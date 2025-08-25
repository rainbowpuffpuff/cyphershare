# run_explanation_interpret.py

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Imports from interpret
from interpret.blackbox import LimeTabular
from interpret import show

# --- Copied from memes_glucose.py ---
# This section is copied to ensure data is processed in the exact same way.

# --- Path and Data Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
S1_FNIRS_PATH = os.path.join(BASE_DIR, 'first_fnirs_log.csv')
S1_CGM_PATH = os.path.join(BASE_DIR, 'first_cgm_log.csv')
S1_CGM_COLUMN = 'Scan Glucose (mmol/L)'

# --- Preprocessing and Feature Engineering Constants ---
SMOOTHING_WINDOW = 30
EPOCH_DURATION_S = 60
EPOCH_OVERLAP_RATIO = 0.5
USABLE_CHANNELS = [
    (2,5,'short'),(3,6,'short'),(6,12,'short'),(7,13,'short'),(1,2,'long'),(1,6,'long'),(1,9,'long'),
    (2,6,'long'),(2,7,'long'),(3,5,'long'),(3,7,'long'),(4,2,'long'),(4,5,'long'),(4,6,'long'),
    (4,7,'long'),(5,6,'long'),(5,9,'long'),(5,12,'long'),(6,3,'long'),(6,5,'long'),(6,13,'long'),
    (7,3,'long'),(7,9,'long'),(7,12,'long'),(8,2,'long'),(8,3,'long'),(8,11,'long'),(8,13,'long'),
]
DPF_WL1=6.25; DPF_WL2=4.89; D_SHORT_CM=0.8; D_LONG_CM=3.0; LN10=np.log(10)
EXT_MOLAR_HBO_WL1=803.1/LN10; EXT_MOLAR_HHB_WL1=2278.1/LN10; EXT_MOLAR_HBO_WL2=1058.0/LN10; EXT_MOLAR_HHB_WL2=740.0/LN10
EPS_HBO_WL1_uM=EXT_MOLAR_HBO_WL1/1.0e6; EPS_HHB_WL1_uM=EXT_MOLAR_HHB_WL1/1.0e6; EPS_HBO_WL2_uM=EXT_MOLAR_HBO_WL2/1.0e6; EPS_HHB_WL2_uM=EXT_MOLAR_HHB_WL2/1.0e6
E_MATRIX_uM=np.array([[EPS_HBO_WL1_uM,EPS_HHB_WL1_uM],[EPS_HBO_WL2_uM,EPS_HHB_WL2_uM]])
try: E_INV_MATRIX_uM=np.linalg.inv(E_MATRIX_uM)
except np.linalg.LinAlgError: print("FATAL ERROR: Extinction coefficient matrix is singular."); exit()


def preprocess_and_feature_engineer(fnirs_path, cgm_path, cgm_column):
    """Loads, preprocesses, and engineers features from fNIRS and CGM data."""
    df_fnirs = pd.read_csv(fnirs_path)
    df_fnirs.columns = df_fnirs.columns.str.strip()
    df_cgm = pd.read_csv(cgm_path)
    df_cgm.columns = df_cgm.columns.str.strip()
    df_cgm['datetime'] = pd.to_datetime(df_cgm['Device Timestamp'], dayfirst=True)
    df_cgm = df_cgm.sort_values(by='datetime').reset_index(drop=True)
    first_cgm_time = df_cgm['datetime'].iloc[0]
    df_cgm['Time_sec'] = (df_cgm['datetime'] - first_cgm_time).dt.total_seconds()
    df_fnirs['glucose'] = np.interp(x=df_fnirs['Time'], xp=df_cgm['Time_sec'], fp=df_cgm[cgm_column])

    for s, d, ctype in USABLE_CHANNELS:
        pmode, dval = ('LP', D_SHORT_CM) if ctype == 'short' else ('RP', D_LONG_CM)
        cid, c740, c850 = f"S{s}_D{d}_{pmode}", f'S{s}_D{d}_740nm_{pmode}', f'S{s}_D{d}_850nm_{pmode}'
        if c740 not in df_fnirs.columns or c850 not in df_fnirs.columns:
            continue
        od740 = -np.log10(np.maximum(df_fnirs[c740] / np.nanmean(df_fnirs[c740]), 1e-9))
        od850 = -np.log10(np.maximum(df_fnirs[c850] / np.nanmean(df_fnirs[c850]), 1e-9))
        hbo, hbr = (E_INV_MATRIX_uM @ np.vstack((od740 / (dval * DPF_WL1), od850 / (dval * DPF_WL2))))
        df_fnirs[f'{cid}_dHbO_s'] = pd.Series(hbo).rolling(SMOOTHING_WINDOW, center=True, min_periods=1).mean()
        df_fnirs[f'{cid}_dHbR_s'] = pd.Series(hbr).rolling(SMOOTHING_WINDOW, center=True, min_periods=1).mean()

    hb_cols = [c for c in df_fnirs.columns if '_dHb' in c and '_s' in c]
    sr = 1 / df_fnirs['Time'].diff().mean()
    samples_epoch = int(EPOCH_DURATION_S * sr)
    step = int(samples_epoch * (1 - EPOCH_OVERLAP_RATIO))
    epochs, labels = [], []

    for i in range(0, len(df_fnirs) - samples_epoch + 1, step):
        epoch_df = df_fnirs.iloc[i:i + samples_epoch]
        features = {}
        for col in hb_cols:
            s = epoch_df[col].dropna()
            f = {'mean': s.mean(), 'std': s.std(), 'skew': s.skew(), 'kurtosis': s.kurtosis(), 'max_minus_min': s.max() - s.min()}
            for k, v in f.items():
                features[f'{col}_{k}'] = v
        epochs.append(features)
        labels.append(epoch_df['glucose'].mean())

    X = pd.DataFrame(epochs)
    y = np.array(labels)
    X.dropna(axis=1, how='all', inplace=True)
    X.fillna(X.mean(), inplace=True)
    return X, y

# --- End of Copied section ---

if __name__ == "__main__":
    print("--- Starting InterpretML Explanation Example ---")

    # 1. Load and preprocess data
    print("--- Loading and preprocessing data for Session 1 ---")
    X, y = preprocess_and_feature_engineer(S1_FNIRS_PATH, S1_CGM_PATH, S1_CGM_COLUMN)

    # The interpret library works better with clean feature names
    X.columns = ["".join (c if c.isalnum() else "_" for c in str(x)) for x in X.columns]

    # 2. Split data for training and testing
    print("--- Splitting data into training and testing sets ---")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Train a model
    print("--- Training RandomForestRegressor model ---")
    model = RandomForestRegressor(random_state=42)
    model.fit(X_train, y_train)

    # 4. Explain the model using LIME
    print("--- Initializing LIME explainer ---")
    lime = LimeTabular(model, X_train, feature_names=X.columns)

    print("--- Generating local explanation for the first 5 test samples ---")
    lime_local = lime.explain_local(X_test[:5], y_test[:5], name='LIME_Explanation')

    # 5. Show the explanation
    # The `show` function is interactive and may open a web browser.
    print("--- Showing explanation visualization ---")
    print("--- This may open a new tab in your web browser. ---")
    show(lime_local)

    print("--- InterpretML Explanation Example Complete ---")

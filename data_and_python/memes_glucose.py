# -*- coding: utf-8 -*-
"""
Refactored Glucose Prediction Analysis Script

This script provides a robust framework for predicting blood glucose levels from fNIRS data.
It includes preprocessing, feature engineering, and a flexible system for running
multiple machine learning experiments with hyperparameter tuning.
"""

import os
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import xgboost as xgb
import lightgbm as lgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.svm import SVR
from sklearn.model_selection import GridSearchCV, train_test_split, TimeSeriesSplit, KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest, f_regression
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# ==============================================================================
# --- Master Configuration ---
# ==============================================================================

# --- Path and Data Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
S1_FNIRS_PATH = os.path.join(BASE_DIR, 'first_fnirs_log.csv')
S1_CGM_PATH = os.path.join(BASE_DIR, 'first_cgm_log.csv')
S2_FNIRS_PATH = os.path.join(BASE_DIR, 'second_fnirs_log.csv')
S2_CGM_PATH = os.path.join(BASE_DIR, 'second_cgm_log.csv')
S1_CGM_COLUMN = 'Scan Glucose (mmol/L)'
S2_CGM_COLUMN = 'Scan Glucose (mmol/L)'

# --- Preprocessing and Feature Engineering Constants ---
SMOOTHING_WINDOW = 30
EPOCH_DURATION_S = 60
EPOCH_OVERLAP_RATIO = 0.5
N_FEATURES_TO_SELECT = 40
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


# --- Model and Hyperparameter Tuning Configuration ---
MODELS_AND_PARAMS = {
    'Ridge': {
        'model': Ridge(),
        'params': {
            'regressor__alpha': [0.1, 1.0, 10, 100]
        }
    },
    'RandomForest': {
        'model': RandomForestRegressor(random_state=42, n_jobs=-1),
        'params': {
            'regressor__n_estimators': [50, 100, 200],
            'regressor__max_depth': [None, 10, 20],
        }
    },
    'XGBoost': {
        'model': xgb.XGBRegressor(objective='reg:squarederror', random_state=42, n_jobs=-1),
        'params': {
            'regressor__n_estimators': [100, 200],
            'regressor__learning_rate': [0.01, 0.1],
            'regressor__max_depth': [3, 5, 7],
        }
    },
    'SVR': {
        'model': SVR(),
        'params': {
            'regressor__C': [0.1, 1, 10],
            'regressor__kernel': ['linear', 'rbf']
        }
    },
    'ElasticNet': {
        'model': ElasticNet(random_state=42),
        'params': {
            'regressor__alpha': [0.1, 1.0, 10],
            'regressor__l1_ratio': [0.1, 0.5, 0.9]
        }
    },
    'LightGBM': {
        'model': lgb.LGBMRegressor(random_state=42, n_jobs=-1),
        'params': {
            'regressor__n_estimators': [100, 200],
            'regressor__learning_rate': [0.01, 0.1],
            'regressor__num_leaves': [31, 50]
        }
    }
}

# --- Experiment Configuration ---
CV_STRATEGY = 'TimeSeriesSplit'  # Options: 'TimeSeriesSplit', 'BlockedKFold', 'KFold'
N_CV_SPLITS = 5
CV_GAP_EPOCHS = 2 # Only used for BlockedKFold
RUN_GENERALIZATION_EXPERIMENTS = True
RUN_COMBINED_HOLDOUT_EXPERIMENT = True
TRAIN_SPLIT_RATIO = 0.7 # For combined holdout experiment

# ==============================================================================
# --- Helper Classes and Functions ---
# ==============================================================================

class BlockedKFold():
    def __init__(self, n_splits=5, gap=0): self.n_splits, self.gap = n_splits, gap
    def get_n_splits(self, X=None, y=None, groups=None): return self.n_splits
    def split(self, X, y=None, groups=None):
        n = len(X)
        k_size = n // self.n_splits
        indices = np.arange(n)
        for i in range(self.n_splits):
            start = i * k_size
            end = start + k_size
            test_indices = indices[start:end]
            train_indices = np.concatenate([indices[:max(0, start - self.gap)], indices[end + self.gap:]])
            yield train_indices, test_indices

def get_cv_strategy(strategy_name, n_splits, gap):
    if strategy_name == 'TimeSeriesSplit':
        return TimeSeriesSplit(n_splits=n_splits)
    elif strategy_name == 'BlockedKFold':
        return BlockedKFold(n_splits=n_splits, gap=gap)
    else: # Default to KFold
        return KFold(n_splits=n_splits, shuffle=False)

def plot_clarke_error_grid(y_true_mmol, y_pred_mmol, title, plots_folder):
    """Generates and saves a Clarke Error Grid plot."""
    y_true = np.array(y_true_mmol) * 18.0182
    y_pred = np.array(y_pred_mmol) * 18.0182
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.scatter(y_true, y_pred, c='k', s=25, zorder=2)
    ax.set_xlabel("Reference Glucose (mg/dL)", fontsize=14)
    ax.set_ylabel("Predicted Glucose (mg/dL)", fontsize=14)
    ax.set_title(title, fontsize=16)
    ax.set_xticks(range(0, 401, 50))
    ax.set_yticks(range(0, 401, 50))
    ax.set_xlim(0, 400)
    ax.set_ylim(0, 400)
    ax.set_facecolor('whitesmoke')
    ax.grid(True, linestyle='--', color='lightgray')
    ax.set_aspect('equal', adjustable='box')
    x = np.arange(0, 401)
    ax.plot(x, x, 'k-', lw=1.5, zorder=1)
    ax.plot([0, 400], [70, 70], 'k--')
    ax.plot([70, 70], [0, 400], 'k--')
    ax.plot([0, 400], [180, 180], 'k--')
    ax.plot([180, 180], [0, 400], 'k--')
    
    zone_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0}
    total_points = len(y_true)
    for true, pred in zip(y_true, y_pred):
        if (abs(true - pred) / true < 0.2) or (true < 70 and pred < 70):
            zone_counts['A'] += 1
        elif (true >= 70 and pred <= 50) or (true <= 70 and pred >= 180):
            zone_counts['D'] += 1
        elif (true > 180 and pred < 70) or (true < 70 and pred > 180):
            zone_counts['E'] += 1
        else:
            zone_counts['B'] += 1
            
    print("\n--- Clarke Error Grid Analysis ---")
    if total_points > 0:
        for z, c in zone_counts.items():
            print(f"  Zone {z}: {c}/{total_points} ({(c/total_points)*100:.2f}%)")
            
    plt.savefig(os.path.join(plots_folder, f"ClarkeGrid_{title.replace(' ', '_').replace(':', '')}.png"), dpi=150)
    plt.close(fig)

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

def evaluate_model(y_true, y_pred, model_name, experiment_name, plots_folder):
    """Calculates and prints performance metrics and generates plots."""
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)

    print(f"\n--- Performance for {model_name} on {experiment_name} ---")
    print(f"  RMSE: {rmse:.3f} mmol/L")
    print(f"  MAE:  {mae:.3f} mmol/L")
    print(f"  R²:   {r2:.3f}")

    plot_title = f"{model_name} on {experiment_name}"
    plot_clarke_error_grid(y_true, y_pred, plot_title, plots_folder)

# ==============================================================================
# --- Experiment Runners ---
# ==============================================================================

def run_generalization_experiment(train_data, test_data, experiment_name, cv_strategy):
    """
    Trains models on one session and tests on another.
    """
    X_train, y_train = train_data
    X_test, y_test = test_data
    
    print("=" * 70)
    print(f"--- Running Generalization Experiment: {experiment_name} ---")
    print(f"Training data shape: {X_train.shape}")
    print(f"Test data shape:     {X_test.shape}")
    print(f"CV Strategy: {CV_STRATEGY}")
    print("=" * 70)

    plots_folder = os.path.join(BASE_DIR, f"PLOTS_{experiment_name}")
    os.makedirs(plots_folder, exist_ok=True)

    for name, config in MODELS_AND_PARAMS.items():
        print(f"\n--- Tuning and Training {name} ---")
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('selector', SelectKBest(f_regression, k=min(N_FEATURES_TO_SELECT, X_train.shape[1]))),
            ('regressor', config['model'])
        ])

        grid_search = GridSearchCV(pipeline, config['params'], cv=cv_strategy, n_jobs=-1, scoring='r2')
        grid_search.fit(X_train, y_train)

        print(f"Best parameters for {name}: {grid_search.best_params_}")
        best_model = grid_search.best_estimator_

        y_pred = best_model.predict(X_test)
        evaluate_model(y_test, y_pred, name, experiment_name, plots_folder)

def run_combined_holdout_experiment(s1_data, s2_data, cv_strategy):
    """
    Trains on a combined dataset and tests on holdout sets from each session.
    """
    X_s1, y_s1 = s1_data
    X_s2, y_s2 = s2_data
    
    experiment_name = "Combined_Holdout"
    print("=" * 70)
    print(f"--- Running {experiment_name} Experiment ---")
    print(f"CV Strategy: {CV_STRATEGY}")
    print("=" * 70)

    plots_folder = os.path.join(BASE_DIR, f"PLOTS_{experiment_name}")
    os.makedirs(plots_folder, exist_ok=True)

    # Create chronological splits
    X_s1_train, X_s1_test, y_s1_train, y_s1_test = train_test_split(X_s1, y_s1, test_size=1 - TRAIN_SPLIT_RATIO, shuffle=False)
    X_s2_train, X_s2_test, y_s2_train, y_s2_test = train_test_split(X_s2, y_s2, test_size=1 - TRAIN_SPLIT_RATIO, shuffle=False)

    # Combine training data
    X_train_combined = pd.concat([X_s1_train, X_s2_train], ignore_index=True)
    y_train_combined = np.concatenate([y_s1_train, y_s2_train])
    
    print(f"Combined training data shape: {X_train_combined.shape}")

    for name, config in MODELS_AND_PARAMS.items():
        print(f"\n--- Tuning and Training {name} on Combined Data ---")
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('selector', SelectKBest(f_regression, k=min(N_FEATURES_TO_SELECT, X_train_combined.shape[1]))),
            ('regressor', config['model'])
        ])

        grid_search = GridSearchCV(pipeline, config['params'], cv=cv_strategy, n_jobs=-1, scoring='r2')
        grid_search.fit(X_train_combined, y_train_combined)

        print(f"Best parameters for {name}: {grid_search.best_params_}")
        best_model = grid_search.best_estimator_

        # Evaluate on Session 1 holdout
        y_s1_pred = best_model.predict(X_s1_test)
        evaluate_model(y_s1_test, y_s1_pred, name, "Test on S1 Holdout", plots_folder)

        # Evaluate on Session 2 holdout
        y_s2_pred = best_model.predict(X_s2_test)
        evaluate_model(y_s2_test, y_s2_pred, name, "Test on S2 Holdout", plots_folder)

# ==============================================================================
# --- Main Execution ---
# ==============================================================================

if __name__ == "__main__":
    print("--- Starting Data Preprocessing ---")
    s1_data = preprocess_and_feature_engineer(S1_FNIRS_PATH, S1_CGM_PATH, S1_CGM_COLUMN)
    s2_data = preprocess_and_feature_engineer(S2_FNIRS_PATH, S2_CGM_PATH, S2_CGM_COLUMN)
    print("--- Data Preprocessing Complete ---")

    cv_strategy = get_cv_strategy(CV_STRATEGY, N_CV_SPLITS, CV_GAP_EPOCHS)

    if RUN_GENERALIZATION_EXPERIMENTS:
        run_generalization_experiment(train_data=s1_data, test_data=s2_data, experiment_name="Train_S1_Test_S2", cv_strategy=cv_strategy)
        run_generalization_experiment(train_data=s2_data, test_data=s1_data, experiment_name="Train_S2_Test_S1", cv_strategy=cv_strategy)

    if RUN_COMBINED_HOLDOUT_EXPERIMENT:
        run_combined_holdout_experiment(s1_data=s1_data, s2_data=s2_data, cv_strategy=cv_strategy)

    print("\nAll experiments complete!")
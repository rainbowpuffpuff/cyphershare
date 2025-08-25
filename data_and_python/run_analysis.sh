#!/bin/bash

# This script automates the setup and execution of the fNIRS glucose prediction analysis.
# It ensures all dependencies are installed, reconstructs data files, and runs the main analysis script.

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
VENV_DIR="$BASE_DIR/../.venv"

# --- Step 1: Create and Activate Virtual Environment ---
if [ ! -d "$VENV_DIR" ]; then
    echo "--- Creating Python virtual environment at $VENV_DIR ---"
    python3 -m venv "$VENV_DIR"
fi

echo "--- Activating virtual environment ---"
source "$VENV_DIR/bin/activate"

# --- Step 2: Install Dependencies ---
echo "--- Installing required Python packages ---"
pip install pandas numpy matplotlib seaborn scikit-learn joblib xgboost lightgbm interpret lime

# --- Step 3: Reconstruct Data Files ---
echo "--- Reconstructing data files... ---"
python3 "$BASE_DIR/reconstruct_file.py" "$BASE_DIR/first_fnirs_log_part1_of_2.csv"
python3 "$BASE_DIR/reconstruct_file.py" "$BASE_DIR/second_fnirs_log_part1_of_2.csv"

# --- Step 4: Rename Reconstructed Files ---
echo "--- Renaming reconstructed files... ---"
mv -f "$BASE_DIR/first_fnirs_log_reconstructed.csv" "$BASE_DIR/first_fnirs_log.csv"
mv -f "$BASE_DIR/second_fnirs_log_reconstructed.csv" "$BASE_DIR/second_fnirs_log.csv"

# --- Step 5: Run the Main Analysis Script ---
echo "--- Running the main analysis script... ---"
python3 "$BASE_DIR/memes_glucose.py"

# --- Deactivate Virtual Environment ---
deactivate

echo "--- Analysis complete. ---"
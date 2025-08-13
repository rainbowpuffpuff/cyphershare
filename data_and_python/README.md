fNIRS-Based Glucose Prediction Analysis

This directory contains the data, Python scripts, and machine learning models for a project aimed at predicting blood glucose levels from functional near-infrared spectroscopy (fNIRS) data. The project involves data preprocessing, feature engineering, model training, and robust evaluation across different sessions.
Directory Contents

The files are organized by function: raw data, file management utilities, testing scripts, and the core machine learning pipeline.
Data Files

    first_cgm_log.csv / second_cgm_log.csv: Ground truth glucose data (in mmol/L) from a Continuous Glucose Monitor (CGM) for two separate sessions.

    first_fnirs_log.csv / second_fnirs_log.csv: The corresponding raw fNIRS sensor data for the two sessions. Note: These files are large and are ignored by version control.

    ..._part1_of_2.csv, ..._part2_of_2.csv: The large fNIRS log files split into smaller parts to facilitate storage and transfer.

    ..._reconstructed.csv: The reassembled fNIRS files, created by the reconstruction utility.

Machine Learning Pipeline

    memes_glucose.py: The main script for the entire machine learning workflow. It performs two key experiments:

        Cross-Session Generalization: Trains a model on all of Session 1's data and tests it on all of Session 2's data (and vice-versa).

        Combined Data Holdout: Combines the first 70% of data from both sessions for training, then tests the model on the remaining 30% holdout set from each session individually.

    PLOTS_.../ (Generated Directory): This directory is created automatically by memes_glucose.py to store all output plots, such as Clarke Error Grids, time-series predictions, and scatter plots.

File Management Utilities

These scripts are designed to handle the large fNIRS data files.

    split_file.py: A command-line tool to break any large file into a specified number of smaller, reconstructable parts.

    reconstruct_file.py: The companion script to reassemble the split parts back into a single, complete file.

    verify_integrity.py: A crucial tool to compare two files (e.g., an original and its reconstruction) using SHA-256 hashes to ensure they are byte-for-byte identical.

    clean_cgm.py: An example data cleaning script to process raw CSV exports from a FreeStyle Libre device, filtering them by time and record type.

Testing

    test_file_utils.py: A unittest suite that provides automated tests for the split_file.py and reconstruct_file.py utilities, ensuring their reliability.

Workflow & How to Run

Follow these steps to replicate the analysis.

Quick Run with Script
---------------------

For convenience, a shell script is provided to automate the entire process. It will reconstruct the data, activate the virtual environment, and run the analysis.

1.  **Make the script executable:**
    ```bash
    chmod +x run_analysis.sh
    ```
2.  **Run the script:**
    ```bash
    ./run_analysis.sh
    ```

Manual Workflow
---------------

1. Prerequisites

Ensure you have Python installed along with the necessary libraries. You can install them using pip:
code Bash
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

      
pip install pandas numpy matplotlib seaborn scikit-learn joblib

    

2. Handling Large Data Files

If you have downloaded the split data parts, you must first reconstruct the full fNIRS log files.
Step 2a: Reconstruct the Files

Use the reconstruct_file.py script. You only need to point it to one of the parts.
code Bash
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

      
# Reconstruct the first fNIRS log
python reconstruct_file.py first_fnirs_log_part1_of_2.csv

# Reconstruct the second fNIRS log
python reconstruct_file.py second_fnirs_log_part1_of_2.csv

    

This will create first_fnirs_log_reconstructed.csv and second_fnirs_log_reconstructed.csv. For the main analysis script to work, rename these to first_fnirs_log.csv and second_fnirs_log.csv.
Step 2b: (Optional) Verify Integrity

To be certain the reconstruction was perfect, use the verify_integrity.py script to compare the reconstructed file against the original (if you have it).
code Bash
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

      
python verify_integrity.py original_large_file.csv reconstructed_file.csv

    

The script will confirm if the files are identical.
3. Run the Main Analysis

Execute the core machine learning script. It will automatically process the data, train the models, run both experiments, and save all results to the generated PLOTS_... directories.
code Bash
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

      
python memes_glucose.py

    

4. Run the Unit Tests

To confirm that the file utility scripts are working as expected, run the test suite.
code Bash
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

      
python test_file_utils.py

    

A successful run will show that all tests passed, confirming the reliability of the splitting and reconstruction logic.
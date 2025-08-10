# generate_scan_report.py

import csv
from datetime import datetime

# --- Configuration ---
INPUT_FILENAME = 'freelibre_readings_glucose.csv'
OUTPUT_FILENAME = 'freelibre_scans_1847_to_1927.csv'

# 1. UPDATED Time filter settings
START_TIME_EXCLUSIVE = '18:47'  # Keep records AFTER this time
END_TIME_INCLUSIVE = '19:27'    # Keep records UP TO AND INCLUDING this time

# 2. Columns to keep in the final output
FINAL_COLUMNS = ['Device Timestamp', 'Scan Glucose (mmol/L)']

# 3. Column names to find in the source file
TIMESTAMP_COLUMN = 'Device Timestamp'
SCAN_GLUCOSE_COLUMN = 'Scan Glucose mmol/L' # We only care about this glucose column now
# ---------------------

def generate_scan_report():
    """
    Reads a raw FreeStyle Libre CSV, then filters by a specific time window,
    selects only manual scan records, sorts them, and saves to a new file.
    """
    # --- 1. Read and Process the Data ---
    print(f"Reading and processing data from '{INPUT_FILENAME}'...")

    processed_data = []
    try:
        with open(INPUT_FILENAME, mode='r', encoding='utf-8', newline='') as infile:
            # Skip the first metadata line
            next(infile)

            reader = csv.reader(infile)
            header = next(reader)

            # Find the indices of the columns we need
            try:
                ts_idx = header.index(TIMESTAMP_COLUMN)
                scan_gluc_idx = header.index(SCAN_GLUCOSE_COLUMN)
            except ValueError as e:
                print(f"Error: A required column was not found in the header. {e}")
                return

            # Convert filter times to time objects for comparison
            start_filter = datetime.strptime(START_TIME_EXCLUSIVE, '%H:%M').time()
            end_filter = datetime.strptime(END_TIME_INCLUSIVE, '%H:%M').time()

            # Iterate over each row to filter and extract data
            for row in reader:
                if not row or not row[ts_idx]: # Skip empty rows
                    continue

                try:
                    # Apply the time filter first
                    record_datetime = datetime.strptime(row[ts_idx], '%d-%m-%Y %H:%M')
                    record_time = record_datetime.time()

                    if start_filter < record_time <= end_filter:
                        # Now, check if there is a value ONLY in the Scan Glucose column
                        glucose_str = row[scan_gluc_idx]

                        if glucose_str: # This ensures we only keep rows with a manual scan
                            # Store the datetime object for easy sorting
                            processed_data.append([record_datetime, float(glucose_str)])

                except (ValueError, IndexError):
                    print(f"Warning: Skipping malformed row: {row}")
                    continue

    except FileNotFoundError:
        print(f"Error: The file '{INPUT_FILENAME}' was not found.")
        return
    except Exception as e:
        print(f"An error occurred during file processing: {e}")
        return

    # --- 2. Sort the Processed Data ---
    print("Sorting the filtered data...")
    processed_data.sort(key=lambda x: x[0])

    # --- 3. Write the Final Report ---
    print(f"Writing final report to '{OUTPUT_FILENAME}'...")
    try:
        with open(OUTPUT_FILENAME, mode='w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(FINAL_COLUMNS) # Write the new header
            
            if not processed_data:
                print("\nWarning: No records matched the specified time range and criteria.")
            else:
                for record_datetime, glucose_value in processed_data:
                    timestamp_str = record_datetime.strftime('%d-%m-%Y %H:%M')
                    writer.writerow([timestamp_str, glucose_value])

        print("-" * 30)
        print("Success! The data has been processed.")
        print(f"{len(processed_data)} records were saved to the final report.")
        print(f"Output file: '{OUTPUT_FILENAME}'")
        print("-" * 30)

    except Exception as e:
        print(f"An error occurred while writing the final file: {e}")


if __name__ == "__main__":
    generate_scan_report()

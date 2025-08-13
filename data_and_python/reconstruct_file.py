# file: reconstruct_file.py

import argparse
import re
from pathlib import Path

def reconstruct_file(first_part_path: Path):
    """
    Reconstructs a single file from its split parts.

    It determines the original filename and finds all sibling parts
    based on the naming convention:
    {original_name}_part{part_num}_of_{total_parts}{original_ext}

    Args:
        first_part_path: The path to any one of the file parts.
    
    Raises:
        FileNotFoundError: If any of the required parts are missing.
        ValueError: If the filename format is incorrect.
    """
    if not first_part_path.is_file():
        raise FileNotFoundError(f"Error: Part file not found at '{first_part_path}'")

    # Regex to extract info from filename like 'myfile_part1_of_2.csv'
    pattern = re.compile(r"(.+)_part(\d+)_of_(\d+)(.*)")
    match = pattern.match(first_part_path.name)

    if not match:
        raise ValueError(
            "Error: Filename format is incorrect. \n"
            "Expected: 'original_name_partX_of_Y.ext'"
        )

    base_name, _, total_parts_str, ext = match.groups()
    total_parts = int(total_parts_str)
    
    # Determine the original, reconstructed filename
    output_filename = f"{base_name}_reconstructed{ext}"
    output_path = first_part_path.with_name(output_filename)

    print(f"Reconstructing '{output_path.name}' from {total_parts} parts...")

    part_paths = []
    for i in range(total_parts):
        part_num = i + 1
        part_filename = f"{base_name}_part{part_num}_of_{total_parts}{ext}"
        part_path = first_part_path.with_name(part_filename)
        
        if not part_path.is_file():
            raise FileNotFoundError(f"Error: Missing part: '{part_path.name}'")
        part_paths.append(part_path)

    try:
        with open(output_path, "wb") as dest_file:
            for part_path in part_paths:
                print(f"  -> Appending '{part_path.name}'...")
                with open(part_path, "rb") as source_part:
                    dest_file.write(source_part.read())
        
        print(f"\nReconstruction complete. File saved as '{output_path.name}'")

    except IOError as e:
        print(f"An I/O error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Reconstruct a single file from its split parts.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "part_file",
        help="The path to any one of the file parts (e.g., the first part)."
    )
    
    args = parser.parse_args()
    
    try:
        part_path = Path(args.part_file)
        reconstruct_file(part_path)
    except (FileNotFoundError, ValueError) as e:
        print(e)

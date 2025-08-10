# file: split_file.py

import argparse
import math
from pathlib import Path

def split_file(file_path: Path, num_parts: int):
    """
    Splits a single file into a specified number of parts.

    The output files will be named using the pattern:
    {original_name}_part{part_num}_of_{total_parts}{original_ext}

    Args:
        file_path: The path to the file to be split.
        num_parts: The number of smaller files to create.
    
    Raises:
        FileNotFoundError: If the input file does not exist.
        ValueError: If num_parts is not a positive integer.
    """
    if not file_path.is_file():
        raise FileNotFoundError(f"Error: Source file not found at '{file_path}'")
    
    if not isinstance(num_parts, int) or num_parts <= 0:
        raise ValueError("Error: Number of parts must be a positive integer.")

    total_size = file_path.stat().st_size
    part_size = math.ceil(total_size / num_parts)

    print(f"Splitting '{file_path.name}' ({total_size} bytes) into {num_parts} parts of ~{part_size} bytes each.")

    try:
        with open(file_path, "rb") as source_file:
            for i in range(num_parts):
                part_num = i + 1
                
                # Construct the output filename
                part_filename = f"{file_path.stem}_part{part_num}_of_{num_parts}{file_path.suffix}"
                part_path = file_path.with_name(part_filename)
                
                print(f"  -> Creating '{part_path.name}'...")
                
                with open(part_path, "wb") as part_file:
                    content = source_file.read(part_size)
                    if not content:
                        break # Stop if there's no more content to read
                    part_file.write(content)

        print("\nSplit complete.")
    except IOError as e:
        print(f"An I/O error occurred: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Split a large file into a specified number of smaller parts.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("file", help="The path to the file you want to split.")
    parser.add_argument(
        "-n", "--num-parts",
        type=int,
        default=2,
        help="The number of parts to split the file into (default: 2)."
    )

    args = parser.parse_args()
    
    try:
        source_path = Path(args.file)
        split_file(source_path, args.num_parts)
    except (FileNotFoundError, ValueError) as e:
        print(e)

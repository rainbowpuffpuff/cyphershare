# file: verify_integrity.py

import argparse
import hashlib
from pathlib import Path
import sys

def get_file_hash(file_path: Path) -> str:
    """Computes and returns the SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    
    try:
        with open(file_path, "rb") as f:
            # Read the file in chunks to handle large files efficiently
            while chunk := f.read(8192):
                sha256.update(chunk)
    except IOError as e:
        print(f"Error reading file '{file_path}': {e}", file=sys.stderr)
        return ""
        
    return sha256.hexdigest()

def compare_files(file1_path: Path, file2_path: Path) -> bool:
    """
    Compares two files for byte-for-byte identity.
    
    First, it checks if the file sizes are identical.
    If they are, it proceeds to compare their SHA256 hashes.
    
    Returns:
        True if files are identical, False otherwise.
    """
    try:
        # Quick check: Compare file sizes first.
        size1 = file1_path.stat().st_size
        size2 = file2_path.stat().st_size

        if size1 != size2:
            print(f"File sizes do not match:")
            print(f"  -> {file1_path.name}: {size1} bytes")
            print(f"  -> {file2_path.name}: {size2} bytes")
            return False

        print("File sizes match. Comparing hashes...")
        
        # Comprehensive check: Compare hashes.
        hash1 = get_file_hash(file1_path)
        hash2 = get_file_hash(file2_path)
        
        if not hash1 or not hash2:
            return False # An error occurred during hashing

        print(f"  -> Hash 1: {hash1}")
        print(f"  -> Hash 2: {hash2}")
        
        return hash1 == hash2

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Verify that two files are byte-for-byte identical by comparing their SHA256 hashes."
    )
    parser.add_argument("file1", help="Path to the first file (e.g., the original).")
    parser.add_argument("file2", help="Path to the second file (e.g., the reconstructed one).")
    
    args = parser.parse_args()

    path1 = Path(args.file1)
    path2 = Path(args.file2)
    
    print(f"Verifying integrity between '{path1.name}' and '{path2.name}'...\n")

    if compare_files(path1, path2):
        print("\n✅ SUCCESS: Files are identical.")
        # Exit with a success code
        sys.exit(0)
    else:
        print("\n❌ FAILURE: Files are different.")
        # Exit with a failure code
        sys.exit(1)

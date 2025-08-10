# file: test_file_utils.py

import unittest
import hashlib
import os
from pathlib import Path
import shutil

# Import the functions to be tested
from split_file import split_file
from reconstruct_file import reconstruct_file

class TestFileSplitterReconstructor(unittest.TestCase):

    def setUp(self):
        """Set up a temporary directory and test files before each test."""
        self.test_dir = Path("temp_test_data")
        self.test_dir.mkdir(exist_ok=True)
        
        # Create a test file with a size that is not easily divisible
        self.original_file = self.test_dir / "original_test_file.bin"
        with open(self.original_file, "wb") as f:
            f.write(os.urandom(1024 * 100 + 13)) # 100KB + 13 bytes
            
        self.original_hash = self._get_file_hash(self.original_file)

    def tearDown(self):
        """Clean up the temporary directory after each test."""
        shutil.rmtree(self.test_dir)

    def _get_file_hash(self, file_path: Path) -> str:
        """Computes the SHA256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()

    def test_split_and_reconstruct_integrity(self):
        """The ultimate test: does a reconstructed file match the original?"""
        num_parts = 5
        
        # 1. Split the file
        split_file(self.original_file, num_parts)
        
        # 2. Check that the correct number of parts were created
        parts = list(self.test_dir.glob("*_part*_of_*"))
        self.assertEqual(len(parts), num_parts)
        
        # 3. Reconstruct the file from the first part
        first_part = self.test_dir / f"original_test_file_part1_of_{num_parts}.bin"
        reconstruct_file(first_part)
        
        # 4. Verify the reconstructed file exists and its hash matches the original
        reconstructed_file = self.test_dir / "original_test_file_reconstructed.bin"
        self.assertTrue(reconstructed_file.exists())
        
        reconstructed_hash = self._get_file_hash(reconstructed_file)
        self.assertEqual(self.original_hash, reconstructed_hash, "File content mismatch after reconstruction!")

    def test_reconstruct_raises_error_on_missing_part(self):
        """Test if reconstruction fails gracefully if a part is missing."""
        num_parts = 3
        split_file(self.original_file, num_parts)
        
        # Delete one of the parts
        part_to_delete = self.test_dir / f"original_test_file_part2_of_{num_parts}.bin"
        os.remove(part_to_delete)
        
        # Expect a FileNotFoundError when trying to reconstruct
        first_part = self.test_dir / f"original_test_file_part1_of_{num_parts}.bin"
        with self.assertRaises(FileNotFoundError):
            reconstruct_file(first_part)

if __name__ == "__main__":
    unittest.main()

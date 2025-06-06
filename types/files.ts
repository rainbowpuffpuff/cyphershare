export interface FileItem {
  id: number | string;
  name: string;
  size: number; // MB
  type: string;
  timestamp: string;
  fileId?: string;
  isEncrypted?: boolean;
  accessCondition?: string;
  isUploading?: boolean;
  progress?: number;
  scriptHash?: string; // Added for Python files that have been run
}

export interface UploadingFile {
  progress: number;
  name: string;
  size: number;
  type: string;
  timestamp?: string;
  isEncrypted?: boolean;
  accessCondition?: string;
}

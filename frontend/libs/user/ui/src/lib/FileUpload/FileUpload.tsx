import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export interface UploadedFile {
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // MB
  maxFiles?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  helperText?: string;
}

export const FileUpload = ({
  label,
  accept = '*',
  multiple = false,
  maxSize = 5,
  maxFiles = 1,
  onFilesChange,
  helperText,
}: FileUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    const validFiles: UploadedFile[] = [];

    fileArray.forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        validFiles.push({
          file,
          status: 'error',
          error: `File size exceeds ${maxSize}MB`,
        });
        return;
      }

      // Check max files
      if (files.length + validFiles.length >= maxFiles) {
        return;
      }

      validFiles.push({
        file,
        status: 'pending',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    });

    const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6
          transition-colors cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            {accept !== '*' && `${accept.toUpperCase()} files - `}
            Max {maxSize}MB {multiple && `(up to ${maxFiles} files)`}
          </p>
        </div>
      </div>

      {helperText && (
        <p className="mt-2 text-sm text-gray-500">{helperText}</p>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((fileItem, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {fileItem.preview ? (
                  <img
                    src={fileItem.preview}
                    alt="preview"
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <FileText className="w-10 h-10 text-gray-400 flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {fileItem.error && (
                    <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {fileItem.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {fileItem.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {fileItem.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
import { useId, useState } from 'react';
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
  /** Field-level validation error (e.g. "required"), shown below the dropzone with a red border. */
  error?: string;
  required?: boolean;
  /** Hide the built-in selected-files list, e.g. when the parent renders its own list. */
  hideFileList?: boolean;
  /**
   * Optional controlled file list. When provided, the component renders and
   * accumulates against this list instead of its own internal state, so the
   * parent stays the single source of truth. Omit to keep the previous
   * uncontrolled behavior unchanged.
   */
  files?: UploadedFile[];
}

export const FileUpload = ({
  label,
  accept = '*',
  multiple = false,
  maxSize = 5,
  maxFiles = 1,
  onFilesChange,
  helperText,
  error,
  required = false,
  hideFileList = false,
  files,
}: FileUploadProps) => {
  const generatedId = useId();
  const inputId = `${generatedId}-file-upload`;
  const helperTextId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const [internalFiles, setInternalFiles] = useState<UploadedFile[]>([]);
  const displayedFiles = files ?? internalFiles;
  const [dragActive, setDragActive] = useState(false);

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
      if (displayedFiles.length + validFiles.length >= maxFiles) {
        return;
      }

      validFiles.push({
        file,
        status: 'pending',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    });

    const updatedFiles = multiple ? [...displayedFiles, ...validFiles] : validFiles;
    setInternalFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = displayedFiles.filter((_, i) => i !== index);
    setInternalFiles(updatedFiles);
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
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span aria-hidden="true" className="text-red-600 ml-1">*</span>}
        </label>
      )}

      {/* Upload Area */}
      <label
        htmlFor={inputId}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative block w-full border-2 border-dashed rounded-lg p-6
          transition-colors cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            [helperText ? helperTextId : null, error ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
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
      </label>

      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {helperText && (
        <p id={helperTextId} className="mt-2 text-sm text-gray-500">{helperText}</p>
      )}

      {/* File List */}
      {!hideFileList && displayedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {displayedFiles.map((fileItem, index) => (
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

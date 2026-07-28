import React, { useState } from "react";
import { fileUploadService } from '../../../../services/file-upload.service';
import { Input, FileUpload, type UploadedFile } from "@edumind/user-ui";
import type { StepProps } from "./types";

export const Step2Media: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const [thumbnailFiles, setThumbnailFiles] = useState<UploadedFile[]>([]);

  const handleFilesChange = async (files: UploadedFile[]) => {
    setThumbnailFiles(files);

    // Nếu có file mới và chưa upload
    const pendingFile = files.find((f) => f.status === "pending");
    if (pendingFile) {
      try {
        // Update status to uploading
        pendingFile.status = "uploading";
        setThumbnailFiles([...files]);

        // Upload file
        const response = await fileUploadService.uploadImage(pendingFile.file, "images/courses", 1280, 720);

        // Update status to success và set URL
        pendingFile.status = "success";
        pendingFile.url = response.url;
        setThumbnailFiles([...files]);

        // Update form data với thumbnail URL
        onChange({ thumbnailUrl: response.url });
      } catch (err: any) {
        // Update status to error
        pendingFile.status = "error";
        pendingFile.error = err.message || "Failed to upload image";
        setThumbnailFiles([...files]);
      }
    } else if (files.length === 0) {
      // Nếu xóa file, clear thumbnail URL
      onChange({ thumbnailUrl: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course Thumbnail
        </label>
        {data.thumbnailUrl ? (
          <div className="relative border-2 border-gray-300 rounded-lg p-6">
            <img
              src={data.thumbnailUrl}
              alt="Thumbnail"
              className="w-full aspect-video object-cover rounded-lg"
            />
            <button
              onClick={() => {
                onChange({ thumbnailUrl: undefined });
                setThumbnailFiles([]);
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <FileUpload
            accept="image/*"
            multiple={false}
            maxSize={5}
            maxFiles={1}
            onFilesChange={handleFilesChange}
            helperText="Recommended: 1280x720px (16:9 ratio). Max 5MB"
          />
        )}
        {errors["thumbnailUrl"] && (
          <p className="text-sm text-red-600 mt-2">{errors["thumbnailUrl"]}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preview Video URL
        </label>
        <Input
          value={data.previewVideoUrl || ""}
          onChange={(e) => onChange({ previewVideoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          error={errors["previewVideoUrl"]}
          helperText="YouTube, Vimeo, or direct video URL"
        />
      </div>
    </div>
  );
};


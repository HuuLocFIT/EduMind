import { z } from "zod";

export const FileUploadResponseSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  fileName: z.string(),
  fileType: z.string().optional(),
  resourceType: z.string().optional(),
  size: z.number(),
});

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
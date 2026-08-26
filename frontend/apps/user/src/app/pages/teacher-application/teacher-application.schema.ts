import { z } from "zod";

export const applicationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must not exceed 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must not exceed 50 characters"),
  email: z
    .string()
    .trim()
    .email("Email should be valid")
    .min(1, "Email is required"),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, "Invalid phone number format")
    .optional()
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must not exceed 200 characters"),
  experienceYears: z
    .number()
    .int("Experience years must be an integer")
    .min(0, "Experience years must be positive")
    .optional()
    .nullable(),
  qualifications: z.string().trim().min(1, "Qualifications are required"),
  bio: z
    .string()
    .trim()
    .max(2000, "Bio must not exceed 2000 characters")
    .optional()
    .nullable(),
  motivation: z
    .string()
    .trim()
    .min(1, "Motivation is required")
    .max(1000, "Motivation must not exceed 1000 characters"),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { BookOpen } from "lucide-react";
import { Textarea } from "@edumind/user-ui";
import type { ApplicationFormData } from "../teacher-application.schema";

interface MotivationSectionProps {
  register: UseFormRegister<ApplicationFormData>;
  errors: FieldErrors<ApplicationFormData>;
}

export function MotivationSection({
  register,
  errors,
}: MotivationSectionProps) {
  return (
    <div className="space-y-4 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <BookOpen className="w-5 h-5 mr-2" />
        Motivation
      </h3>
      <Textarea
        label="Why Do You Want to Teach?"
        placeholder="I'm passionate about helping students learn..."
        rows={4}
        error={errors.motivation?.message}
        helperText="Share your passion and goals as an educator (max 1000 characters)"
        fullWidth
        {...register("motivation")}
        required
      />
    </div>
  );
}

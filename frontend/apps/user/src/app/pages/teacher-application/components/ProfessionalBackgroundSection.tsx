import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { BookOpen, Briefcase, GraduationCap } from "lucide-react";
import { Input, Textarea } from "@edumind/user-ui";
import type { ApplicationFormData } from "../teacher-application.schema";

interface ProfessionalBackgroundSectionProps {
  register: UseFormRegister<ApplicationFormData>;
  errors: FieldErrors<ApplicationFormData>;
}

export function ProfessionalBackgroundSection({
  register,
  errors,
}: ProfessionalBackgroundSectionProps) {
  return (
    <div className="space-y-4 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <GraduationCap className="w-5 h-5 mr-2" />
        Professional Background
      </h3>
      <Input
        label="Subject You Can Teach"
        placeholder="Web Development, JavaScript, React..."
        leftIcon={<BookOpen className="w-5 h-5" />}
        error={errors.subject?.message}
        helperText="List the main subject or subjects you can teach"
        fullWidth
        {...register("subject")}
        required
      />
      <Input
        label="Years of Experience"
        type="number"
        placeholder="5"
        leftIcon={<Briefcase className="w-5 h-5" />}
        error={errors.experienceYears?.message}
        helperText="Number of years of teaching experience"
        fullWidth
        {...register("experienceYears", {
          setValueAs: (value) => (value === "" ? undefined : Number(value)),
        })}
      />
      <Textarea
        label="Qualifications"
        placeholder="Bachelor's in Computer Science from XYZ University, Teaching Certificate..."
        rows={4}
        error={errors.qualifications?.message}
        helperText="Include degrees, certifications, and relevant qualifications"
        fullWidth
        {...register("qualifications")}
        required
      />
      <Textarea
        label="Bio (Optional)"
        placeholder="Brief introduction about yourself..."
        rows={3}
        error={errors.bio?.message}
        helperText="Tell us about yourself (max 2000 characters)"
        fullWidth
        {...register("bio")}
      />
    </div>
  );
}

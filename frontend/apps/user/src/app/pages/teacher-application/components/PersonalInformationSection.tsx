import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Mail, Phone, User } from "lucide-react";
import { Input } from "@edumind/user-ui";
import type { ApplicationFormData } from "../teacher-application.schema";

interface PersonalInformationSectionProps {
  register: UseFormRegister<ApplicationFormData>;
  errors: FieldErrors<ApplicationFormData>;
}

export function PersonalInformationSection({
  register,
  errors,
}: PersonalInformationSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <User className="w-5 h-5 mr-2" />
        Personal Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          placeholder="Lucas"
          leftIcon={<User className="w-5 h-5" />}
          error={errors.firstName?.message}
          fullWidth
          required
          {...register("firstName")}
        />
        <Input
          label="Last Name"
          placeholder="Nguyen"
          leftIcon={<User className="w-5 h-5" />}
          error={errors.lastName?.message}
          fullWidth
          required
          {...register("lastName")}
        />
      </div>
      <Input
        label="Email"
        type="email"
        placeholder="lucas.nguyen@example.com"
        leftIcon={<Mail className="w-5 h-5" />}
        error={errors.email?.message}
        fullWidth
        required
        {...register("email")}
      />
      <Input
        label="Phone Number"
        placeholder="0912 345 678"
        leftIcon={<Phone className="w-5 h-5" />}
        error={errors.phone?.message}
        fullWidth
        {...register("phone")}
      />
    </div>
  );
}

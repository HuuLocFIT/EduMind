import { z } from "zod";
import {
  USERNAME_REGEX,
  PHONE_NUMBER_REGEX,
  NUMERIC_CODE_REGEX,
  PASSWORD_UPPERCASE_REGEX,
  PASSWORD_LOWERCASE_REGEX,
  PASSWORD_NUMBER_REGEX,
  PASSWORD_SPECIAL_CHAR_REGEX,
} from "./auth.regex.js";

type UsernameSchemaOptions = {
  minLength?: number;
  maxLength?: number;
  fieldLabel?: string;
};

export function createUsernameSchema(
  options: UsernameSchemaOptions = {}
): z.ZodString {
  const { minLength = 3, maxLength = 50, fieldLabel = "Username" } = options;

  return z
    .string()
    .min(minLength, `${fieldLabel} must be at least ${minLength} characters`)
    .max(maxLength, `${fieldLabel} too long`)
    .regex(
      USERNAME_REGEX,
      `${fieldLabel} can only contain letters, numbers, underscore, and hyphen`
    );
}

type PasswordSchemaOptions = {
  minLength?: number;
  fieldLabel?: string;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
};

export function createPasswordSchema(
  options: PasswordSchemaOptions = {}
): z.ZodString {
  const {
    minLength = 8,
    fieldLabel = "Password",
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = true,
  } = options;

  let schema = z
    .string()
    .min(minLength, `${fieldLabel} must be at least ${minLength} characters`);

  if (requireUppercase) {
    schema = schema.regex(
      PASSWORD_UPPERCASE_REGEX,
      `${fieldLabel} must contain uppercase letter`
    );
  }

  if (requireLowercase) {
    schema = schema.regex(
      PASSWORD_LOWERCASE_REGEX,
      `${fieldLabel} must contain lowercase letter`
    );
  }

  if (requireNumber) {
    schema = schema.regex(
      PASSWORD_NUMBER_REGEX,
      `${fieldLabel} must contain number`
    );
  }

  if (requireSpecial) {
    schema = schema.regex(
      PASSWORD_SPECIAL_CHAR_REGEX,
      `${fieldLabel} must contain special character`
    );
  }

  return schema;
}

type PhoneNumberSchemaOptions = {
  fieldLabel?: string;
};

export function createPhoneNumberSchema(
  options: PhoneNumberSchemaOptions = {}
): z.ZodString {
  const { fieldLabel = "Phone number" } = options;

  return z
    .string()
    .regex(PHONE_NUMBER_REGEX, `Invalid ${fieldLabel.toLowerCase()} format`);
}

type NumericCodeSchemaOptions = {
  length?: number;
  fieldLabel?: string;
};

export function createNumericCodeSchema(
  options: NumericCodeSchemaOptions = {}
): z.ZodString {
  const { length = 6, fieldLabel = "Code" } = options;

  return z
    .string()
    .length(length, `${fieldLabel} must be ${length} digits`)
    .regex(NUMERIC_CODE_REGEX, `${fieldLabel} must be numeric`);
}

export function createRequiredStringSchema(fieldLabel: string): z.ZodString {
  return z.string().min(1, `${fieldLabel} is required`);
}

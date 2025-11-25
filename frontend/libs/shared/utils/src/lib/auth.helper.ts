import { UserRole } from "@edumind/shared-constants";
import {
  PASSWORD_LOWERCASE_REGEX,
  PASSWORD_NUMBER_REGEX,
  PASSWORD_SPECIAL_CHAR_REGEX,
  PASSWORD_UPPERCASE_REGEX,
} from "./auth.regex.js";

type NameableUser = {
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

type RoleAwareUser = {
  roles: UserRoleValue[];
};

type TrialAwareUser = {
  isTrial: boolean;
  trialEndDate?: string | null;
};

export function getUserDisplayName<T extends NameableUser>(user: T): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.username || user.email.split("@")[0];
}

export function getPrimaryRole<T extends RoleAwareUser>(
  user: T
): UserRoleValue {
  return user.roles[0] || UserRole.STUDENT;
}

export function isTrialExpired<T extends TrialAwareUser>(user: T): boolean {
  if (!user.isTrial || !user.trialEndDate) return false;
  return new Date() > new Date(user.trialEndDate);
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (PASSWORD_UPPERCASE_REGEX.test(password)) score++;
  if (PASSWORD_LOWERCASE_REGEX.test(password)) score++;
  if (PASSWORD_NUMBER_REGEX.test(password)) score++;
  if (PASSWORD_SPECIAL_CHAR_REGEX.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", color: "red" };
  if (score <= 4) return { score, label: "Medium", color: "yellow" };
  return { score, label: "Strong", color: "green" };
}

/**
 * Test account credentials.
 *
 * All E2E credentials are REQUIRED from environment variables.
 * We intentionally do not provide fallback defaults to prevent accidental
 * logins with hardcoded credentials in local/dev/CI environments.
 */

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[e2e] Missing required environment variable: ${name}. ` +
        'Set E2E credentials before running Playwright (for example via frontend/.env.e2e).'
    );
  }
  return value;
}

export const TEST_USERS = {
  get student() {
    return {
      email: requiredEnv('E2E_STUDENT_EMAIL'),
      password: requiredEnv('E2E_STUDENT_PASSWORD'),
      firstName: 'E2E',
      lastName: 'Student',
      username: 'e2e_student',
    };
  },
  get teacher() {
    return {
      email: requiredEnv('E2E_TEACHER_EMAIL'),
      password: requiredEnv('E2E_TEACHER_PASSWORD'),
      firstName: 'E2E',
      lastName: 'Teacher',
      username: 'e2e_teacher',
    };
  },
  get admin() {
    return {
      email: requiredEnv('E2E_ADMIN_EMAIL'),
      password: requiredEnv('E2E_ADMIN_PASSWORD'),
    };
  },
} as const;

/** Base URL for the backend API (used in fixtures that call the API directly). */
export const API_BASE_URL =
  process.env['E2E_API_URL'] ?? 'http://localhost:8080';

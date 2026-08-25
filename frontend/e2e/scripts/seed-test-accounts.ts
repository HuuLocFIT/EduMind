/**
 * E2E Test Account Setup Script
 *
 * Run this ONCE before running E2E tests to create the required test accounts.
 *
 * Usage (from frontend/ directory):
 *   npx tsx e2e/scripts/seed-test-accounts.ts
 *
 * Requirements:
 *   - Backend must be running at http://localhost:8080
 *   - E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD are set (for account to seed)
 *
 * What it creates:
 *   - Student account defined by E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD
 *
 * Safe to run multiple times — heals existing unverified accounts.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFilePath = resolve(process.cwd(), '.env.e2e');
if (existsSync(envFilePath)) {
  (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(envFilePath);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[seed] Missing required environment variable: ${name}. ` +
        'Create frontend/.env.e2e from frontend/.env.e2e.example first.'
    );
  }
  return value;
}

const API_BASE = process.env['E2E_API_URL'] ?? 'http://localhost:8080';

const ACCOUNTS = [
  {
    email: requiredEnv('E2E_STUDENT_EMAIL'),
    password: requiredEnv('E2E_STUDENT_PASSWORD'),
    firstName: 'E2E',
    lastName: 'Student',
    username: process.env['E2E_STUDENT_USERNAME']?.trim() || 'e2e_student',
  },
];

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, body: json };
}

async function main() {
  console.log(`\nSeeding E2E test accounts against ${API_BASE}\n`);

  for (const account of ACCOUNTS) {
    process.stdout.write(`Creating ${account.email}... `);

    // Try to login first — if it works, account already exists
    const loginCheck = await post('/api/auth/login', {
      usernameOrEmail: account.email,
      password: account.password,
    });

    if (loginCheck.ok) {
      console.log('✓ already usable');
      continue;
    }

    const loginErrorCode =
      typeof loginCheck.body === 'object' && loginCheck.body !== null
        ? (loginCheck.body as { errorCode?: unknown }).errorCode
        : undefined;

    if (!(loginCheck.status === 403 && loginErrorCode === 'ERR_5004')) {
      const signup = await post('/api/auth/signup', {
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
      });

      if (!signup.ok) {
        const signupMessage =
          typeof signup.body === 'object' && signup.body !== null
            ? String((signup.body as { message?: unknown }).message ?? '')
            : String(signup.body);
        if (!/already (?:in use|taken)/i.test(signupMessage)) {
          console.log(`✗ signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
          console.log(
            `  → Create manually: POST /api/auth/signup with ${JSON.stringify(account)}`
          );
        }
      }
    }

    const verification = await post('/api/auth/dev/verify-email', {
      email: account.email,
    });
    if (!verification.ok) {
      console.log(
        `✗ verification failed: ${verification.status} ${JSON.stringify(verification.body)}`
      );
      console.log(
        '  → Set DEV_VERIFY_ENDPOINT_ENABLED=true only for the local auth-service.'
      );
      continue;
    }

    const confirmedLogin = await post('/api/auth/login', {
      usernameOrEmail: account.email,
      password: account.password,
    });
    if (!confirmedLogin.ok) {
      console.log(
        `✗ verified but login confirmation failed: ${confirmedLogin.status} ${JSON.stringify(confirmedLogin.body)}`
      );
      continue;
    }

    console.log('✓ verified and usable');
  }

  console.log('\nDone.');
  console.log('\nThis script reads E2E vars from frontend/.env.e2e when available.');
}

main().catch(console.error);

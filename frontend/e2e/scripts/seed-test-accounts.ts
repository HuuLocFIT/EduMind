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
 * Safe to run multiple times — skips if account already exists.
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
      console.log('✓ already exists');
      continue;
    }

    // Register the account
    const signup = await post('/api/auth/signup', {
      email: account.email,
      password: account.password,
      firstName: account.firstName,
      lastName: account.lastName,
      username: account.username,
    });

    if (!signup.ok) {
      console.log(`✗ signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
      console.log(
        `  → Create manually: POST /api/auth/signup with ${JSON.stringify(account)}`
      );
      continue;
    }

    console.log('✓ created (check email for verification if required)');
  }

  console.log('\nDone. If email verification is required:');
  console.log('  1. Check the auth-service DB: disable email verification for test accounts');
  console.log('  2. Or add a bypass endpoint for E2E testing');
  console.log('\nThis script reads E2E vars from frontend/.env.e2e when available.');
}

main().catch(console.error);

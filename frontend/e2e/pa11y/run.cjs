#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const pa11y = require('pa11y');
const htmlReporter = require('pa11y/lib/reporters/html');
const puppeteer = require('puppeteer');
const config = require('./config.cjs');
const {responseForApi} = require('./fixtures.cjs');

const isCi = process.argv.includes('--ci');
const reportDirectory = path.resolve(process.cwd(), config.reportDirectory);

// Endpoints that are POST/PUT for backend/API-design reasons but are actually
// read-only (compute-and-return, no persisted mutation) — the initial render
// of an authenticated page can depend on one of these succeeding, so the
// generic "block every non-GET write" rule below must not 405 them.
const SAFE_NON_GET_READS = [/\/checkout\/preview$/, /\/checkout\/direct\/preview$/];

// UserRoleSchema is z.nativeEnum(UserRole), whose STUDENT value is the string
// 'ROLE_STUDENT' (see @edumind/shared-constants) — the refresh mock response below is
// parsed against RefreshTokenResponseSchema, so this must be the real enum value.
const PA11Y_USER = {
  id: 99001,
  username: 'pa11y-student',
  email: 'pa11y@example.invalid',
  firstName: 'Pa11y',
  lastName: 'Student',
  roles: ['ROLE_STUDENT'],
  isActive: true,
  isEmailVerified: true,
  is2faEnabled: false,
  isTrial: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const PA11Y_ACCESS_TOKEN = 'pa11y-local-fixture-token';

async function preparePage(browser, route) {
  const page = await browser.newPage();
  if (route.requiresAuth) {
    await page.evaluateOnNewDocument((user, accessToken) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: { user, accessToken, isAuthenticated: true },
          version: 0,
        }),
      );
    }, PA11Y_USER, PA11Y_ACCESS_TOKEN);
  }
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    const isApi = url.pathname.startsWith('/api/');

    try {
      if (isApi && request.method() === 'OPTIONS') {
        // The browser sends a CORS preflight ahead of any cross-origin
        // request carrying an Authorization header (every authenticated
        // route here). Answering it with 405 — as the "block writes" branch
        // below would — fails the preflight and silently drops the real
        // request, which starved every `requiresAuth` route's data fetch.
        await request.respond({status: 204, headers: fixtureCorsHeaders()});
      } else if (isApi && url.pathname.endsWith('/auth/refresh')) {
        // The mandatory boot probe (AuthBootBoundary -> bootstrapAuthSession) calls
        // this on every page load before protected content renders. Left to the
        // generic "block writes" branch below, it gets a 405 with no errorCode; since
        // isTerminalRefreshFailure only resolves for errorCode 'ERR_2004', that response
        // is treated as transient and authBootStatus never leaves 'retry' — every
        // requiresAuth route hangs on "Checking authentication...".
        if (route.requiresAuth) {
          await request.respond({
            status: 200,
            contentType: 'application/json',
            headers: fixtureCorsHeaders(),
            body: JSON.stringify({
              status: 200,
              success: true,
              data: { accessToken: PA11Y_ACCESS_TOKEN, tokenType: 'Bearer', user: PA11Y_USER },
            }),
          });
        } else {
          await request.respond({
            status: 401,
            contentType: 'application/json',
            headers: fixtureCorsHeaders(),
            body: JSON.stringify({
              status: 401,
              success: false,
              message: 'No refresh token present',
              errorCode: 'ERR_2004',
              timestamp: '2026-01-01T00:00:00.000Z',
            }),
          });
        }
      } else if (
        isApi &&
        request.method() !== 'GET' &&
        !SAFE_NON_GET_READS.some((pattern) => pattern.test(url.pathname))
      ) {
        await request.respond({
          status: 405,
          contentType: 'application/json',
          headers: fixtureCorsHeaders(),
          body: JSON.stringify({
            status: 405,
            success: false,
            message: 'Pa11y fixture blocks state-changing API requests',
          }),
        });
      } else if (isApi) {
        await request.respond({
          ...responseForApi(url.pathname),
          headers: fixtureCorsHeaders(),
        });
      } else if (url.origin !== config.baseUrl && request.resourceType() === 'image') {
        await request.abort();
      } else {
        await request.continue();
      }
    } catch (error) {
      if (!request.isInterceptResolutionHandled()) throw error;
    }
  });
  return page;
}

function fixtureCorsHeaders() {
  return {
    'access-control-allow-origin': new URL(config.baseUrl).origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type',
  };
}

async function scanRoute(browser, route) {
  const page = await preparePage(browser, route);
  const url = new URL(route.path, config.baseUrl).toString();
  try {
    const results = await pa11y(url, {
      ...config.pa11yOptions,
      browser,
      page,
      actions: [`wait for element ${route.readySelector} to be visible`],
    });
    const actualPath = new URL(results.pageUrl).pathname;
    const expectedPath = new URL(url).pathname;
    if (actualPath !== expectedPath) {
      throw new Error(
        `Expected Pa11y to scan ${expectedPath}, but the app redirected to ${actualPath}`,
      );
    }
    const result = {...results, route: route.path, name: route.name};
    await fs.writeFile(
      path.join(reportDirectory, `${route.name}.html`),
      await htmlReporter.results(results),
      'utf8',
    );
    return result;
  } finally {
    await page.close();
  }
}

async function main() {
  await fs.mkdir(reportDirectory, {recursive: true});
  const browser = await puppeteer.launch({
    headless: true,
    args: isCi ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });

  const results = [];
  let scanFailed = false;
  let budgetExceeded = false;
  try {
    for (const route of config.routes) {
      process.stdout.write(`Pa11y: ${route.path} ... `);
      try {
        const result = await scanRoute(browser, route);
        results.push(result);
        const maxIssues = route.maxIssues ?? 0;
        if (result.issues.length > maxIssues) {
          budgetExceeded = true;
          console.log(
            `${result.issues.length} issue(s) — EXCEEDS budget of ${maxIssues} for "${route.name}"`,
          );
        } else {
          console.log(`${result.issues.length} issue(s) (budget: ${maxIssues})`);
          if (result.issues.length < maxIssues) {
            console.log(
              `  note: "${route.name}" is under budget — consider lowering maxIssues to ${result.issues.length} in e2e/pa11y/config.cjs`,
            );
          }
        }
      } catch (error) {
        scanFailed = true;
        const message = error instanceof Error ? error.stack || error.message : String(error);
        results.push({
          name: route.name,
          route: route.path,
          pageUrl: new URL(route.path, config.baseUrl).toString(),
          issues: [],
          scanError: message,
        });
        await fs.writeFile(
          path.join(reportDirectory, `${route.name}.html`),
          `<!doctype html><html lang="en"><meta charset="utf-8"><title>Pa11y scan failed</title><body><h1>Pa11y scan failed: ${escapeHtml(route.name)}</h1><pre>${escapeHtml(message)}</pre></body></html>`,
          'utf8',
        );
        console.log('scan failed');
      }
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(
    path.join(reportDirectory, 'pa11y-results.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        standard: config.pa11yOptions.standard,
        baseUrl: config.baseUrl,
        results,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Pa11y reports: ${reportDirectory}`);
  if (scanFailed) process.exitCode = 1;
  else if (budgetExceeded) process.exitCode = 2;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

main().catch(async (error) => {
  console.error(error);
  await fs.mkdir(reportDirectory, {recursive: true});
  await fs.writeFile(
    path.join(reportDirectory, 'pa11y-results.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        standard: config.pa11yOptions.standard,
        baseUrl: config.baseUrl,
        fatalError: error instanceof Error ? error.stack || error.message : String(error),
        results: [],
      },
      null,
      2,
    ),
    'utf8',
  );
  process.exitCode = 1;
});

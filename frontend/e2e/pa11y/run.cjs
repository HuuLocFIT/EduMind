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

async function preparePage(browser, route) {
  const page = await browser.newPage();
  if (route.requiresAuth) {
    await page.evaluateOnNewDocument(() => {
      const user = {
        id: 99001,
        username: 'pa11y-student',
        email: 'pa11y@example.invalid',
        firstName: 'Pa11y',
        lastName: 'Student',
        roles: ['STUDENT'],
        isActive: true,
        isEmailVerified: true,
        is2faEnabled: false,
        isTrial: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      localStorage.setItem('accessToken', 'pa11y-local-fixture-token');
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user,
            accessToken: 'pa11y-local-fixture-token',
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
    });
  }
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    const isApi = url.pathname.startsWith('/api/');

    try {
      if (isApi && request.method() !== 'GET') {
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
  try {
    for (const route of config.routes) {
      process.stdout.write(`Pa11y: ${route.path} ... `);
      try {
        const result = await scanRoute(browser, route);
        results.push(result);
        console.log(`${result.issues.length} issue(s)`);
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

  const issueCount = results.reduce((total, result) => total + result.issues.length, 0);
  console.log(`Pa11y reports: ${reportDirectory}`);
  if (scanFailed) process.exitCode = 1;
  else if (issueCount > 0) process.exitCode = 2;
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

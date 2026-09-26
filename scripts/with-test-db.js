#!/usr/bin/env node
require('dotenv').config({ quiet: true });

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

if (!process.env.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL is not set. Add it to your .env file.');
  process.exit(1);
}

const testHost = new URL(process.env.TEST_DATABASE_URL).hostname;

if (!ALLOWED_HOSTS.has(testHost)) {
  console.error(
    `Refusing to run: TEST_DATABASE_URL points at non-local host "${testHost}". ` +
      'It must point at your local Docker Postgres (localhost/127.0.0.1), never a shared or production database.',
  );
  process.exit(1);
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;

const { execSync } = require('child_process');
const command = process.argv.slice(2).join(' ');

execSync(command, { stdio: 'inherit', env: process.env });

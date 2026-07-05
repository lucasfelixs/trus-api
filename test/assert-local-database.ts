const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function assertLocalDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Integration tests must run via "npm run test:integration".',
    );
  }

  const { hostname } = new URL(databaseUrl);

  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to run against non-local database host "${hostname}". ` +
        'Integration tests run destructive TRUNCATE statements and must never target a shared/production database. ' +
        'Run via "npm run test:integration", which points DATABASE_URL at TEST_DATABASE_URL.',
    );
  }
}

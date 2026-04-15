import 'reflect-metadata';

// Provide default environment variables for smoke tests that resolve production bindings
process.env.JIRA_BASE_URL = process.env.JIRA_BASE_URL ?? 'https://test.atlassian.net';
process.env.JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL ?? 'test@example.com';
process.env.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN ?? 'test-token';

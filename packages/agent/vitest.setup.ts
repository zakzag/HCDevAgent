import 'reflect-metadata';

// Provide default environment variables for smoke tests that resolve production bindings
process.env.JIRA_BASE_URL = process.env.JIRA_BASE_URL ?? 'https://test.atlassian.net';
process.env.JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL ?? 'test@example.com';
process.env.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN ?? 'test-token';
process.env.AI_PROVIDER = process.env.AI_PROVIDER ?? 'copilot';
process.env.VERSION_CONTROL_PROVIDER = process.env.VERSION_CONTROL_PROVIDER ?? 'github';
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? 'test-github-token';
process.env.GIT_REPO_URL = process.env.GIT_REPO_URL ?? 'https://github.com/test-owner/test-repo.git';
process.env.GIT_USER_NAME = process.env.GIT_USER_NAME ?? 'Test User';
process.env.GIT_USER_EMAIL = process.env.GIT_USER_EMAIL ?? 'test@example.com';
process.env.WORKSPACE_PATH = process.env.WORKSPACE_PATH ?? process.cwd();

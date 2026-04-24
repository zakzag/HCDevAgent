export const DEFAULT_COPILOT_CLI_BIN = 'copilot';
export const DEFAULT_COPILOT_CLI_TIMEOUT_MS = 180_000;
export const COPILOT_CLI_STDERR_TAIL_BYTES = 2_048;
export const COPILOT_CLI_STDOUT_TAIL_BYTES = 2_048;
export const COPILOT_CLI_LOG_TAIL_BYTES = 4_096;
export const COPILOT_CLI_LOG_WINDOW_MS = 120_000;
export const STRIPPED_COPILOT_ENV_KEYS = [
    'AI_PROVIDER',
    'COPILOT_API_URL',
    'COPILOT_MODEL',
    'COPILOT_CLI_ALLOW_TOOLS',
    'COPILOT_CLI_BIN',
    'COPILOT_CLI_EXTRA_ARGS',
    'COPILOT_CLI_LOG_RAW',
    'COPILOT_CLI_MODEL',
    'COPILOT_CLI_TIMEOUT_MS',
    'COPILOT_CLI_WORKING_DIR',
    'GH_ENTERPRISE_TOKEN',
    'GH_TOKEN',
    'GITHUB_ENTERPRISE_TOKEN',
    'GITHUB_TOKEN',
    'GIT_REPO_URL',
    'GIT_USER_EMAIL',
    'GIT_USER_NAME',
    'JIRA_API_TOKEN',
    'JIRA_BASE_URL',
    'JIRA_PROJECT_KEY',
    'JIRA_USER_EMAIL',
    'MONGODB_DB_NAME',
    'MONGODB_URI',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'VERSION_CONTROL_PROVIDER',
    'WORKSPACE_PATH',
] as const;

/**
 * Header injected into the combined prompt so the CLI treats its input as a
 * pure chat request and does not attempt tool-use, file edits, or questions.
 */
export const COPILOT_CLI_PROMPT_HEADER =
    'You are answering programmatically. Respond ONLY with the assistant answer. '
    + 'Do not call tools. Do not edit files. Do not ask clarifying questions. '
    + 'Do not print status, banners, or session info. Treat the supplied prompt '
    + 'content as the complete context. Do not inspect the workspace, filesystem, '
    + 'or repository instructions.';


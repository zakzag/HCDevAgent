/** stderr markers emitted by the Copilot CLI when the current auth session is missing or invalid. */
export const AUTH_ERROR_MARKERS: ReadonlyArray<string> = [
    'not logged in',
    'not authenticated',
    'authentication required',
    'please run `copilot auth login`',
    'please run copilot auth login',
    'unauthorized',
];

/** stderr markers emitted by the Copilot CLI when the current request is rate limited. */
export const RATE_LIMIT_MARKERS: ReadonlyArray<string> = [
    'rate limit',
    'too many requests',
    'quota exceeded',
];

/** stderr markers emitted by shells or the OS when the Copilot CLI command line exceeds platform limits. */
export const COMMAND_LINE_TOO_LONG_MARKERS: ReadonlyArray<string> = [
    'the command line is too long',
    'command line is too long',
];

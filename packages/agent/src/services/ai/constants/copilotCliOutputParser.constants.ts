// eslint-disable-next-line no-control-regex
export const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
export const BOM_PATTERN = /^\uFEFF/;

/** Spinner frames and status decorations produced by the CLI's progress UI. */
export const STATUS_LINE_PATTERNS: ReadonlyArray<RegExp> = [
    /^\s*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏●◌◍◎○◆◇◈★☆✔✓✖✗✦✧]\s+/u,
    /^\s*(?:thinking|working|running|planning|executing|analyzing|loading|streaming)\b.*$/i,
    /^\s*using\s+model\s*:?.*$/i,
    /^\s*model\s*:\s*\S+\s*$/i,
    /^\s*session\s+(?:id|ended|started).*$/i,
    /^\s*cost\s*:.*$/i,
    /^\s*tokens?\s*:.*$/i,
    /^\s*\[\d+(?:\.\d+)?s]\s*$/i,
    /^\s*(?:done|ok|ready)\.?\s*$/i,
];

export const ASSISTANT_MARKER_PATTERN = /^\s*(?:assistant|answer|response|copilot)\s*[:>]\s*/i;


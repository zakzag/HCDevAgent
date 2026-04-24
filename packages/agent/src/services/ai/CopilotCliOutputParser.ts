/**
 * Diagnostics collected while parsing Copilot CLI output.
 * Exposed to callers so they can log why a result looks unusual,
 * without the parser itself depending on a logger.
 */
export interface CopilotCliParserDiagnostics {
    readonly strippedAnsi: boolean;
    readonly strippedBom: boolean;
    readonly strippedStatusLines: number;
    readonly strippedToolBlocks: number;
    readonly hadAssistantMarker: boolean;
}

/** Result of parsing Copilot CLI stdout. */
export interface CopilotCliParseResult {
    readonly text: string;
    readonly diagnostics: CopilotCliParserDiagnostics;
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const BOM_PATTERN = /^\uFEFF/;

/** Spinner frames and status decorations produced by the CLI's progress UI. */
const STATUS_LINE_PATTERNS: ReadonlyArray<RegExp> = [
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

const ASSISTANT_MARKER_PATTERN = /^\s*(?:assistant|answer|response|copilot)\s*[:>]\s*/i;

const stripAnsi = (value: string): { out: string; changed: boolean } => {
    const out = value.replace(ANSI_PATTERN, '');
    return { out, changed: out !== value };
};

const stripBom = (value: string): { out: string; changed: boolean } => {
    const out = value.replace(BOM_PATTERN, '');
    return { out, changed: out !== value };
};

const normalizeLineEndings = (value: string): string => value.replace(/\r\n?/g, '\n');

const isStatusLine = (line: string): boolean =>
    STATUS_LINE_PATTERNS.some((pattern) => pattern.test(line));

/**
 * Removes CLI tool-invocation blocks. We look for lines like `▶ tool:` or
 * `> tool_use:` and drop everything up to the matching `◀` / `<` terminator
 * or the next blank line.
 */
const stripToolBlocks = (lines: ReadonlyArray<string>): { out: Array<string>; count: number } => {
    const out: Array<string> = [];
    let count = 0;
    let inBlock = false;

    for (const line of lines) {
        if (!inBlock && /^\s*(?:▶|>>|>)\s*tool(?:_use|_call)?\s*[:>]/i.test(line)) {
            inBlock = true;
            count += 1;
            continue;
        }
        if (inBlock) {
            if (line.trim() === '' || /^\s*(?:◀|<<|<)\s*tool(?:_use|_call)?\s*[:>]/i.test(line)) {
                inBlock = false;
            }
            continue;
        }
        out.push(line);
    }

    return { out, count };
};

/**
 * Extracts only the final assistant message if markers are present.
 * If no marker exists, returns the entire input unchanged.
 */
const extractAssistantBlock = (
    lines: ReadonlyArray<string>,
): { out: Array<string>; hadMarker: boolean } => {
    let lastMarkerIndex = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (ASSISTANT_MARKER_PATTERN.test(lines[i] ?? '')) {
            lastMarkerIndex = i;
        }
    }
    if (lastMarkerIndex < 0) {
        return { out: [...lines], hadMarker: false };
    }

    const first = (lines[lastMarkerIndex] ?? '').replace(ASSISTANT_MARKER_PATTERN, '');
    const rest = lines.slice(lastMarkerIndex + 1);
    const out = first.length > 0 ? [first, ...rest] : [...rest];
    return { out, hadMarker: true };
};

const trimBlankEdges = (lines: ReadonlyArray<string>): Array<string> => {
    let start = 0;
    let end = lines.length;
    while (start < end && (lines[start] ?? '').trim() === '') start += 1;
    while (end > start && (lines[end - 1] ?? '').trim() === '') end -= 1;
    return lines.slice(start, end);
};

/**
 * Converts raw Copilot CLI stdout into the assistant's plain-text answer.
 *
 * Pipeline:
 *   1. strip BOM
 *   2. strip ANSI color codes
 *   3. normalize line endings
 *   4. drop tool-invocation blocks
 *   5. drop progress/status lines
 *   6. keep only the last assistant message if markers are present
 *   7. trim leading/trailing blank lines
 *
 * Content inside fenced code blocks (```...```) is preserved verbatim so
 * JSON responses used by investigation / planning / implementation survive
 * untouched.
 */
export const parseCopilotCliOutput = (raw: string): CopilotCliParseResult => {
    const diagnostics = {
        strippedAnsi: false,
        strippedBom: false,
        strippedStatusLines: 0,
        strippedToolBlocks: 0,
        hadAssistantMarker: false,
    };

    const bom = stripBom(raw);
    diagnostics.strippedBom = bom.changed;

    const ansi = stripAnsi(bom.out);
    diagnostics.strippedAnsi = ansi.changed;

    const normalized = normalizeLineEndings(ansi.out);
    const rawLines = normalized.split('\n');

    const tools = stripToolBlocks(rawLines);
    diagnostics.strippedToolBlocks = tools.count;

    const withoutStatus: Array<string> = [];
    let insideFence = false;
    for (const line of tools.out) {
        if (/^\s*```/.test(line)) {
            insideFence = !insideFence;
            withoutStatus.push(line);
            continue;
        }
        if (!insideFence && isStatusLine(line)) {
            diagnostics.strippedStatusLines += 1;
            continue;
        }
        withoutStatus.push(line);
    }

    const assistant = extractAssistantBlock(withoutStatus);
    diagnostics.hadAssistantMarker = assistant.hadMarker;

    const trimmed = trimBlankEdges(assistant.out);

    return {
        text: trimmed.join('\n'),
        diagnostics,
    };
};



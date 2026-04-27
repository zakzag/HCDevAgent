import type { CodeChanges } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for code implementation. */
interface CodeChangesAiResponse {
    readonly filePath: string;
    readonly diff: string;
    readonly language: string;
}

/** Validates that a parsed AI response conforms to the expected code-change shape. */
const isValidCodeResponse = (value: unknown): value is CodeChangesAiResponse => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate['filePath'] === 'string'
        && typeof candidate['diff'] === 'string'
        && typeof candidate['language'] === 'string'
    );
};

/** Strips markdown code fences from an AI JSON response if present. */
const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/** Parses and validates the AI implementation response into CodeChanges. */
export const parseImplementationResponse = (raw: string, context: string): CodeChanges => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;

    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during implementation', {
            context,
            raw: cleaned.slice(0, 500),
        });
    }

    if (!isValidCodeResponse(parsed)) {
        throw new IntegrationError('AI implementation response has unexpected shape', {
            context,
            raw: cleaned.slice(0, 500),
        });
    }

    return {
        filePath: parsed.filePath,
        diff: parsed.diff,
        language: parsed.language,
    };
};


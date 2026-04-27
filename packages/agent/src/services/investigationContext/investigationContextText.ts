import type { Issue } from '@hcdevagent/shared';

const STOP_WORDS = new Set([
    'about', 'after', 'agent', 'build', 'change', 'changes', 'feature', 'from', 'have', 'into', 'issue', 'jira',
    'more', 'need', 'please', 'project', 'should', 'that', 'their', 'there', 'this', 'when', 'with', 'would',
]);

/** Normalizes line endings and trims surrounding whitespace. */
export const normalizeWhitespace = (value: string): string => value.replace(/\r\n/g, '\n').trim();

/** Removes a UTF-8 byte-order mark when present at the beginning of a file. */
export const stripUtf8Bom = (value: string): string => value.replace(/^\uFEFF/, '');

/** Counts how many unique keywords are present in the provided string. */
export const countKeywordHits = (value: string, keywords: ReadonlyArray<string>): number => {
    const lower = value.toLowerCase();
    return keywords.reduce((count, keyword) => count + (lower.includes(keyword) ? 1 : 0), 0);
};

/** Extracts up to twenty distinct investigation keywords from issue text and comments. */
export const extractKeywords = (issue: Issue): Array<string> => {
    const source = [issue.summary, issue.description, issue.labels.join(' '), ...issue.comments.map((comment) => comment.body)]
        .join(' ')
        .toLowerCase();

    const seen = new Set<string>();
    return source
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
        .filter((token) => {
            if (seen.has(token)) {
                return false;
            }

            seen.add(token);
            return true;
        })
        .slice(0, 20);
};

/**
 * Extracts a bounded snippet that prioritizes lines around matching keywords.
 * Falls back to the first lines of the file when no keyword match is found.
 */
export const extractRelevantSnippet = (content: string, keywords: ReadonlyArray<string>, maxChars: number): string => {
    const normalized = normalizeWhitespace(content);
    if (normalized.length <= maxChars) {
        return normalized;
    }

    const lines = normalized.split('\n');
    const selectedIndexes = new Set<number>();
    for (let index = 0; index < lines.length; index += 1) {
        const lower = lines[index].toLowerCase();
        if (!keywords.some((keyword) => lower.includes(keyword))) {
            continue;
        }

        for (let offset = -1; offset <= 1; offset += 1) {
            const candidateIndex = index + offset;
            if (candidateIndex >= 0 && candidateIndex < lines.length) {
                selectedIndexes.add(candidateIndex);
            }
        }
    }

    const chosenLines = selectedIndexes.size > 0
        ? [...selectedIndexes].sort((left, right) => left - right).map((index) => lines[index])
        : lines.slice(0, Math.max(1, Math.floor(maxChars / 80)));
    const snippet = chosenLines.join('\n').slice(0, maxChars);
    return snippet.trim();
};


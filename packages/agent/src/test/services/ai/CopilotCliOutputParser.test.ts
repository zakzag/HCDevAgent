import { describe, it, expect } from 'vitest';
import { parseCopilotCliOutput } from '../../../services/ai/CopilotCliOutputParser.js';

describe('parseCopilotCliOutput', () => {
    it('returns plain text unchanged', () => {
        const result = parseCopilotCliOutput('Hello world');
        expect(result.text).toBe('Hello world');
        expect(result.diagnostics.strippedAnsi).toBe(false);
        expect(result.diagnostics.strippedBom).toBe(false);
        expect(result.diagnostics.strippedStatusLines).toBe(0);
        expect(result.diagnostics.strippedToolBlocks).toBe(0);
    });

    it('strips UTF-8 BOM', () => {
        const result = parseCopilotCliOutput('\uFEFFHello');
        expect(result.text).toBe('Hello');
        expect(result.diagnostics.strippedBom).toBe(true);
    });

    it('strips ANSI color codes', () => {
        const ansiText = '\u001B[31mred\u001B[0m and \u001B[1mbold\u001B[0m';
        const result = parseCopilotCliOutput(ansiText);
        expect(result.text).toBe('red and bold');
        expect(result.diagnostics.strippedAnsi).toBe(true);
    });

    it('normalizes CRLF line endings', () => {
        const result = parseCopilotCliOutput('line1\r\nline2\r\nline3');
        expect(result.text).toBe('line1\nline2\nline3');
    });

    it('strips spinner/status lines but keeps content', () => {
        const raw = [
            '⠋ thinking...',
            'Using model: gpt-5.4',
            'Here is your answer.',
            'Second line.',
            'Session ended.',
        ].join('\n');
        const result = parseCopilotCliOutput(raw);
        expect(result.text).toBe('Here is your answer.\nSecond line.');
        expect(result.diagnostics.strippedStatusLines).toBeGreaterThan(0);
    });

    it('preserves content inside fenced code blocks verbatim', () => {
        const raw = [
            '⠋ working',
            '```json',
            '{ "ready": true, "descriptionForAi": "…" }',
            '```',
            'Done.',
        ].join('\n');
        const result = parseCopilotCliOutput(raw);
        expect(result.text).toContain('```json');
        expect(result.text).toContain('"ready": true');
        expect(result.text).toContain('```');
    });

    it('does not strip status-like content inside fenced code blocks', () => {
        const raw = ['```', 'Using model: gpt-5.4', 'thinking hard here', '```'].join('\n');
        const result = parseCopilotCliOutput(raw);
        expect(result.text).toContain('Using model: gpt-5.4');
        expect(result.text).toContain('thinking hard here');
    });

    it('removes tool-invocation blocks', () => {
        const raw = [
            'Intro line',
            '▶ tool: read_file',
            '  path: foo.ts',
            '',
            'Final answer.',
        ].join('\n');
        const result = parseCopilotCliOutput(raw);
        expect(result.text).toContain('Intro line');
        expect(result.text).toContain('Final answer.');
        expect(result.text).not.toContain('read_file');
        expect(result.diagnostics.strippedToolBlocks).toBe(1);
    });

    it('keeps only the last assistant block when markers are present', () => {
        const raw = [
            'user: hi',
            'assistant: first draft',
            'assistant: final answer line 1',
            'final answer line 2',
        ].join('\n');
        const result = parseCopilotCliOutput(raw);
        expect(result.diagnostics.hadAssistantMarker).toBe(true);
        expect(result.text).toBe('final answer line 1\nfinal answer line 2');
    });

    it('trims leading and trailing blank lines', () => {
        const result = parseCopilotCliOutput('\n\n  \nHello\n\n');
        expect(result.text).toBe('Hello');
    });

    it('handles empty input', () => {
        const result = parseCopilotCliOutput('');
        expect(result.text).toBe('');
    });

    it('handles multibyte unicode content', () => {
        const result = parseCopilotCliOutput('árvíztűrő tükörfúrógép 🚀');
        expect(result.text).toBe('árvíztűrő tükörfúrógép 🚀');
    });
});


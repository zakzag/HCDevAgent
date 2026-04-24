import { describe, expect, it } from 'vitest';
import type { Issue } from '@hcdevagent/shared';
import {
    countKeywordHits,
    extractKeywords,
    extractRelevantSnippet,
    normalizeWhitespace,
    stripUtf8Bom,
} from '../../services/investigationContext/investigationContextText.js';

const createIssue = (): Issue => ({
    id: '1',
    key: 'TEST-1',
    summary: 'Implement auth middleware for dashboard login',
    description: 'Please add auth middleware and session validation for the dashboard.',
    status: 'Issue Investigation',
    assignee: null,
    labels: ['backend', 'authentication'],
    comments: [{ id: 'c1', body: 'Middleware should protect dashboard routes.', author: 'Test User', createdAt: '2026-01-01T00:00:00Z' }],
    customFields: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
});

describe('investigationContextText', () => {
    it('normalizes BOM-prefixed text and counts keyword matches case-insensitively', () => {
        const normalized = normalizeWhitespace(stripUtf8Bom('\uFEFFline one\r\nline two\r\n'));

        expect(normalized).toBe('line one\nline two');
        expect(countKeywordHits('Auth middleware for DASHBOARD', ['auth', 'dashboard', 'billing'])).toBe(2);
    });

    it('extracts distinct issue keywords while removing stop words', () => {
        const result = extractKeywords(createIssue());

        expect(result).toContain('auth');
        expect(result).toContain('middleware');
        expect(result).toContain('dashboard');
        expect(result).not.toContain('please');
        expect(new Set(result).size).toBe(result.length);
    });

    it('prefers lines around keyword matches when building snippets', () => {
        const content = [
            'line 1',
            'export const createHealthRoute = () => true;',
            'line 3',
            'export const createAuthRoute = () => true;',
            'const authMiddleware = () => true;',
            'line 6',
        ].join('\n');

        const result = extractRelevantSnippet(content, ['auth'], 120);

        expect(result).toContain('line 3');
        expect(result).toContain('createAuthRoute');
        expect(result).toContain('authMiddleware');
        expect(result).not.toContain('createHealthRoute');
    });

    it('falls back to the first lines when no keywords match', () => {
        const content = 'first line\nsecond line\nthird line\nfourth line';

        expect(extractRelevantSnippet(content, ['auth'], 20)).toBe('first line');
    });
});



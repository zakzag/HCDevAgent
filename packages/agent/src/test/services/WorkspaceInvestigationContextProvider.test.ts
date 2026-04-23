import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ConfigProvider, Issue, Logger } from '@hcdevagent/shared';
import { WorkspaceInvestigationContextProvider } from '../../services/investigationContext/WorkspaceInvestigationContextProvider.js';

const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

const createConfigProvider = (workspacePath: string): ConfigProvider => ({
    getRequired: vi.fn().mockImplementation((key: string) => {
        if (key === 'WORKSPACE_PATH') {
            return workspacePath;
        }

        throw new Error(`Unexpected config key: ${key}`);
    }),
    getOptional: vi.fn().mockReturnValue(undefined),
    getRequiredNumber: vi.fn().mockReturnValue(0),
    getOptionalNumber: vi.fn().mockReturnValue(undefined),
});

const testIssue: Issue = {
    id: '1',
    key: 'TEST-1',
    summary: 'Add auth endpoint',
    description: 'Implement auth endpoint and middleware',
    status: 'Issue Investigation',
    assignee: null,
    labels: ['backend'],
    comments: [],
    customFields: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

describe('WorkspaceInvestigationContextProvider', () => {
    let tempWorkspace: string;

    beforeEach(async () => {
        tempWorkspace = await mkdtemp(join(tmpdir(), 'hcdevagent-investigation-'));
    });

    afterEach(async () => {
        await rm(tempWorkspace, { recursive: true, force: true });
    });

    it('loads project description, settings, and relevant code chunks from the workspace', async () => {
        await mkdir(join(tempWorkspace, '.agent'), { recursive: true });
        await mkdir(join(tempWorkspace, 'src'), { recursive: true });
        await writeFile(join(tempWorkspace, '.agent', 'project-description.md'), '# Demo API\n\nAuthentication API.');
        await writeFile(
            join(tempWorkspace, '.agent', 'project-settings.json'),
            JSON.stringify({
                schemaVersion: 1,
                investigator: {
                    projectDescriptionFile: '.agent/project-description.md',
                    contextCollection: {
                        includeExtensions: ['.ts', '.md', '.json'],
                        excludeDirectories: ['node_modules', '.git', '.agent'],
                        alwaysIncludeFiles: ['README.md'],
                        maxFiles: 3,
                        maxFileChars: 500,
                        maxTotalChars: 1_500,
                        maxCandidateFiles: 20,
                    },
                    autoFixability: {
                        minimumScore: 80,
                        minimumMetricScore: 60,
                        blockingMetrics: ['dependencyConfidence'],
                        riskyPathPatterns: ['src/server.ts'],
                        humanReviewLabels: ['security-sensitive'],
                        weights: {
                            acceptanceCriteriaCoverage: 0.2,
                            reproductionClarity: 0.1,
                            codeContextCoverage: 0.15,
                            changeLocality: 0.1,
                            dependencyConfidence: 0.15,
                            testability: 0.1,
                            blastRadiusConfidence: 0.1,
                            humanDecisionIndependence: 0.1,
                        },
                    },
                },
                planner: { notes: ['Planner note'] },
                implementer: { notes: ['Implementer note'] },
            }),
        );
        await writeFile(join(tempWorkspace, 'README.md'), '# Workspace README');
        await writeFile(
            join(tempWorkspace, 'src', 'auth.ts'),
            'export const buildAuthRoute = () => ({ path: "/auth" });\nexport const authMiddleware = () => true;\n',
        );
        await writeFile(join(tempWorkspace, 'src', 'health.ts'), 'export const health = () => "ok";\n');

        const provider = new WorkspaceInvestigationContextProvider(
            createConfigProvider(tempWorkspace),
            createMockLogger(),
        );

        const result = await provider.loadContext(testIssue);

        expect(result.contextUsed.projectDescription).toContain('Authentication API');
        expect(result.contextUsed.codeChunksContext).toContain('src/auth.ts');
        expect(result.contextUsed.relevantFiles).toContain('src/auth.ts');
        expect(result.automationSettings.minimumScore).toBe(80);
    });

    it('falls back to README when the project description file is missing', async () => {
        await mkdir(join(tempWorkspace, '.agent'), { recursive: true });
        await mkdir(join(tempWorkspace, 'src'), { recursive: true });
        await writeFile(join(tempWorkspace, 'README.md'), '# README fallback\n\nUse this project to test agent changes.');
        await writeFile(join(tempWorkspace, 'src', 'auth.ts'), 'export const auth = true;\n');

        const provider = new WorkspaceInvestigationContextProvider(
            createConfigProvider(tempWorkspace),
            createMockLogger(),
        );

        const result = await provider.loadContext(testIssue);

        expect(result.contextUsed.projectDescription).toContain('README fallback');
    });

    it('falls back to default settings when the settings file is invalid JSON', async () => {
        const logger = createMockLogger();
        await mkdir(join(tempWorkspace, '.agent'), { recursive: true });
        await mkdir(join(tempWorkspace, 'src'), { recursive: true });
        await writeFile(join(tempWorkspace, '.agent', 'project-settings.json'), '{ invalid json');
        await writeFile(join(tempWorkspace, 'README.md'), '# README fallback');
        await writeFile(join(tempWorkspace, 'src', 'auth.ts'), 'export const auth = true;\n');

        const provider = new WorkspaceInvestigationContextProvider(
            createConfigProvider(tempWorkspace),
            logger,
        );

        const result = await provider.loadContext(testIssue);

        expect(result.automationSettings.minimumScore).toBe(72);
        expect(logger.warn).toHaveBeenCalled();
    });

    it('accepts a settings file prefixed with a UTF-8 BOM', async () => {
        await mkdir(join(tempWorkspace, '.agent'), { recursive: true });
        await mkdir(join(tempWorkspace, 'src'), { recursive: true });
        await writeFile(
            join(tempWorkspace, '.agent', 'project-settings.json'),
            `\uFEFF${JSON.stringify({
                schemaVersion: 1,
                investigator: {
                    projectDescriptionFile: '.agent/project-description.md',
                    contextCollection: {
                        includeExtensions: ['.ts'],
                        excludeDirectories: ['.agent', 'node_modules', '.git'],
                        alwaysIncludeFiles: [],
                        maxFiles: 2,
                        maxFileChars: 500,
                        maxTotalChars: 1_000,
                        maxCandidateFiles: 10,
                    },
                    autoFixability: {
                        minimumScore: 81,
                        minimumMetricScore: 61,
                        blockingMetrics: ['dependencyConfidence'],
                        riskyPathPatterns: [],
                        humanReviewLabels: [],
                        weights: {
                            acceptanceCriteriaCoverage: 0.2,
                            reproductionClarity: 0.1,
                            codeContextCoverage: 0.15,
                            changeLocality: 0.1,
                            dependencyConfidence: 0.15,
                            testability: 0.1,
                            blastRadiusConfidence: 0.1,
                            humanDecisionIndependence: 0.1,
                        },
                    },
                },
                planner: { notes: [] },
                implementer: { notes: [] },
            })}`,
        );
        await writeFile(join(tempWorkspace, 'README.md'), '# README fallback');
        await writeFile(join(tempWorkspace, 'src', 'auth.ts'), 'export const auth = true;\n');

        const provider = new WorkspaceInvestigationContextProvider(
            createConfigProvider(tempWorkspace),
            createMockLogger(),
        );

        const result = await provider.loadContext(testIssue);

        expect(result.automationSettings.minimumScore).toBe(81);
    });
});


import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceInvestigationContextProvider } from '../../services/investigationContext/index.js';
import { createMockLogger } from '../mocks/createMockLogger.js';
import { createMockConfigProvider } from '../mocks/createMockConfigProvider.js';

const testIssue = {
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

    const createProvider = (workspacePath: string, logger = createMockLogger()): WorkspaceInvestigationContextProvider => new WorkspaceInvestigationContextProvider(
        createMockConfigProvider({ WORKSPACE_PATH: workspacePath }),
        logger,
    );

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

        const provider = createProvider(tempWorkspace);

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

        const provider = createProvider(tempWorkspace);

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

        const provider = createProvider(tempWorkspace, logger);

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

        const provider = createProvider(tempWorkspace);

        const result = await provider.loadContext(testIssue);

        expect(result.automationSettings.minimumScore).toBe(81);
    });

    it('prioritizes always-include files even when traversal reaches the candidate limit first', async () => {
        await mkdir(join(tempWorkspace, '.agent'), { recursive: true });
        await mkdir(join(tempWorkspace, 'src'), { recursive: true });
        await writeFile(
            join(tempWorkspace, '.agent', 'project-settings.json'),
            JSON.stringify({
                schemaVersion: 1,
                investigator: {
                    projectDescriptionFile: '.agent/project-description.md',
                    contextCollection: {
                        includeExtensions: ['.ts'],
                        excludeDirectories: ['node_modules', '.git'],
                        alwaysIncludeFiles: ['README.md'],
                        maxFiles: 10,
                        maxFileChars: 500,
                        maxTotalChars: 5_000,
                        maxCandidateFiles: 10,
                    },
                    autoFixability: {
                        minimumScore: 72,
                        minimumMetricScore: 55,
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
            }),
        );
        await writeFile(join(tempWorkspace, 'README.md'), '# Important context');
        await Promise.all(
            Array.from({ length: 12 }, async (_, index) => writeFile(
                join(tempWorkspace, 'src', `file-${String(index).padStart(2, '0')}.ts`),
                `export const file${index} = true;\n`,
            )),
        );

        const provider = createProvider(tempWorkspace);

        const result = await provider.loadContext(testIssue);

        expect(result.contextUsed.relevantFiles).toContain('README.md');
        expect(result.contextUsed.relevantFiles).not.toContain('src/file-10.ts');
        expect(result.contextUsed.codeChunksContext).toContain('File: README.md');
    });

    it('returns an empty code context and logs a warning when the workspace cannot be read', async () => {
        const logger = createMockLogger();
        const provider = createProvider(tempWorkspace, logger);
        await rm(tempWorkspace, { recursive: true, force: true });

        const result = await provider.loadContext(testIssue);

        expect(result.contextUsed.projectDescription).toBe('Project description was not found in the configured workspace.');
        expect(result.contextUsed.codeChunksContext).toBe('No relevant repository code chunks were found for this issue.');
        expect(result.contextUsed.relevantFiles).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
            'Unable to read workspace while collecting investigation context files',
            expect.objectContaining({ directoryPath: tempWorkspace }),
        );
    });
});


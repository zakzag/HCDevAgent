import { describe, expect, it } from 'vitest';
import {
    DEFAULT_PROJECT_SETTINGS,
    formatInvestigatorSettingsContext,
    parseProjectSettings,
} from '../../services/investigationContext/index.js';

describe('projectSettings', () => {
    it('returns independent default settings when the input document is missing', () => {
        const result = parseProjectSettings(undefined);

        expect(result).toEqual(DEFAULT_PROJECT_SETTINGS);
        expect(result).not.toBe(DEFAULT_PROJECT_SETTINGS);
        expect(result.investigator.contextCollection).not.toBe(DEFAULT_PROJECT_SETTINGS.investigator.contextCollection);
        expect(result.investigator.autoFixability).not.toBe(DEFAULT_PROJECT_SETTINGS.investigator.autoFixability);
    });

    it('clamps numeric values and filters invalid array entries in nested settings', () => {
        const result = parseProjectSettings({
            schemaVersion: 0,
            investigator: {
                projectDescriptionFile: 'docs/project.md',
                contextCollection: {
                    includeExtensions: ['.ts', '', 42],
                    excludeDirectories: ['dist', null],
                    alwaysIncludeFiles: ['README.md', ''],
                    maxFiles: 999,
                    maxFileChars: 100,
                    maxTotalChars: 999_999,
                    maxCandidateFiles: 5,
                },
                autoFixability: {
                    minimumScore: -5,
                    minimumMetricScore: 150,
                    blockingMetrics: ['dependencyConfidence', 'not-real'],
                    riskyPathPatterns: ['src/server.ts', ''],
                    humanReviewLabels: ['security-sensitive', ''],
                    weights: {
                        acceptanceCriteriaCoverage: 2,
                        reproductionClarity: -1,
                        codeContextCoverage: 0.25,
                        changeLocality: 0.5,
                        dependencyConfidence: 0.75,
                        testability: 0.4,
                        blastRadiusConfidence: 0.3,
                        humanDecisionIndependence: 0.2,
                    },
                },
            },
            planner: {
                notes: ['Keep plans aligned', ''],
            },
            implementer: {
                notes: ['Expand tests first', ''],
            },
        });

        expect(result.schemaVersion).toBe(1);
        expect(result.investigator.projectDescriptionFile).toBe('docs/project.md');
        expect(result.investigator.contextCollection).toEqual({
            includeExtensions: ['.ts'],
            excludeDirectories: ['dist'],
            alwaysIncludeFiles: ['README.md'],
            maxFiles: 20,
            maxFileChars: 200,
            maxTotalChars: 50_000,
            maxCandidateFiles: 10,
        });
        expect(result.investigator.autoFixability).toEqual({
            minimumScore: 0,
            minimumMetricScore: 100,
            blockingMetrics: ['dependencyConfidence'],
            riskyPathPatterns: ['src/server.ts'],
            humanReviewLabels: ['security-sensitive'],
            weights: {
                acceptanceCriteriaCoverage: 1,
                reproductionClarity: 0,
                codeContextCoverage: 0.25,
                changeLocality: 0.5,
                dependencyConfidence: 0.75,
                testability: 0.4,
                blastRadiusConfidence: 0.3,
                humanDecisionIndependence: 0.2,
            },
        });
        expect(result.planner.notes).toEqual(['Keep plans aligned']);
        expect(result.implementer.notes).toEqual(['Expand tests first']);
    });

    it('renders the investigator settings into a prompt-friendly summary', () => {
        const result = formatInvestigatorSettingsContext(DEFAULT_PROJECT_SETTINGS.investigator);

        expect(result).toContain('Investigator settings:');
        expect(result).toContain('- Minimum auto-fix score: 72');
        expect(result).toContain('- Blocking metrics: dependencyConfidence, blastRadiusConfidence, humanDecisionIndependence');
        expect(result).toContain('- Context max files: 6');
        expect(result).toContain('- Context max file chars: 1800');
    });
});



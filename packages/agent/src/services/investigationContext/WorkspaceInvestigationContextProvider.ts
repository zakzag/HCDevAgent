import { inject, injectable } from 'inversify';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import type {
    ConfigProvider,
    Issue,
    InvestigationContextProvider,
    Logger,
    PreparedInvestigationContext,
} from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import {
    formatInvestigatorSettingsContext,
    parseProjectSettings,
    type InvestigatorContextCollectionSettings,
    type ProjectSettings,
} from './projectSettings.js';

interface CandidateFile {
    readonly path: string;
    readonly score: number;
    readonly snippet: string;
}

interface CollectedCodeChunks {
    readonly codeChunksContext: string;
    readonly relevantFiles: ReadonlyArray<string>;
}

const STOP_WORDS = new Set([
    'about', 'after', 'agent', 'build', 'change', 'changes', 'feature', 'from', 'have', 'into', 'issue', 'jira',
    'more', 'need', 'please', 'project', 'should', 'that', 'their', 'there', 'this', 'when', 'with', 'would',
]);

const isTextLikeFile = (filePath: string, settings: InvestigatorContextCollectionSettings): boolean =>
    settings.includeExtensions.includes(extname(filePath).toLowerCase()) || settings.alwaysIncludeFiles.includes(filePath);

const normalizeWhitespace = (value: string): string => value.replace(/\r\n/g, '\n').trim();

const stripUtf8Bom = (value: string): string => value.replace(/^\uFEFF/, '');

const countKeywordHits = (value: string, keywords: ReadonlyArray<string>): number => {
    const lower = value.toLowerCase();
    return keywords.reduce((count, keyword) => count + (lower.includes(keyword) ? 1 : 0), 0);
};

const extractKeywords = (issue: Issue): Array<string> => {
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

const extractRelevantSnippet = (content: string, keywords: ReadonlyArray<string>, maxChars: number): string => {
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

    const chosenLines = (selectedIndexes.size > 0
        ? [...selectedIndexes].sort((left, right) => left - right).map((index) => lines[index])
        : lines.slice(0, Math.max(1, Math.floor(maxChars / 80))));
    const snippet = chosenLines.join('\n').slice(0, maxChars);
    return snippet.trim();
};

/**
 * Loads investigation prompt context from the configured project workspace.
 * It combines a project description, repo-specific investigator settings, and relevant code snippets.
 */
@injectable()
export class WorkspaceInvestigationContextProvider implements InvestigationContextProvider {
    private readonly workspacePath: string;

    private settingsPromise: Promise<ProjectSettings> | null = null;

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
    ) {
        this.workspacePath = configProvider.getRequired('WORKSPACE_PATH');
    }

    /** Builds the complete prepared investigation context for a Jira issue. */
    public async loadContext(issue: Issue): Promise<PreparedInvestigationContext> {
        const settings = await this.getProjectSettings();
        const projectDescription = await this.getProjectDescription(settings);
        const codeChunks = await this.collectCodeChunks(issue, settings);

        return {
            contextUsed: {
                projectDescription,
                codeChunksContext: codeChunks.codeChunksContext,
                investigatorSettingsContext: formatInvestigatorSettingsContext(settings.investigator),
                relevantFiles: codeChunks.relevantFiles,
            },
            automationSettings: settings.investigator.autoFixability,
        };
    }

    private async getProjectSettings(): Promise<ProjectSettings> {
        if (this.settingsPromise !== null) {
            return this.settingsPromise;
        }

        this.settingsPromise = (async () => {
            const settingsPath = join(this.workspacePath, '.agent', 'project-settings.json');
            try {
                const raw = await readFile(settingsPath, 'utf8');
                const normalized = stripUtf8Bom(raw);
                return parseProjectSettings(JSON.parse(normalized) as unknown);
            } catch (error) {
                this.logger.warn('Falling back to default project settings for investigation context', {
                    workspacePath: this.workspacePath,
                    settingsPath,
                    error: error instanceof Error ? error.message : String(error),
                });
                return parseProjectSettings(undefined);
            }
        })();

        return this.settingsPromise;
    }

    private async getProjectDescription(settings: ProjectSettings): Promise<string> {
        const configuredPath = join(this.workspacePath, settings.investigator.projectDescriptionFile);
        try {
            const raw = await readFile(configuredPath, 'utf8');
            return normalizeWhitespace(raw);
        } catch {
            const fallbackPath = join(this.workspacePath, 'README.md');
            try {
                const fallback = await readFile(fallbackPath, 'utf8');
                return normalizeWhitespace(fallback);
            } catch {
                return 'Project description was not found in the configured workspace.';
            }
        }
    }

    private async collectCodeChunks(issue: Issue, settings: ProjectSettings): Promise<CollectedCodeChunks> {
        const keywords = extractKeywords(issue);
        const candidates = await this.collectCandidateFiles('', settings.investigator.contextCollection, []);
        const scoredFiles: Array<CandidateFile> = [];

        for (const filePath of candidates) {
            try {
                const absolutePath = join(this.workspacePath, filePath);
                const content = await readFile(absolutePath, 'utf8');
                const score = countKeywordHits(filePath, keywords) * 3 + countKeywordHits(content, keywords);
                const isAlwaysIncluded = settings.investigator.contextCollection.alwaysIncludeFiles.includes(filePath);
                if (score === 0 && !isAlwaysIncluded) {
                    continue;
                }

                scoredFiles.push({
                    path: filePath,
                    score: score + (isAlwaysIncluded ? 1 : 0),
                    snippet: extractRelevantSnippet(content, keywords, settings.investigator.contextCollection.maxFileChars),
                });
            } catch (error) {
                this.logger.debug('Skipping unreadable workspace file during investigation context collection', {
                    filePath,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        scoredFiles.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));

        const limitedFiles: Array<CandidateFile> = [];
        let totalChars = 0;
        for (const candidate of scoredFiles) {
            if (limitedFiles.length >= settings.investigator.contextCollection.maxFiles) {
                break;
            }

            const nextTotal = totalChars + candidate.snippet.length;
            if (nextTotal > settings.investigator.contextCollection.maxTotalChars && limitedFiles.length > 0) {
                break;
            }

            limitedFiles.push(candidate);
            totalChars = nextTotal;
        }

        if (limitedFiles.length === 0) {
            return {
                codeChunksContext: 'No relevant repository code chunks were found for this issue.',
                relevantFiles: [],
            };
        }

        return {
            codeChunksContext: limitedFiles
                .map((file) => `File: ${file.path}\n\`\`\`\n${file.snippet}\n\`\`\``)
                .join('\n\n'),
            relevantFiles: limitedFiles.map((file) => file.path),
        };
    }

    private async collectCandidateFiles(
        relativeDirectory: string,
        settings: InvestigatorContextCollectionSettings,
        collected: Array<string>,
    ): Promise<Array<string>> {
        if (collected.length >= settings.maxCandidateFiles) {
            return collected;
        }

        const absoluteDirectory = join(this.workspacePath, relativeDirectory);
        const entries = await readdir(absoluteDirectory, { withFileTypes: true });
        for (const entry of entries) {
            const relativePath = relative(join(this.workspacePath), join(absoluteDirectory, entry.name)).replace(/\\/g, '/');
            if (entry.isDirectory()) {
                if (settings.excludeDirectories.includes(entry.name)) {
                    continue;
                }

                await this.collectCandidateFiles(relativePath, settings, collected);
                if (collected.length >= settings.maxCandidateFiles) {
                    break;
                }
                continue;
            }

            if (!isTextLikeFile(relativePath, settings)) {
                continue;
            }

            collected.push(relativePath);
            if (collected.length >= settings.maxCandidateFiles) {
                break;
            }
        }

        return collected;
    }
}



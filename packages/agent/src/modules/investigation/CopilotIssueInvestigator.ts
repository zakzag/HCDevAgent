import { injectable, inject } from 'inversify';
import type {
    AiClient,
    IssueInvestigator,
    Issue,
    InvestigationResult,
    QualityReport,
    Logger,
    PromptRegistry,
} from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for investigation. */
interface InvestigationAiResponse {
    readonly ready: boolean;
    readonly descriptionForAi: string | null;
    readonly clarificationQuestions: ReadonlyArray<string> | null;
    readonly qualityReport: {
        readonly clarity: { readonly passed: boolean; readonly summary: string };
        readonly completeness: { readonly passed: boolean; readonly summary: string };
        readonly ambiguity: { readonly passed: boolean; readonly summary: string };
        readonly specificity: { readonly passed: boolean; readonly summary: string };
        readonly conflictDetection: { readonly passed: boolean; readonly summary: string };
        readonly scope: { readonly passed: boolean; readonly summary: string };
    };
}

/**
 * Builds the pre-formatted comments section string for the user prompt template.
 * Returns an empty string when there are no comments.
 */
const buildCommentsSection = (issue: Issue): string => {
    if (issue.comments.length === 0) return '';
    const lines = ['\n\nComments:'];
    for (const comment of issue.comments) {
        lines.push(`  [${comment.author}]: ${comment.body}`);
    }
    return lines.join('\n');
};

/**
 * Builds the pre-formatted related issues section string for the user prompt template.
 * Returns an empty string when there are no related issues.
 */
const buildRelatedIssuesSection = (relatedIssues?: ReadonlyArray<Issue>): string => {
    if (!relatedIssues || relatedIssues.length === 0) return '';
    const lines = ['\n\nRelated Issues:'];
    for (const related of relatedIssues) {
        lines.push(`  ${related.key}: ${related.summary}`);
    }

    return lines.join('\n');
};

/**
 * Strips markdown code fences (```json ... ```) from a string if present.
 * AI models sometimes wrap JSON in fences despite being told not to.
 */
const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/**
 * Validates that a parsed AI response conforms to InvestigationAiResponse.
 */
const isValidAiResponse = (value: unknown): value is InvestigationAiResponse => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    if (typeof v['ready'] !== 'boolean') return false;
    if (typeof v['qualityReport'] !== 'object' || v['qualityReport'] === null) return false;
    const qr = v['qualityReport'] as Record<string, unknown>;
    const dims = ['clarity', 'completeness', 'ambiguity', 'specificity', 'conflictDetection', 'scope'];
    return dims.every((dim) => {
        const d = qr[dim] as Record<string, unknown> | undefined;
        return d !== undefined && typeof d['passed'] === 'boolean' && typeof d['summary'] === 'string';
    });
};

/**
 * Investigates a Jira issue using the configured AI client.
 * Evaluates quality dimensions and produces a structured "Description For AI"
 * used by the Planning phase, or returns clarification questions if the issue
 * is not ready.
 */
@injectable()
export class CopilotIssueInvestigator implements IssueInvestigator {
    public constructor(
        @inject(SYMBOLS.AiClient) private readonly aiClient: AiClient,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.PromptRegistry) private readonly prompts: PromptRegistry,
    ) {}

    /** Analyses the issue and returns an InvestigationResult. */
    public async investigate(issue: Issue, relatedIssues?: ReadonlyArray<Issue>): Promise<InvestigationResult> {
        this.logger.debug('Investigating issue', { issueKey: issue.key });

        const systemPrompt = this.prompts.getPrompt('investigation.system', {});
        const userPrompt = this.prompts.getPrompt('investigation.user', {
            issueKey: issue.key,
            summary: issue.summary,
            description: issue.description || '(no description)',
            status: issue.status,
            labels: issue.labels.join(', ') || 'none',
            commentsSection: buildCommentsSection(issue),
            relatedIssuesSection: buildRelatedIssuesSection(relatedIssues),
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt);
        const cleaned = stripCodeFences(raw);

        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new IntegrationError('AI returned invalid JSON during investigation', {
                issueKey: issue.key,
                raw: cleaned.slice(0, 500),
            });
        }

        if (!isValidAiResponse(parsed)) {
            throw new IntegrationError('AI investigation response has unexpected shape', {
                issueKey: issue.key,
                raw: cleaned.slice(0, 500),
            });
        }

        const qualityReport: QualityReport = {
            clarity: parsed.qualityReport.clarity,
            completeness: parsed.qualityReport.completeness,
            ambiguity: parsed.qualityReport.ambiguity,
            specificity: parsed.qualityReport.specificity,
            conflictDetection: parsed.qualityReport.conflictDetection,
            scope: parsed.qualityReport.scope,
        };

        this.logger.debug('Investigation complete', {
            issueKey: issue.key,
            ready: parsed.ready,
        });

        return {
            ready: parsed.ready,
            descriptionForAi: parsed.descriptionForAi ?? null,
            clarificationQuestions: parsed.clarificationQuestions ?? null,
            qualityReport,
        };
    }
}


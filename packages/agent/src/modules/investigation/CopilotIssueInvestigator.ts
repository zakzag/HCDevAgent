import { injectable, inject } from 'inversify';
import type {
    AiClient,
    IssueInvestigator,
    Issue,
    InvestigationResult,
    QualityReport,
    InvestigationContextProvider,
    Logger,
    PromptRegistry,
} from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import { buildCommentsSection, buildRelatedIssuesSection } from './investigationPromptSections.js';
import { parseInvestigationResponse } from './parseInvestigationResponse.js';
import { scoreAutoFixability } from './scoreAutoFixability.js';
import { detectInvestigationBypass, buildBypassedInvestigationResult } from './investigationBypass.js';


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
        @inject(SYMBOLS.InvestigationContextProvider)
        private readonly contextProvider: InvestigationContextProvider,
    ) {}

    /** Analyses the issue and returns an InvestigationResult. */
    public async investigate(issue: Issue, relatedIssues?: ReadonlyArray<Issue>): Promise<InvestigationResult> {
        this.logger.debug('Investigating issue', { issueKey: issue.key });

        const preparedContext = await this.contextProvider.loadContext(issue);

        const bypassResult = detectInvestigationBypass(issue, preparedContext.bypassSettings);
        if (bypassResult.bypassed) {
            this.logger.info('Investigation bypassed by human instruction comment', {
                issueKey: issue.key,
                bypassCommentId: bypassResult.triggeringComment.id,
                bypassCommentAuthor: bypassResult.triggeringComment.author,
            });
            return buildBypassedInvestigationResult(
                issue,
                preparedContext.contextUsed,
                bypassResult.triggeringComment,
            );
        }

        const systemPrompt = this.prompts.getPrompt('investigation.system', {});
        const userPrompt = this.prompts.getPrompt('investigation.user', {
            issueKey: issue.key,
            summary: issue.summary,
            description: issue.description || '(no description)',
            status: issue.status,
            labels: issue.labels.join(', ') || 'none',
            projectDescription: preparedContext.contextUsed.projectDescription,
            codeChunksContext: preparedContext.contextUsed.codeChunksContext,
            investigatorSettingsContext: preparedContext.contextUsed.investigatorSettingsContext,
            commentsSection: buildCommentsSection(issue),
            relatedIssuesSection: buildRelatedIssuesSection(relatedIssues),
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'investigation' });
        const parsed = parseInvestigationResponse(raw, issue.key);

        const qualityReport: QualityReport = {
            clarity: parsed.qualityReport.clarity,
            completeness: parsed.qualityReport.completeness,
            ambiguity: parsed.qualityReport.ambiguity,
            specificity: parsed.qualityReport.specificity,
            conflictDetection: parsed.qualityReport.conflictDetection,
            scope: parsed.qualityReport.scope,
        };
        const autoFixabilityReport = scoreAutoFixability({
            ready: parsed.ready,
            metrics: parsed.autoFixabilityMetrics,
            automationSettings: preparedContext.automationSettings,
            issue,
            contextUsed: preparedContext.contextUsed,
            assumptions: parsed.assumptions,
            suggestedFollowUp: parsed.suggestedFollowUp,
        });

        this.logger.info('Investigation complete', {
            issueKey: issue.key,
            ready: parsed.ready,
            autoFixabilityDecision: autoFixabilityReport.decision,
            autoFixabilityScore: autoFixabilityReport.score,
            relevantFiles: preparedContext.contextUsed.relevantFiles,
            qualityReport: {
                clarity: { passed: qualityReport.clarity.passed, summary: qualityReport.clarity.summary },
                completeness: { passed: qualityReport.completeness.passed, summary: qualityReport.completeness.summary },
                ambiguity: { passed: qualityReport.ambiguity.passed, summary: qualityReport.ambiguity.summary },
                specificity: { passed: qualityReport.specificity.passed, summary: qualityReport.specificity.summary },
                conflictDetection: { passed: qualityReport.conflictDetection.passed, summary: qualityReport.conflictDetection.summary },
                scope: { passed: qualityReport.scope.passed, summary: qualityReport.scope.summary },
            },
        });

        if (parsed.ready && parsed.descriptionForAi) {
            this.logger.info('Issue is ready for planning after investigation', {
                issueKey: issue.key,
                descriptionForAi: parsed.descriptionForAi,
                autoFixabilityDecision: autoFixabilityReport.decision,
            });
        }

        if (!parsed.ready && parsed.clarificationQuestions && parsed.clarificationQuestions.length > 0) {
            this.logger.info('Issue needs CLARIFICATION', {
                issueKey: issue.key,
                clarificationQuestions: parsed.clarificationQuestions,
            });
        }

        return {
            ready: parsed.ready,
            descriptionForAi: parsed.descriptionForAi ?? null,
            clarificationQuestions: parsed.clarificationQuestions ?? null,
            qualityReport,
            contextUsed: preparedContext.contextUsed,
            autoFixabilityReport,
        };
    }
}


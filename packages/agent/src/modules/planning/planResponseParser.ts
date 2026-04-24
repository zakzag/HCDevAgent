import { IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for the reviewer-facing plan. */
interface HumanPlanAiResponse {
    readonly plan: string;
}

/** Raw shape expected from the AI JSON response for the machine-readable plan. */
interface PlanForAiResponse {
    readonly planForAi: string;
}

/** Validates that a parsed AI response contains a reviewer-facing plan. */
const isValidHumanPlanResponse = (value: unknown): value is HumanPlanAiResponse => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate['plan'] === 'string';
};

/** Validates that a parsed AI response contains a machine-readable plan. */
const isValidPlanForAiResponse = (value: unknown): value is PlanForAiResponse => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate['planForAi'] === 'string';
};

/** Strips markdown code fences from an AI JSON response if present. */
const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/** Parses and validates a reviewer-facing plan response. */
export const parseHumanPlanResponse = (raw: string): string => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;

    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during planning', {
            raw: cleaned.slice(0, 500),
        });
    }

    if (!isValidHumanPlanResponse(parsed)) {
        throw new IntegrationError('AI planning response has unexpected shape', {
            raw: cleaned.slice(0, 500),
        });
    }

    return parsed.plan;
};

/** Parses and validates a machine-readable plan response. */
export const parsePlanForAiResponse = (raw: string): string => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;

    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during plan-for-AI generation', {
            raw: cleaned.slice(0, 500),
        });
    }

    if (!isValidPlanForAiResponse(parsed)) {
        throw new IntegrationError('AI plan-for-AI response has unexpected shape', {
            raw: cleaned.slice(0, 500),
        });
    }

    return parsed.planForAi;
};


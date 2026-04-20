import type { JiraCustomFieldJqlName } from '@hcdevagent/shared';

/**
 * Fluent builder for Jira Query Language (JQL) strings.
 *
 * Uses JIRA_CUSTOM_FIELD_JQL_NAMES for custom field references so every
 * field name is type-checked and consistent with the constant definitions.
 *
 * @example
 * const jql = new JqlBuilder()
 *     .status('Selected for Triage')
 *     .andCustomFieldIsEmpty(JIRA_CUSTOM_FIELD_JQL_NAMES.DESCRIPTION_FOR_AI)
 *     .orderBy('created', 'ASC')
 *     .build();
 * // → status = "Selected for Triage" AND "Description For AI" is EMPTY ORDER BY created ASC
 */
export class JqlBuilder {
    private readonly clauses: string[] = [];
    private orderByClause: string | null = null;

    /** Adds a `status = "value"` clause. */
    public status(value: string): this {
        this.clauses.push(`status = "${value}"`);
        return this;
    }

    /** Adds a `project = "key"` clause. */
    public project(projectKey: string): this {
        this.clauses.push(`project = "${projectKey}"`);
        return this;
    }

    /**
     * Adds a `"Custom Field" is EMPTY` clause.
     * @param field — a value from JIRA_CUSTOM_FIELD_JQL_NAMES (already quoted)
     */
    public andCustomFieldIsEmpty(field: JiraCustomFieldJqlName): this {
        this.clauses.push(`${field} is EMPTY`);
        return this;
    }

    /**
     * Adds a `"Custom Field" is not EMPTY` clause.
     * @param field — a value from JIRA_CUSTOM_FIELD_JQL_NAMES (already quoted)
     */
    public andCustomFieldIsNotEmpty(field: JiraCustomFieldJqlName): this {
        this.clauses.push(`${field} is not EMPTY`);
        return this;
    }

    /**
     * Adds a `"Custom Field" = "value"` clause.
     * @param field — a value from JIRA_CUSTOM_FIELD_JQL_NAMES (already quoted)
     * @param value — the value to match
     */
    public andCustomFieldEquals(field: JiraCustomFieldJqlName, value: string): this {
        this.clauses.push(`${field} = "${value}"`);
        return this;
    }

    /**
     * Adds an `ORDER BY field direction` clause.
     * Can only be called once; subsequent calls replace the previous order.
     */
    public orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
        this.orderByClause = `ORDER BY ${field} ${direction}`;
        return this;
    }

    /** Returns the final JQL string. */
    public build(): string {
        const where = this.clauses.join(' AND ');
        return this.orderByClause ? `${where} ${this.orderByClause}` : where;
    }
}


import { describe, it, expect } from 'vitest';
import { JIRA_CUSTOM_FIELD_JQL_NAMES } from '@hcdevagent/shared';
import { JqlBuilder } from '../../../services/issueTracker/JqlBuilder.js';

describe('JqlBuilder', () => {
    describe('status()', () => {
        it('should build a simple status clause', () => {
            const jql = new JqlBuilder().status('In Progress').build();
            expect(jql).toBe('status = "In Progress"');
        });

        it('should not add ORDER BY when orderBy is not called', () => {
            const jql = new JqlBuilder().status('Done').build();
            expect(jql).not.toContain('ORDER BY');
        });
    });

    describe('project()', () => {
        it('should add a project clause', () => {
            const jql = new JqlBuilder().project('HC').build();
            expect(jql).toBe('project = "HC"');
        });
    });

    describe('orderBy()', () => {
        it('should append ORDER BY ASC by default', () => {
            const jql = new JqlBuilder().status('Open').orderBy('created').build();
            expect(jql).toBe('status = "Open" ORDER BY created ASC');
        });

        it('should append ORDER BY DESC when specified', () => {
            const jql = new JqlBuilder().status('Open').orderBy('created', 'DESC').build();
            expect(jql).toBe('status = "Open" ORDER BY created DESC');
        });

        it('should replace previous orderBy when called twice', () => {
            const jql = new JqlBuilder()
                .status('Open')
                .orderBy('created', 'ASC')
                .orderBy('updated', 'DESC')
                .build();
            expect(jql).toBe('status = "Open" ORDER BY updated DESC');
        });
    });

    describe('andCustomFieldIsEmpty()', () => {
        it('should add a custom field IS EMPTY clause using JIRA_CUSTOM_FIELD_JQL_NAMES', () => {
            const jql = new JqlBuilder()
                .status('Selected for Triage')
                .andCustomFieldIsEmpty(JIRA_CUSTOM_FIELD_JQL_NAMES.DESCRIPTION_FOR_AI)
                .build();
            expect(jql).toBe('status = "Selected for Triage" AND "Description For AI" is EMPTY');
        });
    });

    describe('andCustomFieldIsNotEmpty()', () => {
        it('should add a custom field IS NOT EMPTY clause', () => {
            const jql = new JqlBuilder()
                .status('Plan')
                .andCustomFieldIsNotEmpty(JIRA_CUSTOM_FIELD_JQL_NAMES.IMPLEMENTATION_PLAN)
                .build();
            expect(jql).toBe('status = "Plan" AND "Implementation Plan" is not EMPTY');
        });
    });

    describe('andCustomFieldEquals()', () => {
        it('should add a custom field equals clause', () => {
            const jql = new JqlBuilder()
                .status('In Progress')
                .andCustomFieldEquals(JIRA_CUSTOM_FIELD_JQL_NAMES.BRANCH_NAME, 'feature/HC-123')
                .build();
            expect(jql).toBe('status = "In Progress" AND "Branch Name" = "feature/HC-123"');
        });
    });

    describe('chaining', () => {
        it('should chain multiple clauses with AND and add ORDER BY', () => {
            const jql = new JqlBuilder()
                .project('HC')
                .status('Selected for Triage')
                .andCustomFieldIsEmpty(JIRA_CUSTOM_FIELD_JQL_NAMES.DESCRIPTION_FOR_AI)
                .andCustomFieldIsEmpty(JIRA_CUSTOM_FIELD_JQL_NAMES.BRANCH_NAME)
                .orderBy('created', 'ASC')
                .build();

            expect(jql).toBe(
                'project = "HC" AND status = "Selected for Triage"' +
                ' AND "Description For AI" is EMPTY' +
                ' AND "Branch Name" is EMPTY' +
                ' ORDER BY created ASC',
            );
        });
    });

    describe('build() with no clauses', () => {
        it('should return an empty string when no clauses are added', () => {
            const jql = new JqlBuilder().build();
            expect(jql).toBe('');
        });
    });
});


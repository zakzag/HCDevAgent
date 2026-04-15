import type { PlanResult } from '@hcdevagent/shared';

/**
 * Test fixture for a sample PlanResult.
 */
export const testPlan: PlanResult = {
  issueKey: 'TEST-1',
  steps: [
    {
      order: 1,
      description: 'Create the new service class',
      filePath: 'src/services/NewService.ts',
      estimatedComplexity: 'medium',
    },
    {
      order: 2,
      description: 'Write unit tests',
      filePath: 'src/services/__tests__/NewService.test.ts',
      estimatedComplexity: 'low',
    },
  ],
  estimatedFiles: ['src/services/NewService.ts', 'src/services/__tests__/NewService.test.ts'],
  testStrategy: 'Unit tests for all new code, integration test for the service',
};


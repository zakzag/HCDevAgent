/**
 * InversifyJS injection tokens.
 * Each token corresponds to one interface binding.
 */
export const SYMBOLS = {
  Logger: Symbol.for('Logger'),
  ConfigProvider: Symbol.for('ConfigProvider'),
  GitRepository: Symbol.for('GitRepository'),
  GitProvider: Symbol.for('GitProvider'),
  IssueReader: Symbol.for('IssueReader'),
  IssueWriter: Symbol.for('IssueWriter'),
  IssueTrackerOperations: Symbol.for('IssueTrackerOperations'),
  IssueInvestigator: Symbol.for('IssueInvestigator'),
  PlanGenerator: Symbol.for('PlanGenerator'),
  CodeImplementer: Symbol.for('CodeImplementer'),
  VersionControl: Symbol.for('VersionControl'),
  StorageAdapter: Symbol.for('StorageAdapter'),
  EventBus: Symbol.for('EventBus'),
  Conductor: Symbol.for('Conductor'),
  OpenAiClient: Symbol.for('OpenAiClient'),
  AiClient: Symbol.for('AiClient'),
  ProcessRunner: Symbol.for('ProcessRunner'),
  PromptRegistry: Symbol.for('PromptRegistry'),
  InvestigationContextProvider: Symbol.for('InvestigationContextProvider'),
} as const;

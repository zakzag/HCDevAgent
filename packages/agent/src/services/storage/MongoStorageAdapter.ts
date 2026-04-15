import { injectable, inject } from 'inversify';
import type {
  StorageAdapter,
  ActiveIssue,
  ExecutionLogEntry,
  PhaseMetric,
  ConfigProvider,
  Logger,
} from '@hcdevagent/shared';
import { SYMBOLS, StorageError } from '@hcdevagent/shared';

/**
 * MongoDB-based storage adapter using Mongoose.
 * Placeholder implementation — full Mongoose models will be added in a later step.
 */
@injectable()
export class MongoStorageAdapter implements StorageAdapter {
  constructor(
    @inject(SYMBOLS.ConfigProvider) private readonly configProvider: ConfigProvider,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {}

  /** Saves or updates an active issue record. */
  public async upsertActiveIssue(activeIssue: ActiveIssue): Promise<void> {
    this.logger.debug('Upserting active issue', { issueKey: activeIssue.issueKey });
    // TODO: Implement with Mongoose
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }

  /** Retrieves an active issue by its key. */
  public async getActiveIssue(issueKey: string): Promise<ActiveIssue | null> {
    this.logger.debug('Getting active issue', { issueKey });
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }

  /** Removes an active issue record. */
  public async removeActiveIssue(issueKey: string): Promise<void> {
    this.logger.debug('Removing active issue', { issueKey });
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }

  /** Retrieves all currently active issues. */
  public async getAllActiveIssues(): Promise<ReadonlyArray<ActiveIssue>> {
    this.logger.debug('Getting all active issues');
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }

  /** Appends an execution log entry. */
  public async appendLog(entry: ExecutionLogEntry): Promise<void> {
    this.logger.debug('Appending log', { issueKey: entry.issueKey });
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }

  /** Retrieves execution logs for an issue. */
  public async getLogs(issueKey: string): Promise<ReadonlyArray<ExecutionLogEntry>> {
    this.logger.debug('Getting logs', { issueKey });
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }

  /** Records a phase metric. */
  public async recordMetric(metric: PhaseMetric): Promise<void> {
    this.logger.debug('Recording metric', { issueKey: metric.issueKey });
    throw new StorageError('MongoStorageAdapter not yet implemented');
  }
}


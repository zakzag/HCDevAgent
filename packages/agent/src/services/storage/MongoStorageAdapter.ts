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

    /** Fetch the currently active issue record. */
    public async getActiveIssue(): Promise<ActiveIssue | null> {
        this.logger.debug('Getting active issue');
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Create or update the active issue record. */
    public async setActiveIssue(record: ActiveIssue): Promise<void> {
        this.logger.debug('Setting active issue', { issueKey: record.issueKey });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Remove the active issue record. */
    public async clearActiveIssue(issueKey: string): Promise<void> {
        this.logger.debug('Clearing active issue', { issueKey });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Append an audit log entry. */
    public async addExecutionLog(entry: ExecutionLogEntry): Promise<void> {
        this.logger.debug('Adding execution log', { issueKey: entry.issueKey });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Fetch execution history, optionally filtered by issue. */
    public async getExecutionHistory(issueKey?: string): Promise<ReadonlyArray<ExecutionLogEntry>> {
        this.logger.debug('Getting execution history', { issueKey });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Insert or update a phase metric record. */
    public async addMetric(metric: PhaseMetric): Promise<void> {
        this.logger.debug('Adding metric', { issueKey: metric.issueKey });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Update an in-progress metric. */
    public async updateMetric(issueKey: string, phase: string, update: Partial<PhaseMetric>): Promise<void> {
        this.logger.debug('Updating metric', { issueKey, phase });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Fetch metrics, optionally filtered by issue. */
    public async getMetrics(issueKey?: string): Promise<ReadonlyArray<PhaseMetric>> {
        this.logger.debug('Getting metrics', { issueKey });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Read a runtime config override from the database. */
    public async getConfigOverride(key: string): Promise<unknown | null> {
        this.logger.debug('Getting config override', { key });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }

    /** Upsert a runtime config override. */
    public async setConfigOverride(key: string, value: unknown, updatedBy?: string): Promise<void> {
        this.logger.debug('Setting config override', { key, updatedBy });
        throw new StorageError('MongoStorageAdapter not yet implemented');
    }
}

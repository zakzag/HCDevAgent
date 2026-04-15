import { injectable, inject } from 'inversify';
import type { Logger, EventBus } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';

/**
 * The main orchestrator that drives the agent workflow.
 * Coordinates the investigation → planning → implementation pipeline.
 */
@injectable()
export class Conductor {
  private isRunning = false;

  constructor(
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
    @inject(SYMBOLS.EventBus) private readonly eventBus: EventBus,
  ) {}

  /** Starts the conductor polling loop. */
  public async start(): Promise<void> {
    this.logger.info('Conductor starting');
    this.isRunning = true;
  }

  /** Stops the conductor. */
  public async stop(): Promise<void> {
    this.logger.info('Conductor stopping');
    this.isRunning = false;
  }

  /** Returns whether the conductor is currently running. */
  public getIsRunning(): boolean {
    return this.isRunning;
  }
}


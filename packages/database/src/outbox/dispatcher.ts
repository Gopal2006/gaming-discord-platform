import type {
  IOutboxRepository,
  OutboxEventRecord,
} from "../repositories/interfaces.js";

export interface IEventTransport {
  publish(event: OutboxEventRecord): Promise<void>;
}

export interface OutboxDispatcherOptions {
  workerId: string;
  batchSize?: number;
  leaseDurationMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
}

export interface DispatchResult {
  claimedCount: number;
  acknowledgedCount: number;
  failedCount: number;
  recoveredLeasesCount: number;
}

export class OutboxDispatcher {
  private readonly workerId: string;
  private readonly batchSize: number;
  private readonly leaseDurationMs: number;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;

  constructor(
    private readonly outboxRepo: IOutboxRepository,
    private readonly transport: IEventTransport,
    options: OutboxDispatcherOptions,
  ) {
    this.workerId = options.workerId;
    this.batchSize = options.batchSize ?? 10;
    this.leaseDurationMs = options.leaseDurationMs ?? 30000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 2000;
  }

  async dispatchPending(now: Date = new Date()): Promise<DispatchResult> {
    const recovered = await this.outboxRepo.recoverExpiredLeases(now);
    const claimed = await this.outboxRepo.claimPending(
      this.workerId,
      this.batchSize,
      this.leaseDurationMs,
      now,
    );

    let acked = 0;
    let failed = 0;

    for (const event of claimed) {
      try {
        await this.transport.publish(event);
        await this.outboxRepo.markAcknowledged(event.id, now);
        acked++;
      } catch (err) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const retryable = event.attempts < this.maxAttempts;
        // Exponential backoff: base * 2^(attempts-1)
        const backoffMs =
          this.baseBackoffMs * Math.pow(2, Math.max(0, event.attempts - 1));

        await this.outboxRepo.markFailed(
          event.id,
          errorMessage,
          retryable,
          backoffMs,
          now,
        );
      }
    }

    return {
      claimedCount: claimed.length,
      acknowledgedCount: acked,
      failedCount: failed,
      recoveredLeasesCount: recovered,
    };
  }
}

import {
  OutboxDispatcher,
  type IEventTransport,
  type IOutboxRepository,
  type DispatchResult,
} from "@nexus/database";

export interface DispatchOutboxRequest {
  workerId: string;
  batchSize?: number;
  leaseDurationMs?: number;
  now?: Date;
}

export async function dispatchOutboxWorkflow(
  outboxRepo: IOutboxRepository,
  transport: IEventTransport,
  request: DispatchOutboxRequest,
): Promise<DispatchResult> {
  const dispatcher = new OutboxDispatcher(outboxRepo, transport, {
    workerId: request.workerId,
    batchSize: request.batchSize ?? 10,
    leaseDurationMs: request.leaseDurationMs ?? 30000,
  });

  return await dispatcher.dispatchPending(request.now ?? new Date());
}

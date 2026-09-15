export function createWorkoutSubmitter<TPayload, TResult>(
  send: (payload: TPayload, idempotencyKey: string) => Promise<TResult>,
  createKey: () => string = () => crypto.randomUUID()
) {
  const idempotencyKey = createKey();
  return (payload: TPayload) => send(payload, idempotencyKey);
}

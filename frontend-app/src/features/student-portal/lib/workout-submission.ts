export function createWorkoutSubmitter<TPayload, TResult>(
  send: (payload: TPayload, idempotencyKey: string) => Promise<TResult>,
  createKey: () => string = () => crypto.randomUUID()
) {
  let idempotencyKey: string | null = null;
  let payloadSignature: string | null = null;

  return (payload: TPayload) => {
    const nextSignature = JSON.stringify(payload);
    if (idempotencyKey === null || nextSignature !== payloadSignature) {
      idempotencyKey = createKey();
      payloadSignature = nextSignature;
    }
    return send(payload, idempotencyKey);
  };
}

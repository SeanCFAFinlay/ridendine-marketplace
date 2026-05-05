type ProcessorClient = {
  from: (table: string) => any;
};

export function processorIdempotencyKey(headers: Headers, processorName: string): string {
  const supplied = headers.get('x-idempotency-key');
  if (supplied && supplied.trim().length >= 8) return supplied.trim();

  const minute = new Date().toISOString().slice(0, 16);
  return `${processorName}:${minute}`;
}

export async function claimProcessorRun(
  client: ProcessorClient,
  processorName: string,
  headers: Headers
): Promise<{ claimed: boolean; runId?: string; idempotencyKey: string; error?: string }> {
  const idempotencyKey = processorIdempotencyKey(headers, processorName);
  const { data, error } = await client
    .from('ops_processor_runs')
    .insert({
      processor_name: processorName,
      idempotency_key: idempotencyKey,
      status: 'processing',
    })
    .select('id')
    .single();

  if (!error && data?.id) {
    return { claimed: true, runId: data.id as string, idempotencyKey };
  }

  if (error?.code === '23505') {
    return { claimed: false, idempotencyKey };
  }

  return {
    claimed: false,
    idempotencyKey,
    error: error?.message || 'Failed to claim processor run',
  };
}

export async function finishProcessorRun(
  client: ProcessorClient,
  runId: string | undefined,
  status: 'completed' | 'failed',
  result: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  if (!runId) return;
  await client
    .from('ops_processor_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      result,
      error_message: errorMessage ?? null,
    })
    .eq('id', runId);
}

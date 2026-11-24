import type { Api, Model, ProviderHeaders } from '@earendil-works/pi-ai';

/** Cherry business identities, not Pi's provider-affinity session or an installation identity. */
export type PiChatResponsesIdentity = { sessionId: string; turnId: string };

export function resolvePiChatResponsesIdentity(
  model: Model<Api>,
  identity: PiChatResponsesIdentity | undefined,
): PiChatResponsesIdentity | undefined {
  if (model.api !== 'openai-responses' || !identity?.sessionId || !identity.turnId)
    return undefined;
  try {
    const url = new URL(model.baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    const hostname = url.hostname.toLowerCase().replace(/\.+$/, '');
    if (
      ['openai.com', 'chatgpt.com'].some(
        (official) => hostname === official || hostname.endsWith(`.${official}`),
      )
    )
      return undefined;
    return identity;
  } catch {
    return undefined;
  }
}

export function applyPiChatResponsesHeaders(
  headers: ProviderHeaders,
  identity: PiChatResponsesIdentity | undefined,
): void {
  if (!identity) return;
  // Provider overrides can spell these with any casing. Send exactly one authoritative value.
  for (const name of Object.keys(headers)) {
    if (['session-id', 'x-codex-turn-metadata'].includes(name.toLowerCase())) delete headers[name];
  }
  headers['session-id'] = identity.sessionId;
  headers['x-codex-turn-metadata'] = JSON.stringify({
    session_id: identity.sessionId,
    thread_id: identity.sessionId,
    turn_id: identity.turnId,
    request_kind: 'turn',
  });
}

/** Runs after custom request parameters, immediately before the SDK serializes the body. */
export function applyPiChatResponsesPayload(
  payload: unknown,
  identity: PiChatResponsesIdentity | undefined,
): unknown {
  if (!identity || !isRecord(payload)) return payload;
  const keyed = { ...payload, prompt_cache_key: identity.sessionId };
  if (!Array.isArray(payload.input)) return keyed;
  const instructions: string[] = [];
  if (typeof payload.instructions === 'string' && payload.instructions.length)
    instructions.push(payload.instructions);
  else if (payload.instructions != null && typeof payload.instructions !== 'string') return keyed;

  const input: unknown[] = [];
  let promoted = false;
  for (const item of payload.input) {
    if (!isRecord(item) || (item.role !== 'system' && item.role !== 'developer')) {
      input.push(item);
      continue;
    }
    // Include persisted mid-conversation system updates, not just the first system message.
    // Never partially remove a message whose content cannot be represented as instructions text.
    const text = instructionText(item.content);
    if (text === undefined) return keyed;
    if (text.length) instructions.push(text);
    promoted = true;
  }
  return promoted ? { ...keyed, instructions: instructions.join('\n\n'), input } : keyed;
}

function instructionText(content: unknown): string | undefined {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return undefined;
  const text: string[] = [];
  for (const part of content) {
    if (
      !isRecord(part) ||
      (part.type !== 'input_text' && part.type !== 'text') ||
      typeof part.text !== 'string'
    )
      return undefined;
    text.push(part.text);
  }
  return text.join('\n\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

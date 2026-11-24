import type { Api, Model, ProviderHeaders } from '@earendil-works/pi-ai';

import {
  applyPiChatResponsesHeaders,
  applyPiChatResponsesPayload,
  resolvePiChatResponsesIdentity,
} from '../piChatResponses';

const identity = { sessionId: 'conversation', turnId: 'turn' };
const model = (baseUrl: string, api: Api = 'openai-responses') => ({ baseUrl, api }) as Model<Api>;

describe('pure-chat Responses adaptation', () => {
  test.each([
    'https://openai.com/v1',
    'https://api.openai.com/v1',
    'https://API.OPENAI.COM./v1',
    'https://chatgpt.com/backend-api',
    'https://sub.chatgpt.com/v1',
    'file:///relay',
    'not a URL',
    '',
  ])('excludes official or invalid endpoints: %s', (baseUrl) => {
    expect(resolvePiChatResponsesIdentity(model(baseUrl), identity)).toBeUndefined();
  });

  test.each([
    'https://relay.example/v1',
    'http://localhost:3000/v1',
    'https://openai.com.relay.test',
  ])('allows third-party Responses: %s', (baseUrl) => {
    expect(resolvePiChatResponsesIdentity(model(baseUrl), identity)).toBe(identity);
  });

  test.each(['openai-completions', 'anthropic-messages', 'google-generative-ai'] as const)(
    'does not adapt other protocols: %s',
    (api) => {
      expect(
        resolvePiChatResponsesIdentity(model('https://relay.test', api), identity),
      ).toBeUndefined();
    },
  );

  test('requires explicit business session and turn ownership', () => {
    for (const candidate of [
      undefined,
      { ...identity, sessionId: '' },
      { ...identity, turnId: '' },
    ])
      expect(
        resolvePiChatResponsesIdentity(model('https://relay.test'), candidate),
      ).toBeUndefined();
  });

  test('replaces case-insensitive identity headers without touching other headers', () => {
    const headers: ProviderHeaders = {
      'Session-ID': 'old',
      'SESSION-id': 'older',
      'X-Codex-Turn-Metadata': 'old',
      Authorization: 'Bearer key',
      'User-Agent': 'Cherry',
    };
    applyPiChatResponsesHeaders(headers, identity);
    expect(headers).toEqual({
      Authorization: 'Bearer key',
      'User-Agent': 'Cherry',
      'session-id': 'conversation',
      'x-codex-turn-metadata': JSON.stringify({
        session_id: 'conversation',
        thread_id: 'conversation',
        turn_id: 'turn',
        request_kind: 'turn',
      }),
    });
  });

  test('promotes all textual system updates, preserves existing instructions and other input, without mutation', () => {
    const user = {
      role: 'user',
      content: [{ type: 'input_image', image_url: 'https://image.test' }],
    };
    const assistant = { role: 'assistant', content: 'Answer' };
    const tool = { type: 'function_call_output', call_id: 'call', output: 'result' };
    const payload = {
      instructions: 'Existing',
      prompt_cache_key: 'wrong',
      tools: [{ type: 'web_search' }],
      input: [
        { role: 'system', content: 'System' },
        user,
        assistant,
        {
          role: 'developer',
          content: [
            { type: 'input_text', text: 'Date' },
            { type: 'text', text: 'Update' },
          ],
        },
        tool,
      ],
    };
    const original = JSON.stringify(payload);
    const result = applyPiChatResponsesPayload(payload, identity);
    expect(result).toEqual({
      ...payload,
      instructions: 'Existing\n\nSystem\n\nDate\n\nUpdate',
      prompt_cache_key: 'conversation',
      input: [user, assistant, tool],
    });
    expect(JSON.stringify(payload)).toBe(original);
    expect(applyPiChatResponsesPayload(result, identity)).toEqual(result);
  });

  test.each([
    {
      input: [
        { role: 'system', content: 'text' },
        { role: 'developer', content: [{ type: 'input_image', image_url: 'url' }] },
      ],
    },
    { instructions: { unsupported: true }, input: [{ role: 'system', content: 'text' }] },
  ])('does not partially discard unsupported instructions: %j', (payload) => {
    expect(applyPiChatResponsesPayload(payload, identity)).toEqual({
      ...payload,
      prompt_cache_key: 'conversation',
    });
  });

  test('keeps string input and passes through requests without explicit identity', () => {
    const payload = { input: 'Hello', instructions: 'System' };
    expect(applyPiChatResponsesPayload(payload, identity)).toEqual({
      ...payload,
      prompt_cache_key: 'conversation',
    });
    expect(applyPiChatResponsesPayload(payload, undefined)).toBe(payload);
    expect(applyPiChatResponsesPayload(null, identity)).toBeNull();
    const headers = { 'Session-ID': 'untouched' };
    applyPiChatResponsesHeaders(headers, undefined);
    expect(headers).toEqual({ 'Session-ID': 'untouched' });
  });
});

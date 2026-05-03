import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { LLM_HEADERS } from '@/lib/server/llm/provider';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/models', { headers });
}

describe('GET /api/models', () => {
  it('returns 400 when credentials missing', async () => {
    const res = await GET(reqWith({}));
    expect(res.status).toBe(400);
  });

  it('proxies to upstream /models and returns sorted ids', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: 'gpt-4o-mini' },
            { id: 'gpt-4o' },
            { id: 'o1-preview' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await GET(
      reqWith({
        [LLM_HEADERS.baseURL]: 'https://api.openai.com/v1/',
        [LLM_HEADERS.apiKey]: 'sk-test',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.models).toEqual(['gpt-4o', 'gpt-4o-mini', 'o1-preview']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      }),
    );
  });

  it('forwards upstream error status', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('unauthorized', { status: 401 }),
    );

    const res = await GET(
      reqWith({
        [LLM_HEADERS.baseURL]: 'https://api.openai.com/v1',
        [LLM_HEADERS.apiKey]: 'bad',
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('upstream_error');
  });
});

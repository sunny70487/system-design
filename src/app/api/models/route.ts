import { NextResponse } from 'next/server';
import { readCredentialsFromHeaders } from '@/lib/server/llm/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OpenAIModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface OpenAIModelsResponse {
  data?: OpenAIModel[];
}

export async function GET(req: Request) {
  const { baseURL, apiKey } = readCredentialsFromHeaders(req.headers);
  if (!baseURL.trim() || !apiKey.trim()) {
    return NextResponse.json(
      { error: 'missing_credentials' },
      { status: 400 },
    );
  }

  const normalizedBase = baseURL.trim().replace(/\/+$/, '');
  const url = `${normalizedBase}/models`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'upstream_unreachable',
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return NextResponse.json(
      {
        error: 'upstream_error',
        status: upstream.status,
        message: text.slice(0, 500),
      },
      { status: upstream.status },
    );
  }

  const body = (await upstream.json().catch(() => ({}))) as OpenAIModelsResponse;
  const models =
    Array.isArray(body.data)
      ? body.data
          .map((m) => m?.id)
          .filter((id): id is string => typeof id === 'string')
          .sort((a, b) => a.localeCompare(b))
      : [];

  return NextResponse.json({ models });
}

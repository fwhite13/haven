/**
 * Cloudflare Pages Function — Haven AI proxy
 * Proxies POST /api/haven/chat → FAIT dev /api/haven/chat
 * Holds the API key server-side via FAIT_API_KEY secret.
 */

const FAIT_URL = 'https://fait.dev.fortressam.ai/api/haven/chat';

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight handled by onRequestOptions below
  const apiKey = env.FAIT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — API key missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let faitResp;
  try {
    faitResp = await fetch(FAIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'FAIT unreachable', detail: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await faitResp.json().catch(() => ({}));

  return new Response(JSON.stringify(data), {
    status: faitResp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

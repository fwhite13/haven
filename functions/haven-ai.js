/**
 * Cloudflare Pages Function — Haven AI proxy
 * Proxies POST /api/haven/chat → FAIT dev /api/haven/chat
 * Holds the API key server-side via FAIT_API_KEY secret.
 */

const FAIT_URL = 'https://fait.dev.fortressam.ai/api/haven/chat';

// Accept both POST (body) and GET (?q=...&projectId=...) to work around WAF POST blocks
export async function onRequest(context) {
  const { request, env } = context;

  const apiKey = env.FAIT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — API key missing' }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  let body;
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const message = url.searchParams.get('q');
    const projectId = url.searchParams.get('projectId');
    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing q param' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }
    body = { message, projectId };
  } else if (request.method === 'POST') {
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }
  } else {
    return new Response(null, { status: 405, headers: corsHeaders() });
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
      headers: corsHeaders(),
    });
  }

  const data = await faitResp.json().catch(() => ({}));

  return new Response(JSON.stringify(data), {
    status: faitResp.status,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
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

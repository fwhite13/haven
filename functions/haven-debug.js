// Temporary diagnostic — remove after confirming secret is present
export async function onRequest(context) {
  const { env } = context;
  const hasKey = !!env.FAIT_API_KEY;
  const keyLen = env.FAIT_API_KEY ? env.FAIT_API_KEY.length : 0;
  return new Response(JSON.stringify({ hasKey, keyLen }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

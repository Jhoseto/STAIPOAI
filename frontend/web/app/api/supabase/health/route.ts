export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Response.json({
    configured: Boolean(url && anon),
    urlHost: url ? new URL(url).host : null,
  });
}


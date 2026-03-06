const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { q, limit } = await req.json();
    if (!q || typeof q !== 'string' || q.length > 200) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('KLIPY_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchLimit = Math.min(Math.max(limit || 24, 8), 50);
    const url = `https://api.klipy.co/v1/gifs/search?q=${encodeURIComponent(q)}&limit=${searchLimit}`;

    const response = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });
    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = data.data.map((item: any) => ({
      id: item.id,
      url: item.images?.original?.url || item.images?.fixed_height?.url || item.url || '',
      preview_url: item.images?.fixed_width_small?.url || item.images?.preview_gif?.url || item.images?.fixed_height_small?.url || item.url || '',
      width: parseInt(item.images?.fixed_height_small?.width || '200', 10),
      height: parseInt(item.images?.fixed_height_small?.height || '200', 10),
    })).filter((r: any) => r.url);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

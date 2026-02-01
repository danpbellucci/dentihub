
export {}

console.log("Hello from test-connection!");

declare const Deno: {
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = ['http://localhost:5173', 'https://dentihub.com.br', 'https://app.dentihub.com.br'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`Request received: ${req.method} ${req.url}`);
    
    let body = null;
    const contentType = req.headers.get('content-type') || '';
    if (req.body && contentType.includes('application/json')) {
        try {
            body = await req.json(); 
        } catch (e) {
            console.warn("Could not parse body (might be empty):", e);
        }
    }

    const responseData = {
      success: true,
      message: "Conexão com Edge Function estabelecida com sucesso!",
      received_data: body,
      timestamp: new Date().toISOString(),
      environment: "Supabase Edge Runtime"
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Internal Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Unknown error",
      type: "InternalFunctionError"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

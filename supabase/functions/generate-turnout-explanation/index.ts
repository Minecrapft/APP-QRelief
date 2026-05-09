import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

type ExplanationRequest = {
  predicted_turnout: number;
  confidence_label: string;
  confidence_score: number;
  explanation_factors: Array<{
    label: string;
    value: any;
    detail: string;
  }>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (req) => {
  console.log(`Incoming request [SM]: ${req.method} ${req.url}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !groqApiKey) {
    return json({ error: "Cloud Configuration Error: Missing secrets." }, 200);
  }

  // MANUAL AUTH CHECK
  if (!authHeader) {
    return json({ error: "Security Error: Missing Authorization Header" }, 200);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    console.error("Manual Auth Failed:", authError);
    return json({ error: "Security Error: Session invalid.", code: "AUTH_FAILURE" }, 200);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || (profile.role !== "admin" && profile.role !== "staff")) {
    console.warn("Permission Denied (Role Check):", profile?.role);
    return json({ error: "Permission Error: Access restricted to Admin/Staff.", code: "FORBIDDEN" }, 200);
  }

  const body = (await req.json()) as ExplanationRequest;

  // Construct context for the AI
  const factorsSummary = body.explanation_factors
    .map(f => `${f.label}: ${f.detail}`)
    .join("\n");

  const prompt = `You are QRelief AI, a logistics assistant for disaster relief operations.
Analyze the following turnout prediction data for a relief event and provide a concise (2-3 sentences) narrative explanation for administrators of why this attendance is expected. 
Be insightful and mention specific factors like weather or location if they are significant.

Data:
- Predicted Turnout: ${body.predicted_turnout} beneficiaries
- Confidence: ${body.confidence_label} (${(body.confidence_score * 100).toFixed(0)}%)
- Key Factors:
${factorsSummary}

Output: A helpful narrative explanation (max 60 words).`;

  try {
    console.log("Calling Groq API for turnout narrative...");
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a helpful disaster relief logistics assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return json({ error: `AI Error (${groqResponse.status}): ${errorText}`, code: "GROQ_ERROR" }, 200);
    }

    const groqData = await groqResponse.json();
    const narrative = groqData.choices?.[0]?.message?.content?.trim() ?? null;

    return json({ narrative });
  } catch (error) {
    console.error("Groq fetch exception:", error);
    return json({ error: "System Error: AI service unreachable.", code: "EXCEPTION" }, 200);
  }
});

import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages: Message[];
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

const DRRM_SYSTEM_PROMPT = `You are the QRelief DRRM Assistant. You are an expert in Disaster Risk Reduction and Management (DRRM), specifically tailored to the Philippines context (Republic Act 10121).

Your mission is to support QRelief users (Admins, Staff, and Beneficiaries) by:
1. Providing clear, actionable guidance on emergency protocols (typhoon, flood, earthquake).
2. Explaining relief operation logistics and best practices for aid distribution.
3. Offering community preparedness tips and hazard identification based on Philippines standards.
4. Answering questions about RA 10121 and the role of the NDRRMC/LDRRMCs.

Guidelines:
- If a user reports a life-threatening emergency, IMMEDIATELY advise them to contact 911 or local emergency hotlines.
- Be professional, safety-oriented, and encouraging.
- Keep responses concise but thorough.
- Mention specific QRelief features (like digital IDs or real-time inventory) if it helps explain how the app can assist.`;

Deno.serve(async (req) => {
  console.log(`Incoming DRRM Chat request [SM]: ${req.method} ${req.url}`);
  
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

  // MANUAL AUTH CHECK (Because we use --no-verify-jwt)
  if (!authHeader) {
    return json({ error: "Security Error: Missing Authorization Header" }, 200);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    console.error("Manual Auth Failed:", authError);
    return json({ error: "Security Error: Your session is invalid or expired. Please log out and back in.", code: "AUTH_FAILURE" }, 200);
  }

  // Validating the user's role in the database
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.warn("Permission Error (Profile Missing):", user.id);
    return json({ error: "Permission Error: Could not find your user profile in the database.", code: "FORBIDDEN" }, 200);
  }

  // All checks passed
  const body = (await req.json()) as ChatRequest;
  const messages = body.messages || [];

  const fullMessages: Message[] = [
    { role: "system", content: DRRM_SYSTEM_PROMPT },
    ...messages
  ];

  try {
    console.log("Calling Groq API for DRRM chat...");
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: fullMessages,
        temperature: 0.6,
        max_tokens: 800,
        stream: false
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return json({ error: `AI Service Busy: ${errorText}`, code: "GROQ_ERROR" }, 200);
    }

    const groqData = await groqResponse.json();
    const assistantMessage = groqData.choices?.[0]?.message ?? { role: "assistant", content: "I encountered an error processing your request." };
    
    return json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat fetch exception:", error);
    return json({ error: "System Error: The AI service is unreachable.", code: "EXCEPTION" }, 200);
  }
});

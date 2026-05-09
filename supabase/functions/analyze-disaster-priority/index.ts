import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type PHCity = {
  name: string;
  lat: number;
  lng: number;
  population_est: number;
};

const MAJOR_PH_CITIES: PHCity[] = [
  { name: "Manila", lat: 14.5995, lng: 120.9842, population_est: 14000000 },
  { name: "Cebu City", lat: 10.3157, lng: 123.8854, population_est: 1000000 },
  { name: "Davao City", lat: 7.1907, lng: 125.4553, population_est: 1800000 },
  { name: "Surigao City", lat: 9.7820, lng: 125.4851, population_est: 170000 },
  { name: "Tacloban", lat: 11.2433, lng: 125.0042, population_est: 250000 },
  { name: "Legazpi", lat: 13.1387, lng: 123.7353, population_est: 200000 },
  { name: "Naga City", lat: 13.6218, lng: 123.1948, population_est: 210000 },
  { name: "Cagayan de Oro", lat: 8.4542, lng: 124.6319, population_est: 730000 },
  { name: "Baguio", lat: 16.4023, lng: 120.5960, population_est: 370000 },
  { name: "Iloilo City", lat: 10.7202, lng: 122.5621, population_est: 450000 },
  { name: "Tagbilaran", lat: 9.6412, lng: 123.8559, population_est: 100000 },
  { name: "Maasin City", lat: 10.1333, lng: 124.8417, population_est: 850000 }
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const groqApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
  if (!groqApiKey) return json({ error: "Configuration Error", message: "Missing GROQ API Key in environment." }, 200);

  try {
    const { demoMode } = await req.json().catch(() => ({}));
    let phEvents = [];

    if (demoMode) {
      console.log("Running in DEMO MODE (Typhoon Odette Scenario)...");
      phEvents = [
        {
          properties: {
            eventtype: "TC",
            eventname: "Super Typhoon ODETTE (Rai) Simulation",
            severitydata: { severity: "Extreme", severitytext: "Category 5" },
            description: "Massive landfall in Siargao, Surigao del Norte. Extreme wind damage and storm surge across Visayas and Northern Mindanao. Total power outage in Bohol and Southern Leyte."
          }
        }
      ];
    } else {
      console.log("Fetching GDACS data...");
      const gdacsUrl = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=TC;FL";
      const gdacsRes = await fetch(gdacsUrl);
      
      if (!gdacsRes.ok) {
        throw new Error(`GDACS API returned ${gdacsRes.status}`);
      }

      const gdacsData = await gdacsRes.json();
      phEvents = gdacsData.features?.filter((f: any) => {
        const country = f.properties?.country || "";
        const description = f.properties?.description || "";
        return country.includes("Philippines") || 
               description.includes("Philippines") || 
               description.includes("Luzon") || 
               description.includes("Visayas") || 
               description.includes("Mindanao");
      }) || [];
    }

    console.log(`Analyzing ${phEvents.length} events for PH impact.`);

    if (phEvents.length === 0) {
      return json({
        disasters: [],
        priorities: MAJOR_PH_CITIES.map(c => ({
          cityName: c.name,
          score: 1,
          reason: "No active hazard detected in this region.",
          coords: { lat: c.lat, lng: c.lng }
        })),
        criticalHub: "None",
        buildPlan: "Operational monitoring remains in effect."
      });
    }

    const prompt = `
      You are the QRelief Disaster Intelligence AI.
      ${demoMode ? "SCENARIO: This is a simulation of Super Typhoon ODETTE for training and demonstration." : ""}
      Analyze the following disaster events and prioritize relief efforts for major Philippine cities.
      
      DISASTER EVENTS:
      ${JSON.stringify(phEvents.map((e: any) => ({
        type: e.properties.eventtype,
        name: e.properties.eventname,
        severity: e.properties.severitydata,
        location: e.properties.description
      })))}
      
      TARGET CITIES:
      ${JSON.stringify(MAJOR_PH_CITIES)}
      
      TASK:
      1. For each target city, calculate a Priority Score (0-10) based on proximity to active incidents and city population.
      2. Identify the "Critical Hub" (The city most in need).
      3. Generate a "Relief Build Plan" explaining the strategy.
      
      Return ONLY a JSON object with this structure:
      {
        "disasters": [...phEvents],
        "priorities": [
          { "cityName": "string", "score": number, "reason": "string", "coords": { "lat": number, "lng": number } }
        ],
        "criticalHub": "cityName",
        "buildPlan": "A detailed strategy overview..."
      }
    `;

    console.log("Calling Groq for analysis...");
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API returned ${groqResponse.status}: ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log("Received response from Groq.");
    
    if (!groqData.choices?.[0]?.message?.content) {
      throw new Error("Invalid response structure from Groq API.");
    }

    const result = JSON.parse(groqData.choices[0].message.content);
    console.log("Successfully parsed Groq analysis.");

    // 4. Save to Database (if we have the secrets)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceRoleKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: savedReport, error: dbError } = await adminClient
        .from("disaster_reports")
        .insert({
          hazard_data: phEvents,
          priorities: result.priorities,
          critical_hub: result.criticalHub,
          build_plan: result.buildPlan
        })
        .select()
        .single();
      
      if (dbError) {
        console.warn("Failed to save disaster report to database:", dbError);
      } else {
        console.log(`Saved disaster report: ${savedReport.id}`);
        result.reportId = savedReport.id;
      }
    }

    return json(result);
  } catch (err) {
    console.error("Disaster Analysis Error:", err);
    // Explicitly return 200 so the client can read the JSON error message instead of throwing an HTTP protocol error.
    return json({ error: "Analysis failed", message: err instanceof Error ? err.message : String(err) }, 200);
  }
});

import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

type PlacesRequest = {
  input?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !googleMapsApiKey) {
    return json({ error: "Function secrets are not configured." }, 500);
  }

  if (!authHeader) {
    return json({ error: "Missing authorization header. Please log in again.", code: "AUTH_FAILURE" }, 200);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return json({ error: "Unauthorized request. Session expired.", code: "AUTH_FAILURE" }, 200);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.warn("Address look up: Profile not found or error", profileError);
    return json({ error: "Unable to verify user profile.", code: "FORBIDDEN" }, 200);
  }

  const body = (await req.json()) as PlacesRequest;
  const input = body.input?.trim() ?? "";

  if (input.length < 3) {
    return json({ suggestions: [] });
  }

  const requestBody: Record<string, unknown> = {
    input,
    regionCode: "PH",
    includedPrimaryTypes: ["route", "street_address", "premise", "subpremise", "establishment"]
  };

  if (typeof body.latitude === "number" && typeof body.longitude === "number") {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: body.latitude,
          longitude: body.longitude
        },
        radius: 10000
      }
    };
  }

  try {
    const googleResponse = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleMapsApiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text"
      },
      body: JSON.stringify(requestBody)
    });

    if (!googleResponse.ok) {
      const details = await googleResponse.text();
      console.error("Google Places API Error:", details);
      return json({ error: `Google lookup failed (${googleResponse.status}).`, code: "GOOGLE_ERROR" }, 200);
    }

    const payload = await googleResponse.json();
    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions
          .map((entry: any) => {
            const prediction = entry.placePrediction;

            if (!prediction?.text?.text) {
              return null;
            }

            return {
              place_id: prediction.placeId ?? "",
              text: prediction.text.text,
              main_text: prediction.structuredFormat?.mainText?.text ?? prediction.text.text,
              secondary_text: prediction.structuredFormat?.secondaryText?.text ?? ""
            };
          })
          .filter(Boolean)
      : [];

    return json({ suggestions });
  } catch (error) {
    console.error("Address fetch exception:", error);
    return json({ error: "Internal system error during address lookup.", code: "EXCEPTION" }, 200);
  }

  const payload = await googleResponse.json();
  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions
        .map((entry: any) => {
          const prediction = entry.placePrediction;

          if (!prediction?.text?.text) {
            return null;
          }

          return {
            place_id: prediction.placeId ?? "",
            text: prediction.text.text,
            main_text: prediction.structuredFormat?.mainText?.text ?? prediction.text.text,
            secondary_text: prediction.structuredFormat?.secondaryText?.text ?? ""
          };
        })
        .filter(Boolean)
    : [];

  return json({ suggestions });
});

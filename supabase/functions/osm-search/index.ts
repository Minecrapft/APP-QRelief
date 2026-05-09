import { corsHeaders } from "../_shared/cors.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

type OsmRequest = {
  input: string;
  latitude?: number | null;
  longitude?: number | null;
};

type PhotonFeature = {
  properties: {
    osm_id: number;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
};

Deno.serve(async (req) => {
  console.log(`Incoming OSM Search request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // NOTE: Bypassing strict auth logic for speed as this is a free public API proxy
  // But we still require a body
  const body: OsmRequest = await req.json();
  const query = body.input?.trim();

  if (!query || query.length < 3) {
    return json({ suggestions: [] });
  }

  try {
    // Photon API (Komoot) - Free OSM Search
    // countrycode=PH restricts results to Philippines
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&countrycode=PH&limit=5`;
    
    // Add location bias if available
    if (body.latitude && body.longitude) {
      url += `&lat=${body.latitude}&lon=${body.longitude}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Photon API Error:", response.status, await response.text());
      return json({ error: "OSM Search service error", code: "OSM_ERROR" }, 200);
    }

    const data = await response.json();
    const features: PhotonFeature[] = data.features || [];

    const suggestions = features.map(f => {
      const p = f.properties;
      
      // Construct main text (Street name or Building name)
      const mainText = p.name || p.street || "Unknown Location";
      
      // Construct secondary text (City, State, Region)
      const parts = [
        p.housenumber,
        p.street !== p.name ? p.street : null,
        p.city,
        p.state,
        p.postcode
      ].filter(Boolean);
      
      const secondaryText = parts.join(", ");
      const fullText = [mainText, secondaryText].filter(Boolean).join(", ");

      return {
        place_id: `osm-${p.osm_id}`,
        text: fullText,
        main_text: mainText,
        secondary_text: secondaryText
      };
    });

    return json({ suggestions });
  } catch (error) {
    console.error("OSM search exception:", error);
    return json({ error: "System Error during address lookup", code: "EXCEPTION" }, 200);
  }
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/supabase/env";
import { Database } from "@/lib/supabase/types";

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    fetch: (url, options) => {
      const headers = new Headers(options?.headers);
      headers.set("Cache-Control", "no-cache");
      
      const isFunctionCall = url.toString().includes("/functions/v1/");
      if (isFunctionCall) {
        console.log(`[Edge Function Call] ${url}`);
        console.log(`[Headers]`, {
          hasAuth: headers.has("Authorization"),
          hasApiKey: headers.has("apikey"),
          contentType: headers.get("Content-Type")
        });
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
});

/**
 * Supabase Client
 * Manages connection to Supabase for cloud sync
 */
/** @type {import("@supabase/supabase-js")} */
const { createClient } = require("@supabase/supabase-js");

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let supabase = null;

/**
 * Initialize Supabase client
 * Only initialized if credentials are available
 */
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[Supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Cloud sync disabled.",
    );
    return null;
  }

  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("[Supabase] Client initialized");
    return supabase;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Supabase] Failed to initialize:", message);
    return null;
  }
}

/**
 * Get or initialize Supabase client
 * @returns {import("@supabase/supabase-js").SupabaseClient | null} - Supabase client or null if not configured
 */
function getSupabaseClient() {
  if (!supabase) {
    initializeSupabase();
  }
  return supabase;
}

module.exports = getSupabaseClient();

/**
 * Supabase Client
 * Manages connection to Supabase for cloud sync
 */
const { createClient } = require("@supabase/supabase-js");

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
    console.error("[Supabase] Failed to initialize:", error.message);
    return null;
  }
}

/**
 * Get or initialize Supabase client
 * @returns {object|null} - Supabase client or null if not configured
 */
function getSupabaseClient() {
  if (!supabase) {
    initializeSupabase();
  }
  return supabase;
}

module.exports = getSupabaseClient();

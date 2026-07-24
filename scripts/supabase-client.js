(function () {
  let supabaseClient = null;

  function hasValidConfig(config) {
    return (
      config &&
      typeof config.url === "string" &&
      typeof config.anonKey === "string" &&
      config.url.startsWith("https://") &&
      config.anonKey.length > 20
    );
  }

  function createClient(config) {
    if (!window.supabase || !hasValidConfig(config)) {
      return null;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    return supabaseClient;
  }

  async function loadConfig() {
    if (hasValidConfig(window.HITTING_LOG_SUPABASE_CONFIG)) {
      return window.HITTING_LOG_SUPABASE_CONFIG;
    }

    const response = await fetch("/api/supabase-config");

    if (!response.ok) {
      throw new Error("Supabase public configuration is missing.");
    }

    return response.json();
  }

  const ready = loadConfig()
    .then((config) => {
      console.info("[Supabase] Public configuration loaded", {
        hasUrl: typeof config?.url === "string" && config.url.length > 0,
        hasPublicKey: typeof config?.anonKey === "string" && config.anonKey.length > 20,
      });
      return createClient(config);
    })
    .catch((error) => {
      console.error("Supabase client initialization error:", error);
      return null;
    });

  window.hittingLogSupabase = {
    getClient() {
      return supabaseClient;
    },
  };
  window.hittingLogSupabaseReady = ready;
})();

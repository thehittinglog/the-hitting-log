(function () {
  const fallbackConfig = {
    url: "YOUR_SUPABASE_URL",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
  };
  const config = window.HITTING_LOG_SUPABASE_CONFIG || fallbackConfig;

  function hasSupabaseConfig() {
    return (
      typeof config.url === "string" &&
      typeof config.anonKey === "string" &&
      config.url.startsWith("https://") &&
      config.anonKey.length > 20 &&
      !config.url.includes("YOUR_") &&
      !config.anonKey.includes("YOUR_")
    );
  }

  function getSupabaseClient() {
    if (window.hittingLogSupabaseClient) {
      return window.hittingLogSupabaseClient;
    }

    if (!hasSupabaseConfig() || !window.supabase) {
      return null;
    }

    window.hittingLogSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
    return window.hittingLogSupabaseClient;
  }

  window.hittingLogSupabase = {
    getClient: getSupabaseClient,
    isConfigured: hasSupabaseConfig,
  };
})();

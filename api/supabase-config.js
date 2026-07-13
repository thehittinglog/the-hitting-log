function getPublicSupabaseConfig() {
  return {
    url:
      process.env.HITTING_LOG_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "",
    anonKey:
      process.env.HITTING_LOG_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "",
  };
}

module.exports = function handler(req, res) {
  const config = getPublicSupabaseConfig();

  if (!config.url || !config.anonKey) {
    res.status(500).json({
      error: "Supabase public configuration is missing.",
    });
    return;
  }

  res.status(200).json(config);
};

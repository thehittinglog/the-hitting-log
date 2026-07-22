const {
  requireSupabasePublicConfig,
} = require("../lib/supabase-server");

module.exports = function handler(req, res) {
  let config;

  try {
    config = requireSupabasePublicConfig();
  } catch (error) {
    console.error("Supabase public configuration error:", error.message);
    res.status(500).json({
      error: "Supabase public configuration is missing.",
    });
    return;
  }

  res.status(200).json({
    url: config.url,
    anonKey: config.publicKey,
  });
};

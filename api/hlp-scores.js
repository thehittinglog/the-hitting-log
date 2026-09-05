"use strict";

const { calculateHlpScore } = require("../lib/hlp-score");
const {
  getBearerToken,
  requireSupabasePublicConfig,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");

function getGameId(game) {
  return typeof game?.id === "string" ? game.id : "";
}

function getTournamentId(game) {
  return typeof game?.tournamentId === "string" && game.tournamentId
    ? game.tournamentId
    : typeof game?.tournamentName === "string" ? game.tournamentName : "";
}

function buildApprovedScoreResponse(games) {
  const safeGames = Array.isArray(games) ? games : [];
  const gameScores = {};
  const tournamentAtBats = new Map();
  const allAtBats = [];

  safeGames.forEach((game) => {
    const atBats = Array.isArray(game?.atBats) ? game.atBats : [];
    const gameId = getGameId(game);
    const tournamentId = getTournamentId(game);
    allAtBats.push(...atBats);
    if (gameId) gameScores[gameId] = calculateHlpScore(atBats).score;
    if (tournamentId) {
      if (!tournamentAtBats.has(tournamentId)) tournamentAtBats.set(tournamentId, []);
      tournamentAtBats.get(tournamentId).push(...atBats);
    }
  });

  const tournamentScores = {};
  tournamentAtBats.forEach((atBats, tournamentId) => {
    tournamentScores[tournamentId] = calculateHlpScore(atBats).score;
  });

  return {
    overallScore: calculateHlpScore(allAtBats).score,
    gameScores,
    tournamentScores,
  };
}

async function readAuthenticatedGames(accessToken, userId) {
  const { url, publicKey } = requireSupabasePublicConfig();
  const parameters = new URLSearchParams({
    select: "payload",
    user_id: `eq.${userId}`,
    order: "updated_at.asc",
  });
  const response = await fetch(`${url}/rest/v1/hitting_log_games?${parameters}`, {
    headers: { Authorization: `Bearer ${accessToken}`, apikey: publicKey },
  });
  if (!response.ok) throw new Error("Unable to load authenticated score data.");
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map((row) => row?.payload).filter(Boolean);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed", code: "method_not_allowed" });
  }
  const accessToken = getBearerToken(req);
  if (!accessToken) return res.status(401).json({ error: "Authentication required", code: "missing_auth_token" });

  try {
    const authentication = await verifySupabaseUserWithDetails(accessToken);
    if (!authentication.user) {
      return res.status(401).json({ error: "Session expired", code: "invalid_auth_token" });
    }
    const games = await readAuthenticatedGames(accessToken, authentication.user.id);
    return res.status(200).json(buildApprovedScoreResponse(games));
  } catch (error) {
    console.error("HLP score request failed", { code: error?.code || "score_request_failed" });
    return res.status(503).json({ error: "Unable to load performance scores", code: "score_unavailable" });
  }
};

module.exports._test = { buildApprovedScoreResponse };

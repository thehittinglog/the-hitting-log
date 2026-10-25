(function exposeGameLifecycle(globalScope) {
  "use strict";

  const IN_PROGRESS = "in_progress";
  const COMPLETED = "completed";

  function normalizeStatus(status) {
    return status === IN_PROGRESS ? IN_PROGRESS : COMPLETED;
  }

  function isInProgress(game) {
    return normalizeStatus(game?.status) === IN_PROGRESS;
  }

  function appendUniqueAtBat(atBats, atBat) {
    const existing = Array.isArray(atBats) ? atBats : [];

    if (!atBat || !atBat.id || existing.some((savedAtBat) => savedAtBat?.id === atBat.id)) {
      return existing.slice();
    }

    return existing.concat(atBat);
  }

  function withDraftState(game, pendingAtBat, recordingStep = "at_bat_details") {
    return {
      ...game,
      pendingAtBat: pendingAtBat || null,
      recordingStep: pendingAtBat ? recordingStep : "at_bat_details",
    };
  }

  function commitAtBat(game, atBat) {
    return withDraftState({
      ...game,
      atBats: appendUniqueAtBat(game?.atBats, atBat),
    }, null);
  }

  function completeGame(game) {
    return withDraftState({
      ...game,
      status: COMPLETED,
    }, null);
  }

  const api = {
    IN_PROGRESS,
    COMPLETED,
    normalizeStatus,
    isInProgress,
    appendUniqueAtBat,
    withDraftState,
    commitAtBat,
    completeGame,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.hittingLogGameLifecycle = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

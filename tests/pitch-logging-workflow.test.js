(function runPitchLoggingWorkflowTests() {
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  assert(getNextPitchNumber({ pitches: [] }) === 1, "A new at-bat should start at Pitch 1.");
  assert(getNextPitchNumber({ pitches: [{ id: "pitch-1" }] }) === 2, "One saved pitch should advance the entry label to Pitch 2.");
  assert(getNextPitchNumber({ pitches: [{ id: "pitch-1" }, { id: "pitch-2" }] }) === 3, "Two saved pitches should advance the entry label to Pitch 3.");

  const originalPitches = [
    { id: "pitch-1", result: "ball", pitchType: "fastball" },
    { id: "pitch-2", result: "called_strike", pitchType: "curve" },
  ];
  const firstPitchEdit = replacePitchInSequence(
    originalPitches,
    { id: "temporary-draft-id", result: "foul_ball", pitchType: "slider" },
    "pitch-1",
    1
  );

  assert(firstPitchEdit.targetIndex === 0, "A stable pitch ID should take priority over a stale array index.");
  assert(firstPitchEdit.pitches.length === 2, "Editing must not append or remove a pitch.");
  assert(firstPitchEdit.pitches[0].id === "pitch-1", "Editing must preserve the original pitch ID.");
  assert(firstPitchEdit.pitches[0].result === "foul_ball", "The selected pitch should update in place.");
  assert(firstPitchEdit.pitches[1] === originalPitches[1], "Editing Pitch 1 must not alter Pitch 2.");
  assert(originalPitches[0].result === "ball", "Building an edit must not mutate the original sequence before save succeeds.");
  assert(getNextPitchNumber({ pitches: firstPitchEdit.pitches }) === 3, "After editing two saved pitches, new-pitch mode should return to Pitch 3.");

  const secondPitchEdit = replacePitchInSequence(
    firstPitchEdit.pitches,
    { result: "swinging_strike", pitchType: "changeup" },
    "pitch-2",
    1
  );
  assert(secondPitchEdit.pitches[0].result === "foul_ball", "Editing Pitch 2 must leave Pitch 1 unchanged.");
  assert(secondPitchEdit.pitches[1].id === "pitch-2", "Pitch 2 should retain its stable ID.");

  const withNewPitch = secondPitchEdit.pitches.concat({ id: "pitch-3", result: "ball" });
  assert(withNewPitch[2].id === "pitch-3", "The next newly logged pitch should append as Pitch 3.");

  const normalized = normalizePitch({
    id: "pitch-stable",
    location: { id: "zone-5", label: "Zone 5", isZone: true },
    pitchType: "slider",
    result: "batted_ball",
    primaryResult: "batted_ball",
    battedBallType: "line_drive",
    hitLocationX: 0.4,
    hitLocationY: 0.6,
    battedBallOutcome: "single",
  });
  assert(normalized.id === "pitch-stable", "Normalization should preserve a saved pitch ID.");
  assert(normalized.pitchType === "slider", "Normalization should preserve pitch type.");
  assert(normalized.battedBallType === "line_drive", "Normalization should preserve contact type.");
  assert(normalized.hitLocationX === 0.4 && normalized.hitLocationY === 0.6, "Normalization should preserve batted-ball coordinates.");
  assert(normalized.battedBallOutcome === "Single", "Normalization should preserve the normalized pitch outcome.");

  print("Pitch logging workflow tests passed");
})();

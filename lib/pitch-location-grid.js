(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.hittingLogPitchGrid = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const locationRows = [
    [
      { id: "extreme-top-left-out", label: "Extreme Top Left", isZone: false },
      { id: "top-edge-left-out", label: "Top Edge Left", isZone: false },
      { id: "top-edge-mid-left-out", label: "Top Edge Mid Left", isZone: false },
      { id: "top-edge-mid-out", label: "Top Edge Middle", isZone: false },
      { id: "top-edge-mid-right-out", label: "Top Edge Mid Right", isZone: false },
      { id: "top-edge-right-out", label: "Top Edge Right", isZone: false },
      { id: "extreme-top-right-out", label: "Extreme Top Right", isZone: false },
    ],
    [
      { id: "extreme-high-left-out", label: "Extreme High Left", isZone: false },
      { id: "top-left-out", label: "Top Left", isZone: false },
      { id: "high-left-out", label: "High Left", isZone: false },
      { id: "high-mid-out", label: "High", isZone: false },
      { id: "high-right-out", label: "High Right", isZone: false },
      { id: "top-right-out", label: "Top Right", isZone: false },
      { id: "extreme-high-right-out", label: "Extreme High Right", isZone: false },
    ],
    [
      { id: "extreme-upper-left-out", label: "Extreme Upper Left", isZone: false },
      { id: "far-left-high-out", label: "Far Inside High", isZone: false },
      { id: "zone-1", label: "Zone 1", isZone: true },
      { id: "zone-2", label: "Zone 2", isZone: true },
      { id: "zone-3", label: "Zone 3", isZone: true },
      { id: "far-right-high-out", label: "Far Outside High", isZone: false },
      { id: "extreme-upper-right-out", label: "Extreme Upper Right", isZone: false },
    ],
    [
      { id: "extreme-mid-left-out", label: "Extreme Inside", isZone: false },
      { id: "left-out", label: "Inside", isZone: false },
      { id: "zone-4", label: "Zone 4", isZone: true },
      { id: "zone-5", label: "Zone 5", isZone: true },
      { id: "zone-6", label: "Zone 6", isZone: true },
      { id: "right-out", label: "Outside", isZone: false },
      { id: "extreme-mid-right-out", label: "Extreme Outside", isZone: false },
    ],
    [
      { id: "extreme-lower-left-out", label: "Extreme Lower Left", isZone: false },
      { id: "far-left-low-out", label: "Far Inside Low", isZone: false },
      { id: "zone-7", label: "Zone 7", isZone: true },
      { id: "zone-8", label: "Zone 8", isZone: true },
      { id: "zone-9", label: "Zone 9", isZone: true },
      { id: "far-right-low-out", label: "Far Outside Low", isZone: false },
      { id: "extreme-lower-right-out", label: "Extreme Lower Right", isZone: false },
    ],
    [
      { id: "extreme-low-left-out", label: "Extreme Low Left", isZone: false },
      { id: "bottom-left-out", label: "Bottom Left", isZone: false },
      { id: "low-left-out", label: "Low Left", isZone: false },
      { id: "low-mid-out", label: "Low", isZone: false },
      { id: "low-right-out", label: "Low Right", isZone: false },
      { id: "bottom-right-out", label: "Bottom Right", isZone: false },
      { id: "extreme-low-right-out", label: "Extreme Low Right", isZone: false },
    ],
    [
      { id: "extreme-bottom-left-out", label: "Extreme Bottom Left", isZone: false },
      { id: "bottom-edge-left-out", label: "Bottom Edge Left", isZone: false },
      { id: "bottom-edge-mid-left-out", label: "Bottom Edge Mid Left", isZone: false },
      { id: "bottom-edge-mid-out", label: "Bottom Edge Middle", isZone: false },
      { id: "bottom-edge-mid-right-out", label: "Bottom Edge Mid Right", isZone: false },
      { id: "bottom-edge-right-out", label: "Bottom Edge Right", isZone: false },
      { id: "extreme-bottom-right-out", label: "Extreme Bottom Right", isZone: false },
    ],
  ];
  const locations = locationRows.flat();
  const positionById = new Map();

  locationRows.forEach((row, rowIndex) => {
    row.forEach((location, columnIndex) => {
      positionById.set(location.id, { row: rowIndex, column: columnIndex });
    });
  });

  function getLocationId(pitchLocation) {
    if (typeof pitchLocation === "string") return pitchLocation.trim();
    if (!pitchLocation || typeof pitchLocation !== "object") return "";
    const nestedLocation = pitchLocation.location;
    if (typeof nestedLocation === "string") return nestedLocation.trim();
    return String(
      nestedLocation?.id ||
      pitchLocation.locationId ||
      pitchLocation.location_id ||
      pitchLocation.pitch_location ||
      pitchLocation.id ||
      ""
    ).trim();
  }

  function getPitchLocationGridPosition(pitchLocation) {
    const position = positionById.get(getLocationId(pitchLocation));
    return position ? { ...position } : null;
  }

  function getPhysicalHorizontalLocation(pitchLocation) {
    const position = getPitchLocationGridPosition(pitchLocation);
    if (!position) return null;
    const columnCount = locationRows[position.row].length;
    const center = (columnCount - 1) / 2;
    if (position.column < center) return "left";
    if (position.column > center) return "right";
    return "middle";
  }

  function getHitterRelativeHorizontalLocation(pitchLocation, handedness) {
    if (handedness !== "right" && handedness !== "left") return null;
    const horizontal = getPhysicalHorizontalLocation(pitchLocation);
    if (!horizontal || horizontal === "middle") return horizontal;
    if (handedness === "right") return horizontal === "left" ? "inside" : "outside";
    return horizontal === "right" ? "inside" : "outside";
  }

  function getVerticalLocation(pitchLocation) {
    const position = getPitchLocationGridPosition(pitchLocation);
    if (!position) return null;
    const middleRow = (locationRows.length - 1) / 2;
    if (position.row < middleRow - 1) return "above the zone";
    if (position.row < middleRow) return "high";
    if (position.row === middleRow) return "middle-height";
    if (position.row <= middleRow + 1) return "low";
    return "below the zone";
  }

  function describePitchLocation(pitchLocation, handedness) {
    const vertical = getVerticalLocation(pitchLocation);
    const horizontal = getHitterRelativeHorizontalLocation(pitchLocation, handedness)
      || getPhysicalHorizontalLocation(pitchLocation);
    if (!vertical || !horizontal) return "";
    return vertical === "middle-height" ? horizontal : `${vertical} and ${horizontal}`;
  }

  return Object.freeze({
    columnCount: Math.max(...locationRows.map((row) => row.length)),
    rowCount: locationRows.length,
    locations,
    describePitchLocation,
    getHitterRelativeHorizontalLocation,
    getPhysicalHorizontalLocation,
    getPitchLocationGridPosition,
    getVerticalLocation,
  });
});

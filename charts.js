const HIDDEN_CHART_FILTER_OPTIONS = new Set([
  "Left Field Line",
  "Right Field Line",
  "Fielder's Choice",
  "ROE",
  "Sac Bunt",
  "Drag Bunt",
  "Walk",
  "HBP",
]);

const VELOCITY_RANGES_BY_SPORT = {
  softball: ["30-39", "40-49", "50-59", "60-69", "70-79"],
  baseball: ["60-69", "70-79", "80-89", "90-99", "100-109"],
};

function getSavedChartSportType() {
  const sportType =
    typeof window.getCurrentSportType === "function"
      ? window.getCurrentSportType()
      : "baseball";

  return sportType === "softball" ? "softball" : "baseball";
}

function getVelocityRangeOptions(sportType = getSavedChartSportType()) {
  const normalizedSportType = sportType === "softball" ? "softball" : "baseball";

  return VELOCITY_RANGES_BY_SPORT[normalizedSportType];
}

function populateVelocityRangeOptions(select) {
  const previousValue = select.value || "all";
  const ranges = getVelocityRangeOptions();

  select.innerHTML = "";
  ["all", ...ranges].forEach((range) => {
    const option = document.createElement("option");
    option.value = range;
    option.textContent = range === "all" ? "All Velocities" : `${range.replace("-", "–")} mph`;
    select.appendChild(option);
  });

  select.value = ranges.includes(previousValue) ? previousValue : "all";
}

function populatePitchTypeOptions(select) {
  const previousValue = select.value || "all";
  const pitchTypes =
    typeof window.getPitchTypesForSport === "function"
      ? window.getPitchTypesForSport(getSavedChartSportType())
      : [];

  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Pitch Types";
  select.appendChild(allOption);

  pitchTypes.forEach((pitchType) => {
    const option = document.createElement("option");
    option.value = pitchType.value;
    option.textContent = pitchType.filterLabel || pitchType.label;
    select.appendChild(option);
  });

  select.value = pitchTypes.some((pitchType) => pitchType.value === previousValue)
    ? previousValue
    : "all";
}

function normalizePitcherHandedness(value) {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (["r", "rh", "rhp", "right", "righthanded"].includes(normalizedValue)) {
    return "right";
  }

  if (["l", "lh", "lhp", "left", "lefthanded"].includes(normalizedValue)) {
    return "left";
  }

  return "";
}

function matchesPitcherHandedness(pitch, selectedHandedness) {
  if (!selectedHandedness || selectedHandedness === "all") {
    return true;
  }

  const savedHandedness =
    pitch?.pitcherHandedness ||
    pitch?.pitcher_handedness ||
    pitch?.atBat?.pitcherHandedness ||
    pitch?.atBat?.pitcher_handedness ||
    "";

  return normalizePitcherHandedness(savedHandedness) === selectedHandedness;
}

function matchesPitchType(pitch, selectedPitchType) {
  if (!selectedPitchType || selectedPitchType === "all") {
    return true;
  }

  const savedPitchType = pitch?.pitchType || pitch?.pitch_type || "";

  if (!String(savedPitchType).trim()) {
    return false;
  }

  const normalize =
    typeof window.normalizePitchType === "function"
      ? window.normalizePitchType
      : (value) => String(value || "").trim().toLowerCase();

  return normalize(savedPitchType) === normalize(selectedPitchType);
}

function getRecordedPitchVelocity(pitch, atBat = pitch?.atBat) {
  const possibleValues = [
    pitch?.pitchVelocity,
    pitch?.pitch_velocity,
    pitch?.velocity,
    atBat?.pitcherVelocity,
    atBat?.pitchVelocity,
    atBat?.pitch_velocity,
  ];

  for (const value of possibleValues) {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      continue;
    }

    const velocity = Number(value);

    if (Number.isFinite(velocity)) {
      return velocity;
    }
  }

  return null;
}

function matchesVelocityRange(value, selectedRange) {
  if (!selectedRange || selectedRange === "all") {
    return true;
  }

  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return false;
  }

  const velocity = Number(value);
  const [min, max, ...extraParts] = String(selectedRange).split("-").map(Number);

  if (!Number.isFinite(velocity) || !Number.isFinite(min) || !Number.isFinite(max) || extraParts.length > 0) {
    return false;
  }

  return velocity >= min && velocity <= max;
}

window.matchesVelocityRange = matchesVelocityRange;

function removeHiddenChartFilterOptions(filterSelect) {
  Array.from(filterSelect.options).forEach((option) => {
    if (HIDDEN_CHART_FILTER_OPTIONS.has(option.value)) {
      option.remove();
    }
  });
}

function normalizeChartDate(value) {
  const trimmed = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function getChartDateRange(startInput, endInput) {
  return {
    startDate: normalizeChartDate(startInput?.value),
    endDate: normalizeChartDate(endInput?.value),
  };
}

function isGameInChartDateRange(game, dateRange) {
  const gameDate = normalizeChartDate(game?.date);

  if (!gameDate) {
    return false;
  }

  if (dateRange.startDate && gameDate < dateRange.startDate) {
    return false;
  }

  if (dateRange.endDate && gameDate > dateRange.endDate) {
    return false;
  }

  return true;
}

function filterGamesByChartDateRange(games, dateRange) {
  return games.filter((game) => isGameInChartDateRange(game, dateRange));
}

function renderChartStrikeZone() {
  const zoneMap = document.getElementById("chart-zone-map");

  if (!zoneMap) {
    return;
  }

  zoneMap.innerHTML = "";

  const chartPitchLocations =
    Array.isArray(window.pitchLocations) && window.pitchLocations.length
      ? window.pitchLocations
      : Array.isArray(window.dataStorePitchLocations) && window.dataStorePitchLocations.length
        ? window.dataStorePitchLocations
      : [
          { id: "top-left-out", label: "Top Left", isZone: false },
          { id: "high-left-out", label: "High Left", isZone: false },
          { id: "high-mid-out", label: "High", isZone: false },
          { id: "high-right-out", label: "High Right", isZone: false },
          { id: "top-right-out", label: "Top Right", isZone: false },
          { id: "far-left-high-out", label: "Far Inside High", isZone: false },
          { id: "zone-1", label: "Zone 1", isZone: true },
          { id: "zone-2", label: "Zone 2", isZone: true },
          { id: "zone-3", label: "Zone 3", isZone: true },
          { id: "far-right-high-out", label: "Far Outside High", isZone: false },
          { id: "left-out", label: "Inside", isZone: false },
          { id: "zone-4", label: "Zone 4", isZone: true },
          { id: "zone-5", label: "Zone 5", isZone: true },
          { id: "zone-6", label: "Zone 6", isZone: true },
          { id: "right-out", label: "Outside", isZone: false },
          { id: "far-left-low-out", label: "Far Inside Low", isZone: false },
          { id: "zone-7", label: "Zone 7", isZone: true },
          { id: "zone-8", label: "Zone 8", isZone: true },
          { id: "zone-9", label: "Zone 9", isZone: true },
          { id: "far-right-low-out", label: "Far Outside Low", isZone: false },
          { id: "bottom-left-out", label: "Bottom Left", isZone: false },
          { id: "low-left-out", label: "Low Left", isZone: false },
          { id: "low-mid-out", label: "Low", isZone: false },
          { id: "low-right-out", label: "Low Right", isZone: false },
          { id: "bottom-right-out", label: "Bottom Right", isZone: false },
        ];

  chartPitchLocations.forEach((location) => {
    const cell = document.createElement("div");
    const count = document.createElement("span");

    cell.className = `zone-cell ${location.isZone ? "is-zone" : "is-outside"}`;
    cell.setAttribute("aria-label", location.label);
    cell.dataset.locationId = location.id;

    count.className = "zone-count";

    cell.appendChild(count);
    zoneMap.appendChild(cell);
  });
}

window.renderChartStrikeZone = renderChartStrikeZone;

const HOT_COLD_HIT_COLOR = { red: 169, green: 31, blue: 36 };
const HOT_COLD_OUT_COLOR = { red: 7, green: 50, blue: 79 };

function getHotColdColor(hitRatio, outRatio) {
  return {
    red: Math.round((HOT_COLD_HIT_COLOR.red * hitRatio) + (HOT_COLD_OUT_COLOR.red * outRatio)),
    green: Math.round((HOT_COLD_HIT_COLOR.green * hitRatio) + (HOT_COLD_OUT_COLOR.green * outRatio)),
    blue: Math.round((HOT_COLD_HIT_COLOR.blue * hitRatio) + (HOT_COLD_OUT_COLOR.blue * outRatio)),
  };
}

function getChartCellStyle(bucket, filterName, maxCount) {
  const emptyCellStyle = "background: var(--panel-solid); color: var(--muted); border-color: var(--line);";

  if (!bucket || maxCount === 0) {
    return emptyCellStyle;
  }

  if (filterName === "Hot/Cold Zones") {
    const total = bucket.hits + bucket.outs;

    if (total === 0) {
      return emptyCellStyle;
    }

    const hitShare = bucket.hits / total;
    const outShare = bucket.outs / total;
    const color = getHotColdColor(hitShare, outShare);
    const rgbColor = `${color.red}, ${color.green}, ${color.blue}`;

    return `background: rgb(${rgbColor}); color: #ffffff; border-color: rgba(${rgbColor}, 0.55);`;
  }

  if (bucket.count === 0) {
    return emptyCellStyle;
  }

  const opacity = Math.max(0.35, bucket.count / maxCount);

  if (filterName === "Out") {
    return `background: rgba(7, 50, 79, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(7, 50, 79, 0.45);`;
  }

  return `background: rgba(169, 31, 36, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(169, 31, 36, 0.45);`;
}

function renderChartLegend(filterName) {
  const chartLegend = document.getElementById("chart-legend");

  if (!chartLegend) {
    return;
  }

  const isHotColdView = filterName === "Hot/Cold Zones";
  chartLegend.classList.toggle("chart-legend--hot-cold", isHotColdView);

  if (isHotColdView) {
    chartLegend.innerHTML = `
      <div class="legend-hot-cold-scale">
        <div class="legend-hot-cold-labels">
          <span>Outs</span>
          <span>Hits</span>
        </div>
        <span class="legend-hot-cold-gradient" aria-hidden="true"></span>
      </div>
    `;
    return;
  }

  if (filterName === "Out") {
    chartLegend.innerHTML = `
      <span class="legend-swatch legend-out"></span>
      <span>Darker navy = more Out results in that location</span>
    `;
    return;
  }

  chartLegend.innerHTML = `
    <span class="legend-swatch legend-hit"></span>
    <span>Darker red = more matching results in that location</span>
  `;
}

function renderChartsPage() {
  const filterSelect = document.getElementById("chart-filter");
  const velocitySelect = document.getElementById("chart-velocity-filter");
  const handednessSelect = document.getElementById("chart-handedness-filter");
  const pitchTypeSelect = document.getElementById("chart-pitch-type-filter");
  const startDateInput = document.getElementById("chart-start-date");
  const endDateInput = document.getElementById("chart-end-date");
  const chartsEmpty = document.getElementById("charts-empty");
  const zoneMap = document.getElementById("chart-zone-map");
  const filterTotal = document.getElementById("chart-filter-total");
  const chartZoneTitle = document.getElementById("chart-zone-title");

  if (!filterSelect || !velocitySelect || !handednessSelect || !pitchTypeSelect || !startDateInput || !endDateInput || !chartsEmpty || !zoneMap || !filterTotal || !chartZoneTitle) {
    return;
  }

  removeHiddenChartFilterOptions(filterSelect);
  populateVelocityRangeOptions(velocitySelect);
  populatePitchTypeOptions(pitchTypeSelect);

  function renderSelectedFilter() {
    const selectedFilter =
      typeof window.normalizeResultName === "function"
        ? window.normalizeResultName(filterSelect.value)
        : filterSelect.value;
    const savedGames = typeof window.getSavedGames === "function" ? window.getSavedGames() : [];
    const filteredGames = filterGamesByChartDateRange(savedGames, getChartDateRange(startDateInput, endDateInput));
    const allAtBats = typeof window.getAllAtBats === "function" ? window.getAllAtBats(filteredGames) : [];
    const allPitches = typeof window.getAllPitches === "function" ? window.getAllPitches(filteredGames) : [];
    const selectedVelocityRange = velocitySelect.value;
    const selectedHandedness = handednessSelect.value;
    const selectedPitchType = pitchTypeSelect.value;
    const matchesActiveFilters = (pitch) =>
      matchesVelocityRange(getRecordedPitchVelocity(pitch, pitch.atBat), selectedVelocityRange) &&
      matchesPitcherHandedness(pitch, selectedHandedness) &&
      matchesPitchType(pitch, selectedPitchType);
    const filterMatchedPitches = allPitches.filter(matchesActiveFilters);
    const chartData =
      typeof window.getChartDataForFilter === "function"
        ? window.getChartDataForFilter(selectedFilter, filteredGames, matchesActiveFilters)
        : { buckets: {}, totalMatches: 0, matchingPitches: [] };
    const zoneCounts = Object.entries(chartData.buckets || {}).reduce((counts, [locationId, bucket]) => {
      const count =
        selectedFilter === "Hot/Cold Zones"
          ? (bucket.hits || 0) + (bucket.outs || 0)
          : bucket.count || 0;

      if (count > 0) {
        counts[locationId] = count;
      }

      return counts;
    }, {});

    console.log("loaded saved games", savedGames);
    console.log("all pitches found", allPitches);
    console.log("selected filter", selectedFilter);
    console.log("matching chart data", chartData);
    console.log("matching items", chartData.matchingItems || chartData.matchingPitches || []);
    console.log("zone counts", zoneCounts);

    renderChartStrikeZone();

    const buckets = chartData.buckets || {};
    const maxCount =
      selectedFilter === "Hot/Cold Zones"
        ? Math.max(...Object.values(buckets).map((bucket) => bucket.hits + bucket.outs), 0)
        : Math.max(...Object.values(buckets).map((bucket) => bucket.count), 0);

    Object.entries(buckets).forEach(([locationId, bucket]) => {
      const cell = zoneMap.querySelector(`[data-location-id="${locationId}"]`);

      if (!cell) {
        return;
      }

      const isHotColdView = selectedFilter === "Hot/Cold Zones";
      const count = isHotColdView ? bucket.hits + bucket.outs : bucket.count;
      const countElement = cell.querySelector(".zone-count");

      cell.style.cssText = getChartCellStyle(bucket, selectedFilter, maxCount);

      if (countElement) {
        countElement.textContent = count > 0 ? String(count) : "";
      }

      if (isHotColdView && count > 0) {
        const tooltip = [
          `Hits: ${bucket.hits}`,
          `Outs: ${bucket.outs}`,
          `Total results: ${count}`,
        ].join("\n");
        const locationLabel = cell.getAttribute("aria-label") || "Strike zone";

        cell.title = tooltip;
        cell.setAttribute("aria-label", `${locationLabel}. ${tooltip.replace(/\n/g, ". ")}`);
      }
    });

    filterTotal.textContent = String(chartData.totalMatches || 0);
    chartZoneTitle.textContent = selectedFilter;
    const hasActivePitchFilter =
      selectedVelocityRange !== "all" ||
      selectedHandedness !== "all" ||
      selectedPitchType !== "all";
    chartsEmpty.hidden = hasActivePitchFilter
      ? filterMatchedPitches.length > 0
      : allPitches.length > 0 || allAtBats.length > 0;
    renderChartLegend(selectedFilter);
  }

  filterSelect.addEventListener("change", renderSelectedFilter);
  velocitySelect.addEventListener("change", renderSelectedFilter);
  handednessSelect.addEventListener("change", renderSelectedFilter);
  pitchTypeSelect.addEventListener("change", renderSelectedFilter);
  startDateInput.addEventListener("change", renderSelectedFilter);
  endDateInput.addEventListener("change", renderSelectedFilter);
  renderSelectedFilter();
}

window.renderChartsPage = renderChartsPage;

const SPRAY_RESULT_FILTERS = [
  "all",
  "fly_balls",
  "line_drives",
  "ground_balls",
  "hard-hit",
  "weak-contact",
  "hits",
  "outs",
  "singles",
  "doubles",
  "triples",
  "home_runs",
  "on_time",
  "early",
  "late",
];

const SPRAY_HIT_OUT_FILTERS = new Set(["all", "fly_balls", "line_drives", "ground_balls"]);
const SPRAY_HIT_OUTCOMES = new Set(["single", "double", "triple", "home_run"]);
const SPRAY_OUT_OUTCOMES = new Set([
  "out",
  "ground_out",
  "line_out",
  "fly_out",
  "sac_fly",
  "sac_bunt",
  "drag_bunt",
  "fielders_choice",
]);

function normalizeSprayValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[\s-]+/g, "_");
}

function getSprayOutcome(pitch, atBat) {
  return normalizeSprayValue(
    pitch.battedBallOutcome ||
    pitch.batted_ball_outcome ||
    pitch.outcome ||
    atBat.finalOutcome ||
    atBat.outcome
  );
}

function getSprayBattedBallType(pitch, atBat) {
  return normalizeSprayValue(
    pitch.battedBallType ||
    pitch.batted_ball_type ||
    pitch.contact_type ||
    atBat.battedBallType ||
    atBat.batted_ball_type
  );
}

function getSprayTiming(pitch, atBat) {
  const timing = normalizeSprayValue(atBat.timing || pitch.timing || "");

  return timing === "ontime" ? "on_time" : timing;
}

function getSprayLocation(pitch) {
  const x = Number.isFinite(Number(pitch.hitLocationX))
    ? Number(pitch.hitLocationX)
    : Number.isFinite(Number(pitch.hit_location_x))
      ? Number(pitch.hit_location_x)
      : null;
  const y = Number.isFinite(Number(pitch.hitLocationY))
    ? Number(pitch.hitLocationY)
    : Number.isFinite(Number(pitch.hit_location_y))
      ? Number(pitch.hit_location_y)
      : null;

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

function isSprayHit(entry) {
  return SPRAY_HIT_OUTCOMES.has(entry.outcome);
}

function isSprayOut(entry) {
  return SPRAY_OUT_OUTCOMES.has(entry.outcome);
}

function getSprayEntries(games = typeof window.getSavedGames === "function" ? window.getSavedGames() : []) {
  const entries = [];

  games.forEach((game) => {
    if (!Array.isArray(game.atBats)) {
      return;
    }

    game.atBats.forEach((atBat) => {
      if (!Array.isArray(atBat.pitches)) {
        return;
      }

      atBat.pitches.forEach((pitch) => {
        const battedBallType = getSprayBattedBallType(pitch, atBat);
        const outcome = getSprayOutcome(pitch, atBat);
        const location = getSprayLocation(pitch);
        const isBattedBall = pitch.result === "batted_ball" || Boolean(battedBallType || outcome);

        // TODO: Older saved batted balls may not have hitLocationX/Y yet; once edited or relogged,
        // they will flow through this same renderer automatically.
        if (!isBattedBall || !location) {
          return;
        }

        entries.push({
          battedBallType,
          outcome,
          timing: getSprayTiming(pitch, atBat),
          hardHitBall: atBat.hardHitBall,
          velocity: getRecordedPitchVelocity(pitch, atBat),
          pitcherHandedness: pitch.pitcherHandedness,
          pitcher_handedness: pitch.pitcher_handedness,
          pitchType: pitch.pitchType,
          pitch_type: pitch.pitch_type,
          atBat,
          x: location.x,
          y: location.y,
        });
      });
    });
  });

  return entries;
}

function matchesSprayFilter(entry, filterId) {
  if (filterId === "all") {
    return true;
  }

  if (filterId === "fly_balls") {
    return entry.battedBallType === "fly_ball";
  }

  if (filterId === "line_drives") {
    return entry.battedBallType === "line_drive";
  }

  if (filterId === "ground_balls") {
    return entry.battedBallType === "ground_ball";
  }

  if (filterId === "hard-hit") {
    return entry.hardHitBall === true;
  }

  if (filterId === "weak-contact") {
    return entry.hardHitBall === false;
  }

  if (filterId === "hits") {
    return isSprayHit(entry);
  }

  if (filterId === "outs") {
    return isSprayOut(entry);
  }

  if (filterId === "singles") {
    return entry.outcome === "single";
  }

  if (filterId === "doubles") {
    return entry.outcome === "double";
  }

  if (filterId === "triples") {
    return entry.outcome === "triple";
  }

  if (filterId === "home_runs") {
    return entry.outcome === "home_run";
  }

  if (filterId === "on_time") {
    return entry.timing === "on_time";
  }

  if (filterId === "early") {
    return entry.timing === "early";
  }

  if (filterId === "late") {
    return entry.timing === "late";
  }

  return true;
}

function getSprayMarkerClass(entry, filterId) {
  if (SPRAY_HIT_OUT_FILTERS.has(filterId)) {
    return isSprayHit(entry) ? "spray-chart-marker--hit" : "spray-chart-marker--out";
  }

  if (entry.battedBallType === "line_drive") {
    return "spray-chart-marker--line";
  }

  if (entry.battedBallType === "fly_ball") {
    return "spray-chart-marker--fly";
  }

  return "spray-chart-marker--ground";
}

function renderSprayLegend(legendList, filterId) {
  const items = SPRAY_HIT_OUT_FILTERS.has(filterId)
    ? [
        { label: "Hit", className: "spray-legend-dot--hit" },
        { label: "Out", className: "spray-legend-dot--out" },
      ]
    : [
        { label: "Ground Ball", className: "spray-legend-dot--ground" },
        { label: "Line Drive", className: "spray-legend-dot--line" },
        { label: "Fly Ball", className: "spray-legend-dot--fly" },
      ];

  legendList.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("li");
    const dot = document.createElement("span");

    dot.className = `spray-legend-dot ${item.className}`;
    row.appendChild(dot);
    row.append(item.label);
    legendList.appendChild(row);
  });
}

function renderSprayChartsPage() {
  const filterSelect = document.getElementById("spray-result-filter");
  const velocitySelect = document.getElementById("spray-velocity-filter");
  const handednessSelect = document.getElementById("spray-handedness-filter");
  const pitchTypeSelect = document.getElementById("spray-pitch-type-filter");
  const startDateInput = document.getElementById("spray-start-date");
  const endDateInput = document.getElementById("spray-end-date");
  const markerLayer = document.getElementById("spray-marker-layer");
  const emptyState = document.getElementById("spray-empty-state");
  const legendList = document.getElementById("spray-legend-list");

  if (!filterSelect || !velocitySelect || !handednessSelect || !pitchTypeSelect || !startDateInput || !endDateInput || !markerLayer || !emptyState || !legendList) {
    return;
  }

  populateVelocityRangeOptions(velocitySelect);
  populatePitchTypeOptions(pitchTypeSelect);

  function renderSelectedFilter() {
    const filterId = SPRAY_RESULT_FILTERS.includes(filterSelect.value) ? filterSelect.value : "all";
    const savedGames = typeof window.getSavedGames === "function" ? window.getSavedGames() : [];
    const filteredGames = filterGamesByChartDateRange(savedGames, getChartDateRange(startDateInput, endDateInput));
    const selectedVelocityRange = velocitySelect.value;
    const selectedHandedness = handednessSelect.value;
    const selectedPitchType = pitchTypeSelect.value;
    const matches = getSprayEntries(filteredGames).filter(
      (entry) =>
        matchesSprayFilter(entry, filterId) &&
        matchesVelocityRange(entry.velocity, selectedVelocityRange) &&
        matchesPitcherHandedness(entry, selectedHandedness) &&
        matchesPitchType(entry, selectedPitchType)
    );

    markerLayer.innerHTML = "";
    matches.forEach((entry) => {
      const marker = document.createElement("span");
      marker.className = `spray-chart-marker ${getSprayMarkerClass(entry, filterId)}`;
      marker.style.left = `${entry.x * 100}%`;
      marker.style.top = `${entry.y * 100}%`;
      marker.title = `${entry.battedBallType || "Batted ball"} ${entry.outcome || ""}`.trim();
      markerLayer.appendChild(marker);
    });

    emptyState.hidden = matches.length > 0;
    renderSprayLegend(legendList, filterId);
  }

  filterSelect.value = "all";
  filterSelect.addEventListener("change", renderSelectedFilter);
  velocitySelect.addEventListener("change", renderSelectedFilter);
  handednessSelect.addEventListener("change", renderSelectedFilter);
  pitchTypeSelect.addEventListener("change", renderSelectedFilter);
  startDateInput.addEventListener("change", renderSelectedFilter);
  endDateInput.addEventListener("change", renderSelectedFilter);
  renderSelectedFilter();
}

window.renderSprayChartsPage = renderSprayChartsPage;

function getChartsViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get("view");

  return requestedView === "heat-maps" || requestedView === "spray-charts" ? requestedView : "landing";
}

function setChartsView(viewName) {
  document.querySelectorAll("[data-chart-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.chartView === viewName);
  });
}

window.setChartsView = setChartsView;

document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.dataset.page !== "charts") {
    return;
  }

  setChartsView(getChartsViewFromUrl());
  renderChartStrikeZone();

  // This page-specific bootstrap keeps the Heat Maps view ready when opened.
  if (typeof window.renderChartsPage === "function") {
    window.renderChartsPage();
  }

  if (typeof window.renderSprayChartsPage === "function") {
    window.renderSprayChartsPage();
  }
});

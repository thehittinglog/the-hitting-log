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

function removeHiddenChartFilterOptions(filterSelect) {
  Array.from(filterSelect.options).forEach((option) => {
    if (HIDDEN_CHART_FILTER_OPTIONS.has(option.value)) {
      option.remove();
    }
  });
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
    const label = document.createElement("span");
    const count = document.createElement("span");

    cell.className = `zone-cell ${location.isZone ? "is-zone" : "is-outside"}`;
    cell.setAttribute("aria-label", location.label);
    cell.dataset.locationId = location.id;

    label.className = "zone-label";
    label.textContent = location.isZone ? location.label.replace("Zone ", "") : "";

    count.className = "zone-count";

    cell.appendChild(label);
    cell.appendChild(count);
    zoneMap.appendChild(cell);
  });
}

window.renderChartStrikeZone = renderChartStrikeZone;

function getChartCellStyle(bucket, filterName, maxCount) {
  if (!bucket || maxCount === 0) {
    return "";
  }

  if (filterName === "Hot/Cold Zones") {
    const total = bucket.hits + bucket.outs;

    if (total === 0) {
      return "";
    }

    const hitShare = bucket.hits / total;
    const outShare = bucket.outs / total;

    if (hitShare > outShare) {
      const opacity = Math.max(0.2, hitShare * (total / maxCount));
      return `background: rgba(228, 0, 44, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(228, 0, 44, 0.45);`;
    }

    const opacity = Math.max(0.2, outShare * (total / maxCount));
    return `background: rgba(12, 35, 64, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(12, 35, 64, 0.45);`;
  }

  if (bucket.count === 0) {
    return "";
  }

  const opacity = Math.max(0.35, bucket.count / maxCount);

  if (filterName === "Out") {
    return `background: rgba(12, 35, 64, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(12, 35, 64, 0.45);`;
  }

  return `background: rgba(228, 0, 44, ${opacity.toFixed(2)}); color: #ffffff; border-color: rgba(228, 0, 44, 0.45);`;
}

function renderChartLegend(filterName) {
  const chartLegend = document.getElementById("chart-legend");

  if (!chartLegend) {
    return;
  }

  if (filterName === "Hot/Cold Zones") {
    chartLegend.innerHTML = `
      <span class="legend-swatch legend-hit"></span>
      <span>Red = Single, Double, Triple, Home Run</span>
      <span class="legend-swatch legend-out"></span>
      <span>Navy = Out</span>
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
  const generateButton = document.getElementById("generate-chart-button");
  const chartsEmpty = document.getElementById("charts-empty");
  const zoneMap = document.getElementById("chart-zone-map");
  const filterTotal = document.getElementById("chart-filter-total");
  const chartZoneTitle = document.getElementById("chart-zone-title");

  if (!filterSelect || !generateButton || !chartsEmpty || !zoneMap || !filterTotal || !chartZoneTitle) {
    return;
  }

  removeHiddenChartFilterOptions(filterSelect);

  function renderSelectedFilter() {
    const selectedFilter =
      typeof window.normalizeResultName === "function"
        ? window.normalizeResultName(filterSelect.value)
        : filterSelect.value;
    const savedGames = typeof window.getSavedGames === "function" ? window.getSavedGames() : [];
    const allAtBats = typeof window.getAllAtBats === "function" ? window.getAllAtBats() : [];
    const allPitches = typeof window.getAllPitches === "function" ? window.getAllPitches() : [];
    const chartData =
      typeof window.getChartDataForFilter === "function"
        ? window.getChartDataForFilter(selectedFilter)
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

      const count = selectedFilter === "Hot/Cold Zones" ? bucket.hits + bucket.outs : bucket.count;
      const countElement = cell.querySelector(".zone-count");

      cell.style.cssText = getChartCellStyle(bucket, selectedFilter, maxCount);

      if (countElement) {
        countElement.textContent = count > 0 ? String(count) : "";
      }
    });

    filterTotal.textContent = String(chartData.totalMatches || 0);
    chartZoneTitle.textContent = selectedFilter;
    chartsEmpty.hidden = allPitches.length > 0 || allAtBats.length > 0;
    renderChartLegend(selectedFilter);
  }

  generateButton.addEventListener("click", renderSelectedFilter);
  filterSelect.addEventListener("change", renderSelectedFilter);
  renderSelectedFilter();
}

window.renderChartsPage = renderChartsPage;

const SPRAY_RESULT_FILTERS = [
  "all",
  "fly_balls",
  "line_drives",
  "ground_balls",
  "hits",
  "outs",
  "singles",
  "doubles",
  "triples",
  "home_runs",
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

function getSprayEntries() {
  const games = typeof window.getSavedGames === "function" ? window.getSavedGames() : [];
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
  const markerLayer = document.getElementById("spray-marker-layer");
  const emptyState = document.getElementById("spray-empty-state");
  const legendList = document.getElementById("spray-legend-list");

  if (!filterSelect || !markerLayer || !emptyState || !legendList) {
    return;
  }

  function renderSelectedFilter() {
    const filterId = SPRAY_RESULT_FILTERS.includes(filterSelect.value) ? filterSelect.value : "all";
    const matches = getSprayEntries().filter((entry) => matchesSprayFilter(entry, filterId));

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

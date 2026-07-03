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

document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.dataset.page !== "charts") {
    return;
  }

  renderChartStrikeZone();

  // This page-specific bootstrap updates the always-visible strike zone with chart data.
  if (typeof window.renderChartsPage === "function") {
    window.renderChartsPage();
  }
});

(function () {
  const metricThresholds = {
    hardHitBallPercent: {
      good: (value) => value >= 70,
      average: (value) => value >= 40 && value < 70,
      poor: (value) => value < 40,
    },
    twoStrikePercent: {
      good: (value) => value <= 25,
      average: (value) => value > 25 && value <= 50,
      poor: (value) => value > 50,
    },
  };

  const performanceClasses = ["metric-good", "metric-average", "metric-poor"];

  function normalizeMetricPerformanceValue(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const parsedValue = Number.parseFloat(value.replace("%", ""));
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
  }

  function getMetricPerformanceColor(metricKey, value) {
    const thresholds = metricThresholds[metricKey];
    const normalizedValue = normalizeMetricPerformanceValue(value);

    if (!thresholds || normalizedValue === null) {
      return "";
    }

    if (thresholds.good(normalizedValue)) {
      return "green";
    }

    if (thresholds.poor(normalizedValue)) {
      return "red";
    }

    if (thresholds.average(normalizedValue)) {
      return "black";
    }

    return "";
  }

  function applyMetricPerformanceColor(element, metricKey, value) {
    const color = getMetricPerformanceColor(metricKey, value);

    element.classList.remove(...performanceClasses);

    if (color === "green") {
      element.classList.add("metric-good");
      return;
    }

    if (color === "red") {
      element.classList.add("metric-poor");
      return;
    }

    if (color === "black") {
      element.classList.add("metric-average");
    }
  }

  window.metricThresholds = metricThresholds;
  window.getMetricPerformanceColor = getMetricPerformanceColor;
  window.applyMetricPerformanceColor = applyMetricPerformanceColor;
})();

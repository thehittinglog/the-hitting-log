(function () {
  const metricThresholds = {
    hardHitBallPercent: {
      good: (value) => value >= 60,
      average: (value) => value >= 50 && value < 60,
      poor: (value) => value < 50,
    },
    twoStrikePercent: {
      good: (value) => value <= 30,
      average: (value) => value > 30 && value <= 40,
      poor: (value) => value > 40,
    },
    hardHitTwoStrikePercent: {
      good: (value) => value >= 70,
      average: (value) => value >= 50 && value < 70,
      poor: (value) => value < 50,
    },
    productiveOutPercent: {
      good: (value) => value >= 70,
      average: (value) => value >= 50 && value < 70,
      poor: (value) => value < 50,
    },
    chaseRate: {
      good: (value) => value <= 20,
      average: (value) => value > 20 && value <= 35,
      poor: (value) => value > 35,
    },
    contactRate: {
      good: (value) => value >= 85,
      average: (value) => value >= 75 && value < 85,
      poor: (value) => value < 75,
    },
    qualityAtBatPercent: {
      good: (value) => value >= 75,
      average: (value) => value >= 60 && value < 75,
      poor: (value) => value < 60,
    },
    extraBaseHitPercent: {
      good: (value) => value >= 30,
      average: (value) => value >= 15 && value < 30,
      poor: (value) => value < 15,
    },
    battingAverage: {
      good: (value) => value >= 0.35,
      average: (value) => value >= 0.25 && value < 0.35,
      poor: (value) => value < 0.25,
    },
    onBasePercentage: {
      good: (value) => value >= 0.43,
      average: (value) => value >= 0.33 && value < 0.43,
      poor: (value) => value < 0.33,
    },
    sluggingPercentage: {
      good: (value) => value >= 0.6,
      average: (value) => value >= 0.4 && value < 0.6,
      poor: (value) => value < 0.4,
    },
    ops: {
      good: (value) => value >= 1,
      average: (value) => value >= 0.75 && value < 1,
      poor: (value) => value < 0.75,
    },
    hitsPerGame: {
      good: (value) => value >= 1.5,
      average: (value) => value >= 1 && value < 1.5,
      poor: (value) => value < 1,
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

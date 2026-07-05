(function () {
  const metricDefinitions = {
    games: {
      title: "Games",
      definition: "The total number of games saved in your hitting log.",
      formula: "Count of saved games",
      explanation: "This gives context for the size of the sample behind the rest of your numbers.",
    },
    atBats: {
      title: "At-Bats",
      definition: "The total number of official at-bats recorded across saved games.",
      formula: "Singles + Doubles + Triples + Home Runs + Outs + Strikeouts + Reached On Error + Fielder's Choice",
      explanation: "At-bats are the base sample for batting average and many production trends.",
    },
    hits: {
      title: "Hits",
      definition: "The total number of singles, doubles, triples, and home runs.",
      formula: "Singles + Doubles + Triples + Home Runs",
      explanation: "Hits are the simplest measure of offensive results and feed most production stats.",
    },
    battingAverage: {
      title: "Batting Average",
      definition: "The rate of hits per official at-bat.",
      formula: "Hits / At-Bats",
      explanation: "Batting average shows how often at-bats turn into hits.",
    },
    onBasePercentage: {
      title: "OBP",
      definition: "The rate at which plate appearances result in reaching base.",
      formula: "(Hits + Walks + Hit By Pitch) / Plate Appearances",
      explanation: "OBP rewards hitters who avoid outs and create baserunners.",
    },
    sluggingPercentage: {
      title: "Slugging",
      definition: "Total bases per official at-bat.",
      formula: "Total Bases / At-Bats",
      explanation: "Slugging shows extra-base impact, not just whether a hit happened.",
    },
    ops: {
      title: "OPS",
      definition: "A combined measure of getting on base and hitting for power.",
      formula: "On-Base Percentage + Slugging Percentage",
      explanation: "OPS is a quick snapshot of overall offensive production.",
    },
    bestGame: {
      title: "Best Game",
      definition: "The saved game with the highest hit total.",
      formula: "Highest hits in a single saved game",
      explanation: "This highlights standout single-game production.",
    },
    lastOpponent: {
      title: "Last Opponent",
      definition: "The opponent from your most recently dated saved game.",
      formula: "Opponent from the newest saved game date",
      explanation: "This helps orient your recent log history at a glance.",
    },
    baLastFive: {
      title: "BA Last 5",
      definition: "Batting average across your five most recent saved games.",
      formula: "Hits in last 5 games / At-Bats in last 5 games",
      explanation: "This helps show recent batting trend without replacing full-season results.",
    },
    opsLastFive: {
      title: "OPS Last 5",
      definition: "OPS across your five most recent saved games.",
      formula: "OBP over last 5 games + SLG over last 5 games",
      explanation: "This gives a recent production trend that includes power and on-base value.",
    },
    hittingLogPerformanceScore: {
      title: "Hitting Log Performance Score",
      definition: "A 0-100 development score that blends contact quality, quality at-bats, productive outs, and two-strike performance.",
      formula: "(Hard Hit Ball % x 0.45) + (Quality At-Bat % x 0.25) + (Productive Outs % x 0.20) + (Two-Strike Adjustment x 0.10). Two-Strike Adjustment = 100 - (Two-Strike % x ((100 - Hard Hit Ball % w/ 2 Strikes) / 100)).",
      explanation: "This creates one quick read on game or season performance while still rewarding strong no-out games by redistributing the productive-out weight when no outs were recorded.",
    },
    hardHitBallPercent: {
      title: "Hard Hit Ball %",
      definition: "The percentage of batted balls that are classified as hard hit.",
      formula: "Hard Hit Balls / Total Batted Balls x 100",
      explanation: "A higher percentage generally indicates stronger quality of contact and better offensive production.",
    },
    twoStrikePercent: {
      title: "Two-Strike %",
      definition: "The percentage of plate appearances that reached a two-strike count.",
      formula: "Two-Strike At-Bats / Plate Appearances x 100",
      explanation: "This shows how often at-bats get deep into two-strike situations.",
    },
    hardHitTwoStrikePercent: {
      title: "Hard Hit Ball % w/ 2 Strikes",
      definition: "The percentage of two-strike at-bats that produced hard contact.",
      formula: "Hard-Hit Two-Strike At-Bats / Two-Strike At-Bats x 100",
      explanation: "This helps track whether quality contact holds up in tougher counts.",
    },
    productiveOutPercent: {
      title: "Productive Out %",
      definition: "The percentage of outs that moved or scored a runner.",
      formula: "Productive Outs / Total Outs x 100",
      explanation: "Productive outs can still create team value even when the at-bat does not produce a hit.",
    },
    lineDrivePercent: {
      title: "Line Drive %",
      definition: "The percentage of balls in play logged as line drives.",
      formula: "Line Drives / Balls In Play x 100",
      explanation: "Line drives are often strong indicators of quality contact.",
    },
    groundBallPercent: {
      title: "Ground Ball %",
      definition: "The percentage of balls in play logged as ground balls.",
      formula: "Ground Balls / Balls In Play x 100",
      explanation: "Ground-ball rate helps describe contact shape and swing path trends.",
    },
    flyBallPercent: {
      title: "Fly Ball %",
      definition: "The percentage of balls in play logged as fly balls.",
      formula: "Fly Balls / Balls In Play x 100",
      explanation: "Fly-ball rate helps explain launch tendency and extra-base-hit opportunities.",
    },
    extraBaseHitPercent: {
      title: "Extra Base Hit %",
      definition: "The percentage of hits that went for extra bases.",
      formula: "(Doubles + Triples + Home Runs) / Hits x 100",
      explanation: "This shows how much of your hit production creates additional bases.",
    },
    chaseRate: {
      title: "Chase Rate",
      definition: "The percentage of out-of-zone pitches that resulted in swings.",
      formula: "Out-of-Zone Swings / Out-of-Zone Pitches x 100",
      explanation: "Lower chase rates usually reflect better strike-zone discipline.",
    },
    contactRate: {
      title: "Contact Rate",
      definition: "The percentage of swings that resulted in contact.",
      formula: "Contact Swings / Total Swings x 100",
      explanation: "Contact rate helps evaluate bat-to-ball skill and swing decisions.",
    },
    qualityAtBatPercent: {
      title: "Quality At-Bat %",
      definition: "The percentage of plate appearances that met the app's quality at-bat criteria.",
      formula: "Quality At-Bats / Plate Appearances x 100",
      explanation: "This gives a broader development view than hit results alone.",
    },
    hitsPerGame: {
      title: "Hits Per Game",
      definition: "Average number of hits per saved game.",
      formula: "Hits / Games",
      explanation: "This helps compare production across different stretches of the season.",
    },
    atBatsPerGame: {
      title: "At-Bats Per Game",
      definition: "Average number of official at-bats per saved game.",
      formula: "At-Bats / Games",
      explanation: "This helps contextualize opportunity volume game to game.",
    },
    multiHitGames: {
      title: "Multi-Hit Games",
      definition: "The number of saved games with two or more hits.",
      formula: "Count of games where Hits >= 2",
      explanation: "Multi-hit games show consistency in producing multiple positive outcomes.",
    },
    zeroHitGames: {
      title: "Zero-Hit Games",
      definition: "The number of saved games with no hits.",
      formula: "Count of games where Hits = 0",
      explanation: "Tracking zero-hit games helps identify consistency and development opportunities.",
    },
    bestSingleGame: {
      title: "Best Single Game",
      definition: "Your highest hit total in one saved game.",
      formula: "Maximum hits in any saved game",
      explanation: "This highlights peak single-game offensive output.",
    },
    gamesWithHit: {
      title: "Games With A Hit",
      definition: "The number of saved games where at least one hit was recorded.",
      formula: "Count of games where Hits > 0",
      explanation: "This is a simple consistency marker across the game log.",
    },
    recentThreeAverage: {
      title: "Recent 3-Game Average",
      definition: "Batting average across your three most recent saved games.",
      formula: "Hits in last 3 games / At-Bats in last 3 games",
      explanation: "This gives a short-term view of recent hitting results.",
    },
    recentThreeOps: {
      title: "Recent 3-Game OPS",
      definition: "OPS across your three most recent saved games.",
      formula: "OBP over last 3 games + SLG over last 3 games",
      explanation: "This gives a short-term production view that includes on-base and power.",
    },
    mostRecentGame: {
      title: "Most Recent Game",
      definition: "The newest saved game by date.",
      formula: "Most recent game date and opponent",
      explanation: "This anchors the advanced stats view to your latest logged activity.",
    },
  };

  let activeButton = null;
  let activePopover = null;

  function closeMetricInfo() {
    if (activeButton) {
      activeButton.setAttribute("aria-expanded", "false");
    }

    if (activePopover) {
      activePopover.remove();
    }

    activeButton = null;
    activePopover = null;
  }

  function renderMetricContent(content) {
    if (Array.isArray(content)) {
      const list = document.createElement("ul");

      content.forEach((item) => {
        const row = document.createElement("li");
        row.textContent = item;
        list.appendChild(row);
      });

      return list;
    }

    if (content && typeof content === "object") {
      if (content.type === "link") {
        const link = document.createElement("a");
        link.href = content.href || "#";
        link.textContent = content.label || content.href || "Learn more";
        return link;
      }

      if (content.type === "image") {
        const image = document.createElement("img");
        image.src = content.src || "";
        image.alt = content.alt || "";
        return image;
      }

      if (content.type === "video") {
        const video = document.createElement("video");
        video.src = content.src || "";
        video.controls = true;
        return video;
      }
    }

    const body = document.createElement("p");
    body.textContent = content || "";
    return body;
  }

  function createSection(label, content) {
    const section = document.createElement("section");
    const heading = document.createElement("h4");

    heading.textContent = label;
    section.appendChild(heading);
    section.appendChild(renderMetricContent(content));
    return section;
  }

  function positionPopover(popover, button) {
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const gap = 10;
    const viewportPadding = 12;
    const top = buttonRect.bottom + window.scrollY + gap;
    const idealLeft = buttonRect.left + window.scrollX + (buttonRect.width / 2) - (popoverRect.width / 2);
    const maxLeft = window.scrollX + window.innerWidth - popoverRect.width - viewportPadding;
    const left = Math.max(window.scrollX + viewportPadding, Math.min(idealLeft, maxLeft));

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.setProperty("--metric-info-arrow-left", `${buttonRect.left + window.scrollX + (buttonRect.width / 2) - left}px`);
  }

  function openMetricInfo(button, definition) {
    const popover = document.createElement("div");
    const title = document.createElement("h3");

    closeMetricInfo();

    popover.className = "metric-info-popover";
    popover.id = button.getAttribute("aria-controls");
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", `${definition.title} information`);

    title.textContent = definition.title;
    popover.appendChild(title);
    popover.appendChild(createSection("Definition", definition.definition));
    popover.appendChild(createSection("Formula", definition.formula));
    popover.appendChild(createSection("Why It Matters", definition.explanation));

    document.body.appendChild(popover);
    activeButton = button;
    activePopover = popover;
    button.setAttribute("aria-expanded", "true");
    positionPopover(popover, button);
  }

  function renderMetricInfoButton(label, metricKey, index) {
    const definition = metricDefinitions[metricKey];

    if (!definition || label.querySelector(".metric-info-button")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-info-button";
    button.textContent = "?";
    button.setAttribute("aria-label", `Learn about ${definition.title}`);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", `metric-info-popover-${metricKey}-${index}`);

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      if (activeButton === button) {
        closeMetricInfo();
        return;
      }

      openMetricInfo(button, definition);
    });

    label.classList.add("stat-label--with-info");
    label.appendChild(button);
  }

  function initializeMetricInfo() {
    document.querySelectorAll("[data-metric-info]").forEach((label, index) => {
      renderMetricInfoButton(label, label.dataset.metricInfo, index);
    });

    document.addEventListener("click", (event) => {
      if (!activePopover) {
        return;
      }

      if (activePopover.contains(event.target) || activeButton?.contains(event.target)) {
        return;
      }

      closeMetricInfo();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMetricInfo();
      }
    });

    window.addEventListener("resize", () => {
      if (activePopover && activeButton) {
        positionPopover(activePopover, activeButton);
      }
    });

    window.addEventListener("scroll", () => {
      if (activePopover && activeButton) {
        positionPopover(activePopover, activeButton);
      }
    }, true);
  }

  window.metricDefinitions = metricDefinitions;
  window.initializeMetricInfo = initializeMetricInfo;

  document.addEventListener("DOMContentLoaded", initializeMetricInfo);
})();

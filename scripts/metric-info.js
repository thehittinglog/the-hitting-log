(function () {
  const metricDefinitions = {
    pitcherVelocity: {
      title: "Pitcher Velocity",
      body: "Enter the pitcher's top recorded velocity if it is known. This should be the fastest pitch they are capable of throwing, not necessarily the speed of the current pitch. If the pitcher's velocity is unknown, simply leave this field blank.",
    },
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
      sections: [
        {
          label: "Definition",
          content: "The Hitting Log Performance Score™ is a proprietary 0-100 rating that evaluates the overall quality of a player's offensive performance in a game.",
        },
        {
          label: "What It's Based On",
          content: [
            "Hard Hit Ball %",
            "Quality At-Bat %",
            "Productive Outs %",
            "Two-Strike Performance",
          ],
          note: "These metrics are weighted using Hitting Log's proprietary scoring model to generate a single overall Performance Score.",
        },
        {
          label: "Why It Matters",
          content: "The Performance Score is designed to reward the process that leads to long-term offensive success, rather than simply rewarding outcomes. Players who consistently make quality contact, produce quality at-bats, compete with two strikes, and help their team offensively will generally earn higher Performance Scores.",
        },
      ],
      footer: "Hitting Log Performance Score™ is calculated using Hitting Log's proprietary performance model.",
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
      definition: "The percentage of balls put in play with two strikes that were hit hard.",
      formula: "Hard-Hit Two-Strike Balls in Play / Two-Strike Balls in Play x 100",
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
    onTimePercent: {
      title: "On-Time Percentage",
      definition: "The percentage of at-bats with timing recorded that were logged as on time.",
      formula: "On Time Timing Results / Total At-Bats With Timing Recorded x 100",
      explanation: "This helps track how often swing timing is synced with the pitch.",
    },
    earlyPercent: {
      title: "Early Percentage",
      definition: "The percentage of at-bats with timing recorded that were logged as early.",
      formula: "Early Timing Results / Total At-Bats With Timing Recorded x 100",
      explanation: "This can reveal whether timing issues are showing up ahead of the pitch.",
    },
    latePercent: {
      title: "Late Percentage",
      definition: "The percentage of at-bats with timing recorded that were logged as late.",
      formula: "Late Timing Results / Total At-Bats With Timing Recorded x 100",
      explanation: "This can reveal whether timing issues are showing up behind the pitch.",
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
  let hoverCloseTimer = null;
  let infoButtonCount = 0;

  function supportsMetricInfoHover() {
    return typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function clearMetricInfoCloseTimer() {
    if (hoverCloseTimer) {
      window.clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    }
  }

  function scheduleMetricInfoClose(button) {
    clearMetricInfoCloseTimer();
    hoverCloseTimer = window.setTimeout(() => {
      if (activeButton === button) {
        closeMetricInfo();
      }
    }, 150);
  }

  function closeMetricInfo() {
    clearMetricInfoCloseTimer();

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

  function createMetricInfoSection(sectionDefinition) {
    const section = createSection(sectionDefinition.label, sectionDefinition.content);

    if (sectionDefinition.note) {
      const note = document.createElement("p");
      note.className = "metric-info-note";
      note.textContent = sectionDefinition.note;
      section.appendChild(note);
    }

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

    if (definition.body) {
      popover.appendChild(renderMetricContent(definition.body));
    } else if (Array.isArray(definition.sections)) {
      definition.sections.forEach((sectionDefinition) => {
        popover.appendChild(createMetricInfoSection(sectionDefinition));
      });
    } else {
      popover.appendChild(createSection("Definition", definition.definition));
      popover.appendChild(createSection("Formula", definition.formula));
      popover.appendChild(createSection("Why It Matters", definition.explanation));
    }

    if (definition.footer) {
      const footer = document.createElement("p");
      footer.className = "metric-info-footer";
      footer.textContent = definition.footer;
      popover.appendChild(footer);
    }

    document.body.appendChild(popover);
    activeButton = button;
    activePopover = popover;
    button.setAttribute("aria-expanded", "true");
    positionPopover(popover, button);

    if (supportsMetricInfoHover()) {
      popover.addEventListener("mouseenter", clearMetricInfoCloseTimer);
      popover.addEventListener("mouseleave", () => scheduleMetricInfoClose(button));
    }
  }

  function renderMetricInfoButton(label, metricKey) {
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
    button.setAttribute("aria-controls", `metric-info-popover-${metricKey}-${infoButtonCount}`);
    infoButtonCount += 1;

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      if (activeButton === button) {
        closeMetricInfo();
        return;
      }

      openMetricInfo(button, definition);
    });

    button.addEventListener("mouseenter", () => {
      if (!supportsMetricInfoHover()) {
        return;
      }

      clearMetricInfoCloseTimer();

      if (activeButton !== button) {
        openMetricInfo(button, definition);
      }
    });

    button.addEventListener("mouseleave", () => {
      if (supportsMetricInfoHover()) {
        scheduleMetricInfoClose(button);
      }
    });

    label.classList.add("stat-label--with-info");
    label.appendChild(button);
  }

  function initializeMetricInfo() {
    document.querySelectorAll("[data-metric-info]").forEach((label) => {
      renderMetricInfoButton(label, label.dataset.metricInfo);
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
  window.renderMetricInfoButton = renderMetricInfoButton;

  document.addEventListener("DOMContentLoaded", initializeMetricInfo);
})();

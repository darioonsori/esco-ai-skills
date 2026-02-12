/* ============================================================
   AI-related occupations & skills (ESCO) — main.js
   ============================================================ */

/* =======================
   TOC collapse / expand (gutter-left FAB, no overlap, no persistence)
   ======================= */
function initTocToggle() {
  const body = document.body;
  const toc = document.querySelector(".toc");
  const tocToggle = document.getElementById("toc-toggle");
  if (!tocToggle || !toc) return;

  // Reuse existing floating button if present (avoid duplicates)
  let showBtn = document.querySelector(".toc-fab");
  if (!showBtn) {
    showBtn = document.createElement("button");
    showBtn.type = "button";
    showBtn.className = "toc-fab";
    showBtn.innerHTML = `<span>Show</span><span>Contents</span>`;
    showBtn.setAttribute("aria-label", "Show table of contents");
    document.body.appendChild(showBtn);
  }

  const hero = document.querySelector(".site-hero");
  const heroH = () => (hero ? hero.getBoundingClientRect().height : 240);

  function isCollapsed() {
    return body.classList.contains("toc-collapsed");
  }

  // Place FAB in the left "gutter"
  function positionFabInGutter() {
    const gap = 12;
  
    // On small screens, avoid FAB (overlap)
    if (window.innerWidth <= 980) {
      showBtn.style.display = "none";
      return;
    }
  
    // Measure button width even if display:none
    const prevDisplay = showBtn.style.display;
    const prevVis = showBtn.style.visibility;
    showBtn.style.visibility = "hidden";
    showBtn.style.display = "inline-flex";
    const btnW = Math.ceil(showBtn.getBoundingClientRect().width || 140);
    showBtn.style.display = prevDisplay;
    showBtn.style.visibility = prevVis || "";
  
    // Anchor to the REAL left edge of your content container (.layout)
    const layout = document.querySelector(".layout");
    const layoutRect = layout ? layout.getBoundingClientRect() : { left: 20 };
  
    // Place the button just OUTSIDE the layout, in the gutter, but keep it on-screen
    const extraLeft = 48; // <-- spostalo ancora più a sinistra (prova 48, 64, 80)
    const left = Math.max(8, Math.round(layoutRect.left - btnW - gap - extraLeft));

    showBtn.style.position = "fixed";
    showBtn.style.left = `${left}px`;
    showBtn.style.right = "auto";
    showBtn.style.transform = "none";     // IMPORTANT: no translateX tricks
    showBtn.style.zIndex = "9999";
  }

  function updateFloatingVisibility() {
    const collapsed = isCollapsed();
  
    // solo desktop
    if (window.innerWidth <= 980) {
      showBtn.style.display = "none";
      return;
    }
  
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const h = heroH();
    const inHeroZone = y < (h - 40);
  
    // calcolo top: sotto hero se sei "in alto", altrimenti top standard
    const baseTop = 18;
    const topBelowHero = Math.round((h - y) + 18);
    const top = Math.max(12, inHeroZone ? topBelowHero : baseTop);
  
    positionFabInGutter();
    showBtn.style.top = `calc(${top}px + env(safe-area-inset-top))`;
  
    showBtn.style.display = collapsed ? "inline-flex" : "none";
  }

  function setCollapsed(collapsed) {
    body.classList.toggle("toc-collapsed", collapsed);

    tocToggle.setAttribute("aria-pressed", String(collapsed));
    tocToggle.textContent = collapsed ? "Expand" : "Collapse";
    tocToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");

    updateFloatingVisibility();
  }

  // Bind listeners once
  if (!tocToggle.dataset.bound) {
    tocToggle.dataset.bound = "1";
    tocToggle.addEventListener("click", () => setCollapsed(!isCollapsed()));
  }
  if (!showBtn.dataset.bound) {
    showBtn.dataset.bound = "1";
    showBtn.addEventListener("click", () => setCollapsed(false));
  }

  window.addEventListener("scroll", updateFloatingVisibility, { passive: true });
  window.addEventListener("resize", updateFloatingVisibility);

  // Default on refresh = expanded
  setCollapsed(false);
}

initTocToggle();

/* =======================
   Chart 1: Core size per occupation
   - stacked HORIZONTAL bars (essential vs optional)
   - controls: sort, show top, min AI skills >= X  (NEW, default 2)
   ======================= */
async function drawRelationChart() {
  const container = d3.select("#relation-chart");
  container.selectAll("*").remove();

  // Tooltip singleton
  const tooltip = d3.select("body").selectAll("div.tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("display", "none");

  // Controls
  const controls = container.append("div").attr("class", "chart-controls");

  // --- Order by
  controls.append("span")
    .attr("class", "chart-controls__label")
    .text("Order by:");

  const sortSelect = controls.append("select")
    .attr("class", "chart-controls__select")
    .attr("aria-label", "Sort occupations");

  sortSelect.selectAll("option")
    .data([
      { value: "total", label: "Total AI skills" },
      { value: "shareEssential", label: "Share of essential skills" }
    ])
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.label);

  // --- Micro-line under "Order by" (dynamic)
  const sortMicro = controls.append("span")
    .attr("class", "chart-controls__micro")
    .style("order", 98)
    .style("flex-basis", "100%")
    .text("");

  // --- Show top
  controls.append("span")
    .attr("class", "chart-controls__label")
    .style("margin-left", "14px")
    .text("Show:");

  const topSelect = controls.append("select")
    .attr("class", "chart-controls__select")
    .attr("aria-label", "Select how many occupations to display");

  topSelect.selectAll("option")
    .data([
      { value: "10",  label: "Top 10" },
      { value: "20",  label: "Top 20" },
      { value: "30",  label: "Top 30" },
      { value: "all", label: "All" }
    ])
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.label);

  // --- Min AI skills (ONE LINE: label + info + value + slider) no ticks
  const minWrap = controls.append("div")
    .attr("class", "chart-controls__min")
    .style("margin-left", "14px");

  const minLabelWrap = minWrap.append("span")
    .attr("class", "chart-controls__label");

  minLabelWrap.append("span").text("Min AI skills:");

  minLabelWrap.append("span")
    .attr("class", "ui-tooltip")
    .attr("data-tip", "Minimum number of AI-related skills required for an occupation to be shown.")
    .attr("tabindex", 0)
    .text(" ⓘ");

  minWrap.append("span")
    .attr("class", "chart-controls__value")
    .html(`<span id="minskills-value">2</span> <small id="minskills-note">(default)</small>`);

  const minSlider = minWrap.append("input")
    .attr("class", "chart-controls__range")
    .attr("type", "range")
    .attr("min", 2)
    .attr("step", 1)
    .attr("value", 2)
    .attr("aria-label", "Minimum number of AI skills");

  const sortHint = controls.append("span")
    .attr("class", "chart-controls__hint")
    .text("");

  // Optional meta info (shown/available)
  const meta = controls.append("span")
    .attr("class", "chart-controls__meta")
    .style("order", 97)
    .style("flex-basis", "100%")
    .text("");


  const svgWrap = container.append("div").attr("class", "chart-svg");

  // Load data
  const raw = await d3.csv("data/viz_occ_relation_composition.csv", d3.autoType);

  raw.forEach(d => {
    d.relation = String(d.relation || "").trim().toLowerCase();
    d.occupation = String(d.occupation || "").trim();
    d.count = +d.count || 0;
  });

  const relations = ["essential", "optional"];

  // Wide format per occupation
  let dataWideAll = d3.rollups(
    raw,
    v => {
      const obj = { essential: 0, optional: 0 };
      v.forEach(d => {
        if (relations.includes(d.relation)) obj[d.relation] = d.count;
      });
      return obj;
    },
    d => d.occupation
  ).map(([occupation, vals]) => {
    const essential = vals.essential || 0;
    const optional = vals.optional || 0;
    const total = essential + optional;
    return {
      occupation,
      essential,
      optional,
      total,
      shareEssential: total ? essential / total : 0
    };
  }).filter(d => d.occupation && d.total > 0);

  // Update label "All (N)"
  const allN = dataWideAll.length;
  topSelect.selectAll("option")
    .filter(d => d.value === "all")
    .text(`All (${allN})`);

  // Slider max = dataset max(total)
  const maxTotalAll = d3.max(dataWideAll, d => d.total) || 2;
  const maxSafe = Math.max(2, maxTotalAll);
  minSlider.attr("max", maxSafe);

  let cur = +minSlider.property("value") || 2;
  if (cur > maxSafe) {
    cur = maxSafe;
    minSlider.property("value", cur);
    d3.select("#minskills-value").text(cur);
    d3.select("#minskills-note").text(cur === 2 ? "(default)" : "");
  }

  function sortData(arr, mode) {
    if (mode === "shareEssential") {
      // 1) shareEssential desc
      // 2) total desc
      // 3) occupation A→Z (stable tie-break)
      arr.sort((a, b) =>
        d3.descending(a.shareEssential, b.shareEssential) ||
        d3.descending(a.total, b.total) ||
        d3.ascending(a.occupation, b.occupation)
      );
    } else {
      // 1) total desc
      // 2) essential desc (more essential goes higher when totals equal)
      // 3) occupation A→Z
      arr.sort((a, b) =>
        d3.descending(a.total, b.total) ||
        d3.descending(a.essential, b.essential) ||
        d3.ascending(a.occupation, b.occupation)
      );
    }
  }

  function formatPct(x) { return d3.format(".0%")(x); }

  function placeTooltip(event) {
    const pad = 12;
    const tt = tooltip.node();
    const w = tt.offsetWidth || 220;
    const h = tt.offsetHeight || 80;

    const pageX = event.pageX;
    const pageY = event.pageY;

    const rightBound = window.scrollX + window.innerWidth;
    const bottomBound = window.scrollY + window.innerHeight;

    let xPos = pageX + pad;
    let yPos = pageY - h - pad;

    if (xPos + w + pad > rightBound) xPos = pageX - w - pad;
    if (yPos < window.scrollY + pad) yPos = pageY + pad;
    if (yPos + h + pad > bottomBound) yPos = bottomBound - h - pad;

    tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
  }

  function measureTextPx(str, font = "12px system-ui") {
    const canvas = measureTextPx._c || (measureTextPx._c = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    return ctx.measureText(str).width;
  }

  function updateRelationTakeaway(dataWide, sortMode, topMode, minSkills) {
    const wrap = document.getElementById("relation-takeaway");
    if (!wrap) return;
    const textEl = wrap.querySelector(".takeaway-text");
    if (!textEl) return;

    const n = dataWide.length;
    if (!n) {
      textEl.textContent = `No occupations match the current filters (min ≥ ${minSkills}).`;
      return;
    }

    const fmtPct = d3.format(".0%");
    const medianShare = d3.median(dataWide, d => d.shareEssential) ?? 0;
    const medianLabel = (medianShare <= 0.005) ? "close to 0%" : fmtPct(medianShare);

    const majorityEssential = dataWide.filter(d => d.shareEssential >= 0.5).length;
    const pctMajority = Math.round((majorityEssential / n) * 100);

    const coreHeavy = dataWide.filter(d => d.shareEssential >= 0.7).length;
    const pctCoreHeavy = Math.round((coreHeavy / n) * 100);

    const sortLabel = (sortMode === "shareEssential") ? "essential share" : "total AI skills";
    const scopeLabel = (topMode === "all") ? `All ${n}` : `Top ${Math.min(+topMode, n)}`;

    textEl.textContent =
      `${scopeLabel} (min ≥ ${minSkills}): median essential share is ${medianLabel}; ` +
      `${pctMajority}% of shown occupations have a majority essential core (≥ 50%), and ` +
      `${pctCoreHeavy}% are strongly core-heavy (≥ 70%). ` +
      `Sorted by ${sortLabel}.`;
  }

  function render(sortMode, topMode, minSkills) {
    const filteredAll = dataWideAll.filter(d => d.total >= minSkills);

    meta.text(
      `Showing ${Math.min(
        topMode === "all" ? filteredAll.length : +topMode,
        filteredAll.length
      )} / ${dataWideAll.length} occupations (min ≥ ${minSkills})`
    );

    let dataWide = filteredAll.slice().sort((a, b) => d3.descending(a.total, b.total));
    if (topMode !== "all") dataWide = dataWide.slice(0, +topMode);

    sortData(dataWide, sortMode);

    sortMicro.text(
      sortMode === "shareEssential"
        ? "Sorted by essential / total (ratio). Bar length still shows absolute counts."
        : ""
    );

    updateRelationTakeaway(dataWide, sortMode, topMode, minSkills);

    svgWrap.selectAll("*").remove();

    const wrapW = svgWrap.node().getBoundingClientRect().width || 980;
    const width = wrapW;

    const rowH = dataWide.length > 30 ? 16 : 20;
    const innerH = Math.max(120, dataWide.length * rowH);

    const maxLabelPx =
      d3.max(dataWide, d => measureTextPx(d.occupation, "12px system-ui")) || 180;

    const margin = {
      top: 56,
      right: 34,
      bottom: 62,
      left: Math.min(360, Math.max(170, Math.ceil(maxLabelPx) + 16))
    };

    const height = margin.top + innerH + margin.bottom;

    const svg = svgWrap.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Stacked horizontal bar chart showing essential vs optional AI skills per occupation");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width - margin.left - margin.right;
    const maxTotal = d3.max(dataWide, d => d.total) || 1;

    const color = d3.scaleOrdinal()
      .domain(relations)
      .range(["#4C78A8", "#B0B0B0"]);

    const y = d3.scaleBand()
      .domain(dataWide.map(d => d.occupation))
      .range([0, innerH])
      .padding(0.25);

    const x = d3.scaleLinear()
      .domain([0, maxTotal])
      .range([0, innerW])
      .nice();
    
    const topOccupation = dataWide[0]?.occupation;

    g.append("g").attr("class", "axis axis-y")
      .call(d3.axisLeft(y).tickSizeOuter(0));

    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3.axisBottom(x)
          .ticks(Math.min(6, maxTotal))
          .tickFormat(d3.format("d"))
          .tickSizeOuter(0)
      );

    g.append("text")
      .attr("class", "axis-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 46)
      .attr("text-anchor", "middle")
      .text("Number of AI-related skills");

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right - 170}, ${18})`);

    legend.append("rect")
      .attr("x", -10).attr("y", -8)
      .attr("width", 160).attr("height", 44)
      .attr("fill", "rgba(0,0,0,0.35)")
      .attr("opacity", 1)
      .attr("rx", 8).attr("ry", 8)
      .attr("stroke", "#e6e6e6");

    relations.forEach((r, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(r));
      row.append("text").attr("x", 18).attr("y", 10).text(r);
    });

    const bg = g.append("g").attr("class", "bg-rows");
    bg.selectAll("rect.stack-rect-bg")
      .data(dataWide, d => d.occupation)
      .join("rect")
      .attr("class", d => d.occupation === topOccupation ? "stack-rect-bg is-top" : "stack-rect-bg")
      .attr("x", x(0))
      .attr("y", d => y(d.occupation))
      .attr("height", y.bandwidth())
      .attr("width", x(maxTotal));

    const stack = d3.stack().keys(relations);
    const series = stack(dataWide);

    const serieG = g.selectAll("g.serie")
      .data(series, d => d.key)
      .join("g")
      .attr("class", "serie")
      .attr("fill", d => color(d.key));

    serieG.selectAll("rect.stack-rect")
      .data(d => d.map(p => ({ ...p, key: d.key })), d => `${d.data.occupation}|${d.key}`)
      .join(
        enter => enter.append("rect")
          .attr("class", d => d.data.occupation === topOccupation ? "stack-rect is-top" : "stack-rect")
          .attr("x", d => x(d[0]))
          .attr("y", d => y(d.data.occupation))
          .attr("height", y.bandwidth())
          .attr("width", 0)
          .call(enter => enter.transition().duration(300)
            .attr("width", d => Math.max(0, x(d[1]) - x(d[0])))
          ),
        update => update
          .attr("class", d => d.data.occupation === topOccupation ? "stack-rect is-top" : "stack-rect")
          .call(update => update.transition().duration(300)
            .attr("x", d => x(d[0]))
            .attr("y", d => y(d.data.occupation))
            .attr("height", y.bandwidth())
            .attr("width", d => Math.max(0, x(d[1]) - x(d[0])))
          ),
        exit => exit.remove()
      );

    const totalLabelG = g.append("g").attr("class", "total-labels");
    totalLabelG.selectAll("text.total-label")
      .data(dataWide, d => d.occupation)
      .join("text")
      .attr("class", "total-label")
      .attr("x", d => x(d.total) + 10)
      .attr("y", d => y(d.occupation) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => d.total);

    // --- Interaction state (pin) ---
    let pinned = null;

    function setFocus(occ) {
      // dim everything
      g.selectAll(".stack-rect")
        .classed("is-dim", true)
        .classed("is-focus", false);

      g.selectAll(".stack-rect-bg")
        .classed("is-dim", true)
        .classed("is-focus", false);

      // focus the selected occupation (both essential+optional rects)
      g.selectAll(".stack-rect")
        .filter(r => r.data.occupation === occ)
        .classed("is-dim", false)
        .classed("is-focus", true);

      // focus row background
      g.selectAll(".stack-rect-bg")
        .filter(r => r.occupation === occ)
        .classed("is-dim", false)
        .classed("is-focus", true);

      // show total label for that row
      totalLabelG.selectAll(".total-label")
        .classed("is-active", r => r.occupation === occ);
    }

    function clearHover(force = false) {
      if (pinned && !force) return;

      g.selectAll(".stack-rect")
        .classed("is-dim", false)
        .classed("is-focus", false);

      g.selectAll(".stack-rect-bg")
        .classed("is-dim", false)
        .classed("is-focus", false);

      totalLabelG.selectAll(".total-label")
        .classed("is-active", false);

      tooltip.style("opacity", 0).style("display", "none");
    }

    function showTooltip(event, d) {
      const essential = d.data.essential;
      const optional  = d.data.optional;
      const total     = d.data.total;

      const pctE = total ? essential / total : 0;
      const pctO = total ? optional / total : 0;

      const emphE = (d.key === "essential") ? "tt-emph" : "";
      const emphO = (d.key === "optional")  ? "tt-emph" : "";

      tooltip
        .style("display", "block")
        .style("opacity", 1)
        .html(
          `<strong>${d.data.occupation}</strong>
           <div class="${emphE}">Essential: ${essential} (${formatPct(pctE)})</div>
           <div class="${emphO}">Optional: ${optional} (${formatPct(pctO)})</div>
           <div class="muted">Total: ${total}</div>`
        );

      placeTooltip(event);
    }

    function togglePin(event, d) {
      event.preventDefault();
      event.stopPropagation();

      pinned = (pinned && pinned === d.data.occupation) ? null : d.data.occupation;

      if (!pinned) {
        clearHover(true);
        return;
      }

      setFocus(pinned);
      showTooltip(event, d);
    }

    g.selectAll("rect.stack-rect")
      .on("pointerenter", (event, d) => {
        if (pinned) return;
        setFocus(d.data.occupation);
        tooltip.style("display", "block");
      })
      .on("pointermove", (event, d) => {
        if (pinned) return;
        showTooltip(event, d);
      })
      .on("pointerleave", () => {
        if (pinned) return;
        clearHover(true);
      })
      .on("pointerdown", togglePin); // click to pin (same logic as chart 2)

    // click outside -> unpin/reset
    svg.on("pointerdown", () => {
      pinned = null;
      clearHover(true);
    });

    // leaving svg -> clear only if nothing pinned
    svg.on("pointerleave", () => {
      if (!pinned) clearHover(true);
    });
  }

  // Defaults
  let currentSort = "total";
  let currentTop  = "30";
  let currentMin  = 2;

  sortSelect.property("value", currentSort);
  topSelect.property("value", currentTop);

  minSlider.property("value", currentMin);
  d3.select("#minskills-value").text(currentMin);
  d3.select("#minskills-note")
    .text("(default)")
    .classed("is-hidden", currentMin !== 2);

  render(currentSort, currentTop, currentMin);

  sortSelect.on("change", (event) => {
    currentSort = event.target.value;
    render(currentSort, currentTop, currentMin);
  });

  topSelect.on("change", (event) => {
    currentTop = event.target.value;
    render(currentSort, currentTop, currentMin);
  });

  minSlider.on("input", (event) => {
    currentMin = +event.target.value || 2;

    d3.select("#minskills-value").text(currentMin);
    d3.select("#minskills-note")
      .text("(default)")
      .classed("is-hidden", currentMin !== 2);
    render(currentSort, currentTop, currentMin);
  });
}

/* =======================
   Chart 2: Top AI skills across occupations
   - horizontal lollipop chart
   - color by skill_type (knowledge vs skill/competence)
   - controls: top N + filter by skill_type
   ======================= */
async function drawTopSkillsChart() {
  const container = d3.select("#top-skills-chart");
  container.selectAll("*").remove();

  // Tooltip singleton (reuse same class used by chart 1)
  const tooltip = d3.select("body").selectAll("div.tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("display", "none");

  function placeTooltip(event) {
    const pad = 12;
    const tt = tooltip.node();
    const w = tt.offsetWidth || 220;
    const h = tt.offsetHeight || 80;

    const pageX = event.pageX;
    const pageY = event.pageY;

    const rightBound = window.scrollX + window.innerWidth;
    const bottomBound = window.scrollY + window.innerHeight;

    let xPos = pageX + pad;
    let yPos = pageY - h - pad;

    if (xPos + w + pad > rightBound) xPos = pageX - w - pad;
    if (yPos < window.scrollY + pad) yPos = pageY + pad;
    if (yPos + h + pad > bottomBound) yPos = bottomBound - h - pad;

    tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
  }

  // Controls
  const controls = container.append("div").attr("class", "chart-controls");

  controls.append("span")
    .attr("class", "chart-controls__label")
    .text("Show:");

  const topSelect = controls.append("select")
    .attr("class", "chart-controls__select")
    .attr("aria-label", "Select how many skills to display");

  // Load data
  const raw = await d3.csv("data/viz_top_skills.csv", d3.autoType);

  raw.forEach(d => {
    d.skill_label = String(d.skill_label || "").trim();
    d.skill_type = String(d.skill_type || "").trim().toLowerCase();
    d.n_occurrences = +d.n_occurrences || 0;
  });

  // Keep only valid
  const all = raw.filter(d => d.skill_label && d.n_occurrences > 0);

  const maxN = all.length;
  const options = [10, 15, 20].filter(x => x <= maxN);
  if (!options.includes(maxN)) options.push(maxN);

  topSelect.selectAll("option")
    .data(options.map(v => ({ value: String(v), label: v === maxN ? `All (${maxN})` : `Top ${v}` })))
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.label);

  topSelect.property("value", String(Math.min(20, maxN)));

  // Filter by type
  controls.append("span")
    .attr("class", "chart-controls__label")
    .style("margin-left", "14px")
    .text("Filter:");

  const typeSelect = controls.append("select")
    .attr("class", "chart-controls__select")
    .attr("aria-label", "Filter by skill type");

  const typeOpts = [
    { value: "all", label: "All types" },
    { value: "skill/competence", label: "Skill / competence" },
    { value: "knowledge", label: "Knowledge" }
  ];

  typeSelect.selectAll("option")
    .data(typeOpts)
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.label);

  typeSelect.property("value", "all");
  updateTopOptionsForType("all");

  // Meta row
  const meta = controls.append("span")
    .attr("class", "chart-controls__meta")
    .style("order", 97)
    .style("flex-basis", "100%")
    .text("");

  const svgWrap = container.append("div").attr("class", "chart-svg");

  const colors = new Map([
    ["skill/competence", "#6aa8ff"], // accent-ish
    ["knowledge", "#b0b0b0"]         // neutral
  ]);

  function updateTopOptionsForType(type) {
    const filteredCount = (type === "all")
      ? all.length
      : all.filter(d => d.skill_type === type).length;
  
    const opts = [10, 15, 20].filter(v => v <= filteredCount);
    if (!opts.includes(filteredCount)) opts.push(filteredCount);
  
    const cur = +topSelect.property("value") || 20;
  
    topSelect.selectAll("option")
      .data(opts, d => d)
      .join(
        enter => enter.append("option"),
        update => update,
        exit => exit.remove()
      )
      .attr("value", d => String(d))
      .text(d => (d === filteredCount ? `All (${filteredCount})` : `Top ${d}`));
  
    const newMax = Math.max(...opts);
    const newVal = opts.includes(cur) ? cur : newMax;
    topSelect.property("value", String(newVal));
  }
  
  function render() {
    const type = typeSelect.property("value");
  
    // 1) filtro UNA volta sola
    const filtered = (type === "all")
      ? all
      : all.filter(d => d.skill_type === type);
  
    // 2) baseCount coerente col filtro
    const baseCount = filtered.length;
  
    // 3) topN e slice coerenti
    const topN = +topSelect.property("value") || 20;
  
    const data = filtered
      .slice()
      .sort((a,b) => d3.descending(a.n_occurrences, b.n_occurrences))
      .slice(0, topN);
  
    const showingAll = (data.length === baseCount);

    if (baseCount === 0) {
      meta.text("No skills available for this filter");
      svgWrap.selectAll("*").remove();
      return;
    }
    
    meta.text(showingAll ? `Showing all ${baseCount} skills` : `Showing ${data.length} / ${baseCount} skills`);

    svgWrap.selectAll("*").remove();

    const wrapW = svgWrap.node().getBoundingClientRect().width || 980;
    const width = wrapW;

    const rowH = data.length > 18 ? 22 : 26;
    const innerH = Math.max(220, data.length * rowH);

    // Margin left based on label length (simple but effective)
    const measure = (str) => {
      const canvas = render._c || (render._c = document.createElement("canvas"));
      const ctx = canvas.getContext("2d");
      ctx.font = "12px system-ui";
      return ctx.measureText(str).width;
    };
    const maxLabelPx = d3.max(data, d => measure(d.skill_label)) || 180;

    const margin = {
      top: 56,
      right: 28,
      bottom: 62,
      left: Math.min(360, Math.max(180, Math.ceil(maxLabelPx) + 16))
    };

    const height = margin.top + innerH + margin.bottom;

    const svg = svgWrap.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Lollipop chart showing most frequent AI skills across occupations");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width - margin.left - margin.right;

    const y = d3.scaleBand()
      .domain(data.map(d => d.skill_label))
      .range([0, innerH])
      .padding(0.35);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.n_occurrences) || 1])
      .range([0, innerW])
      .nice();

        // Row highlight backgrounds (behind everything)
    const rowBg = g.append("g").attr("class", "lollipop-rowbgs")
      .selectAll("rect")
      .data(data, d => d.skill_label)
      .join("rect")
      .attr("class", "lollipop-rowbg")
      .attr("x", -margin.left + 10)   // extends under y-labels a bit
      .attr("y", d => y(d.skill_label))
      .attr("width", innerW + margin.left - 10)
      .attr("height", y.bandwidth())
      .attr("rx", 8)
      .attr("ry", 8);

    rowBg.style("pointer-events", "none");
    rowBg.lower();
    
    // Axes
    g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).tickSizeOuter(0));

    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(Math.min(6, x.domain()[1])).tickFormat(d3.format("d")).tickSizeOuter(0));

    g.append("text")
      .attr("class", "axis-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 46)
      .attr("text-anchor", "middle")
      .text("Number of occupations linked to the skill");

    // Legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right - 220}, ${18})`);

    legend.append("rect")
      .attr("x", -10).attr("y", -8)
      .attr("width", 210).attr("height", 44)
      .attr("fill", "rgba(0,0,0,0.35)")
      .attr("rx", 8).attr("ry", 8)
      .attr("stroke", "#e6e6e6")
      .attr("opacity", 1);

    const legendItems = [
      { key: "skill/competence", label: "Skill / competence" },
      { key: "knowledge", label: "Knowledge" }
    ];

    legendItems.forEach((it, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      row.append("circle")
        .attr("cx", 6).attr("cy", 6).attr("r", 6)
        .attr("fill", colors.get(it.key) || "#999");
      row.append("text").attr("x", 18).attr("y", 10).text(it.label);
    });

    // Lollipop: baseline lines
    const lines = g.append("g").attr("class", "lollipop-lines")
      .selectAll("line")
      .data(data, d => d.skill_label)
      .join("line")
      .attr("class", "lollipop-line")
      .attr("x1", x(0))
      .attr("x2", d => x(d.n_occurrences))
      .attr("y1", d => y(d.skill_label) + y.bandwidth() / 2)
      .attr("y2", d => y(d.skill_label) + y.bandwidth() / 2);
    
    const lineHits = g.append("g").attr("class", "lollipop-linehits")
      .selectAll("line")
      .data(data, d => d.skill_label)
      .join("line")
      .attr("x1", x(0))
      .attr("x2", d => x(d.n_occurrences))
      .attr("y1", d => y(d.skill_label) + y.bandwidth() / 2)
      .attr("y2", d => y(d.skill_label) + y.bandwidth() / 2)
      .attr("stroke", "transparent")
      .attr("stroke-width", 14)       // area cliccabile più larga
      .style("pointer-events", "stroke");
    
    // Dots
    const dots = g.append("g").attr("class", "lollipop-dots")
      .selectAll("circle")
      .data(data, d => d.skill_label)
      .join("circle")
      .attr("class", "lollipop-dot")
      .attr("cx", d => x(d.n_occurrences))
      .attr("cy", d => y(d.skill_label) + y.bandwidth() / 2)
      .attr("r", 6)
      .attr("fill", d => colors.get(d.skill_type) || "#999");
    
    // Hit targets (invisible, larger radius) to stabilize hover
    const hits = g.append("g").attr("class", "lollipop-hits")
      .selectAll("circle")
      .data(data, d => d.skill_label)
      .join("circle")
      .attr("cx", d => x(d.n_occurrences))
      .attr("cy", d => y(d.skill_label) + y.bandwidth() / 2)
      .attr("r", 12)                 // area più grande
      .attr("fill", "transparent")
      .style("pointer-events", "all");
    
    hits.raise();
    
    // Value labels (small, at the end)
    g.append("g").attr("class", "lollipop-values")
      .selectAll("text")
      .data(data, d => d.skill_label)
      .join("text")
      .attr("class", "lollipop-value")
      .attr("x", d => x(d.n_occurrences) + 10)
      .attr("y", d => y(d.skill_label) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => d.n_occurrences);

    // --- Interaction state (pin) ---
    let pinned = null;
    
    function clearHover(force = false) {
      if (pinned && !force) return;
    
      g.selectAll(".lollipop-line, .lollipop-dot, .lollipop-value")
        .classed("is-dim", false)
        .classed("is-focus", false);
    
      g.selectAll(".lollipop-rowbg").classed("is-active", false);
    
      tooltip.style("opacity", 0).style("display", "none");
    }
    
    function focusRow(skillLabel) {
      g.selectAll(".lollipop-line, .lollipop-dot, .lollipop-value")
        .classed("is-dim", true)
        .classed("is-focus", false);
    
      g.selectAll(".lollipop-line")
        .filter(d => d.skill_label === skillLabel)
        .classed("is-dim", false)
        .classed("is-focus", true);
    
      g.selectAll(".lollipop-dot")
        .filter(d => d.skill_label === skillLabel)
        .classed("is-dim", false)
        .classed("is-focus", true);
    
      g.selectAll(".lollipop-value")
        .filter(d => d.skill_label === skillLabel)
        .classed("is-dim", false)
        .classed("is-focus", true);
    
      g.selectAll(".lollipop-rowbg").classed("is-active", false);
      g.selectAll(".lollipop-rowbg")
        .filter(d => d.skill_label === skillLabel)
        .classed("is-active", true);
    }
    
    function applyFocus(d) {
      if (!d) { clearHover(true); return; }
    
      focusRow(d.skill_label);
    
      tooltip
        .style("display", "block")
        .style("opacity", 1)
        .html(
          `<strong>${d.skill_label}</strong>
           <div>Type: ${d.skill_type}</div>
           <div class="muted">Appears in: ${d.n_occurrences} occupations</div>`
        );
    }
    
    // --- Pin on click (dot or line) ---
    function togglePin(event, d) {
      event.preventDefault();
      event.stopPropagation();
    
      pinned = (pinned && pinned.skill_label === d.skill_label) ? null : d;
      if (!pinned) clearHover(true);
      else applyFocus(pinned);
    }
    
    hits.on("pointerdown", togglePin);
    lineHits.on("pointerdown", togglePin);
    
    // --- Hover (disabled when pinned) ---
    function bindHover(sel) {
      sel
        .on("pointerenter", (event, d) => {
          if (pinned) return;
          focusRow(d.skill_label);
          tooltip.style("display", "block");
        })
        .on("pointermove", (event, d) => {
          if (pinned) return;
    
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.skill_label}</strong>
               <div>Type: ${d.skill_type}</div>
               <div class="muted">Appears in: ${d.n_occurrences} occupations</div>`
            );
    
          placeTooltip(event);
        })
        .on("pointerleave", () => {
          if (pinned) return;
          clearHover(true);
        });
    }
    
    lineHits.raise();
    hits.raise();
    
    bindHover(lineHits);
    bindHover(hits);
    
    // --- Click outside -> unpin/reset ---
    svg.on("pointerdown", (event) => {
      if (event.target.closest(".lollipop-hits") || event.target.closest(".lollipop-linehits")) return;
      pinned = null;
      clearHover(true);
    });
    
    // Leaving the SVG (only clears if nothing is pinned)
    svg.on("pointerleave", () => {
      if (!pinned) clearHover(true);
    });
  }
  
  render();

  topSelect.on("change", render);

  typeSelect.on("change", () => {
    updateTopOptionsForType(typeSelect.property("value"));
    render();
  });
}

/* =======================
   Chart 3: ISCO Drilldown Bars
   - data: viz_isco_sunburst.json (same as sunburst)
   - click bar to drill down, breadcrumb to go up, reset/back buttons
   ======================= */
async function drawIscoDrilldown() {
  const container = d3.select("#isco-drilldown");
  if (container.empty()) return;
  container.selectAll("*").remove();
  console.log("ISCO: drawIscoDrilldown started");

  // UI
  const ui = container.append("div").attr("class", "isco-ui");
  const breadcrumbEl = ui.append("div").attr("class", "isco-breadcrumb");
  const actionsEl = ui.append("div").attr("class", "isco-actions");

  const btnReset = actionsEl.append("button")
    .attr("class", "isco-btn").attr("type", "button").text("Reset view");

  const btnBack = actionsEl.append("button")
    .attr("class", "isco-btn").attr("type", "button").text("Back");

  const metaEl = ui.append("div").attr("class", "isco-meta");

  // Header (title + level + metric definition)
  const head = container.append("div").attr("class","isco-head");
  const titleEl = head.append("div").attr("class","isco-title");
  const subtitleEl = head.append("div").attr("class","isco-subtitle"); // level + metric

  // Tooltip (reuse your global .tooltip)
  const tooltip = d3.select("body").selectAll("div.tooltip")
    .data([null]).join("div")
    .attr("class", "tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("display", "none");

  let rafMove = null;
  
  function moveTooltip(event){
    if (rafMove) return;
    rafMove = requestAnimationFrame(() => {
      rafMove = null;
  
      const pad = 12;
      const tt = tooltip.node();
      const w = tt.offsetWidth || 240;
      const h = tt.offsetHeight || 90;
  
      let x = event.pageX + pad, y = event.pageY - h - pad;
      const right = window.scrollX + window.innerWidth;
      const top = window.scrollY + pad;
      const bottom = window.scrollY + window.innerHeight;
  
      if (x + w + pad > right) x = event.pageX - w - pad;
      if (y < top) y = event.pageY + pad;
      if (y + h + pad > bottom) y = bottom - h - pad;
  
      tooltip.style("left", `${x}px`).style("top", `${y}px`);
    });
  }
  
  function setTooltipContent(d){
    const path = d.ancestors().reverse().slice(1).map(x => labelOf(x)).join(" → ");
    tooltip
      .style("display","block")
      .style("opacity", 1)
      .html(
        `<strong>${labelOf(d)}</strong>
         <div class="muted">${path || "ISCO"}</div>
         <div class="muted">Type: ${isLeaf(d) ? "occupation" : "ISCO group"}</div>
         <div>${isLeaf(d) ? "AI-related skills" : "Total AI-related skills in subtree"}: <strong>${d.value || 0}</strong></div>
         <div class="muted">Click to ${isLeaf(d) ? "stop (leaf)" : "drill down"}</div>`
      );
  }
  function hideTooltip(){ tooltip.style("opacity",0).style("display","none"); }
  
  let raw;
  try {
    raw = await d3.json("data/viz_isco_sunburst.json");
  } catch (e) {
    container.append("div")
      .attr("class","callout callout-subtle")
      .text("Could not load data/viz_isco_sunburst.json (check path / server).");
    console.error("ISCO JSON load error:", e);
    return;
  }
  
  // Load + hierarchy
  const root = d3.hierarchy(raw)
    .sum(d => (d.type === "occupation" ? (+d.value || 0) : 0))
    .sort((a,b) => d3.descending(a.value, b.value));

  const color = d3.scaleOrdinal()
    .domain((root.children || []).map(d => d.data.name))
    .range(d3.schemeTableau10);

  function topAncestor(d){ let c=d; while(c.depth>1) c=c.parent; return c; }
  function labelOf(d){ return d?.data?.name ?? "—"; }
  function isLeaf(d){ return (d?.data?.type === "occupation"); }

  function truncateToPx(str, maxPx, font = "12px system-ui"){
    const canvas = truncateToPx._c || (truncateToPx._c = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = font;
  
    if (ctx.measureText(str).width <= maxPx) return str;
  
    const ell = "…";
    let lo = 0, hi = str.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const s = str.slice(0, mid) + ell;
      if (ctx.measureText(s).width <= maxPx) lo = mid + 1;
      else hi = mid;
    }
    return str.slice(0, Math.max(0, lo - 1)) + ell;
  }
  
  function levelOf(d){
    if (d === root) return "Overview (ISCO major groups)";
    if (isLeaf(d)) return "Occupation (leaf)";
    // fallback by depth (adjust if your hierarchy depth differs)
    if (d.depth === 1) return "ISCO major group";
    if (d.depth === 2) return "ISCO sub-major group";
    if (d.depth === 3) return "ISCO minor group";
    return "ISCO group";
  }
  
  function metricLabel(){
    return "Metric: # of AI-related skill links (sum over occupations in view)";
  }
  
  let focus = root;

  // SVG
  const wrapW = container.node().getBoundingClientRect().width || 980;
  const W = Math.max(520, Math.min(980, Math.floor(wrapW)));
  const rowH = 28;
  const pad = {t: 8, r: 18, b: 8, l: 260};
  const maxRows = 18; // keep it clean (you can add "show more" later)

  const axisH = 26;
  const svgH = (pad.t + pad.b) + (rowH * maxRows) + axisH;
  
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${W} ${svgH}`)
    .style("width","100%")
    .style("height","auto");
  
  const g = svg.append("g");
  const gAxis = svg.append("g").attr("class","isco-axis");

  svg.on("pointerleave", () => {
    hideTooltip();
    if (rafMove) { cancelAnimationFrame(rafMove); rafMove = null; }
  });

  function crumbPath(d){
    return d.ancestors().reverse();
  }

  function renderBreadcrumb(d){
    breadcrumbEl.selectAll("*").remove();
    const path = crumbPath(d);
  
    path.forEach((node, i) => {
      const isLast = (i === path.length - 1);
      const label = (i === 0) ? "ISCO (root)" : labelOf(node);
  
      breadcrumbEl.append("span")
        .attr("class", `isco-crumb ${isLast ? "is-current" : ""}`)
        .style("cursor", isLast ? "default" : "pointer")
        .text(label)
        .on("click", () => { if (!isLast) zoomTo(node); });
  
      if (!isLast) {
        breadcrumbEl.append("span")
          .attr("class","isco-sep")
          .text("›");
      }
    });
  }

  function updateMeta(){
    const viewLabel = (focus === root) ? "All ISCO major groups" : labelOf(focus);
    const hint = (focus === root)
      ? "Click a bar to drill down."
      : "Click a bar to go deeper, or use Back/breadcrumb to go up.";
  
    // Dynamic title (this is what the user sees as the "chart title")
    titleEl.text(
      focus === root
        ? "AI-related occupations across ISCO"
        : `AI-related occupations within: ${labelOf(focus)}`
    );
  
    // Subtitle = level + metric definition (explicit, no ambiguity)
    subtitleEl.text(`${levelOf(focus)} • ${metricLabel()}`);
  
    // Meta = compact operational info
    metaEl.text(`View: ${viewLabel} • Total in view: ${focus.value || 0} • Showing top ${Math.min(maxRows, (focus.children||[]).length)} by total • ${hint}`);
  }

  function zoomTo(node){
    // --- hard reset tooltip/dimming when switching view ---
    hideTooltip();
    if (rafMove) { cancelAnimationFrame(rafMove); rafMove = null; }
    g.selectAll(".isco-bar").classed("is-dim", false);
  
    focus = node;

    btnBack.property("disabled", focus === root);
    btnReset.property("disabled", focus === root);

    renderBreadcrumb(focus);
    updateMeta();

    const childrenAll = (focus.children || [])
      .slice()
      .sort((a,b) => d3.descending(a.value, b.value));

    const sumChildren = d3.sum(childrenAll, d => d.value || 0);
      if (childrenAll.length) {
        const focusValue = focus.value || 0;
      
        // meglio con tolleranza (floating / NaN sporadici)
        const ok = Math.abs(sumChildren - focusValue) < 1e-9;
      
        if (!ok) {
          console.warn("ISCO value mismatch:", {
            focus: labelOf(focus),
            focusValue,
            sumChildren,
            diff: sumChildren - focusValue
          });
        }
      }
    
    const children = childrenAll.slice(0, maxRows);
    const nRows = Math.max(1, children.length);  // <-- QUI: righe reali
    
    const maxVal = d3.max(children, d => d.value) || 1;
    
    const x = d3.scaleLinear()
      .domain([0, maxVal])
      .range([pad.l, W - pad.r]);
    
    // aggiorna altezza svg e asse in base a nRows
    const axisY = pad.t + (nRows * rowH) + 10;
    const newSvgH = (pad.t + pad.b) + (rowH * nRows) + axisH;
    
    // aggiorna viewBox (così “collassa” lo spazio morto)
    svg.attr("viewBox", `0 0 ${W} ${newSvgH}`);
    
    gAxis
      .attr("transform", `translate(0, ${axisY})`)
      .call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));

    // Clear plot area
    g.selectAll(".isco-row").remove();

    const nodeKey = d => d.ancestors().reverse().map(n => n.data.name).join(" | ");
    
    const rows = g.selectAll(".isco-row")
      .data(children, nodeKey)
      .join("g")
      .attr("class","isco-row")
      .attr("transform", (d,i) => `translate(0, ${pad.t + i*rowH})`);

    // row background
    rows.append("rect")
      .attr("class","isco-rowbg")
      .attr("x", 10)
      .attr("y", 3)
      .attr("width", W-20)
      .attr("height", rowH-6)
      .attr("rx", 10);

    // bar
    rows.append("rect")
      .attr("class","isco-bar")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => `Drilldown: ${labelOf(d)}. Total: ${d.value || 0}.`)
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!isLeaf(d)) zoomTo(d);
        }
      })
      .attr("x", pad.l)
      .attr("y", 6)
      .attr("height", rowH-12)
      .attr("rx", 8)
      .attr("width", d => Math.max(2, x(d.value) - pad.l))
      .attr("fill", d => color(topAncestor(d).data.name))
      .attr("fill-opacity", d => (focus.depth <= 1 ? 0.95 : 0.85))
      .on("pointerenter", (event, d) => {
        g.selectAll(".isco-bar").classed("is-dim", true);
        d3.select(event.currentTarget).classed("is-dim", false);
      
        setTooltipContent(d);
        moveTooltip(event);
      })
      .on("pointermove", (event) => moveTooltip(event))
      .on("pointerleave", () => {
        g.selectAll(".isco-bar").classed("is-dim", false);
        hideTooltip();
      })
    .on("pointerdown", (event, d) => {
      event.preventDefault();
      event.stopPropagation();
    
      hideTooltip();
      if (rafMove) { cancelAnimationFrame(rafMove); rafMove = null; }
    
      if (!isLeaf(d)) zoomTo(d);
    });

    // labels left
    const maxLabelPx = pad.l - 24;
    
    rows.append("text")
      .attr("class","isco-label")
      .attr("x", 14)
      .attr("y", rowH/2 + 4)
      .text(d => truncateToPx(labelOf(d), maxLabelPx))
      .each(function(d){
        d3.select(this).selectAll("title").data([null]).join("title").text(labelOf(d));
      });

    // value right
    rows.append("text")
      .attr("class","isco-value")
      .attr("x", W - 14)
      .attr("y", rowH/2 + 4)
      .attr("text-anchor","end")
      .text(d => d.value || 0);

    // Update takeaway (optional)
    const tw = document.querySelector("#isco-takeaway .takeaway-text");
    if (tw) {
      const label = (focus === root) ? "all ISCO groups" : labelOf(focus);
      tw.textContent = `Drilldown view on ${label}. Total AI-related skills in view: ${focus.value || 0}.`;
    }
  }

  btnReset.on("click", () => zoomTo(root));
  btnBack.on("click", () => zoomTo(focus.parent || root));

  zoomTo(root);
}
/* =======================
   Chart 4: Occupation × Skill Matrix (top30)
   - default ordering + cluster-ish ordering (seriation)
   - marginal bars (row/col totals)
   - hover highlight row+col
   - click column label to lock a skill
   - search filter (occupation/skill)
   ======================= */
async function drawOccSkillMatrix() {
  const container = d3.select("#heatmap-chart");
  container.selectAll("*").remove();

  // Tooltip singleton (reuse)
  const tooltip = d3.select("body").selectAll("div.tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("display", "none");

  function placeTooltip(event) {
    const pad = 12;
    const tt = tooltip.node();
    const w = tt.offsetWidth || 240;
    const h = tt.offsetHeight || 90;

    const pageX = event.pageX;
    const pageY = event.pageY;

    const rightBound = window.scrollX + window.innerWidth;
    const bottomBound = window.scrollY + window.innerHeight;

    let xPos = pageX + pad;
    let yPos = pageY - h - pad;

    if (xPos + w + pad > rightBound) xPos = pageX - w - pad;
    if (yPos < window.scrollY + pad) yPos = pageY + pad;
    if (yPos + h + pad > bottomBound) yPos = bottomBound - h - pad;

    tooltip.style("left", `${xPos}px`).style("top", `${yPos}px`);
  }

  // Controls
  const controls = container.append("div").attr("class", "chart-controls");

  controls.append("span")
    .attr("class", "chart-controls__label")
    .text("Ordering:");

  const orderSelect = controls.append("select")
    .attr("class", "chart-controls__select")
    .attr("aria-label", "Matrix ordering");

  orderSelect.selectAll("option")
    .data([
      { value: "default", label: "Default (by totals)" },
      { value: "cluster", label: "Cluster ordering (similarity)" }
    ])
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.label);

  controls.append("span")
    .attr("class", "chart-controls__label")
    .style("margin-left", "14px")
    .text("Search:");

  const search = controls.append("input")
    .attr("class", "chart-controls__select")
    .attr("type", "text")
    .attr("placeholder", "occupation or skill…")
    .style("min-width", "220px");

  controls.append("span")
    .attr("class", "chart-controls__hint")
    .text("Click a column number to lock / unlock that skill.");
  
  const meta = controls.append("span")
    .attr("class", "chart-controls__meta")
    .style("order", 97)
    .style("flex-basis", "100%")
    .text("");

  const mxWrap = container.append("div").attr("class", "mx-wrap");

  const svgWrap = mxWrap.append("div").attr("class", "mx-plot chart-svg");
  
  const legendPanel = mxWrap.append("aside")
    .attr("class", "mx-legend-panel")
    .attr("aria-label", "Skill legend");
  
  legendPanel.append("h4").text("Skill legend (column labels)");
  
  const legendList = legendPanel.append("ol").attr("class", "mx-legend-list");

  // Load data
  const raw = await d3.csv("data/viz_heat_occ_skill_top30.csv", d3.autoType);
  const edges = await d3.csv("data/ai_edges_labeled.csv", d3.autoType);

  raw.forEach(d => {
    d.occupation_label = String(d.occupation_label || "").trim();
    d.skill_label = String(d.skill_label || "").trim();
    d.value = +d.value || 0;
  });

  // map for tooltip enrichment: occ||skill -> {relation, skill_type}
  const metaMap = new Map();
  edges.forEach(e => {
    const occ = String(e.occupation_label || "").trim();
    const sk  = String(e.skill_label || "").trim();
    if (!occ || !sk) return;
    metaMap.set(`${occ}||${sk}`, {
      relation: String(e.relation || "").trim().toLowerCase(),
      skill_type: String(e.skill_type || "").trim().toLowerCase()
    });
  });

  const allOcc = Array.from(new Set(raw.map(d => d.occupation_label))).filter(Boolean);
  const allSkill = Array.from(new Set(raw.map(d => d.skill_label))).filter(Boolean);

  // presence map
  const present = new Map(); // key: occ||skill -> 0/1
  raw.forEach(d => present.set(`${d.occupation_label}||${d.skill_label}`, d.value ? 1 : 0));

  function rowTotal(occ, skills) {
    let s = 0;
    for (const k of skills) s += (present.get(`${occ}||${k}`) || 0);
    return s;
  }

  function colTotal(skill, occs) {
    let s = 0;
    for (const o of occs) s += (present.get(`${o}||${skill}`) || 0);
    return s;
  }

  function jaccardRow(a, b, skills) {
    let inter = 0, uni = 0;
    for (const k of skills) {
      const va = present.get(`${a}||${k}`) || 0;
      const vb = present.get(`${b}||${k}`) || 0;
      if (va || vb) uni++;
      if (va && vb) inter++;
    }
    return uni ? inter / uni : 0;
  }

  function jaccardCol(a, b, occs) {
    let inter = 0, uni = 0;
    for (const o of occs) {
      const va = present.get(`${o}||${a}`) || 0;
      const vb = present.get(`${o}||${b}`) || 0;
      if (va || vb) uni++;
      if (va && vb) inter++;
    }
    return uni ? inter / uni : 0;
  }

  // simple seriation: greedy nearest-neighbor by Jaccard
  function greedyOrderRows(occs, skills) {
    const remaining = new Set(occs);
    const start = occs.slice().sort((x, y) => d3.descending(rowTotal(x, skills), rowTotal(y, skills)))[0];
    const out = [];
    let cur = start;
    out.push(cur);
    remaining.delete(cur);

    while (remaining.size) {
      let best = null, bestSim = -1;
      for (const cand of remaining) {
        const sim = jaccardRow(cur, cand, skills);
        if (sim > bestSim) { bestSim = sim; best = cand; }
      }
      cur = best;
      out.push(cur);
      remaining.delete(cur);
    }
    return out;
  }

  function greedyOrderCols(skills, occs) {
    const remaining = new Set(skills);
    const start = skills.slice().sort((x, y) => d3.descending(colTotal(x, occs), colTotal(y, occs)))[0];
    const out = [];
    let cur = start;
    out.push(cur);
    remaining.delete(cur);

    while (remaining.size) {
      let best = null, bestSim = -1;
      for (const cand of remaining) {
        const sim = jaccardCol(cur, cand, occs);
        if (sim > bestSim) { bestSim = sim; best = cand; }
      }
      cur = best;
      out.push(cur);
      remaining.delete(cur);
    }
    return out;
  }

  // Interaction state
  let pinnedSkill = null;

  let lastMode = "default"; // serve per animare solo quando cambia ordering

  let svg = null;
  let g = null;
  
  function render() {

    const q = (search.property("value") || "").trim().toLowerCase();
    const mode = orderSelect.property("value");
   
    const modeChanged = (mode !== lastMode);
    lastMode = mode;

    let occs = allOcc.slice();
    let skills = allSkill.slice();
    
    // ordering
    if (mode === "default") {
      occs.sort((a, b) => d3.descending(rowTotal(a, skills), rowTotal(b, skills)));
      skills.sort((a, b) => d3.descending(colTotal(a, occs), colTotal(b, occs)));
    } else {
      const occDefault = occs.slice().sort((a, b) => d3.descending(rowTotal(a, skills), rowTotal(b, skills)));
      const skDefault  = skills.slice().sort((a, b) => d3.descending(colTotal(a, occs), colTotal(b, occs)));
      occs = greedyOrderRows(occDefault, skDefault);
      skills = greedyOrderCols(skDefault, occs);
    }
    
    //indexes MUST be built after ordering
    const occIndex = new Map(occs.map((d,i)=>[d,i]));
    const skillIndex = new Map(skills.map((d,i)=>[d,i]));
    // search dims (we keep full matrix but dim unmatched rows/cols)
    const occMatch = new Set();
    const skMatch  = new Set();
    if (q) {
      occs.forEach(o => { if (o.toLowerCase().includes(q)) occMatch.add(o); });
      skills.forEach(s => { if (s.toLowerCase().includes(q)) skMatch.add(s); });
    }

    const rowTotals = new Map(occs.map(o => [o, rowTotal(o, skills)]));
    const colTotals = new Map(skills.map(s => [s, colTotal(s, occs)]));

    const baseMeta = `Matrix: ${occs.length} occupations × ${skills.length} skills. Filled cells: ${d3.sum(occs, o => rowTotals.get(o))}.`;
    
    const wrapW = svgWrap.node().getBoundingClientRect().width || 980;
    const width = wrapW;

    // layout sizes (dynamic, based on label lengths)
    const pad = 8;        // era 14
    const rowBarW = 56;    // era 70
    const colBarH = 24;    // era 40
    const gutter = 6;      // era 12    
    // stima grezza larghezza testo (dark-theme, font 12px)
    const approxCharW = 6.6;
    
    const maxOccChars = d3.max(occs, d => d.length) || 18;
    const leftLabelsW = Math.max(130, Math.min(260, Math.round(maxOccChars * approxCharW + 18)));
    
    // skill labels: spazio necessario in alto
    const maxSkillChars = d3.max(skills, d => d.length) || 12;
    const angleDeg = 0;          // numeri -> no rotazione
    const topLabelsH = 26;  
    
    // larghezza disponibile per la griglia (NON usare xShift qui)
    const innerW = width - pad * 2 - leftLabelsW - rowBarW - gutter;
    const cell = Math.max(10, Math.min(22, Math.floor(innerW / skills.length)));

    const labelStep = 1;   
    
    const gridW = cell * skills.length;
    const gridH = cell * occs.length;
    
    // centro orizzontalmente tutto il blocco (labels+bars+grid)
    // centro orizzontalmente tutto il blocco (labels+bars+grid)
    const contentW = leftLabelsW + rowBarW + gutter + gridW;
    const xShift = 0; // allinea a sinistra (dataviz: predictable layout)
    
    // dove inizia la griglia (serve anche per la legenda)
    const originX = leftLabelsW + rowBarW + gutter;
    const originY = topLabelsH + colBarH;
    
    const height = pad * 2 + topLabelsH + colBarH + gridH + 10;
   
    if (!svg) {
    
      svg = svgWrap.append("svg")
        .attr("role", "img")
        .attr("aria-label", "Matrix view: occupations by skills (presence)");
    
      g = svg.append("g");
    
    }
    
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    g.attr("transform", `translate(${pad + xShift},${pad})`);

    // --- CLIP: prevent column labels from overlapping the grid ---
    const clipId = "mx-colclip-" + container.attr("id");
    
    const defs = svg.selectAll("defs")
      .data([null])
      .join("defs");
    
    const clip = defs.selectAll(`#${clipId}`)
      .data([null])
      .join("clipPath")
      .attr("id", clipId)
      .attr("clipPathUnits", "userSpaceOnUse");
    
    clip.selectAll("rect")
      .data([null])
      .join("rect")
      .attr("x", pad + xShift)
      .attr("y", 0)
      .attr("width", width - pad * 2)
      .attr("height", pad + topLabelsH);

    // scales for marginal bars
    const rowBar = d3.scaleLinear()
      .domain([0, d3.max(Array.from(rowTotals.values())) || 1])
      .range([0, rowBarW - 10]);

    const colBar = d3.scaleLinear()
      .domain([0, d3.max(Array.from(colTotals.values())) || 1])
      .range([0, colBarH - 10]);

    // Column bars (singleton group)
    const colBarsG = g.selectAll("g.mx-colbars")
      .data([null])
      .join("g")
      .attr("class", "mx-colbars");
    
    const colBars = colBarsG.selectAll("rect")
      .data(skills, d => d)
      .join("rect")
      .attr("class", "mx-colbar")
      .attr("width", cell - 1);
    
    // update positions (animate when mode changes)
    colBars
      .transition()
      .duration(modeChanged ? 450 : 0)
      .attr("x", d => originX + skillIndex.get(d) * cell)
      .attr("y", d => originY - colBarH + 8 + (colBarH - 10) - colBar(colTotals.get(d)))
      .attr("height", d => colBar(colTotals.get(d)));

    // Row bars (singleton group)
    const rowBarsG = g.selectAll("g.mx-rowbars")
      .data([null])
      .join("g")
      .attr("class", "mx-rowbars");
    
    const rowBars = rowBarsG.selectAll("rect")
      .data(occs, d => d)
      .join("rect")
      .attr("class", "mx-rowbar")
      .attr("x", leftLabelsW + 2)
      .attr("height", Math.max(3, Math.round(cell * 0.64)))
      .attr("rx", 3);
    
    // animate y + width when ordering changes
    rowBars
      .transition()
      .duration(modeChanged ? 450 : 0)
      .attr("y", d => originY + occIndex.get(d) * cell + Math.round(cell * 0.18))
      .attr("width", d => rowBar(rowTotals.get(d)));

    const rowLabelG = g.selectAll("g.mx-rowlabels")
      .data([null])
      .join("g")
      .attr("class", "mx-rowlabels");

    const rowLabels = rowLabelG
      .selectAll("text")
      .data(occs, d => d)
      .join("text")
      .attr("class", "mx-rowlabel")
      .attr("x", leftLabelsW - 8)
      .attr("text-anchor", "end")
      .text(d => d);

    rowLabels
      .transition()
      .duration(modeChanged ? 450 : 0)
      .attr("y", d => originY + occIndex.get(d) * cell + cell * 0.72);

    const colLabelY = 18;

    const headerHit = g.selectAll("g.mx-colhits")
      .data([null])
      .join("g")
      .attr("class", "mx-colhits");
    
    headerHit.selectAll("rect")
      .data(skills, d => d)
      .join("rect")
      .attr("x", d => originX + skillIndex.get(d) * cell)
      .attr("y", 0)
      .attr("width", cell)
      .attr("height", topLabelsH)     // tutta l’area label
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("pointerdown", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        pinnedSkill = (pinnedSkill === d) ? null : d;
        applyState();
        showLegendTooltip(
          event,
          { label: d, idx: skillIndex.get(d) + 1 },
          colTotals
        );
      });
    
    const colLabelG = g.selectAll("g.mx-collabels")
      .data([null])
      .join("g")
      .attr("class", "mx-collabels")
      .attr("clip-path", `url(#${clipId})`);
    
    const colLabels = colLabelG.selectAll("text")
      .data(skills, d => d)
      .join("text")
      .attr("class", "mx-collabel")
      .attr("y", colLabelY)
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .style("opacity", (d,i) => (i % labelStep === 0 ? 0.92 : 0))
      .text((d, i) => (i + 1))
      .each(function(d){
        d3.select(this).selectAll("title").data([d]).join("title").text(d);
      });

    colLabels
      .transition()
      .duration(modeChanged ? 450 : 0)
      .attr("x", d => originX + skillIndex.get(d) * cell + cell * 0.5);
        
    g.selectAll("line.mx-baseline")
      .data([null])
      .join("line")
      .attr("class", "mx-baseline")
      .attr("y1", originY - 0.5)
      .attr("y2", originY - 0.5)
      .transition()
      .duration(modeChanged ? 450 : 0)
      .attr("x1", originX)
      .attr("x2", originX + gridW);

    // ---- HTML legend (right panel) ----
    const items = skills.map((s, i) => ({ idx: i + 1, label: s }));
    
    const li = legendList.selectAll("li")
      .data(items, d => d.label)
      .join("li")
      .attr("data-idx", d => d.idx)     // utile per accessibilità/debug
      .text(d => d.label)               // <-- niente "1." perché lo fa già <ol>
      .on("pointerdown", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        const skill = d.label;
        pinnedSkill = (pinnedSkill === skill) ? null : skill;
        applyState();
        showLegendTooltip(event, d, colTotals);
      })
      .on("pointerenter", (event, d) => {
        if (pinnedSkill) return;
        li.classed("is-hover", x => x.label === d.label);
        previewColumn(d.label);
        showLegendTooltip(event, d, colTotals);
      })
      .on("pointermove", (event, d) => {
        if (pinnedSkill) return;
        placeTooltip(event);
      })
      .on("pointerleave", () => {
        li.classed("is-hover", false);
        if (pinnedSkill) return;
        applyState();
        clearTooltip();
      });
    
    // Cells
    const cells = [];
    for (const o of occs) {
      for (const s of skills) {
        const v = present.get(`${o}||${s}`) || 0;
        if (v) cells.push({ o, s, v });
      }
    }

    const cellG = g.selectAll("g.mx-cells")
      .data([null])
      .join("g")
      .attr("class", "mx-cells");

    const rects = cellG.selectAll("rect")
      .data(cells, d => `${d.o}||${d.s}`)
      .join(
        enter => enter.append("rect")
          .attr("class", "mx-cell")
          .attr("width", cell - 1)
          .attr("height", cell - 1)
          .attr("x", d => originX + skillIndex.get(d.s) * cell)
          .attr("y", d => originY + occIndex.get(d.o) * cell),
    
        update => update,
    
        exit => exit.remove()
      );
    
    rects
      .transition()
      .duration(modeChanged ? 450 : 0)
      .attr("x", d => originX + skillIndex.get(d.s) * cell)
      .attr("y", d => originY + occIndex.get(d.o) * cell);


    // Hover interactions
    function showTooltip(event, d) {
      const m = metaMap.get(`${d.o}||${d.s}`) || {};
      const rel = m.relation ? m.relation : "—";
      const typ = m.skill_type ? m.skill_type : "—";

      tooltip
        .style("display", "block")
        .style("opacity", 1)
        .html(
          `<strong>${d.o}</strong>
           <div>${d.s}</div>
           <div class="muted">Relation: ${rel}</div>
           <div class="muted">Type: ${typ}</div>`
        );

      placeTooltip(event);
    }

    function clearTooltip() {
      tooltip.style("opacity", 0).style("display", "none");
    }

    function applyHover(occ, skill) {
      // dim all first
      g.selectAll(".mx-cell").classed("is-dim", true).classed("is-focus", false);
      g.selectAll(".mx-rowlabel, .mx-collabel").classed("is-dim", true).classed("is-focus", false);
      g.selectAll(".mx-rowbar, .mx-colbar").classed("is-dim", true).classed("is-focus", false);

      // focus row/col labels + bars
      rowLabels.filter(d => d === occ).classed("is-dim", false).classed("is-focus", true);
      colLabels.filter(d => d === skill).classed("is-dim", false).classed("is-focus", true);

      g.selectAll(".mx-rowbar").filter(d => d === occ).classed("is-dim", false).classed("is-focus", true);
      g.selectAll(".mx-colbar").filter(d => d === skill).classed("is-dim", false).classed("is-focus", true);

      // focus cells in row/col + main cell
      g.selectAll(".mx-cell")
        .filter(d => d.o === occ || d.s === skill)
        .classed("is-dim", false);

      g.selectAll(".mx-cell")
        .filter(d => d.o === occ && d.s === skill)
        .classed("is-focus", true);
    }

    function previewColumn(skill) {
      // stessa logica del focus: evidenzia colonna + celle di quella skill
      g.selectAll(".mx-cell").classed("is-dim", true).classed("is-focus", false);
      g.selectAll(".mx-rowlabel, .mx-collabel").classed("is-dim", true).classed("is-focus", false);
      g.selectAll(".mx-rowbar, .mx-colbar").classed("is-dim", true).classed("is-focus", false);
    
      // col label + col bar in focus
      colLabels.filter(d => d === skill).classed("is-dim", false).classed("is-focus", true);
      g.selectAll(".mx-colbar").filter(d => d === skill).classed("is-dim", false).classed("is-focus", true);
    
      // celle della colonna visibili
      g.selectAll(".mx-cell")
        .filter(d => d.s === skill)
        .classed("is-dim", false)
        .classed("is-focus", true);
    
      // righe che hanno quella skill meno “spente”
      rowLabels.classed("is-dim", d => (present.get(`${d}||${skill}`) || 0) === 0);
      g.selectAll(".mx-rowbar").classed("is-dim", d => (present.get(`${d}||${skill}`) || 0) === 0);
    }
    
    function showLegendTooltip(event, d, colTotals) {
      tooltip
        .style("display", "block")
        .style("opacity", 1)
        .html(
          `<strong>${d.idx}. ${d.label}</strong>
           <div class="muted">Linked occupations: ${colTotals.get(d.label) || 0}</div>
           <div class="muted">Tip: click to pin</div>`
        );
      placeTooltip(event);
    }
    
    // global state (search + pinned skill)
    function applyState() {

      // HTML legend state
      const hasSkillHits = q && skMatch.size > 0;

      li
        .classed("is-selected", d => pinnedSkill && d.label === pinnedSkill)
        .classed("is-match", d => q && skMatch.has(d.label))     // <-- match search sulle skill
        .classed("is-dim", d => {
          if (pinnedSkill) return d.label !== pinnedSkill;       // pin vince su tutto
          if (hasSkillHits) return !skMatch.has(d.label);        // dim solo se la query matcha skill
          return false;
        });
            
      meta.text(
        pinnedSkill
          ? `${baseMeta}  |  Pinned: ${pinnedSkill} (click outside to clear)`
          : baseMeta
      );

      // base: reset
      g.selectAll(".mx-rowlabel, .mx-collabel, .mx-rowbar, .mx-colbar, .mx-cell")
        .classed("is-dim", false)
        .classed("is-focus", false)
        .classed("is-selected", false);

      // search dim
      if (q) {
        rowLabels.classed("is-dim", d => !occMatch.has(d));
        colLabels.classed("is-dim", d => !skMatch.has(d));

        g.selectAll(".mx-rowbar").classed("is-dim", d => !occMatch.has(d));
        g.selectAll(".mx-colbar").classed("is-dim", d => !skMatch.has(d));

        // cells dim if row or col not matching
        g.selectAll(".mx-cell").classed("is-dim", d => {
          const rm = occMatch.has(d.o);
          const cm = skMatch.has(d.s);
          // if query matches only in one side, still allow those hits
          return !(rm || cm);
        });
      }

      rowLabels.classed("is-match", d => q && occMatch.has(d));
      colLabels.classed("is-match", d => q && skMatch.has(d));
      
      // pinned skill selection
      if (pinnedSkill) {
        colLabels.classed("is-selected", d => d === pinnedSkill);
        g.selectAll(".mx-colbar").classed("is-selected", d => d === pinnedSkill);

        // dim everything not in that column (cells + row labels/bars)
        g.selectAll(".mx-cell").classed("is-dim", d => d.s !== pinnedSkill);
        rowLabels.classed("is-dim", d => (rowTotals.get(d) > 0) ? ((present.get(`${d}||${pinnedSkill}`) || 0) === 0) : true);
        g.selectAll(".mx-rowbar").classed("is-dim", d => ((present.get(`${d}||${pinnedSkill}`) || 0) === 0));
      }
    }

    applyState();

    rects
      .on("pointerdown", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
    
        pinnedSkill = (pinnedSkill === d.s) ? null : d.s;
        applyState();
    
        // aggiorna il tooltip sulla cella cliccata
        showTooltip(event, d);
      })
      .on("pointerenter", (event, d) => {
        if (pinnedSkill) return;
        applyHover(d.o, d.s);
        tooltip.style("display", "block");
      })
      .on("pointermove", (event, d) => {
        if (pinnedSkill) return;
        showTooltip(event, d);
      })
      .on("pointerleave", () => {
        if (pinnedSkill) return;
        applyState();
        clearTooltip();
      });

    // click outside -> unpin
    svg.on("pointerdown", (event) => {
      // se clicco dentro la legenda NON devo unpinnare
      if (event.target.closest && event.target.closest(".mx-legend-panel")) return;
    
      pinnedSkill = null;
      applyState();
      clearTooltip();
    });
  }

  orderSelect.property("value", "default");
  render();

  orderSelect.on("change", render);
  let searchTimer = null;
  search.on("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => render(), 120);
  });
}

/* =======================
   Chart 5 Network
   ======================= */
async function drawNetwork() {
  const container = d3.select("#network-chart");
  if (container.empty()) return;

  // wipe chart
  container.selectAll("*").remove();

  // UI hooks (optional if not present)
  const searchEl = document.getElementById("net-search");
  const resetEl  = document.getElementById("net-reset");
  const hubsEl   = document.getElementById("net-hubs");

  const width = container.node().getBoundingClientRect().width || 900;
  const height = 520;

  const svg = container.append("svg")
    .attr("class", "net-svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");

  // tooltip (reuse one)
  const tooltip = d3.select("body").selectAll("div.tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("display", "none");
 
  let lastTooltipHTML = "";

  function showTooltip(event, html){
    tooltip
      .style("display","block")
      .style("opacity",1)
      .html(html);

    const pad = 12;
    const tt = tooltip.node();
    const w = tt.offsetWidth || 260;
    const h = tt.offsetHeight || 90;

    let x = event.pageX + pad;
    let y = event.pageY - h - pad;

    const right = window.scrollX + window.innerWidth;
    const top = window.scrollY + pad;

    if (x + w > right) x = event.pageX - w - pad;
    if (y < top) y = event.pageY + pad;

    tooltip.style("left", `${x}px`).style("top", `${y}px`);
  }
  function hideTooltip(){
    tooltip.style("opacity",0).style("display","none");
  }

  // load data
  const [nodesRaw, linksRaw] = await Promise.all([
    d3.csv("data/viz_network_nodes.csv"),
    d3.csv("data/viz_network_links.csv")
  ]);

  const nodes = nodesRaw.map(d => ({
    id: d.id,
    label: d.label,
    type: d.node_type // "occupation" | "skill"
  }));

  const nodeById = new Map(nodes.map(d => [d.id, d]));

  const links = linksRaw
    .filter(d => nodeById.has(d.source) && nodeById.has(d.target))
    .map(d => ({
      source: d.source,
      target: d.target,
      relation: d.relation // "essential" | "optional"
    }));

  // build adjacency for fast neighbor highlight
  const neighbors = new Map(); // id -> Set(ids)
  const degree = new Map();    // id -> number
  for (const n of nodes) { neighbors.set(n.id, new Set()); degree.set(n.id, 0); }

  for (const l of links) {
    neighbors.get(l.source).add(l.target);
    neighbors.get(l.target).add(l.source);
    degree.set(l.source, degree.get(l.source) + 1);
    degree.set(l.target, degree.get(l.target) + 1);
  }
  nodes.forEach(n => n.degree = degree.get(n.id));

  // hub threshold (top-ish)
  const degValues = nodes.map(d => d.degree).sort((a,b)=>a-b);
  const hubThreshold = degValues[Math.max(0, Math.floor(degValues.length * 0.92))] || 6;

  // layers
  const g = svg.append("g");

  // zoom
  const zoom = d3.zoom()
    .scaleExtent([0.4, 6])
    .on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);

  // link drawing
  const linkSel = g.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", d => `net-link ${d.relation === "essential" ? "is-essential" : "is-optional"}`)
    .attr("stroke-dasharray", d => d.relation === "optional" ? "2,2" : null)
    .attr("stroke-width", d => d.relation === "essential" ? 1.4 : 0.8)
    .attr("stroke-opacity", d => d.relation === "essential" ? 0.35 : 0.25);

  // node radius: degree + type
  const rOcc  = d3.scaleSqrt().domain([0, d3.max(nodes, d => d.degree) || 1]).range([4.5, 10]);
  const rSkill = d3.scaleSqrt().domain([0, d3.max(nodes, d => d.degree) || 1]).range([3.6, 8]);

  const nodeSel = g.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("class", d => `net-node ${d.type === "occupation" ? "net-occupation" : "net-skill"}`)
    .attr("r", d => d.type === "occupation" ? rOcc(d.degree) : rSkill(d.degree));

  // labels (only show hubs/pin/match)
  const labelSel = g.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "net-label")
    .attr("text-anchor", "start")
    .attr("dy", "0.35em")
    .text(d => d.label);

  let pinnedId = null;
  let query = "";

  function isNeighbor(aId, bId){
    return neighbors.get(aId)?.has(bId) || false;
  }

  function applyState(focusId = null, matched = new Set()){
    const focus = focusId || pinnedId;

    // decide which nodes are "active"
    const active = new Set();
    if (focus) {
      active.add(focus);
      for (const nb of neighbors.get(focus) || []) active.add(nb);
    }
    for (const m of matched) {
      active.add(m);
      for (const nb of neighbors.get(m) || []) active.add(nb);
    }

    // dim everything if we have focus OR matches
    const shouldDim = (focus !== null) || (matched.size > 0);

    nodeSel.classed("is-dim", d => shouldDim ? !active.has(d.id) : false);
    nodeSel.classed("is-pinned", d => d.id === pinnedId);
    labelSel.classed("is-dim", d => shouldDim ? !active.has(d.id) : false);

    linkSel.classed("is-dim", d => {
      if (!shouldDim) return false;
      const s = typeof d.source === "object" ? d.source.id : d.source;
      const t = typeof d.target === "object" ? d.target.id : d.target;
      return !(active.has(s) && active.has(t));
    });

    // labels visibility policy
    const showHubs = hubsEl ? hubsEl.checked : true;
    labelSel.style("display", d => {
      if (focus && (d.id === focus || isNeighbor(focus, d.id))) return "block";
      if (matched.has(d.id)) return "block";
      if (showHubs && d.degree >= hubThreshold) return "block";
      return "none";
    });
  }

  function computeMatches(q){
    const s = (q || "").trim().toLowerCase();
    if (!s) return new Set();
    const m = new Set();
    for (const n of nodes) {
      if ((n.label || "").toLowerCase().includes(s)) m.add(n.id);
    }
    return m;
  }

  function updateFromUI(){
    const matches = computeMatches(query);
    applyState(null, matches);
  }

  // interactions: hover + click pin
  nodeSel
    .on("pointerenter", (event, d) => {
      const matches = computeMatches(query);
      applyState(d.id, matches);
    
      lastTooltipHTML = `
        <strong>${d.label}</strong>
        <div class="muted">Type: ${d.type}</div>
        <div class="muted">Degree: ${d.degree}</div>
        <div class="muted">${pinnedId === d.id ? "Pinned — click again to unpin" : "Click to pin"}</div>
      `;
    
      showTooltip(event, lastTooltipHTML);
    })
    .on("pointermove", (event) => {
      if (!lastTooltipHTML) return;
      showTooltip(event, lastTooltipHTML);
    })
    .on("pointerleave", () => {
      hideTooltip();
      updateFromUI();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
    
      const isUnpin = (pinnedId === d.id);
    
      // se c'era un pinned diverso, sbloccalo
      if (!isUnpin && pinnedId) {
        const prev = nodes.find(n => n.id === pinnedId);
        if (prev) {
          prev.fx = null;
          prev.fy = null;
        }
      }
    
      if (isUnpin) {
        pinnedId = null;
        d.fx = null;
        d.fy = null;
      } else {
        pinnedId = d.id;
    
        // pin vero
        d.fx = d.x;
        d.fy = d.y;
    
        // piccola "riattivazione" della simulazione
        simulation.alphaTarget(0.12).restart();
        setTimeout(() => simulation.alphaTarget(0), 120);
      }
    
      updateFromUI();
    });

    // click on background to unpin
    svg.on("click", () => {
      if (pinnedId) {
        const prev = nodes.find(n => n.id === pinnedId);
        if (prev) { prev.fx = null; prev.fy = null; }
      }
      pinnedId = null;
      updateFromUI();
    });

  // drag
  const drag = d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.15).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      // keep pinned node fixed, otherwise release
      if (pinnedId !== d.id) { d.fx = null; d.fy = null; }
    });

  nodeSel.call(drag);

  // force simulation
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id)
      .distance(l => (l.relation === "essential" ? 45 : 75))
      .strength(l => (l.relation === "essential" ? 0.8 : 0.35))
    )
    .force("charge", d3.forceManyBody().strength(-70))
    .force("center", d3.forceCenter(width / 2, height / 2))
    // NEW: gentle pull toward center (prevents “fly-away” nodes)
    .force("x", d3.forceX(width / 2).strength(0.06))
    .force("y", d3.forceY(height / 2).strength(0.06))
    // OPTIONAL but recommended: soft “fence” radius
    .force("radial", d3.forceRadial(Math.min(width, height) * 0.42, width/2, height/2).strength(0.08))
    .force("collision", d3.forceCollide().radius(d =>
      (d.type === "occupation" ? rOcc(d.degree) : rSkill(d.degree)) + 2
    ));

  simulation.on("tick", () => {
    linkSel
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
  
    nodeSel
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  
    labelSel
      .attr("x", d => {
        const r = (d.type === "occupation" ? rOcc(d.degree) : rSkill(d.degree));
        return d.x + r + 4;
      })
      .attr("y", d => d.y);
  });

  if (searchEl) {
    searchEl.oninput = (e) => {
      query = e.target.value || "";
      updateFromUI();
    };
  }
  
  if (hubsEl) {
    hubsEl.onchange = () => updateFromUI();
  }
  
  if (resetEl) {
    resetEl.onclick = () => {
      pinnedId = null;
      query = "";
      if (searchEl) searchEl.value = "";
  
      svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
  
      nodes.forEach(n => { n.fx = null; n.fy = null; });
      simulation.alpha(0.6).restart();
  
      updateFromUI();
    };
  }

  // initial state
  updateFromUI();
}
// resize -> redraw (debounced) [bind once]
let resizeT;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    drawRelationChart();
    drawTopSkillsChart();
    drawIscoDrilldown();
    drawOccSkillMatrix();
    drawNetwork()
  }, 140);
});

drawRelationChart();
drawTopSkillsChart();
drawIscoDrilldown();
drawOccSkillMatrix();
drawNetwork()



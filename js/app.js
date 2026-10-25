(() => {
  "use strict";

  const DATA = window.APP_DATA;
  if (!DATA) {
    document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>数据加载失败：请确认 data/app_data.js 存在。</p>";
    return;
  }

  const DISTRICTS = DATA.districts || [];
  const TOTALS = DATA.totals || {};
  const EXTREMES = DATA.extremes || {};
  const META = DATA.meta || {};

  const fmt = (n) => Number(n).toLocaleString("zh-CN");
  const pct = (n) => `${Number(n).toFixed(1)}%`;
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const byAgingDesc = [...DISTRICTS].sort((a, b) => b.aging - a.aging);
  const byAgingAsc = [...DISTRICTS].sort((a, b) => a.aging - b.aging);
  const byIndex = [...DISTRICTS].sort((a, b) => b.index - a.index);
  const byMeal = [...DISTRICTS].sort((a, b) => a.mealPer10k - b.mealPer10k);
  const byDay = [...DISTRICTS].sort((a, b) => a.daycarePer10k - b.daycarePer10k);

  const isNarrow = window.innerWidth < 640;
  const chartText = { fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif' };
  const tooltipBase = {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#d6cdbb",
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: "#102338", fontSize: 12, fontFamily: '"Microsoft YaHei", sans-serif' },
    extraCssText: "box-shadow:0 10px 28px rgba(22,32,42,.12);border-radius:10px;",
  };
  const row = (label, value, color) =>
    `<div style="display:flex;justify-content:space-between;gap:22px;margin-top:4px;color:#33475b">
      <span>${label}</span><b style="color:${color || "#102338"}">${value}</b>
    </div>`;

  /* ---------------- 首页 ---------------- */
  setText("statDistricts", TOTALS.districts);
  setText("statElderly", (TOTALS.elderly60 / 10000).toFixed(2));
  setText("statMeal", fmt(TOTALS.meal));
  setText("statDaycare", fmt(TOTALS.daycare));

  if (EXTREMES.oldest) setText("highlightAging", `${EXTREMES.oldest.name} ${pct(EXTREMES.oldest.aging)}`);
  if (EXTREMES.mealLow) setText("highlightMeal", `${EXTREMES.mealLow.name} ${EXTREMES.mealLow.mealPer10k.toFixed(1)} 个/万`);
  if (EXTREMES.best) setText("highlightIndex", `${EXTREMES.best.name} ${EXTREMES.best.index.toFixed(1)}`);

  /* ---------------- 导航 ---------------- */
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sectionIds = ["home", "visual", "facilities", "lab", "insights"];
  const sectionEls = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  function updateNav() {
    const pos = window.scrollY + 140;
    let active = "home";
    sectionEls.forEach((sec) => {
      if (sec.offsetTop <= pos) active = sec.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${active}`);
    });
  }
  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();

  /* ---------------- 主图表 ---------------- */
  const chartEl = document.getElementById("mainChart");
  let chart = null;
  if (window.echarts && chartEl) {
    chart = window.echarts.init(chartEl, null, { renderer: "canvas" });
  } else if (chartEl) {
    chartEl.innerHTML = "<div style='display:grid;place-items:center;height:100%;color:#667085;font-size:14px'>图表库加载失败，请确认 vendor/echarts.min.js 存在。</div>";
  }

  const populationOption = () => ({
    textStyle: chartText,
    color: ["#175d8d", "#b54633"],
    tooltip: {
      ...tooltipBase,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter(params) {
        const d = byAgingDesc[params[0].dataIndex];
        return `<div style="font-weight:600;margin-bottom:4px">${d.name}</div>`
          + row("60 岁及以上", `${(d.elderly60 / 10000).toFixed(2)} 万`)
          + row("老龄化率", pct(d.aging), "#b54633")
          + row("2020 常住人口", `${(d.pop2020 / 10000).toFixed(2)} 万`);
      },
    },
    legend: {
      top: 0,
      left: "center",
      itemGap: 18,
      icon: "rect",
      itemWidth: 10,
      itemHeight: 6,
      textStyle: { color: "#5f7182", fontSize: 11 },
    },
    grid: { left: 55, right: 58, top: 44, bottom: isNarrow ? 100 : 82 },
    xAxis: {
      type: "category",
      data: byAgingDesc.map((d) => d.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b8c8d4" } },
      axisLabel: {
        color: "#5f7182",
        fontSize: isNarrow ? 9 : 10,
        rotate: isNarrow ? 45 : 32,
        interval: isNarrow ? 1 : 0,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "60+人口（万人）",
        nameTextStyle: { color: "#8fa3b3", fontSize: 10, padding: [0, 0, 6, 0] },
        axisLabel: { color: "#8fa3b3", fontSize: 10 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      {
        type: "value",
        name: "老龄化率（%）",
        min: 12,
        max: 35,
        nameTextStyle: { color: "#8fa3b3", fontSize: 10, padding: [0, 0, 6, 0] },
        axisLabel: { color: "#8fa3b3", fontSize: 10, formatter: "{value}%" },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "老年人口",
        type: "bar",
        data: byAgingDesc.map((d) => +(d.elderly60 / 10000).toFixed(2)),
        barWidth: "55%",
        itemStyle: { borderRadius: 0, color: "#175d8d" },
        emphasis: { itemStyle: { color: "#0e3f63" } },
      },
      {
        name: "老龄化率",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        data: byAgingDesc.map((d) => d.aging),
        lineStyle: { width: 2.2, color: "#b54633" },
        itemStyle: { color: "#b54633", borderColor: "#ffffff", borderWidth: 1.2 },
      },
    ],
  });

  const heatRows = [...DISTRICTS].sort((a, b) => b.index - a.index);
  const heatMetrics = [
    { key: "mealPer10k", label: "助餐点" },
    { key: "daycarePer10k", label: "日间照料" },
    { key: "bedsPer10k", label: "卫生床位" },
  ];
  const heatValues = heatMetrics.map((m) => heatRows.map((d) => d[m.key]));
  const heatNorm = heatValues.map((vals) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return vals.map((v) => (hi === lo ? 0.5 : (v - lo) / (hi - lo)));
  });
  const heatData = [];
  heatRows.forEach((d, y) => {
    heatMetrics.forEach((m, x) => {
      heatData.push([x, y, d[m.key], heatNorm[x][y]]);
    });
  });

  const facilityOption = () => ({
    textStyle: chartText,
    tooltip: {
      ...tooltipBase,
      trigger: "item",
      formatter(p) {
        const d = heatRows[p.data[1]];
        const m = heatMetrics[p.data[0]];
        const per = p.data[0] === 2 ? "张 / 万名老人" : "个 / 万名老人";
        return `<div style="font-weight:600;margin-bottom:4px">${d.name} · ${m.label}</div>`
          + row("每万老人", `${p.data[2].toFixed(1)} ${per}`, "#175d8d")
          + row("绝对数量", m.label === "卫生床位" ? `${fmt(d.beds)} 张` : `${fmt(d[m.label === "助餐点" ? "meal" : "daycare"])} 个`);
      },
    },
    grid: { left: 62, right: 54, top: 42, bottom: 42 },
    xAxis: {
      type: "category",
      data: heatMetrics.map((m) => m.label),
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b8c8d4" } },
      axisLabel: { color: "#5f7182", fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: heatRows.map((d) => d.name),
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b8c8d4" } },
      axisLabel: { color: "#5f7182", fontSize: 9.5 },
    },
    visualMap: {
      min: 0,
      max: 1,
      dimension: 3,
      orient: "vertical",
      right: 0,
      top: "center",
      itemWidth: 10,
      itemHeight: 100,
      text: ["高", "低"],
      textStyle: { color: "#8fa3b3", fontSize: 9 },
      calculable: false,
      inRange: { color: ["#f4f8fb", "#cfe3f1", "#175d8d"] },
    },
    series: [{
      name: "设施配置",
      type: "heatmap",
      data: heatData,
      label: {
        show: true,
        formatter: (p) => `{${p.data[3] > 0.62 ? "light" : "dark"}|${p.data[2].toFixed(1)}}`,
        fontSize: 8.5,
        rich: {
          light: { color: "#ffffff" },
          dark: { color: "#102338" },
        },
      },
      itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,.2)" } },
    }],
  });

  const shareOption = () => {
    const totalPoints = TOTALS.meal + TOTALS.daycare;
    const pieData = [
      { name: "助餐点", value: TOTALS.meal },
      { name: "日间照料中心", value: TOTALS.daycare },
    ];
    return {
      textStyle: chartText,
      color: ["#175d8d", "#b54633"],
      title: {
        text: fmt(totalPoints),
        subtext: "个社区养老点位",
        left: "center",
        top: "36%",
        textAlign: "center",
        textStyle: { color: "#102338", fontSize: 24, fontWeight: 700, fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif' },
        subtextStyle: { color: "#8fa3b3", fontSize: 11 },
      },
      tooltip: { ...tooltipBase, trigger: "item", formatter: "{b}<br/><b>{c}</b> 个（{d}%）" },
      legend: {
        bottom: 0,
        left: "center",
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#5f7182", fontSize: 11 },
      },
      series: [{
        name: "点位构成",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "44%"],
        itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
        label: { color: "#33475b", fontSize: 11, formatter: "{b}\n{d}%" },
        labelLine: { length: 10, length2: 8 },
        data: pieData,
      }],
    };
  };

  function mixColor(from, to, t) {
    const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function indexColor(value) {
    const t = Math.max(0, Math.min(1, value / 100));
    if (t < 0.5) return mixColor([181, 70, 51], [127, 168, 196], t * 2);
    return mixColor([127, 168, 196], [23, 93, 141], (t - 0.5) * 2);
  }

  const matchOption = () => {
    const avgAging = DISTRICTS.reduce((a, d) => a + d.aging, 0) / DISTRICTS.length;
    const avgDay = DISTRICTS.reduce((a, d) => a + d.daycarePer10k, 0) / DISTRICTS.length;
    const offsets = {
      "河北区": [10, 8], "红桥区": [-34, 12], "河东区": [12, -12], "河西区": [-36, -10],
      "南开区": [12, -12], "和平区": [-32, 10], "静安区": [10, 8],
    };
    const data = byAgingAsc.map((d) => ({
      name: d.name,
      value: [d.aging, d.daycarePer10k, d.elderly60, d.index],
      symbolSize: Math.max(14, Math.sqrt(d.elderly60 / 10000) * 14),
      itemStyle: { color: indexColor(d.index), borderColor: "#ffffff", borderWidth: 1.5, opacity: 0.92 },
    }));

    return {
      textStyle: chartText,
      tooltip: {
        ...tooltipBase,
        trigger: "item",
        formatter(p) {
          const v = p.data.value;
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>`
            + row("老龄化率", `${v[0].toFixed(1)}%`)
            + row("每万老人日间照料", `${v[1].toFixed(1)} 个`, "#b54633")
            + row("60+ 人口", `${(v[2] / 10000).toFixed(1)} 万`)
            + row("综合便利指数", v[3].toFixed(1), "#175d8d");
        },
      },
      grid: { left: 62, right: 28, top: 28, bottom: 54 },
      xAxis: {
        type: "value",
        min: 14,
        max: 33,
        axisLabel: { color: "#8fa3b3", fontSize: 10, formatter: "{value}%" },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#8fa3b3", fontSize: 10 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      series: [{
        type: "scatter",
        data,
        label: { show: true, position: "top", formatter: "{b}", color: "#33475b", fontSize: 9.5 },
        labelLayout: (params) => {
          const off = offsets[params.text] || [0, -9];
          return { dx: off[0], dy: off[1] };
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: "#8fa3b3" },
          label: { show: false },
          data: [{ xAxis: avgAging }, { yAxis: avgDay }],
        },
      }],
    };
  };

  const views = {
    population: {
      title: "各区老年人口与老龄化率",
      sub: "按老龄化率排序 · 2020 七普",
      badge: "16 区",
      note: "数据来源：天津市第七次全国人口普查（2020）。老龄化率 = 60 岁及以上人口 ÷ 常住人口。",
      option: populationOption,
    },
    facilities: {
      title: "每万老人设施配置",
      sub: "助餐点、日间照料、卫生床位 · 颜色越深，相对水平越高",
      badge: "3 类设施",
      note: "助餐/日照为 2025 年区级名单逐行统计；卫生床位为 2024 年卫生机构床位；每万老人以 2020 年 60+ 人口为分母。",
      option: facilityOption,
    },
    share: {
      title: "社区养老服务点位构成",
      sub: "助餐点 + 日间照料 · 不含按张计数的卫生床位",
      badge: "点位构成",
      note: "助餐点为 2025 年区级名单逐行统计（含蓟州参照估算）；日间照料为 2025 年 11 月各区清单。",
      option: shareOption,
    },
    match: {
      title: "老龄化程度与日间照料供给",
      sub: "气泡越大，60+ 人口越多；颜色越绿，综合便利指数越高",
      badge: "供需匹配",
      note: "虚线为 16 区均值；老龄化与日照密度相关系数 r = -0.35。",
      option: matchOption,
    },
  };

  const titleEl = document.getElementById("chartTitle");
  const subEl = document.getElementById("chartSub");
  const badgeEl = document.getElementById("chartBadge");
  const noteEl = document.getElementById("chartNote");
  let currentView = "population";

  function renderView(key) {
    const view = views[key];
    if (!view || !chart) return;
    currentView = key;
    titleEl.textContent = view.title;
    subEl.textContent = view.sub;
    badgeEl.textContent = view.badge;
    noteEl.textContent = view.note;
    if (chart) chart.dispose();
    chart = window.echarts.init(chartEl, null, { renderer: "canvas" });
    chart.setOption(view.option(), true);
    chart.resize();
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      renderView(tab.dataset.view);
    });
  });

  if (chart) {
    renderView(currentView);
    window.addEventListener("resize", () => chart.resize(), { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => chart.resize()).observe(chartEl);
  }

  /* ---------------- 区级设施账单 ---------------- */
  const SORTS = [
    { key: "index", label: "按便利指数" },
    { key: "aging", label: "按老龄化" },
    { key: "daycare", label: "按日照密度" },
    { key: "meal", label: "按助餐密度" },
  ];
  const listState = { sort: "index", query: "" };
  const sortFilters = document.getElementById("sortFilters");
  const searchInput = document.getElementById("searchInput");
  const listEl = document.getElementById("facilityList");
  const resultCount = document.getElementById("resultCount");

  function buildSortChips() {
    sortFilters.innerHTML = SORTS.map((s) =>
      `<button class="chip ${s.key === listState.sort ? "active" : ""}" type="button" data-sort="${s.key}">${s.label}</button>`
    ).join("");
    sortFilters.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        listState.sort = chip.dataset.sort;
        buildSortChips();
        renderList();
      });
    });
  }

  function sortValue(d) {
    if (listState.sort === "aging") return d.aging;
    if (listState.sort === "daycare") return d.daycarePer10k;
    if (listState.sort === "meal") return d.mealPer10k;
    return d.index;
  }

  function renderList() {
    const q = listState.query.trim();
    const list = DISTRICTS.filter((d) => !q || d.name.includes(q))
      .sort((a, b) => sortValue(b) - sortValue(a));
    resultCount.textContent = `共 ${list.length} 个区` + (q ? `（搜索：${q}）` : "");
    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state">没有找到这个区，试试“和平”“滨海”或“蓟州”。</div>`;
      return;
    }
    listEl.innerHTML = list.map((d) => `
      <article class="district-card">
        <div class="district-head">
          <h4>${d.name}</h4>
          <span>老龄化 ${d.aging.toFixed(1)}%</span>
        </div>
        <div class="district-metrics">
          <div class="district-metric"><strong>${fmt(d.meal)}</strong><span>助餐点 · ${d.mealPer10k.toFixed(1)}/万</span></div>
          <div class="district-metric"><strong>${fmt(d.daycare)}</strong><span>日照 · ${d.daycarePer10k.toFixed(1)}/万</span></div>
          <div class="district-metric"><strong>${fmt(d.beds)}</strong><span>卫生床位 · ${d.bedsPer10k.toFixed(0)}/万</span></div>
        </div>
        <div class="district-links">
          <a class="map-link" href="${META.links.meal}" target="_blank" rel="noopener">助餐名单 ↗</a>
          <a class="map-link" href="${META.links.daycare}" target="_blank" rel="noopener">日照名单 ↗</a>
        </div>
      </article>`).join("");
  }

  searchInput.addEventListener("input", (event) => {
    listState.query = event.target.value;
    renderList();
  });

  buildSortChips();
  renderList();

  /* ---------------- 资源优先级实验室 ---------------- */
  const weightState = { meal: 40, daycare: 35, health: 25 };
  const mealRange = document.getElementById("mealRange");
  const daycareRange = document.getElementById("daycareRange");
  const healthRange = document.getElementById("healthRange");
  const mealWeight = document.getElementById("mealWeight");
  const daycareWeight = document.getElementById("daycareWeight");
  const healthWeight = document.getElementById("healthWeight");
  const labChartEl = document.getElementById("labChart");
  const labInsight = document.getElementById("labInsight");
  let labChart = window.echarts && labChartEl ? window.echarts.init(labChartEl, null, { renderer: "canvas" }) : null;

  const mealVals = DISTRICTS.map((d) => d.mealPer10k);
  const dayVals = DISTRICTS.map((d) => d.daycarePer10k);
  const bedVals = DISTRICTS.map((d) => d.bedsPer10k);
  function norm(vals, v) {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return hi === lo ? 0.5 : (v - lo) / (hi - lo);
  }

  function normalizedWeights() {
    const total = weightState.meal + weightState.daycare + weightState.health;
    if (total <= 0) return { meal: 1 / 3, daycare: 1 / 3, health: 1 / 3 };
    return {
      meal: weightState.meal / total,
      daycare: weightState.daycare / total,
      health: weightState.health / total,
    };
  }

  function labResult() {
    const w = normalizedWeights();
    return DISTRICTS.map((d) => ({
      ...d,
      custom: (norm(mealVals, d.mealPer10k) * w.meal
        + norm(dayVals, d.daycarePer10k) * w.daycare
        + norm(bedVals, d.bedsPer10k) * w.health) * 100,
    })).sort((a, b) => b.custom - a.custom);
  }

  function renderLab() {
    const list = labResult();
    const best = list[0];
    const worst = list[list.length - 1];
    const w = normalizedWeights();
    mealWeight.textContent = weightState.meal;
    daycareWeight.textContent = weightState.daycare;
    healthWeight.textContent = weightState.health;
    const text = `按当前权重（助餐 ${(w.meal * 100).toFixed(0)}% · 日照 ${(w.daycare * 100).toFixed(0)}% · 床位 ${(w.health * 100).toFixed(0)}%），`
      + `${best.name}最均衡（${best.custom.toFixed(1)}），${worst.name}最需要补（${worst.custom.toFixed(1)}）。`;
    labInsight.textContent = text;

    if (!labChart) return;
    const sorted = list.slice().sort((a, b) => a.custom - b.custom);
    labChart.setOption({
      textStyle: chartText,
      grid: { left: 62, right: 42, top: 18, bottom: 28 },
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter(params) {
          const d = list.find((x) => x.name === params[0].name);
          return `<div style="font-weight:600;margin-bottom:4px">${d.name}</div>`
            + row("自定义指数", d.custom.toFixed(1), "#175d8d")
            + row("助餐点", `${d.mealPer10k.toFixed(1)}/万`)
            + row("日间照料", `${d.daycarePer10k.toFixed(1)}/万`)
            + row("卫生床位", `${d.bedsPer10k.toFixed(0)}/万`);
        },
      },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { color: "#8fa3b3", fontSize: 9 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      yAxis: {
        type: "category",
        data: sorted.map((d) => d.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#b8c8d4" } },
        axisLabel: { color: "#5f7182", fontSize: 9 },
      },
      series: [{
        type: "bar",
        data: sorted.map((d) => ({
          value: +d.custom.toFixed(1),
          itemStyle: { color: indexColor(d.custom) },
        })),
        barMaxWidth: 12,
        label: { show: true, position: "right", formatter: "{c}", fontSize: 9, color: "#5f7182" },
      }],
    }, true);
    labChart.resize();
  }

  function setPreset(key) {
    if (key === "meal") { weightState.meal = 60; weightState.daycare = 25; weightState.health = 15; }
    else if (key === "daycare") { weightState.meal = 20; weightState.daycare = 60; weightState.health = 20; }
    else if (key === "health") { weightState.meal = 20; weightState.daycare = 20; weightState.health = 60; }
    else { weightState.meal = 40; weightState.daycare = 35; weightState.health = 25; }
    mealRange.value = weightState.meal;
    daycareRange.value = weightState.daycare;
    healthRange.value = weightState.health;
    document.querySelectorAll("#labPresets .chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.preset === key);
    });
    renderLab();
  }

  document.querySelectorAll("#labPresets .chip").forEach((chip) => {
    chip.addEventListener("click", () => setPreset(chip.dataset.preset));
  });

  [[mealRange, "meal"], [daycareRange, "daycare"], [healthRange, "health"]].forEach(([el, key]) => {
    el.addEventListener("input", () => {
      weightState[key] = Number(el.value);
      document.querySelectorAll("#labPresets .chip").forEach((c) => c.classList.remove("active"));
      renderLab();
    });
  });

  if (labChart) {
    renderLab();
    window.addEventListener("resize", () => labChart.resize(), { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => labChart.resize()).observe(labChartEl);
  }

  /* ---------------- 结论 ---------------- */
  const oldest = EXTREMES.oldest;
  const youngest = EXTREMES.youngest;
  const bestD = EXTREMES.best;
  const worstD = EXTREMES.worst;
  const mealLow = EXTREMES.mealLow;
  const dayLow = EXTREMES.dayLow;
  const dayHigh = [...DISTRICTS].sort((a, b) => b.daycarePer10k - a.daycarePer10k)[0];
  const mealHigh = [...DISTRICTS].sort((a, b) => b.mealPer10k - a.mealPer10k)[0];

  if (oldest) {
    setText("insightAging", pct(oldest.aging));
    setText("insightAgingText", `${oldest.name}最高，${youngest.name}最低（${pct(youngest.aging)}），相差 ${(oldest.aging - youngest.aging).toFixed(1)} 个百分点。`);
  }
  if (mealLow) {
    setText("insightMeal", `${mealLow.mealPer10k.toFixed(1)} 个`);
    setText("insightMealText", `${mealLow.name}每万老人仅 ${mealLow.mealPer10k.toFixed(1)} 个助餐点，和平为 ${mealHigh.mealPer10k.toFixed(1)} 个；名单完整性仍需核对。`);
  }
  if (dayLow) {
    setText("insightDaycare", `${dayLow.daycarePer10k.toFixed(1)} 个`);
    setText("insightDaycareText", `${dayLow.name}每万老人仅 ${dayLow.daycarePer10k.toFixed(1)} 个，静海为 ${dayHigh.daycarePer10k.toFixed(1)} 个；村居级点位拉高了郊区密度。`);
  }
  if (bestD) {
    setText("insightIndex", bestD.index.toFixed(1));
    setText("insightIndexText", `${bestD.name}最高，${worstD.name}最低（${worstD.index.toFixed(1)}）；拖动实验室权重，排名会变化。`);
  }

  setText("dataNoteText", META.dataNote);
  setText("mealNoteText", META.facilityNote);
  const sourcesEl = document.getElementById("dataSources");
  if (sourcesEl) sourcesEl.textContent = `数据来源：${META.sources.join("；")}。`;
})();

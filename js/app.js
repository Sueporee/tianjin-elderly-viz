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

  const gapOption = () => {
    const ordered = [...DISTRICTS].sort((a, b) => b.gap - a.gap);
    const display = ordered.slice().reverse();
    const maxAbs = Math.max(10, ...DISTRICTS.map((d) => Math.abs(d.gap)));
    const bound = Math.ceil(maxAbs / 10) * 10;
    return {
      textStyle: chartText,
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter(params) {
          const d = ordered[ordered.length - 1 - params[0].dataIndex];
          return `<div style="font-weight:600;margin-bottom:4px">${d.name}</div>`
            + row("需求指数", d.demand.toFixed(1))
            + row("供给指数", d.index.toFixed(1))
            + row("缺口", `${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}`, d.gap > 0 ? "#b54633" : "#175d8d")
            + row("优先补", d.weakest, "#b54633");
        },
      },
      grid: { left: 64, right: 56, top: 16, bottom: 34 },
      xAxis: {
        type: "value",
        min: -bound,
        max: bound,
        axisLabel: { color: "#8fa3b3", fontSize: 9 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      yAxis: {
        type: "category",
        data: display.map((d) => d.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#b8c8d4" } },
        axisLabel: { color: "#5f7182", fontSize: 9 },
      },
      series: [{
        type: "bar",
        data: display.map((d) => ({
          value: d.gap,
          itemStyle: { color: d.gap >= 0 ? "#b54633" : "#175d8d" },
        })),
        barMaxWidth: 12,
        label: {
          show: true,
          position: "right",
          formatter: (p) => `${p.value > 0 ? "+" : ""}${p.value.toFixed(1)}`,
          fontSize: 9,
          color: "#5f7182",
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#8fa3b3", type: "solid" },
          label: { show: false },
          data: [{ xAxis: 0 }],
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
      sub: "气泡越大，60+ 人口越多；颜色越蓝，综合便利指数越高",
      badge: "供需匹配",
      note: "虚线为 16 区均值；老龄化与日照密度相关系数 r = -0.35。",
      option: matchOption,
    },
    gap: {
      title: "需求—供给缺口",
      sub: "正值=需求高于供给，优先补点；负值=供给相对充足",
      badge: "A · 补点",
      note: "需求指数 = 60+ 人口规模（60%）+ 老龄化率（40%）；供给指数为默认权重的综合便利指数。缺口只用于区级排序，不替代街道实地核查。",
      option: gapOption,
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

  /* ---------------- 资源优先级推演 ---------------- */
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
    setText("insightIndexText", `${bestD.name}最高，${worstD.name}最低（${worstD.index.toFixed(1)}）；拖动推演权重，排名会变化。`);
  }

  /* ---------------- B 附近地图 ---------------- */
  const POINTS = DATA.points || [];
  const POINT_SUMMARY = DATA.pointSummary || {};
  const mapState = { scope: "pilot", type: "全部", metric: "meal", district: "全部", location: null, selected: null };
  const mapEl = document.getElementById("tjMap");
  const mapListEl = document.getElementById("mapList");
  const mapListCount = document.getElementById("mapListCount");
  const mapListSort = document.getElementById("mapListSort");
  const mapDistrictCard = document.getElementById("mapDistrictCard");
  const locateBtn = document.getElementById("locateBtn");
  const locateStatus = document.getElementById("locateStatus");
  const typeFilterEl = document.getElementById("pointTypeFilters");
  let mapChart = null;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function haversine(a, b) {
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLon = (b[1] - a[1]) * Math.PI / 180;
    const la1 = a[0] * Math.PI / 180;
    const la2 = b[0] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function pointDistance(p) {
    return mapState.location ? haversine(mapState.location, [p.lat, p.lon]) : null;
  }

  function filteredPoints() {
    return POINTS.filter((p) =>
      (mapState.type === "全部" || p.type === mapState.type) &&
      (mapState.district === "全部" || p.district === mapState.district)
    ).sort((a, b) => {
      if (mapState.location) return pointDistance(a) - pointDistance(b);
      return a.district.localeCompare(b.district, "zh") || a.name.localeCompare(b.name, "zh");
    });
  }

  function buildMapFilters() {
    let scopeEl = document.getElementById("mapScopeFilters");
    if (scopeEl) {
      const scopes = [["pilot", "中心城区试点"], ["city", "全市 16 区"]];
      scopeEl.innerHTML = scopes.map(([key, label]) =>
        `<button class="chip ${key === mapState.scope ? "active" : ""}" type="button" data-scope="${key}">${label}</button>`
      ).join("");
      scopeEl.querySelectorAll(".chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          mapState.scope = btn.dataset.scope;
          mapState.district = "全部";
          mapState.type = "全部";
          buildMapFilters();
          renderMap();
        });
      });
    }

    const isCity = mapState.scope === "city";
    const chips = isCity
      ? [["meal", "助餐点"], ["daycare", "日间照料"], ["beds", "卫生床位"]]
      : [["all", "全部"], ["meal", "助餐点"], ["daycare", "日间照料"]];
    typeFilterEl.innerHTML = chips.map(([key, label]) =>
      `<button class="chip ${(isCity ? mapState.metric === key : mapState.type === (key === "all" ? "全部" : key === "meal" ? "助餐点" : "日间照料")) ? "active" : ""}" type="button" data-key="${key}">${label}</button>`
    ).join("");
    typeFilterEl.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isCity) mapState.metric = btn.dataset.key;
        else mapState.type = btn.dataset.key === "all" ? "全部" : btn.dataset.key === "meal" ? "助餐点" : "日间照料";
        buildMapFilters();
        renderMap();
      });
    });

    let districtEl = document.getElementById("pointDistrictFilters");
    if (!districtEl) {
      districtEl = document.createElement("div");
      districtEl.id = "pointDistrictFilters";
      districtEl.className = "chips";
      typeFilterEl.insertAdjacentElement("afterend", districtEl);
    }
    districtEl.style.display = isCity ? "none" : "flex";
    const ds = ["全部", ...(POINT_SUMMARY.coveredDistricts || [])];
    districtEl.innerHTML = ds.map((d) =>
      `<button class="chip ${d === mapState.district ? "active" : ""}" type="button" data-district="${d}">${d}</button>`
    ).join("");
    districtEl.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        mapState.district = btn.dataset.district;
        buildMapFilters();
        renderMap();
      });
    });
  }

  function renderMapDistrict() {
    if (!mapDistrictCard) return;
    if (mapState.district === "全部") {
      mapDistrictCard.innerHTML = `
        <p class="map-card-label">A · 区级背景</p>
        <h3>先在地图或筛选里选一个区</h3>
        <p>选中区后，这里会显示老龄化、综合便利指数、供需缺口和优先补的设施类型。</p>`;
      return;
    }
    const d = DISTRICTS.find((x) => x.name === mapState.district);
    if (!d) return;
    mapDistrictCard.innerHTML = `
      <p class="map-card-label">A · 区级背景</p>
      <div class="map-card-head">
        <h3>${esc(d.name)}</h3>
        <span>${d.aging.toFixed(1)}% 老龄化</span>
      </div>
      <div class="map-card-metrics">
        <div><b>${d.index.toFixed(1)}</b><span>综合指数</span></div>
        <div><b class="${d.gap > 0 ? "is-gap" : ""}">${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}</b><span>供需缺口</span></div>
        <div><b>${esc(d.weakest)}</b><span>优先补</span></div>
      </div>
      <a class="map-card-link" href="#/checkup">去 A 看这个区的图表 →</a>`;
  }

  function renderCityList() {
    const metricMap = {
      meal: { key: "mealPer10k", count: "meal", label: "助餐点", unit: "个/万老人" },
      daycare: { key: "daycarePer10k", count: "daycare", label: "日间照料", unit: "个/万老人" },
      beds: { key: "bedsPer10k", count: "beds", label: "卫生床位", unit: "张/万老人" },
    };
    const m = metricMap[mapState.metric] || metricMap.meal;
    const list = DISTRICTS.filter((d) => mapState.district === "全部" || d.name === mapState.district)
      .sort((a, b) => b[m.key] - a[m.key]);
    if (mapListCount) mapListCount.textContent = `${list.length} 个区 · 按${m.label}密度`;
    if (mapListSort) mapListSort.textContent = "全市区级图层";
    if (!mapListEl) return;
    mapListEl.innerHTML = list.map((d) => `
      <article class="map-point">
        <div class="map-point-top">
          <span class="map-point-type ${mapState.metric === "meal" ? "is-meal" : "is-day"}">${m.label}</span>
          <span class="map-point-geo">区级</span>
          <span class="map-point-dist">${d[m.key].toFixed(1)} ${m.unit}</span>
        </div>
        <h4>${esc(d.name)}</h4>
        <p>共 ${fmt(d[m.count])} · 老龄化 ${d.aging.toFixed(1)}% · 缺口 ${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}</p>
      </article>`).join("");
  }

  function renderMapList() {
    if (mapState.scope === "city") return renderCityList();
    const list = filteredPoints();
    if (mapListCount) mapListCount.textContent = `共 ${list.length} 个点位`;
    if (mapListSort) mapListSort.textContent = mapState.location ? "按离我距离排序" : "按区 / 名称";
    if (!mapListEl) return;
    if (!list.length) {
      mapListEl.innerHTML = `<div class="map-empty">这个筛选下没有点位。</div>`;
      return;
    }
    mapListEl.innerHTML = list.slice(0, 50).map((p) => {
      const dist = pointDistance(p);
      const geo = p.geoLevel === "street" ? "街道级近似" : "区级近似";
      return `
        <article class="map-point" data-name="${esc(p.name)}">
          <div class="map-point-top">
            <span class="map-point-type ${p.type === "助餐点" ? "is-meal" : "is-day"}">${p.type}</span>
            <span class="map-point-geo">${geo}</span>
            ${dist !== null ? `<span class="map-point-dist">${dist.toFixed(1)} km</span>` : ""}
          </div>
          <h4>${esc(p.name)}</h4>
          <p>${esc(p.district)} · ${esc(p.address)}</p>
          ${p.phone ? `<a class="map-point-phone" href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ""}
        </article>`;
    }).join("") + (list.length > 50 ? `<p class="map-list-more">还有 ${list.length - 50} 个点位，缩小筛选范围可查看更多。</p>` : "");
  }

  function renderMap() {
    const desc = document.getElementById("mapDesc");
    if (desc) {
      desc.textContent = mapState.scope === "city"
        ? "全市 16 区：按区级设施密度着色，颜色越深越密；点位详情仅中心城区试点提供。"
        : "中心城区试点：和平、河西、南开、河东、河北。定位后按距离排序；点位为区级/街道级近似，不显示门牌级精度。";
    }
    const scope = document.getElementById("mapScope");
    if (scope) {
      if (mapState.scope === "city") {
        scope.textContent = "全市 16 区 · 区级图层（点位详情仅中心城区试点）";
      } else {
        const ds = (POINT_SUMMARY.coveredDistricts || []).length;
        scope.textContent = `试点范围：${ds} 区 · ${POINT_SUMMARY.total || 0} 个点位（助餐 ${POINT_SUMMARY.meal || 0} / 日照 ${POINT_SUMMARY.daycare || 0}；街道级 ${POINT_SUMMARY.street || 0} / 区级 ${POINT_SUMMARY.district || 0}）`;
      }
    }
    buildMapFilters();
    renderMapDistrict();
    renderMapList();
    if (!mapChart) return;
    const list = filteredPoints();
    const cityMode = mapState.scope === "city";
    const hasStreet = (POINT_SUMMARY.street || 0) > 0;
    let data = [];
    let regions = [];
    if (cityMode) {
      const metricKey = { meal: "mealPer10k", daycare: "daycarePer10k", beds: "bedsPer10k" }[mapState.metric] || "mealPer10k";
      const vals = DISTRICTS.map((d) => d[metricKey]);
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      regions = DISTRICTS.map((d) => ({
        name: d.name,
        itemStyle: {
          areaColor: mixColor([234, 243, 248], [23, 93, 141], hi === lo ? 0.5 : (d[metricKey] - lo) / (hi - lo)),
        },
      }));
    } else if (hasStreet) {
      data = list.map((p) => ({
        name: p.name,
        value: [p.lon, p.lat],
        point: p,
        itemStyle: { color: p.type === "助餐点" ? "#b54633" : "#175d8d" },
      }));
    } else {
      const centers = {};
      (window.TJ_GEO?.features || []).forEach((f) => {
        const p = f.properties || {};
        const c = p.center || p.centroid;
        if (c) centers[p.name] = c;
      });
      const groups = {};
      list.forEach((p) => {
        if (!groups[p.district]) groups[p.district] = { district: p.district, count: 0 };
        groups[p.district].count += 1;
      });
      data = Object.values(groups).map((g) => {
        const c = centers[g.district] || [117.2, 39.1];
        return {
          name: g.district,
          value: [c[0], c[1], g.count],
          group: g,
          label: { show: true, formatter: `${g.count}`, color: "#102338", fontSize: 9, position: "inside" },
          itemStyle: { color: "#175d8d", opacity: 0.85, borderColor: "#ffffff", borderWidth: 1.5 },
        };
      });
    }
    const note = document.querySelector(".map-note");
    if (note) {
      if (cityMode) {
        note.textContent = "全市区级图层：颜色越深代表该指标密度越高；点位详情仅中心城区试点提供。";
      } else if (!hasStreet) {
        note.textContent = "坐标服务暂不可用：地图按区聚合；下方列表仍可查看点位名称、地址和电话（区级近似）。";
      }
    }
    mapChart.setOption({
      tooltip: {
        ...tooltipBase,
        trigger: "item",
        formatter(p) {
          if (!p.data) return p.name || "";
          if (p.data.group) {
            return `<div style="font-weight:600;margin-bottom:4px">${esc(p.data.group.district)}</div>`
              + row("点位数", `${p.data.group.count} 个`, "#175d8d")
              + row("地图精度", "区级聚合（坐标服务暂不可用）");
          }
          if (!p.data.point) return p.name || "";
          const d = p.data.point;
          const dist = pointDistance(d);
          return `<div style="font-weight:600;margin-bottom:4px">${esc(d.name)}</div>`
            + row("类型", d.type, d.type === "助餐点" ? "#b54633" : "#175d8d")
            + row("地址", d.address)
            + row("位置精度", d.geoLevel === "street" ? "街道级近似" : "区级近似")
            + (dist !== null ? row("离我", `${dist.toFixed(1)} km`, "#b54633") : "");
        },
      },
      geo: {
        map: "tianjin",
        roam: true,
        zoom: mapState.scope === "city" ? 1.02 : 1.38,
        center: mapState.location ? [mapState.location[1], mapState.location[0]] : (mapState.scope === "city" ? [117.2, 39.15] : [117.18, 39.13]),
        itemStyle: { areaColor: "#eaf3f8", borderColor: "#c3d8e5", borderWidth: 1 },
        emphasis: { itemStyle: { areaColor: "#d7e8f2" }, label: { color: "#102338" } },
        regions,
        label: { show: true, color: "#6f8798", fontSize: 9 },
      },
      series: [{
        name: "养老点位",
        type: "scatter",
        coordinateSystem: "geo",
        data,
        symbolSize: (val) => hasStreet ? 6 : Math.max(14, Math.min(32, 10 + Math.sqrt(val[2] || 1) * 1.7)),
        itemStyle: { borderColor: "#ffffff", borderWidth: 1, opacity: 0.9 },
        emphasis: { scale: 1.8, itemStyle: { borderColor: "#102338", borderWidth: 1.5 } },
      }],
    }, true);
    mapChart.resize();
  }

  if (mapEl && window.echarts && window.TJ_GEO) {
    window.echarts.registerMap("tianjin", window.TJ_GEO);
    mapChart = window.echarts.init(mapEl, null, { renderer: "canvas" });
    mapChart.on("click", (params) => {
      if (params.componentType === "series" && params.data && params.data.point) {
        mapState.selected = params.data.point;
        const d = params.data.point;
        if (mapState.district === "全部" && DISTRICTS.some((x) => x.name === d.district)) {
          mapState.district = d.district;
          renderMap();
        }
        return;
      }
      if (params.componentType === "series" && params.data && params.data.group) {
        mapState.district = params.data.group.district;
        renderMap();
        return;
      }
      const name = params.name;
      if (name && DISTRICTS.some((x) => x.name === name)) {
        mapState.district = mapState.district === name ? "全部" : name;
        renderMap();
      }
    });
    renderMap();
    window.addEventListener("resize", () => mapChart.resize(), { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => mapChart.resize()).observe(mapEl);
  } else if (mapEl) {
    mapEl.innerHTML = `<div class="map-empty" style="height:100%;display:grid;place-items:center">地图数据加载失败，请确认 data/tianjin_geo.js 存在。</div>`;
  }

  if (locateBtn) {
    locateBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        locateStatus.textContent = "浏览器不支持定位";
        return;
      }
      locateStatus.textContent = "正在定位…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapState.location = [pos.coords.latitude, pos.coords.longitude];
          locateStatus.textContent = `已定位 · ${mapState.location[0].toFixed(3)}, ${mapState.location[1].toFixed(3)}`;
          renderMap();
        },
        () => {
          locateStatus.textContent = "定位失败，可改用区筛选";
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    });
  }

  // A 的补点清单：直接由缺口排序生成，和缺口图联动
  const aActions = document.getElementById("aActions");
  if (aActions && EXTREMES.gapTop && EXTREMES.gapTop.length) {
    const list = EXTREMES.gapTop;
    aActions.innerHTML = `
      <div class="a-actions-head">
        <div>
          <p class="section-index">A · 补点清单</p>
          <h3>按当前数据，先看这三个区</h3>
        </div>
        <p>缺口 = 需求指数 − 供给指数。先补“最弱那一类”，再到 B 看这个区的点位。</p>
      </div>
      <div class="a-action-grid">
        ${list.map((d, i) => `
          <article class="a-action-card">
            <div class="a-action-top">
              <span class="a-action-rank">0${i + 1}</span>
              <span class="a-action-gap">${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}</span>
            </div>
            <h4>${d.name}</h4>
            <p>老龄化 ${d.aging.toFixed(1)}% · 供给指数 ${d.index.toFixed(1)}</p>
            <a href="#/map" class="a-action-tag" data-district="${d.name}">到地图看 ${d.name} →</a>
          </article>`).join("")}
      </div>`;
    aActions.querySelectorAll(".a-action-tag").forEach((link) => {
      link.addEventListener("click", () => {
        mapState.district = link.dataset.district;
        renderMap();
      });
    });
  }

  setText("dataNoteText", META.dataNote);
  setText("mealNoteText", META.facilityNote);
  const sourcesEl = document.getElementById("dataSources");
  if (sourcesEl) sourcesEl.textContent = `数据来源：${META.sources.join("；")}。`;

  /* ---------------- 使用说明弹窗 ---------------- */
  const helpModal = document.getElementById("helpModal");
  const helpOpen = document.getElementById("helpOpen");
  let lastFocus = null;

  function openHelp() {
    if (!helpModal) return;
    lastFocus = document.activeElement;
    helpModal.classList.add("open");
    helpModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const close = helpModal.querySelector(".help-close");
    if (close) close.focus();
  }

  function closeHelp() {
    if (!helpModal) return;
    helpModal.classList.remove("open");
    helpModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (helpOpen) helpOpen.addEventListener("click", openHelp);
  if (helpModal) {
    helpModal.querySelectorAll("[data-help-close]").forEach((el) => {
      el.addEventListener("click", closeHelp);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && helpModal.classList.contains("open")) closeHelp();
    });
  }

  /* ---------------- 分页路由 ---------------- */
  const PAGES = new Set(["home", "map", "checkup", "directory", "lab", "conclusion"]);
  const PAGE_ALIASES = { visual: "checkup", facilities: "directory", insights: "conclusion" };
  function pageFromHash() {
    const h = window.location.hash.replace(/^#\/?/, "");
    if (PAGE_ALIASES[h]) return PAGE_ALIASES[h];
    return PAGES.has(h) ? h : "home";
  }
  function showPage(name, updateHash = true) {
    if (!PAGES.has(name)) name = "home";
    if (helpModal && helpModal.classList.contains("open")) closeHelp();
    document.querySelectorAll(".page").forEach((p) => {
      p.classList.toggle("active", p.dataset.page === name);
    });
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.page === name);
    });
    if (updateHash && window.location.hash !== `#/${name}`) {
      history.replaceState(null, "", `#/${name}`);
    }
    window.scrollTo(0, 0);
    window.setTimeout(() => {
      if (chart) chart.resize();
      if (labChart) labChart.resize();
      if (mapChart) mapChart.resize();
    }, 60);
  }
  window.addEventListener("hashchange", () => showPage(pageFromHash(), false));
  showPage(pageFromHash(), false);
})();

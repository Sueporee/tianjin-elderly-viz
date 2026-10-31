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
  const chartText = { fontFamily: '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", system-ui, sans-serif' };
  const tooltipBase = {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#d6cdbb",
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: "#14181c", fontSize: 14, fontFamily: '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", system-ui, sans-serif' },
    extraCssText: "box-shadow:0 12px 32px rgba(20,24,28,.12);border-radius:8px;",
  };
  const row = (label, value, color) =>
    `<div style="display:flex;justify-content:space-between;gap:22px;margin-top:4px;color:#33475b">
      <span>${label}</span><b style="color:${color || "#14181c"}">${value}</b>
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
      top: isNarrow ? null : 0,
      bottom: isNarrow ? 0 : null,
      left: "center",
      itemGap: 18,
      icon: "rect",
      itemWidth: 10,
      itemHeight: 6,
      textStyle: { color: "#5f7182", fontSize: 12 },
    },
    grid: { left: isNarrow ? 44 : 55, right: isNarrow ? 46 : 58, top: isNarrow ? 56 : 44, bottom: isNarrow ? 120 : 82 },
    xAxis: {
      type: "category",
      data: byAgingDesc.map((d) => d.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b8c8d4" } },
      axisLabel: {
        color: "#5f7182",
        fontSize: 12,
        rotate: isNarrow ? 45 : 32,
        interval: isNarrow ? 1 : 0,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "60+人口（万人）",
        nameTextStyle: {
          color: "#6b747c",
          fontSize: 12,
          align: isNarrow ? "left" : "center",
          padding: [0, 0, 6, 0],
        },
        axisLabel: { color: "#6b747c", fontSize: 12 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      {
        type: "value",
        name: "老龄化率（%）",
        min: 12,
        max: 35,
        nameTextStyle: {
          color: "#6b747c",
          fontSize: 12,
          align: isNarrow ? "right" : "center",
          padding: [0, 0, 6, 0],
        },
        axisLabel: { color: "#6b747c", fontSize: 12, formatter: "{value}%" },
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
      axisLabel: { color: "#5f7182", fontSize: 12 },
    },
    yAxis: {
      type: "category",
      data: heatRows.map((d) => d.name),
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b8c8d4" } },
      axisLabel: { color: "#5f7182", fontSize: 12.5 },
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
      textStyle: { color: "#6b747c", fontSize: 12 },
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
        fontSize: 12.5,
        rich: {
          light: { color: "#ffffff" },
          dark: { color: "#14181c" },
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
        textStyle: { color: "#14181c", fontSize: 20, fontWeight: 600, fontFamily: '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", system-ui, sans-serif' },
        subtextStyle: { color: "#6b747c", fontSize: 12 },
      },
      tooltip: { ...tooltipBase, trigger: "item", formatter: "{b}<br/><b>{c}</b> 个（{d}%）" },
      legend: {
        bottom: 0,
        left: "center",
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#5f7182", fontSize: 12 },
      },
      series: [{
        name: "点位构成",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "44%"],
        itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
        label: { color: "#33475b", fontSize: 12, formatter: "{b}\n{d}%" },
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
        axisLabel: { color: "#6b747c", fontSize: 12, formatter: "{value}%" },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#6b747c", fontSize: 12 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      series: [{
        type: "scatter",
        data,
        label: { show: true, position: "top", formatter: "{b}", color: "#33475b", fontSize: 12.5 },
        labelLayout: (params) => {
          const off = offsets[params.text] || [0, -9];
          return { dx: off[0], dy: off[1] };
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: "#6b747c" },
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
        axisLabel: { color: "#6b747c", fontSize: 12 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      yAxis: {
        type: "category",
        data: display.map((d) => d.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#b8c8d4" } },
        axisLabel: { color: "#5f7182", fontSize: 12 },
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
          fontSize: 12,
          color: "#5f7182",
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#6b747c", type: "solid" },
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
    const sens = DATA.sensitivity;
    const sensText = sens ? ` 权重敏感性：${sens.stable}/${sens.total} 区排名波动≤2 位，${sens.volatile} 区波动≥5 位；中间区对权重较敏感，需结合实地核查。` : "";
    labInsight.textContent = text + sensText;

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
        axisLabel: { color: "#6b747c", fontSize: 12 },
        splitLine: { lineStyle: { color: "#d8e2e9" } },
      },
      yAxis: {
        type: "category",
        data: sorted.map((d) => d.name),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#b8c8d4" } },
        axisLabel: { color: "#5f7182", fontSize: 12 },
      },
      series: [{
        type: "bar",
        data: sorted.map((d) => ({
          value: +d.custom.toFixed(1),
          itemStyle: { color: indexColor(d.custom) },
        })),
        barMaxWidth: 12,
        label: { show: true, position: "right", formatter: "{c}", fontSize: 12, color: "#5f7182" },
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

  /* ---------------- B 真实底图 ---------------- */
  const POINTS = DATA.points || [];
  const POINT_SUMMARY = DATA.pointSummary || {};
  const mapState = { type: "全部", district: "全部", street: null, location: null, locationGcj: null, focus: null, selected: null };
  const mapEl = document.getElementById("tjMap");
  const mapListEl = document.getElementById("mapList");
  const mapListCount = document.getElementById("mapListCount");
  const mapListSort = document.getElementById("mapListSort");
  const mapDistrictCard = document.getElementById("mapDistrictCard");
  const locateBtn = document.getElementById("locateBtn");
  const locateStatus = document.getElementById("locateStatus");
  const typeFilterEl = document.getElementById("pointTypeFilters");
  const mapSearchEl = document.getElementById("mapSearch");
  const mapSearchResults = document.getElementById("mapSearchResults");
  const STREETS = [...new Set(POINTS.map((p) => p.street).filter(Boolean))];
  let map = null;
  let districtLayer = null;
  let markerLayer = null;
  let bubbleLayer = null;
  let highlightLayer = null;
  let userMarker = null;

  function updatePointCopy() {
    const ds = (POINT_SUMMARY.coveredDistricts || []).length;
    const total = POINT_SUMMARY.total || 0;
    const home = document.getElementById("homePointText");
    if (home) home.textContent = `全市 ${ds} 区 · ${total} 个点位 · 定位后按距离排序`;
    const note = document.getElementById("heroPointNote");
    if (note) note.textContent = `B 已收录 ${ds} 区 ${total} 个点位；中心城区为街道级近似，其他区为区级近似；具体服务以民政局名单为准。`;
    const help = document.getElementById("helpPointNote");
    if (help) help.innerHTML = `<strong>为什么地图有 ${total} 个点位？</strong>B 已收录 ${ds} 区民政局名单；中心城区较细，其他区为区级近似。全市区级总数仍以“区级账本”为准。`;
  }

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
    if (!mapState.location) return null;
    const loc = p.coordSys === "gcj" ? mapState.locationGcj : mapState.location;
    return loc ? haversine(loc, [p.lat, p.lon]) : null;
  }

  function filteredPoints() {
    if (mapState.type === "卫生床位") return [];
    return POINTS.filter((p) =>
      (mapState.type === "全部" || p.type === mapState.type) &&
      (mapState.district === "全部" || p.district === mapState.district) &&
      (!mapState.street || p.street === mapState.street)
    ).sort((a, b) => {
      if (mapState.location) return pointDistance(a) - pointDistance(b);
      return a.district.localeCompare(b.district, "zh") || a.name.localeCompare(b.name, "zh");
    });
  }

  // Photon/浏览器定位是 WGS84，高德底图是 GCJ-02；街道点做一次转换。
  function wgs84ToGcj02(lat, lon) {
    const a = 6378245.0, ee = 0.00669342162296594323;
    const outOfChina = lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
    if (outOfChina) return [lat, lon];
    const transformLat = (x, y) => {
      let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
      r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
      r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
      return r;
    };
    const transformLon = (x, y) => {
      let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
      r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
      r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
      return r;
    };
    const dLat = transformLat(lon - 105, lat - 35);
    const dLon = transformLon(lon - 105, lat - 35);
    const radLat = lat / 180 * Math.PI;
    const magic = Math.sin(radLat);
    const magic2 = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic2);
    const dLat2 = (dLat * 180) / ((a * (1 - ee)) / (magic2 * sqrtMagic) * Math.PI);
    const dLon2 = (dLon * 180) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    return [lat + dLat2, lon + dLon2];
  }

  function pointLatLng(p) {
    if (p.coordSys === "gcj") return [p.lat, p.lon];
    if (p.coordSys === "wgs" || p.geoLevel === "street") return wgs84ToGcj02(p.lat, p.lon);
    return [p.lat, p.lon];
  }

  function centerOf(name) {
    const f = (window.TJ_GEO?.features || []).find((x) => x.properties?.name === name);
    if (!f) return null;
    const c = f.properties?.center || f.properties?.centroid;
    return c ? [c[1], c[0]] : null;
  }

  function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function districtAt(lat, lon) {
    for (const f of (window.TJ_GEO?.features || [])) {
      if (!f.geometry) continue;
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) {
        if (poly?.[0] && pointInRing(lon, lat, poly[0])) return f;
      }
    }
    return null;
  }

  function districtCount(name, type) {
    if (type === "卫生床位") {
      const d = DISTRICTS.find((x) => x.name === name);
      return d ? d.beds : 0;
    }
    return POINTS.filter((p) => p.district === name && (type === "全部" || p.type === type)).length;
  }

  function searchPlaces(query) {
    const q = String(query || "").trim();
    if (!q) return [];
    const items = [];
    DISTRICTS.filter((d) => d.name.includes(q)).slice(0, 3).forEach((d) => items.push({ kind: "district", value: d.name, label: d.name, note: "行政区" }));
    STREETS.filter((s) => s.includes(q)).slice(0, 5).forEach((s) => items.push({ kind: "street", value: s, label: s, note: "街道" }));
    POINTS.filter((p) => p.name.includes(q) || p.address.includes(q)).slice(0, 6).forEach((p) => items.push({ kind: "point", value: p.name, label: p.name, note: `点位 · ${p.district}`, point: p }));
    return items;
  }

  function choosePlace(item) {
    if (!item) return;
    if (item.kind === "district") {
      mapState.district = item.value;
      mapState.street = null;
      mapState.selected = null;
      mapState.focus = centerOf(item.value);
    } else if (item.kind === "street") {
      const p = POINTS.find((x) => x.street === item.value);
      if (p) {
        mapState.district = p.district;
        mapState.street = item.value;
        mapState.selected = null;
        mapState.focus = pointLatLng(p);
      }
    } else if (item.kind === "point") {
      const p = item.point;
      mapState.district = p.district;
      mapState.street = null;
      mapState.selected = p;
      mapState.focus = pointLatLng(p);
    }
    if (mapSearchEl) mapSearchEl.value = item.label;
    if (mapSearchResults) mapSearchResults.classList.remove("open");
    renderMap();
  }

  function renderSearchResults() {
    if (!mapSearchResults) return;
    const items = searchPlaces(mapSearchEl?.value || "");
    if (!items.length) { mapSearchResults.classList.remove("open"); mapSearchResults.innerHTML = ""; return; }
    mapSearchResults.innerHTML = items.map((item, i) =>
      `<button class="map-search-item" type="button" data-index="${i}">${esc(item.label)}<small>${item.note}</small></button>`
    ).join("");
    mapSearchResults.classList.add("open");
    mapSearchResults.querySelectorAll(".map-search-item").forEach((btn) => {
      btn.addEventListener("click", () => choosePlace(items[Number(btn.dataset.index)]));
    });
  }

  if (mapSearchEl) {
    mapSearchEl.addEventListener("input", renderSearchResults);
    mapSearchEl.addEventListener("focus", renderSearchResults);
    mapSearchEl.addEventListener("keydown", (e) => {
      const items = searchPlaces(mapSearchEl.value);
      if (e.key === "Escape") { mapSearchResults.classList.remove("open"); mapSearchEl.blur(); }
      if (e.key === "Enter" && items.length) { e.preventDefault(); choosePlace(items[0]); }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".map-search-wrap")) mapSearchResults?.classList.remove("open");
    });
  }

  function buildMapFilters() {
    const counts = { "全部": POINT_SUMMARY.total || 0, "助餐点": POINT_SUMMARY.meal || 0, "日间照料": POINT_SUMMARY.daycare || 0 };
    const types = ["全部", "助餐点", "日间照料", "卫生床位"];
    typeFilterEl.innerHTML = types.map((t) =>
      `<button class="chip ${t === mapState.type ? "active" : ""}" type="button" data-type="${t}">${t}${counts[t] ? ` (${counts[t]})` : ""}</button>`
    ).join("");
    typeFilterEl.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        mapState.type = btn.dataset.type;
        mapState.selected = null;
        mapState.street = null;
        if (mapState.type === "卫生床位") mapState.district = "全部";
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
    districtEl.style.display = mapState.type === "卫生床位" ? "none" : "flex";
    const ds = ["全部", ...(POINT_SUMMARY.coveredDistricts || [])];
    districtEl.innerHTML = ds.map((d) =>
      `<button class="chip ${d === mapState.district ? "active" : ""}" type="button" data-district="${d}">${d}</button>`
    ).join("");
    districtEl.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        mapState.district = btn.dataset.district;
        mapState.selected = null;
        mapState.street = null;
        mapState.focus = mapState.district === "全部" ? null : centerOf(mapState.district);
        renderMap();
      });
    });
  }

  function renderMapDistrict() {
    if (!mapDistrictCard) return;
    if (mapState.district === "全部") {
      mapDistrictCard.innerHTML = `<p class="map-card-label">A · 区级背景</p><h3>点地图上的区，看它的资源账本</h3><p>选中区后，这里会显示老龄化、综合指数、供需缺口和优先补的设施类型。</p>`;
      return;
    }
    const d = DISTRICTS.find((x) => x.name === mapState.district);
    if (!d) return;
    mapDistrictCard.innerHTML = `<p class="map-card-label">A · 区级背景</p>
      <div class="map-card-head"><h3>${esc(d.name)}</h3><span>${d.aging.toFixed(1)}% 老龄化</span></div>
      <div class="map-card-metrics"><div><b>${d.index.toFixed(1)}</b><span>综合指数</span></div>
      <div><b class="${d.gap > 0 ? "is-gap" : ""}">${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}</b><span>供需缺口</span></div>
      <div><b>${esc(d.weakest)}</b><span>优先补</span></div></div>
      <a class="map-card-link" href="#/checkup">去 A 看这个区的图表 →</a>`;
  }

  function renderSelection() {
    const el = document.getElementById("mapSelection");
    if (!el) return;
    const p = mapState.selected;
    if (!p) { el.className = "map-selection"; el.innerHTML = ""; return; }
    el.className = "map-selection open";
    el.innerHTML = `<div class="map-selection-top"><span>已选中点位 · ${p.geoLevel === "address" ? "门址级" : p.geoLevel === "street" ? "街道级近似" : "区级近似"}${p.quality ? ` · 资料 ${p.quality}` : ""}</span><button class="map-selection-close" type="button" data-clear-point aria-label="关闭">×</button></div>
      <h4>${esc(p.name)}</h4><p>${esc(p.district)} · ${esc(p.address)}</p>
      ${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ""}`;
    const close = el.querySelector("[data-clear-point]");
    if (close) close.addEventListener("click", () => { mapState.selected = null; renderMap(); });
  }

  function renderPointList() {
    const list = filteredPoints();
    if (mapListCount) mapListCount.textContent = `共 ${list.length} 个点位`;
    if (mapListSort) mapListSort.textContent = mapState.location ? "按离我距离排序" : "按区 / 名称";
    if (!mapListEl) return;
    if (!list.length) { mapListEl.innerHTML = `<div class="map-empty">这个分类下没有点位。</div>`; return; }
    mapListEl.innerHTML = list.slice(0, 50).map((p) => {
      const dist = pointDistance(p);
      const geo = `${p.geoLevel === "address" ? "门址级" : p.geoLevel === "street" ? "街道级近似" : "区级近似"}${p.quality ? ` · 资料${p.quality}` : ""}`;
      return `<article class="map-point"><div class="map-point-top"><span class="map-point-type ${p.type === "助餐点" ? "is-meal" : "is-day"}">${p.type}</span><span class="map-point-geo">${geo}</span>${dist !== null ? `<span class="map-point-dist">${dist.toFixed(1)} km</span>` : ""}</div><h4>${esc(p.name)}</h4><p>${esc(p.district)} · ${esc(p.address)}</p>${p.phone ? `<a class="map-point-phone" href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ""}</article>`;
    }).join("") + (list.length > 50 ? `<p class="map-list-more">还有 ${list.length - 50} 个点位，缩小到具体区可查看更多。</p>` : "");
    mapListEl.querySelectorAll(".map-point").forEach((el, i) => {
      el.addEventListener("click", () => {
        const p = list[i]; if (!p) return;
        mapState.selected = p; mapState.district = p.district;
        mapState.focus = p.geoLevel === "address" || p.geoLevel === "street" ? pointLatLng(p) : centerOf(p.district);
        renderMap();
      });
    });
  }

  function renderAggregateList() {
    const isBeds = mapState.type === "卫生床位";
    const rows = DISTRICTS.map((d) => ({ d, count: districtCount(d.name, mapState.type) }))
      .sort((a, b) => isBeds ? b.d.metric - a.d.metric : b.count - a.count);
    if (mapListCount) mapListCount.textContent = `16 个区 · ${isBeds ? "按床位密度" : "按点位数"}`;
    if (mapListSort) mapListSort.textContent = isBeds ? "区级图层" : "点击区查看点位";
    if (!mapListEl) return;
    mapListEl.innerHTML = rows.map(({ d, count }) => `<article class="map-point" data-district="${esc(d.name)}"><div class="map-point-top"><span class="map-point-type ${isBeds ? "is-day" : count > 0 ? "is-meal" : "is-day"}">${isBeds ? "卫生床位" : count > 0 ? "有点位" : "暂无点位"}</span><span class="map-point-geo">区级</span><span class="map-point-dist">${isBeds ? `${d.bedsPer10k.toFixed(0)} 张/万老人` : `${count} 个`}</span></div><h4>${esc(d.name)}</h4><p>老龄化 ${d.aging.toFixed(1)}% · 综合指数 ${d.index.toFixed(1)} · 缺口 ${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}</p></article>`).join("");
    mapListEl.querySelectorAll(".map-point[data-district]").forEach((el) => {
      el.addEventListener("click", () => {
        mapState.district = el.dataset.district; mapState.selected = null;
        mapState.street = null;
        mapState.focus = centerOf(mapState.district); renderMap();
      });
    });
  }

  function highlightSelected() {
    if (!map || !highlightLayer) return;
    highlightLayer.clearLayers();
    const p = mapState.selected;
    if (!p) return;
    const latlng = p.geoLevel === "address" || p.geoLevel === "street" ? pointLatLng(p) : centerOf(p.district);
    if (!latlng) return;
    L.circleMarker(latlng, {
      radius: 11, color: "#b54633", weight: 2, fillColor: "#ffffff", fillOpacity: 0.18, dashArray: "3,3",
    }).addTo(highlightLayer);
    const content = `<div class="selected-popup"><strong>${esc(p.name)}</strong><br>${esc(p.district)} · ${esc(p.address)}${p.phone ? `<br><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ""}<br><small>${p.geoLevel === "address" ? "门址级" : p.geoLevel === "street" ? "街道级近似" : "区级近似"}${p.quality ? ` · 资料 ${p.quality}` : ""}</small></div>`;
    L.popup({ autoClose: false, closeOnClick: false, className: "selected-popup-wrap", maxWidth: 270 })
      .setLatLng(latlng).setContent(content).openOn(map);
    map.setView(latlng, Math.max(map.getZoom(), 13));
  }

  function renderMap() {
    updatePointCopy();
    buildMapFilters();
    renderMapDistrict();
    renderSelection();
    const showPoints = mapState.district !== "全部" && mapState.type !== "卫生床位";
    if (!showPoints) renderAggregateList(); else renderPointList();
    const note = document.querySelector(".map-note");
    if (note) {
      if (showPoints) {
        const all = filteredPoints();
        const approx = all.filter((p) => p.geoLevel === "district").length;
        if (mapState.street) {
          note.textContent = `当前筛选街道：${mapState.street}；共 ${all.length} 个点位。`;
        } else {
          note.textContent = approx
            ? `门址/街道级点位单独显示；另有 ${approx} 个区级近似点位在右侧列表，不在地图上伪造位置。`
            : "当前为门址/街道级点位；点选可看详情。";
        }
      } else {
        note.textContent = "颜色=区级设施密度；点击地图气泡或右侧区名，查看该区具体点位。";
      }
    }
    if (!map) return;

    const metricKey = mapState.type === "助餐点" ? "mealPer10k" : mapState.type === "日间照料" ? "daycarePer10k" : mapState.type === "卫生床位" ? "bedsPer10k" : "index";
    const vals = DISTRICTS.map((d) => d[metricKey]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    districtLayer.setStyle((f) => {
      const d = DISTRICTS.find((x) => x.name === f.properties.name);
      const t = d && hi !== lo ? (d[metricKey] - lo) / (hi - lo) : 0.5;
      return { fillColor: mixColor([234, 243, 248], [23, 93, 141], t), fillOpacity: 0.5, color: "#ffffff", weight: 1 };
    });

    markerLayer.clearLayers();
    bubbleLayer.clearLayers();
    if (showPoints) {
      const all = filteredPoints();
      const exactPoints = all.filter((p) => p.geoLevel !== "district");
      const approxPoints = all.filter((p) => p.geoLevel === "district");
      const groups = {};
      exactPoints.forEach((p) => {
        const key = p.geoLevel === "address"
          ? `addr-${p.lat}-${p.lon}-${p.name}`
          : (p.street || `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`);
        if (!groups[key]) groups[key] = { points: [], lat: p.lat, lon: p.lon, type: p.type };
        groups[key].points.push(p);
      });
      Object.values(groups).forEach((g) => {
        const p = g.points[0];
        const radius = g.points.length > 1 ? Math.max(7, Math.min(14, 5 + Math.sqrt(g.points.length) * 2)) : 5;
        const m = L.circleMarker(pointLatLng(p), { radius, color: "#fff", weight: 1.2, fillColor: p.type === "助餐点" ? "#b54633" : "#175d8d", fillOpacity: 0.95 }).addTo(markerLayer);
        const list = g.points.slice(0, 6).map((x) => `<div style="margin:4px 0"><strong>${esc(x.name)}</strong><br>${esc(x.address)}${x.phone ? `<br>${esc(x.phone)}` : ""}</div>`).join("");
        m.bindPopup(`<div style="max-width:260px;max-height:240px;overflow:auto;font-size:11px"><div style="font-weight:700;margin-bottom:4px">${g.points.length} 个街道级点位</div>${list}${g.points.length > 6 ? "<div>…</div>" : ""}</div>`);
        if (g.points.length > 1) m.bindTooltip(`${g.points.length}`, { permanent: true, direction: "center", className: "leaflet-street-label" });
        m.on("click", () => {
          mapState.selected = p; mapState.district = p.district;
          mapState.focus = wgs84ToGcj02(p.lat, p.lon);
          renderMap();
        });
      });
      if (approxPoints.length && exactPoints.length === 0) {
        const c = centerOf(mapState.district);
        if (c) {
          const b = L.circleMarker(c, { radius: Math.max(18, Math.min(40, 14 + Math.sqrt(approxPoints.length) * 2.2)), color: "#fff", weight: 1.5, fillColor: "#175d8d", fillOpacity: 0.88 }).addTo(bubbleLayer);
          b.bindTooltip(`${approxPoints.length} 个区级点位`, { permanent: true, direction: "center", className: "leaflet-bubble-label" });
        }
      }
      const center = centerOf(mapState.district);
      if (center) map.setView(center, Math.max(map.getZoom(), 13));
    } else {
      DISTRICTS.forEach((d) => {
        const c = centerOf(d.name);
        const count = districtCount(d.name, mapState.type);
        if (!c || count <= 0) return;
        const b = L.circleMarker(c, { radius: Math.max(14, Math.min(38, 12 + Math.sqrt(count) * 1.5)), color: "#fff", weight: 1.3, fillColor: mapState.type === "助餐点" ? "#b54633" : "#175d8d", fillOpacity: 0.88 }).addTo(bubbleLayer);
        b.bindTooltip(`${count}`, { permanent: true, direction: "center", className: "leaflet-bubble-label" });
        b.on("click", () => { mapState.district = d.name; mapState.focus = c; renderMap(); });
      });
      map.fitBounds(districtLayer.getBounds(), { padding: [18, 18] });
    }
    highlightSelected();
  }

  if (mapEl && window.L && window.TJ_GEO) {
    map = L.map(mapEl, { zoomControl: true, attributionControl: true }).setView([39.13, 117.2], 10);
    L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
      subdomains: ["1", "2", "3", "4"], maxZoom: 18, attribution: "&copy; 高德地图",
    }).addTo(map);
    districtLayer = L.geoJSON(window.TJ_GEO, {
      style: { fillColor: "#eaf3f8", fillOpacity: 0.45, color: "#ffffff", weight: 1 },
      onEachFeature: (f, layer) => {
        const name = f.properties?.name;
        layer.bindTooltip(name, { permanent: true, direction: "center", className: "leaflet-district-label" });
        layer.on("click", () => { mapState.district = name; mapState.focus = centerOf(name); renderMap(); });
      },
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    bubbleLayer = L.layerGroup().addTo(map);
    highlightLayer = L.layerGroup().addTo(map);
    renderMap();
    window.addEventListener("resize", () => map.invalidateSize(), { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize()).observe(mapEl);
  } else if (mapEl) {
    mapEl.innerHTML = `<div class="map-empty" style="height:100%;display:grid;place-items:center">地图库加载失败，请确认 vendor/leaflet/leaflet.js 存在。</div>`;
  }

  if (locateBtn) {
    locateBtn.addEventListener("click", () => {
      if (!navigator.geolocation) { locateStatus.textContent = "浏览器不支持定位"; return; }
      locateStatus.textContent = "正在定位…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const wgs = [pos.coords.latitude, pos.coords.longitude];
          const gcj = wgs84ToGcj02(wgs[0], wgs[1]);
          mapState.location = wgs;
          mapState.locationGcj = gcj;
          const f = districtAt(gcj[0], gcj[1]);
          if (f) {
            const name = f.properties?.name || "";
            mapState.district = name;
            mapState.street = null;
            mapState.selected = null;
            mapState.focus = gcj;
            locateStatus.textContent = `已定位 · ${name} · ${wgs[0].toFixed(4)}, ${wgs[1].toFixed(4)}`;
          } else {
            mapState.district = "全部";
            mapState.focus = gcj;
            locateStatus.textContent = `已定位 · ${wgs[0].toFixed(4)}, ${wgs[1].toFixed(4)}（不在天津 16 区范围）`;
          }
          if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
          const ring = L.circleMarker(gcj, { radius: 18, color: "#1d7ed6", weight: 0, fillColor: "#1d7ed6", fillOpacity: 0.16 }).addTo(map);
          const dot = L.circleMarker(gcj, { radius: 7, color: "#fff", weight: 2, fillColor: "#1d7ed6", fillOpacity: 1 }).addTo(map);
          userMarker = L.layerGroup([ring, dot]).addTo(map);
          dot.bindPopup(`<strong>我的位置</strong><br>${wgs[0].toFixed(5)}, ${wgs[1].toFixed(5)}${f ? `<br>${f.properties.name}` : ""}`).openPopup();
          renderMap();
          map.setView(gcj, 15);
        },
        () => { locateStatus.textContent = "定位失败，可改用区筛选"; },
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
      if (map) {
        map.invalidateSize();
        if (mapState.focus) map.setView(mapState.focus, Math.max(map.getZoom(), 13));
        else if (districtLayer) map.fitBounds(districtLayer.getBounds(), { padding: [18, 18] });
      }
    }, 60);
  }
  window.addEventListener("hashchange", () => showPage(pageFromHash(), false));
  showPage(pageFromHash(), false);
})();

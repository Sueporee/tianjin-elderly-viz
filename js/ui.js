/* 视觉层交互：滚动揭示、浮层状态、移动端菜单
   只做表现，不改动 app.js 的数据与路由逻辑。 */
(function () {
  "use strict";

  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 顶部导航滚动状态 ---------- */
  var header = document.getElementById("siteHeader");
  var ticking = false;

  function onScrollState() {
    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScrollState);
      }
    },
    { passive: true }
  );
  onScrollState();

  /* ---------- 区块滚动揭示 ---------- */
  var revealItems = [].slice.call(document.querySelectorAll("[data-reveal]"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) {
      el.classList.add("is-revealed");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    revealItems.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- 标语逐字点亮 ---------- */
  var tagline = document.getElementById("taglineText");
  var taglineWords = [];

  if (tagline) {
    [].slice.call(tagline.querySelectorAll(".tagline-line")).forEach(function (line) {
      var text = line.textContent.trim();
      line.textContent = "";
      Array.from(text).forEach(function (ch) {
        var span = document.createElement("span");
        span.className = "tagline-word";
        span.textContent = ch;
        line.appendChild(span);
        taglineWords.push(span);
      });
    });
  }

  if (taglineWords.length) {
    if (reduceMotion) {
      taglineWords.forEach(function (w) {
        w.classList.add("on");
      });
    } else {
      var litCount = -1;
      var tagTicking = false;

      var paintTagline = function () {
        tagTicking = false;
        var line = window.innerHeight * 0.82;
        var next = 0;
        for (var i = 0; i < taglineWords.length; i += 1) {
          var rect = taglineWords[i].getBoundingClientRect();
          if (rect.top < line) next = i + 1;
        }
        if (next === litCount) return;
        litCount = next;
        for (var j = 0; j < taglineWords.length; j += 1) {
          taglineWords[j].classList.toggle("on", j < next);
        }
      };

      var onTagScroll = function () {
        if (!tagTicking) {
          tagTicking = true;
          requestAnimationFrame(paintTagline);
        }
      };

      window.addEventListener("scroll", onTagScroll, { passive: true });
      window.addEventListener("resize", onTagScroll);
      paintTagline();
    }
  }

  /* ---------- 移动端菜单状态 ---------- */
  var nav = document.getElementById("nav");
  var navToggle = document.getElementById("navToggle");

  function syncNavLock() {
    var open = !!(nav && nav.classList.contains("open"));
    document.body.classList.toggle("nav-open", open);
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "关闭菜单" : "展开菜单");
    }
  }

  if (nav) {
    new MutationObserver(syncNavLock).observe(nav, {
      attributes: true,
      attributeFilter: ["class"]
    });
    syncNavLock();
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (nav && nav.classList.contains("open")) {
      nav.classList.remove("open");
    }
  });

  window.addEventListener("hashchange", function () {
    if (nav) nav.classList.remove("open");
    window.scrollTo(0, 0);
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900 && nav) {
      nav.classList.remove("open");
    }
  });

  /* ---------- 首页典型区速写（数字取自 APP_DATA，避免与表格脱节） ---------- */
  var focusCards = [].slice.call(document.querySelectorAll(".focus-card"));
  var DATA = window.APP_DATA;

  if (focusCards.length && DATA && DATA.districts && DATA.districts.length) {
    var districts = DATA.districts;
    var pick = function (compare) {
      return districts.reduce(function (best, d) {
        return compare(d, best) ? d : best;
      }, districts[0]);
    };
    var extremes = {
      aging: pick(function (d, b) {
        return d.aging > b.aging;
      }),
      meal: pick(function (d, b) {
        return d.mealPer10k < b.mealPer10k;
      }),
      index: pick(function (d, b) {
        return d.index > b.index;
      })
    };
    var copy = {
      aging: function (d) {
        return "60 岁以上 " + (d.elderly60 / 10000).toFixed(2) + " 万，老龄化率全市最高。";
      },
      meal: function (d) {
        return "每万名老人 " + d.mealPer10k.toFixed(1) + " 家助餐点，吃饭这件小事最需要补。";
      },
      index: function (d) {
        return "三类设施综合便利指数 " + d.index.toFixed(1) + "，中心城区资源最密，但仍要看点位。";
      }
    };

    focusCards.forEach(function (card) {
      var textEl = card.querySelector(".focus-text");
      var key = textEl ? textEl.getAttribute("data-focus-text") : null;
      var d = key && extremes[key];
      if (!d) return;
      var valueEl = card.querySelector(".focus-value strong");
      var nameEl = card.querySelector("h3");
      var metric = key === "meal" ? d.mealPer10k : key === "index" ? d.index : d.aging;
      if (valueEl) valueEl.textContent = metric.toFixed(1);
      if (nameEl) nameEl.textContent = d.name;
      if (textEl) textEl.textContent = copy[key](d);
    });
  }

  /* ---------- 区级一页纸（打印 / 存 PDF） ---------- */
  var printSheet = document.getElementById("printSheet");

  function median(values) {
    var arr = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  function sign(n) {
    return (n > 0 ? "+" : "") + n.toFixed(1);
  }

  function buildSheet(districtName) {
    var data = window.APP_DATA;
    if (!data || !data.districts) return null;
    var d = data.districts.filter(function (x) { return x.name === districtName; })[0];
    if (!d) return null;

    var med = {
      aging: median(data.districts.map(function (x) { return x.aging; })),
      meal: median(data.districts.map(function (x) { return x.mealPer10k; })),
      daycare: median(data.districts.map(function (x) { return x.daycarePer10k; })),
      beds: median(data.districts.map(function (x) { return x.bedsPer10k; })),
      index: median(data.districts.map(function (x) { return x.index; }))
    };

    var kpi = function (label, value, unit) {
      return '<div class="brief-kpi"><span class="brief-kpi-label">' + label + "</span><strong>"
        + value + '</strong><span class="brief-kpi-unit">' + unit + "</span></div>";
    };

    var num = function (n) {
      return Number(n).toLocaleString("zh-CN");
    };

    var row = function (label, own, base, unit) {
      var diff = own - base;
      return "<tr><th>" + label + "</th><td>" + own.toFixed(1) + unit
        + "</td><td>" + base.toFixed(1) + unit
        + '</td><td class="' + (diff >= 0 ? "is-up" : "is-down") + '">' + sign(diff) + unit + "</td></tr>";
    };

    var sources = (data.meta.sources || []).map(function (s) {
      return "<li>" + s + "</li>";
    }).join("");

    return ''
      + '<header class="brief-head">'
      + '<p class="brief-kicker">海河养老资源 · 区级一页纸</p>'
      + "<h1>" + d.name + "</h1>"
      + '<p class="brief-sub">老年人、助餐点、日间照料与卫生床位 · 2020 七普 / 2024—2025 公开名单</p>'
      + "</header>"
      + '<section class="brief-kpis">'
      + kpi("60 岁以上", (d.elderly60 / 10000).toFixed(2), "万人")
      + kpi("老龄化率", d.aging.toFixed(1), "%")
      + kpi("助餐点", num(d.meal), "家 · " + d.mealPer10k.toFixed(1) + "/万人")
      + kpi("日间照料", num(d.daycare), "家 · " + d.daycarePer10k.toFixed(1) + "/万人")
      + kpi("卫生床位", num(d.beds), "张 · " + d.bedsPer10k.toFixed(0) + "/万人")
      + kpi("综合便利指数", d.index.toFixed(1), "16 区第 " + (d.rankRange || "—") + " 位")
      + "</section>"
      + '<section class="brief-text">'
      + "<h2>一句话判断</h2>"
      + "<p>该区目前最薄的一环是<strong>" + d.weakest + "</strong>；按本次权重口径测算的供需缺口为 <strong>"
      + sign(d.gap) + "</strong>（需求指数 " + d.demand.toFixed(1) + "）。缺口为正表示设施相对需求偏紧，为负表示相对宽松。</p>"
      + "</section>"
      + '<section class="brief-text">'
      + "<h2>与全市中位数对比</h2>"
      + '<table class="brief-table"><thead><tr><th>指标</th><th>' + d.name + "</th><th>16 区中位数</th><th>差</th></tr></thead><tbody>"
      + row("老龄化率", d.aging, med.aging, "%")
      + row("每万人助餐点", d.mealPer10k, med.meal, " 家")
      + row("每万人日间照料", d.daycarePer10k, med.daycare, " 家")
      + row("每万人卫生床位", d.bedsPer10k, med.beds, " 张")
      + row("综合便利指数", d.index, med.index, "")
      + "</tbody></table>"
      + "</section>"
      + '<section class="brief-text brief-scope">'
      + "<h2>数据来源与边界</h2>"
      + "<ul>"
      + "<li><strong>来源：</strong>民政部门公开名单，含区级逐行统计；卫生床位为 2024 年卫生机构口径。</li>"
      + "<li><strong>坐标：</strong>市域点位按门址经纬度（GCJ-02）落点，个别点位只有区级坐标；距离为直线距离，不代表实际步行距离。</li>"
      + "<li><strong>核实：</strong>点位信息来自公开名单，<strong>尚未逐条人工电话核实</strong>，实际营业状态与收费需电话确认。</li>"
      + "<li><strong>不可用于：</strong>不能用本页推算真实补点选址（还需街道人口、房源、运营成本与补贴口径），也不能替代民政部门的正式名单。</li>"
      + "</ul>"
      + sources
      + "</section>"
      + '<footer class="brief-foot">生成于 ' + new Date().toLocaleDateString("zh-CN")
      + " · sueporee.github.io/tianjin-elderly-viz</footer>";
  }

  if (printSheet) {
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest ? event.target.closest("[data-brief]") : null;
      if (!trigger) return;
      var html = buildSheet(trigger.getAttribute("data-brief"));
      if (!html) return;
      printSheet.innerHTML = html;
      printSheet.classList.add("is-ready");
      window.setTimeout(function () {
        window.print();
      }, 120);
    });
  }

  /* ---------- 页脚入口 ---------- */
  [].slice.call(document.querySelectorAll("[data-help-open]")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var opener = document.getElementById("helpOpen");
      if (opener) opener.click();
    });
  });

  [].slice.call(document.querySelectorAll("[data-to-top]")).forEach(function (link) {
    link.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
})();

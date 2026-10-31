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

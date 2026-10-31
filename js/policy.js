(function () {
  "use strict";

  var form = document.getElementById("policyForm");
  var out = document.getElementById("policyResults");
  var bar = document.getElementById("policyProgress");
  if (!form || !out || !window.POLICY_DATA) return;

  var data = window.POLICY_DATA;
  var state = { age: "", status: "", ability: "" };

  var AGE_ORDER = ["60-64", "65-79", "80-89", "90-99", "100+"];
  var ABILITY_ORDER = ["self", "mild", "moderate", "severe"];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function ageIndex(v) {
    var i = AGE_ORDER.indexOf(v);
    return i < 0 ? -1 : i;
  }
  function abilityIndex(v) {
    var i = ABILITY_ORDER.indexOf(v);
    return i < 0 ? -1 : i;
  }

  /* 逐条判断，返回 yes / maybe / no + 一句理由 */
  function judge(id) {
    var ai = ageIndex(state.age);
    var bi = abilityIndex(state.ability);

    if (id === "gaoling") {
      if (ai >= 2) {
        return { verdict: "yes", why: "年满 80 周岁、天津户籍，符合高龄津贴的年龄与户籍条件。" };
      }
      return { verdict: "no", why: "高龄津贴从 80 周岁当年起发放，目前年龄还没到。" };
    }

    if (id === "kunnan") {
      if (state.status === "none") {
        return {
          verdict: "no",
          why: "这一项面向低保、低保边缘家庭和优抚对象，普通家庭不在范围内。"
        };
      }
      if (ai < 1) {
        return { verdict: "no", why: "这一项要求年满 65 周岁。" };
      }
      if (bi >= 2) {
        return {
          verdict: "yes",
          why: "65 岁以上、属于困难或优抚身份，且能力评估在中度受损以上，符合两项补贴的主要条件。"
        };
      }
      return {
        verdict: "maybe",
        why: "身份和年龄对得上，但还差一次民政老年人能力评估：评到 2 级（中度受损）及以上才能领。"
      };
    }

    if (id === "changhu") {
      if (bi >= 3) {
        return {
          verdict: "maybe",
          why: "重度失能是长护险的门槛，还需要满足两项：失能状态持续 6 个月以上、参加天津职工基本医疗保险。"
        };
      }
      if (bi === 2) {
        return {
          verdict: "maybe",
          why: "长护险只认重度失能。中度受损通常达不到评定标准，但可以去定点机构做一次失能评定确认。"
        };
      }
      return {
        verdict: "no",
        why: "长护险针对重度失能人员，当前失能程度还没到评定门槛。"
      };
    }

    return { verdict: "no", why: "" };
  }

  var VERDICT_TEXT = { yes: "符合", maybe: "可能符合", no: "暂不符合" };
  var VERDICT_RANK = { yes: 0, maybe: 1, no: 2 };

  function moneyList(policy) {
    return (
      '<dl class="pol-money">' +
      policy.money
        .map(function (m) {
          return (
            '<div class="pol-money-row"><dt>' +
            esc(m.label) +
            "</dt><dd>" +
            esc(m.value) +
            "</dd></div>"
          );
        })
        .join("") +
      "</dl>"
    );
  }

  function card(policy) {
    var r = judge(policy.id);
    var notes = policy.notes
      .map(function (n) {
        return "<li>" + esc(n) + "</li>";
      })
      .join("");
    var mats = policy.materials
      .map(function (m) {
        return "<li>" + esc(m) + "</li>";
      })
      .join("");

    return (
      '<article class="pol-card is-' +
      r.verdict +
      '">' +
      '<div class="pol-card-head">' +
      "<div>" +
      '<p class="pol-level">' +
      esc(policy.level) +
      "</p>" +
      "<h3>" +
      esc(policy.name) +
      "</h3>" +
      "</div>" +
      '<span class="pol-verdict">' +
      VERDICT_TEXT[r.verdict] +
      "</span>" +
      "</div>" +
      '<p class="pol-why">' +
      esc(r.why) +
      "</p>" +
      moneyList(policy) +
      '<p class="pol-where"><span>去哪儿办</span>' +
      esc(policy.where) +
      "</p>" +
      '<details class="pol-more"><summary>要带的材料与补充说明</summary>' +
      '<p class="pol-more-label">材料</p><ul>' +
      mats +
      "</ul>" +
      '<p class="pol-more-label">说明</p><ul>' +
      notes +
      "</ul></details>" +
      '<a class="pol-src" href="' +
      policy.source.url +
      '" target="_blank" rel="noopener noreferrer">政策原文：' +
      esc(policy.source.label) +
      " ↗</a>" +
      "</article>"
    );
  }

  function render() {
    var filled = 0;
    if (state.age) filled++;
    if (state.status) filled++;
    if (state.ability) filled++;

    if (bar) {
      bar.textContent = filled === 3 ? "已选完 3 项，下面是初步匹配结果" : "还差 " + (3 - filled) + " 项";
    }

    if (filled < 3) {
      out.innerHTML =
        '<p class="pol-empty">选完上面三项，自动列出可能符合的政策、大致金额和办理地点。</p>';
      return;
    }

    var cards = data.policies
      .map(function (p) {
        return { html: card(p), rank: VERDICT_RANK[judge(p.id).verdict] };
      })
      .sort(function (a, b) {
        return a.rank - b.rank;
      })
      .map(function (c) {
        return c.html;
      })
      .join("");

    out.innerHTML =
      '<div class="pol-cards">' +
      cards +
      "</div>" +
      '<p class="pol-boundary">' +
      esc(data.boundary) +
      "</p>" +
      '<p class="pol-updated">政策核对日期：' +
      esc(data.updated) +
      " · 只收录公开发布的市级与区级文件</p>";
  }

  form.addEventListener("change", function (e) {
    var input = e.target;
    if (!input || input.type !== "radio" || !input.name) return;
    var key = input.name.replace("pol-", "");
    if (key === "age" || key === "status" || key === "ability") {
      state[key] = input.value;
      render();
    }
  });

  /* 支持从 URL 预填：#/policy?age=80-89&status=dibao&ability=severe */
  (function prefill() {
    var hash = window.location.hash || "";
    var qi = hash.indexOf("?");
    if (qi < 0) return;
    var params = new URLSearchParams(hash.slice(qi + 1));
    ["age", "status", "ability"].forEach(function (k) {
      var v = params.get(k);
      if (!v) return;
      var el = form.querySelector('input[name="pol-' + k + '"][value="' + v + '"]');
      if (el) {
        el.checked = true;
        state[k] = v;
      }
    });
    render();
  })();

  render();
})();

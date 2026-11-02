/* Landing-page interactions: before/after, spots, "I want this", instant audit, retainer intake. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const toast = (m) => window.toast && window.toast(m);
  const confetti = (el) => window.confetti && window.confetti(el);
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---- Placeholder links (payment + booking) ----------------------------
     PAYMENT: Finance & Ops is choosing the payment tool. Replace each
     href="#PAYMENT_LINK_…" / "#BOOKING_LINK" with the real URL and this
     handler stops firing automatically. */
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#PAYMENT_LINK"], a[href="#BOOKING_LINK"]');
    if (!a) return;
    e.preventDefault();
    const key = a.getAttribute("href").slice(1);
    toast(key === "BOOKING_LINK" ? "Booking link coming soon (placeholder)." : `Checkout isn’t connected yet (${key}).`);
  });

  /* ---- Before / After compare ------------------------------------------ */
  const ba = $("[data-ba]");
  if (ba) {
    const range = $("input[type=range]", ba);
    const seg = $(".seg");
    const segBtns = $$("[data-ba-show]");
    let pos = 50;
    const set = (p, tween) => {
      pos = Math.max(0, Math.min(100, p));
      ba.classList.toggle("is-tweening", !!tween && !reduceMotion.matches);
      ba.style.setProperty("--pos", pos + "%");
      range.value = Math.round(pos);
      range.setAttribute("aria-valuetext", pos >= 98 ? "Showing before" : pos <= 2 ? "Showing after" : `${Math.round(pos)}% before, ${100 - Math.round(pos)}% after`);
      const state = pos >= 98 ? "before" : pos <= 2 ? "after" : "mid";
      ba.dataset.state = state; if (seg) seg.dataset.state = state;
      segBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.baShow === state)));
    };
    const fromEvent = (e) => { const r = ba.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
    let dragging = false;
    ba.addEventListener("pointerdown", e => { dragging = true; ba.classList.add("is-dragging"); ba.setPointerCapture(e.pointerId); set(fromEvent(e), e.pointerType !== "mouse"); });
    ba.addEventListener("pointermove", e => { if (dragging) set(fromEvent(e), false); });
    const end = () => { dragging = false; ba.classList.remove("is-dragging"); };
    ba.addEventListener("pointerup", end); ba.addEventListener("pointercancel", end);
    range.addEventListener("input", () => set(+range.value, false));
    segBtns.forEach(b => b.addEventListener("click", () => set(b.dataset.baShow === "before" ? 100 : 0, true)));
    ba.addEventListener("transitionend", () => ba.classList.remove("is-tweening"));
    window.__setCompare = (p) => set(p, false);
    set(50);
    // One gentle nudge the first time it scrolls into view, so people know it moves.
    if (!reduceMotion.matches && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return; io.disconnect();
        setTimeout(() => { if (pos === 50) { set(34, true); setTimeout(() => pos === 34 && set(50, true), 750); } }, 900);
      }, { threshold: 0.6 });
      io.observe(ba);
    }
  }

  /* ---- Founding spots indicator (value updated by hand in the HTML) ----- */
  $$("[data-spots]").forEach(card => {
    const total = +card.dataset.spotsTotal || 5, left = Math.max(0, Math.min(total, +card.dataset.spotsLeft));
    const dots = $(".spots__dots", card);
    dots.innerHTML = Array.from({ length: total }, (_, i) => `<span class="${i < total - left ? "is-taken" : ""}"></span>`).join("");
    $("[data-spots-text]", card).textContent = `${left} of ${total}`;
    if (left === 0) { const b = $("[data-payment]", card); b.textContent = "Founding spots are gone. Join the waitlist"; b.href = "#get-started"; }
  });

  /* ---- "I want this" heart (placeholder: localStorage only) ------------- */
  $$("[data-want]").forEach(btn => {
    const key = "vtp-want-" + btn.dataset.want, base = +btn.dataset.baseCount || 0;
    const countEl = $("[data-want-count]", btn);
    let on = false; try { on = localStorage.getItem(key) === "1"; } catch (e) {}
    const render = (animate) => {
      btn.setAttribute("aria-pressed", String(on));
      const n = base + (on ? 1 : 0);
      if (animate && !reduceMotion.matches && countEl.animate) countEl.animate([{ transform: `translateY(${on ? "60%" : "-60%"})`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(0.34,1.56,0.64,1)" });
      countEl.textContent = n.toLocaleString();
      btn.setAttribute("aria-label", `I want this. ${n} ${n === 1 ? "person wants" : "people want"} it${on ? ", including you" : ""}.`);
    };
    btn.addEventListener("click", () => {
      on = !on; try { localStorage.setItem(key, on ? "1" : "0"); } catch (e) {}
      render(true);
      if (on) { btn.classList.remove("is-popping"); void btn.offsetWidth; btn.classList.add("is-popping"); confetti(btn.querySelector("svg")); toast("Noted. That’s one more reason to ship it sooner."); }
    });
    render(false);
  });

  /* ======================================================================
     INSTANT DESIGN AUDIT: Google PageSpeed Insights API v5, client-side.
     - Free, CORS-enabled, no key needed at low volume. The keyless quota is
       shared across everyone and is often exhausted (HTTP 429), so:
     - OPTIONAL: put a free Google Cloud API key in config.js (PageSpeed Insights API
       enabled, restricted to this site's referrer) into PSI_API_KEY for a
       dedicated free quota (25,000 requests/day). It does not bill.
     - LATER (only with Dhaval's OK on cost): send the top audits to an LLM
       for a written teardown. Not wired in; this version is $0.
     ====================================================================== */
  const PSI_API_KEY = ((window.V2P_CONFIG || {}).PSI_API_KEY || "").trim(); // set in config.js
  const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const CATS = [["performance", "Speed"], ["accessibility", "Accessibility"], ["best-practices", "Polish"], ["seo", "Findability"]];

  // Lighthouse audit ids -> design-language advice. Ordered by how much a user feels it.
  const FINDINGS = [
    { ids: ["color-contrast"], t: "Your text blends into the background", a: "Some text doesn’t have enough contrast to read comfortably, especially outdoors on a phone. Darken the text or lighten the surface; premium apps never make people squint." },
    { ids: ["largest-contentful-paint", "speed-index", "first-contentful-paint"], t: "Your first screen shows up late", a: "On a typical phone the main content takes a while to appear. First impressions form in under a second, so lead with a light, fast hero and load the heavy parts after." },
    { ids: ["cumulative-layout-shift", "cls-culprits-insight", "unsized-images"], t: "Things jump around while it loads", a: "Content shifts as images and fonts arrive. Reserve space for every image and card so the layout feels solid and intentional." },
    { ids: ["target-size", "tap-targets"], t: "Buttons are hard to hit with a thumb", a: "Some tap targets are small or crowded. Give actions at least 44px of breathing room and fewer, clearer choices per screen." },
    { ids: ["font-size"], t: "Text is too small on mobile", a: "Parts of the page use type that’s tiny on a phone. Set body copy at 16px or more and build hierarchy with weight and spacing, not shrinking." },
    { ids: ["total-blocking-time", "interactive", "unused-javascript", "bootup-time", "mainthread-work-breakdown"], t: "It feels sluggish to tap", a: "The page runs a lot of JavaScript before it responds. Users read that as “cheap.” Trim unused code so every tap answers instantly." },
    { ids: ["image-delivery-insight", "uses-responsive-images", "modern-image-formats", "uses-optimized-images", "offscreen-images"], t: "Images are heavier than they look", a: "You’re shipping more image data than the screen needs. Smaller, modern formats keep the polish without the wait." },
    { ids: ["total-byte-weight"], t: "The page is heavy to download", a: "A first visit pulls down a lot of data, which is slow and costly on a phone connection. Compress media, drop libraries you don’t use and load below-the-fold extras later." },
    { ids: ["button-name", "link-name", "link-text", "label", "image-alt"], t: "Some controls don’t say what they do", a: "Some buttons, links or fields have no name or a vague one like “Learn more”. That hurts screen readers and usually means unclear UI for everyone. Every action deserves a plain, specific label." },
    { ids: ["heading-order"], t: "The page hierarchy is muddled", a: "Headings skip levels, which often mirrors a visual hierarchy where everything shouts at once. One clear headline, then calm sections." },
    { ids: ["render-blocking-insight", "font-display-insight", "render-blocking-resources", "font-display"], t: "A blank screen before anything paints", a: "Styles or fonts block the first paint. Load one font file, swap it in gracefully, and inline what the first screen needs." },
    { ids: ["errors-in-console", "inspector-issues"], t: "There are errors under the hood", a: "The browser logs errors while loading. Visitors don’t see them, but they often cause broken states that they do see." },
    { ids: ["meta-description", "document-title"], t: "Your link previews look unfinished", a: "Missing title or description means search results and shared links show generic text. That’s the first impression before the first impression." },
    { ids: ["viewport", "viewport-insight"], t: "It isn’t built for phones", a: "The page doesn’t declare a mobile viewport, so phones render a zoomed-out desktop page. Mobile-first is table stakes for premium." },
  ];

  const form = $("[data-audit]"), panel = $("[data-audit-panel]");
  const ringColor = (s) => s >= 90 ? "var(--color-success)" : s >= 50 ? "var(--color-warning)" : "var(--color-danger)";
  const LOADING = ["Opening your app on a mid-range phone…", "Waiting for the first screen to paint…", "Checking text contrast and tap targets…", "Looking at how the layout settles…", "Reading it like a first-time visitor…", "Almost there. Google is doing the heavy lifting…"];

  const showLoading = (host) => {
    panel.innerHTML = `<div class="audit-loading"><div class="scan" aria-hidden="true"></div><p class="audit-loading__msg" data-msg>${LOADING[0]}</p><div class="audit-loading__bar" aria-hidden="true"><span data-bar></span></div><p class="hint">Auditing <b>${esc(host)}</b>. This usually takes 20–60 seconds.</p></div>`;
    let i = 0, t0 = Date.now();
    const msg = $("[data-msg]", panel), bar = $("[data-bar]", panel);
    requestAnimationFrame(() => bar.style.width = "8%");
    const id = setInterval(() => {
      i = (i + 1) % LOADING.length; msg.textContent = LOADING[i];
      const s = (Date.now() - t0) / 1000; bar.style.width = Math.min(94, 8 + 86 * (1 - Math.exp(-s / 14))) + "%";
    }, 3000);
    return () => clearInterval(id);
  };

  const ctas = `<div class="audit-ctas"><p class="small muted">Want these fixed, plus the things a robot can’t measure?</p><a class="btn btn--primary" href="#sprint">Fix it in a 5-day sprint</a><a class="btn btn--secondary" href="#partner">Apply for Design Partner</a></div>`;

  const showError = (title, body) => {
    panel.innerHTML = `<div class="audit-error"><b>${title}</b><p class="small">${body}</p></div>${ctas}`;
  };

  const render = (lhr, opts = {}) => {
    const scores = CATS.map(([id, label]) => [label, Math.round(((lhr.categories[id] || {}).score || 0) * 100)]);
    const [p, a, bp, seo] = scores.map(s => s[1]);
    const premium = Math.round(p * 0.3 + a * 0.3 + bp * 0.2 + seo * 0.2);
    const verdict = premium >= 90 ? "Technically sharp. Now make it feel premium." : premium >= 70 ? "Solid bones, rough edges." : "Users are feeling the friction.";
    const audits = lhr.audits || {};
    const found = [];
    FINDINGS.forEach((f, order) => {
      const hits = f.ids.map(id => audits[id]).filter(x => x && x.score !== null && x.score !== undefined && !["notApplicable", "manual", "informative"].includes(x.scoreDisplayMode));
      if (!hits.length) return;
      const worst = Math.min(...hits.map(h => h.score));
      if (worst < 0.9) found.push({ ...f, score: worst, order });
    });
    found.sort((x, y) => (x.score < 0.5) === (y.score < 0.5) ? x.order - y.order : x.score - y.score);
    const list = found.slice(0, 5);
    if (list.length < 3) list.push({ t: "The fundamentals are healthy", a: "Speed, accessibility and basics check out. That’s the floor, not the ceiling.", ok: true });
    if (list.length < 3) list.push({ t: "What no robot can score", a: "Hierarchy, spacing, typography and restraint decide whether it feels premium. That’s the part a sprint fixes.", ok: true });
    const shot = audits["final-screenshot"] && audits["final-screenshot"].details && audits["final-screenshot"].details.data;
    let host = opts.url || lhr.finalDisplayedUrl || lhr.finalUrl || "";
    try { host = new URL(host).host; } catch (e) {}
    panel.innerHTML = `
      <div class="audit-result">
        <div class="audit-top">
          ${shot ? `<div class="audit-shot"><img src="${shot}" alt="How ${esc(host)} looked on a simulated phone" width="160" height="284"></div>` : ""}
          <div class="audit-score">
            ${opts.sample ? `<span class="badge badge--warning">Sample result · fictional demo page</span>` : ""}<p class="eyebrow">Premium score for ${esc(host)}</p>
            <div class="audit-score__big"><span class="audit-score__num" data-count-to="${premium}">0</span><span class="audit-score__of">/ 100</span></div>
            <p class="h4">${verdict}</p>
            <div class="rings">${scores.map(([label, s]) => `<div class="ring"><div class="ring__svg"><svg viewBox="0 0 72 72" aria-hidden="true"><circle class="ring__track" cx="36" cy="36" r="32"/><circle class="ring__val" cx="36" cy="36" r="32" style="--ring-color:${ringColor(s)}" data-ring="${s}"/></svg><span class="ring__num">${s}</span></div><span>${label}</span></div>`).join("")}</div>
          </div>
        </div>
        <ol class="findings" aria-label="Findings">${list.map((f, i) => `<li class="finding ${f.ok ? "finding--ok" : f.score < 0.5 ? "finding--bad" : ""}"><span class="finding__dot" aria-hidden="true">${f.ok ? "✓" : i + 1}</span><div><b>${f.t}</b><p>${f.a}</p></div></li>`).join("")}</ol>
        <p class="fineprint">Based on Google Lighthouse${lhr.lighthouseVersion ? " " + esc(lhr.lighthouseVersion) : ""}, mobile, run ${new Date(lhr.fetchTime || Date.now()).toLocaleString()}. Premium score = 30% speed, 30% accessibility, 20% polish, 20% findability.</p>
        ${ctas}
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$("[data-ring]", panel).forEach(c => c.style.strokeDashoffset = 201 * (1 - c.dataset.ring / 100));
      const num = $("[data-count-to]", panel), to = +num.dataset.countTo;
      if (reduceMotion.matches) { num.textContent = to; return; }
      const t0 = performance.now();
      const tick = (t) => { const k = Math.min(1, (t - t0) / 1100); num.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
  };
  window.__renderAudit = render; // used for previews/tests

  if (form) {
    const input = $("input", form), btn = $("button", form), hint = $(".hint", form), hintText = hint.textContent;
    input.addEventListener("input", () => { input.removeAttribute("aria-invalid"); hint.textContent = hintText; hint.classList.remove("hint--error"); });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      let raw = input.value.trim(), url;
      if (raw && !/^https?:\/\//i.test(raw)) raw = "https://" + raw;
      try { url = new URL(raw); if (!url.hostname.includes(".")) throw 0; } catch (err) {
        input.setAttribute("aria-invalid", "true"); hint.textContent = "Paste a full address, like yourapp.lovable.app"; hint.classList.add("hint--error"); input.focus(); return;
      }
      btn.classList.add("is-loading"); btn.disabled = true;
      const stop = showLoading(url.host);
      const qs = new URLSearchParams({ url: url.href, strategy: "mobile" });
      CATS.forEach(([c]) => qs.append("category", c));
      if (PSI_API_KEY) qs.set("key", PSI_API_KEY);
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 90000);
      try {
        const res = await fetch(`${PSI}?${qs}`, { signal: ctrl.signal });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) showError("Google’s free audit queue is full right now", "The free quota resets daily, so try again in a little while. In the meantime, the weekly teardown below covers the same issues on real AI-built apps.");
        else if (!res.ok || !data.lighthouseResult) showError("Couldn’t audit that page", `Google couldn’t load <b>${esc(url.host)}</b>. Make sure it’s public (not behind a login or a preview password) and try again.${data.error && data.error.message ? `<br><span class="muted">${esc(data.error.message.slice(0, 160))}</span>` : ""}`);
        else { render(data.lighthouseResult, { url: url.href }); confetti($(".audit-score__num", panel)); }
      } catch (err) {
        showError(err.name === "AbortError" ? "Google’s audit is running slow" : "Network hiccup", err.name === "AbortError" ? "Heavy pages sometimes take Google over a minute to test. Give it another go, or browse the weekly teardowns below." : "The audit didn’t finish. Check your connection and give it another go.");
      } finally { clearTimeout(timer); stop(); btn.classList.remove("is-loading"); btn.disabled = false; }
    });
  }

  /* ======================================================================
     DESIGN PARTNER INTAKE: client-side fit scoring (no AI service, $0).
     Score 0–12 -> Qualified / Maybe / Not yet. Sent as hidden fields
     intake_score + intake_tier so follow-ups can be automated by tier.
     ====================================================================== */
  const intake = $("[data-intake]");
  if (intake) {
    if (window.V2P) window.V2P.warmTally(intake, (window.V2P_CONFIG || {}).TALLY_RETAINER_FORM_ID);
    const W = {
      users: { none: 0, lt100: 1, "100-1k": 2, "1k+": 3 },
      funding: { "bootstrapped-pre": 0, "bootstrapped-rev": 2, preseed: 2, "seed+": 3 },
      launch: { live: 2, "30d": 2, "90d": 1, none: 0 },
      builder: { lovable: 1, cursor: 1, bolt: 1, v0: 1, other: 0.5 },
      budget: { yes: 3, maybe: 1, no: 0 },
    };
    const score = (fd) => {
      const s = Object.keys(W).reduce((t, k) => t + (W[k][fd.get(k)] || 0), 0);
      let tier = s >= 8 ? "qualified" : s >= 4.5 ? "maybe" : "not-yet";
      if (fd.get("budget") === "no") tier = s >= 6 ? "maybe" : "not-yet";
      if (fd.get("budget") === "maybe" && tier === "qualified" && s < 9.5) tier = "maybe";
      return { s, tier };
    };
    const NEXT = {
      qualified: { badge: "badge--success", label: "Great fit", color: "var(--color-success)",
        h: "You’re exactly who Design Partner is for.", p: (n) => `${n} has the traction to get real value from ongoing design. Grab a 20-minute intro call and we’ll map your first month of requests.`,
        cta: "Book your intro call", href: "#BOOKING_LINK" },
      maybe: { badge: "badge--warning", label: "Promising", color: "var(--color-warning)",
        h: "Let’s start with a sprint.", p: (n) => `A 5-day sprint is the lowest-risk way to see what premium looks like for ${n}. If you upgrade within 14 days, the full $990 counts toward Design Partner.`,
        cta: "Reserve a Founding 5 spot · $990", href: "#PAYMENT_LINK_SPRINT" },
      "not-yet": { badge: "badge--accent", label: "A bit early", color: "var(--color-accent)",
        h: "Start with the Design Rules Kit.", p: (n) => `${n} is early, which is the perfect time to set good rules. The $49 Kit gives your AI the same taste I’d bring, and you can apply again when you’ve got users.`,
        cta: "Pre-order the Kit · $49", href: "#PAYMENT_LINK_KIT" },
    };
    const hint = $("[data-intake-hint]", intake), hintText = hint.textContent;
    intake.addEventListener("change", e => { const fs = e.target.closest("fieldset"); if (fs) fs.removeAttribute("aria-invalid"); });
    intake.addEventListener("input", e => e.target.removeAttribute("aria-invalid"));
    intake.addEventListener("submit", e => {
      e.preventDefault();
      let first = null;
      $$("input[required], select[required]", intake).forEach(el => { const ok = el.checkValidity() && el.value.trim(); el.toggleAttribute("aria-invalid", !ok); if (!ok) el.setAttribute("aria-invalid", "true"); if (!ok && !first) first = el; });
      $$("fieldset[data-required]", intake).forEach(fs => { const ok = !!$("input:checked", fs); if (!ok) { fs.setAttribute("aria-invalid", "true"); if (!first) first = $("input", fs); } else fs.removeAttribute("aria-invalid"); });
      if (first) { hint.textContent = "A couple of answers are missing. They’re highlighted above."; hint.classList.add("hint--error"); first.focus(); return; }
      hint.textContent = hintText; hint.classList.remove("hint--error");
      const fd = new FormData(intake), { s, tier } = score(fd);
      intake.elements.intake_score.value = s; intake.elements.intake_tier.value = tier;
      const btn = $("button[type=submit]", intake); btn.classList.add("is-loading");
      const show = (how) => {
        const tab = how === "tab", mail = how === "mail";
        const to = esc(((window.V2P_CONFIG || {}).CONTACT_EMAIL || "").trim());
        const n = NEXT[tier], name = esc(fd.get("app_name") || "your app");
        const box = $("[data-intake-result]");
        box.innerHTML = `<span class="badge ${n.badge}" style="justify-self:start">${n.label}</span><h3 class="h3">${n.h}</h3><p class="muted">${n.p(name)}</p><div class="intake-result__meter"><span>Fit</span><div class="intake-result__track"><span style="--tier-color:${n.color}" data-fit="${Math.round(s / 12 * 100)}"></span></div><span>${Math.round(s / 12 * 100)}%</span></div><a class="btn btn--primary btn--lg" href="${n.href}">${n.cta}</a><p class="fineprint">${mail ? `Last step: your email app should open with your application for ${name}; just hit send. Nothing opened? <a href="${esc(window.V2P.lastMailto)}">Email ${to}</a>.` : tab ? `Last step: press Submit in the Tally tab that just opened to send your application for ${name}.` : `Application received for ${name}.`} I’ll reply to ${esc(fd.get("email"))} within one business day.</p>`;
        intake.hidden = true; box.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => { const f = $("[data-fit]", box); f.style.width = f.dataset.fit + "%"; }));
        box.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
        if (tier === "qualified") confetti($(".badge", box));
        toast(mail ? "Your email app should open. Just hit send." : tab ? "Almost there: press Submit in the Tally tab." : "Application received. Thanks!");
      };
      // Hand off to Tally (config.js) with every answer + score as hidden fields; otherwise a prefilled email to CONTACT_EMAIL.
      const id = (window.V2P_CONFIG || {}).TALLY_RETAINER_FORM_ID;
      const fields = {}; fd.forEach((v, k) => { fields[k] = String(v); }); fields.intake_score = String(s); fields.intake_tier = tier;
      const LABELS = { app_name: "App name", app_url: "App URL", builder: "Built with", users: "Users", funding: "Funding", launch: "Launch", budget: "Budget OK ($2,950/mo)", email: "Email", intake_score: "Intake score (0-12)", intake_tier: "Intake tier", source: "Source" };
      const send = id ? window.V2P.sendToTally(id, fields)
        : window.V2P.sendByEmail(`Design Partner application: ${fields.app_name}`, ["Hi, here’s my Design Partner application.", "", ...Object.keys(LABELS).filter(k => k in fields).map(k => `${LABELS[k]}: ${fields[k]}`)]);
      send.then(show).catch(err => {
        btn.classList.remove("is-loading");
        hint.textContent = err && err.message === "closed" ? "Your application isn’t sent until you press Submit in the Tally window. Your answers are still here." : "Couldn’t send your application. Please try again.";
        hint.classList.add("hint--error");
      });
    });
  }
})();

/* Minimal vanilla JS: theme, reveal, copy + confetti-lite, toast, accordion, forms. */
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- Theme toggle (system by default, remembers manual choice) -------- */
  const resolve = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");
  const syncTheme = () => {
    root.dataset.resolvedTheme = resolve();
    $$("[data-theme-toggle]").forEach(b => {
      const next = resolve() === "dark" ? "light" : "dark";
      b.setAttribute("aria-label", `Switch to ${next} mode`);
      b.title = `Switch to ${next} mode`;
    });
  };
  systemDark.addEventListener("change", syncTheme);
  $$("[data-theme-toggle]").forEach(b => b.addEventListener("click", () => {
    const next = resolve() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncTheme();
  }));
  syncTheme();

  /* ---- Sticky nav shadow ------------------------------------------------ */
  const nav = $(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---- Reveal on scroll ------------------------------------------------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add("is-visible"));

  /* ---- Toast ------------------------------------------------------------ */
  let region = $(".toast-region");
  if (!region) { region = document.createElement("div"); region.className = "toast-region"; document.body.append(region); }
  region.setAttribute("role", "status"); region.setAttribute("aria-live", "polite");
  const check = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  const toast = (msg, ms = 2600) => {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="toast__icon">${check}</span><span></span>`;
    t.lastChild.textContent = msg;
    region.append(t);
    setTimeout(() => { t.classList.add("is-leaving"); t.addEventListener("animationend", () => t.remove(), { once: true }); setTimeout(() => t.remove(), 600); }, ms);
  };
  window.toast = toast;

  /* ---- Confetti-lite (≈14 particles, Web Animations API) ---------------- */
  const confetti = (el) => {
    if (reduceMotion.matches || !el.animate) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(root);
    const colors = ["--color-accent", "--color-secondary", "--color-highlight", "--color-success"].map(v => cs.getPropertyValue(v).trim());
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("span");
      p.className = "confetti";
      p.style.background = colors[i % colors.length];
      if (i % 3 === 0) p.style.borderRadius = "50%";
      document.body.append(p);
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
      const d = 40 + Math.random() * 46;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 24;
      p.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(0.6) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x0 + dx}px, ${y0 + dy}px) scale(1) rotate(${Math.random() * 280}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${x0 + dx * 1.1}px, ${y0 + dy + 34}px) scale(0.8) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], { duration: 750 + Math.random() * 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }).onfinish = () => p.remove();
    }
  };
  window.confetti = confetti;

  /* ---- Copy to clipboard ------------------------------------------------ */
  $$("[data-copy]").forEach(el => el.addEventListener("click", async () => {
    const text = el.dataset.copy;
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    const label = $(".copy-chip__label", el);
    el.classList.add("is-copied"); if (label) label.textContent = "Copied";
    confetti(el); toast(el.dataset.copyToast || "Copied to clipboard");
    clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove("is-copied"); if (label) label.textContent = "Copy"; }, 1800);
  }));

  /* ---- Accordion: smooth height on native <details> --------------------- */
  $$(".accordion details").forEach(d => {
    const summary = $("summary", d), body = $(".accordion__body", d);
    summary.addEventListener("click", e => {
      if (reduceMotion.matches || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "cubic-bezier(0.2,0,0,1)" }).onfinish = () => d.open = false;
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 320, easing: "cubic-bezier(0.16,1,0.3,1)" });
      }
    });
  });

  /* ---- Tally hand-off ----------------------------------------------------
     Form IDs live in config.js. With an ID set, our on-page form hands its
     answers to a Tally popup as hidden fields (prefilled), the visitor hits
     Submit there, and Tally stores the entry + sends autoresponders.
     The Tally embed script is loaded lazily, only on first interaction.
     No ID -> mailto: CONTACT_EMAIL with the answers prefilled (visitor hits send). */
  const CFG = window.V2P_CONFIG || {};
  let tallyLoading = null;
  const loadTally = () => tallyLoading || (tallyLoading = new Promise((res, rej) => {
    if (window.Tally) return res(window.Tally);
    const sc = document.createElement("script");
    sc.src = "https://tally.so/widgets/embed.js"; sc.async = true;
    sc.onload = () => window.Tally ? res(window.Tally) : rej(new Error("tally"));
    sc.onerror = () => { tallyLoading = null; rej(new Error("tally")); };
    document.head.append(sc);
    setTimeout(() => rej(new Error("timeout")), 6000);
  }));
  const tallyUrl = (id, fields) => `https://tally.so/r/${encodeURIComponent(id)}?` + new URLSearchParams(fields);
  // Resolves "sent" (submitted in popup) or "tab" (opened tally.so/r/... fallback); rejects "closed".
  const sendToTally = (id, fields) => loadTally().then(T => new Promise((res, rej) => {
    let done = false;
    T.openPopup(id, { layout: "modal", width: 560, autoClose: 1800, hiddenFields: fields,
      onSubmit: () => { done = true; res("sent"); },
      onClose: () => { if (!done) rej(new Error("closed")); } });
  }), () => { const w = window.open(tallyUrl(id, fields), "_blank"); if (w) w.opener = null; else location.href = tallyUrl(id, fields); return "tab"; });
  const warmTally = (form, id) => { if (id) ["focusin", "pointerdown"].forEach(ev => form.addEventListener(ev, () => loadTally().catch(() => {}), { once: true })); };
  // mailto fallback. Encodes with encodeURIComponent (spaces -> %20, newlines -> %0D%0A),
  // which mail apps handle reliably (URLSearchParams' "+" for spaces is not).
  const sendByEmail = (subject, lines) => {
    const to = (CFG.CONTACT_EMAIL || "").trim();
    const body = lines.join("\r\n");
    const href = `mailto:${encodeURIComponent(to).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.V2P.lastMailto = href;
    const a = document.createElement("a"); a.href = href; a.hidden = true; document.body.append(a); a.click(); a.remove();
    return Promise.resolve("mail");
  };
  window.V2P = { sendToTally, warmTally, sendByEmail, CFG };

  /* ---- Email capture (front-end only) ---------------------------------- */
  $$("form[data-capture]").forEach(form => {
    warmTally(form, CFG.TALLY_WAITLIST_FORM_ID);
    const input = $("input[type=email]", form), hint = $(".hint", form), btn = $("button[type=submit]", form);
    const original = hint ? hint.textContent : "";
    input.addEventListener("input", () => { input.removeAttribute("aria-invalid"); if (hint) { hint.textContent = original; hint.classList.remove("hint--error"); } });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!input.checkValidity() || !input.value.trim()) {
        input.setAttribute("aria-invalid", "true");
        if (hint) { hint.textContent = "That email doesn’t look quite right. Mind checking it?"; hint.classList.add("hint--error"); }
        input.focus(); return;
      }
      btn.classList.add("is-loading");
      const id = CFG.TALLY_WAITLIST_FORM_ID;
      const email = input.value.trim();
      const send = id ? sendToTally(id, { email, source: "landing-v1-waitlist" })
        : sendByEmail("Weekly teardown: add me", ["Please add me to the weekly teardown list.", "", `Email: ${email}`, "Source: landing-v1-waitlist"]);
      send.then(how => {
        btn.classList.remove("is-loading");
        form.classList.add("is-done");
        const ok = $(".capture__success", form.parentElement);
        if (ok) {
          ok.hidden = false;
          if (how === "mail") {
            const to = (CFG.CONTACT_EMAIL || "").trim(), span = ok.querySelector("span");
            span.textContent = "Almost there. Your email app should open with your sign-up; just hit send. Nothing opened? Email ";
            const a = document.createElement("a"); a.href = window.V2P.lastMailto; a.textContent = to; span.append(a, ".");
          } else $(".capture__email", ok).textContent = email;
        }
        confetti(btn); toast(how === "mail" ? "Your email app should open. Just hit send." : "You’re on the list. Welcome aboard!");
      }).catch(err => { btn.classList.remove("is-loading"); toast(err && err.message === "closed" ? "No worries. You’re not subscribed until you hit Submit." : "Couldn’t send that. Please try again in a moment."); });
    });
  });

  /* ---- Demo buttons on the styleguide ---------------------------------- */
  $$("[data-demo-loading]").forEach(b => b.addEventListener("click", () => { b.classList.add("is-loading"); setTimeout(() => b.classList.remove("is-loading"), 1200); }));
  $$("[data-demo-toast]").forEach(b => b.addEventListener("click", () => toast(b.dataset.demoToast)));

  /* ---- Footer year ------------------------------------------------------- */
  $$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
})();

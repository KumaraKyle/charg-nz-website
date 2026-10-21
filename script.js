document.documentElement.classList.remove("no-js");

// Rates (NZD), as shown on the station screen.
const PRICING = { perHour: 5, maxPerRental: 15, notReturned: 30 };

// Placeholder stations: replace with your real venues (or load from an API).
// Each station holds 8 powerbanks, so available + free slots = 8.
const STATIONS = [
  { name: "Ponsonby Central", suburb: "Ponsonby", type: "Café", hours: "7am – 10pm", available: 6 },
  { name: "Britomart Transport Centre", suburb: "Auckland CBD", type: "Transport", hours: "Open 24 hours", available: 6 },
  { name: "University Student Hub", suburb: "Grafton", type: "Campus", hours: "7am – 11pm", available: 2 },
  { name: "Viaduct Harbour Bar", suburb: "Viaduct", type: "Bar", hours: "11am – 2am", available: 4 },
  { name: "K Road Coffee Co.", suburb: "Karangahape Rd", type: "Café", hours: "6:30am – 4pm", available: 0 },
  { name: "Newmarket Train Station", suburb: "Newmarket", type: "Transport", hours: "5am – 1am", available: 7 },
  { name: "Wynyard Quarter Taphouse", suburb: "Wynyard Quarter", type: "Bar", hours: "12pm – 12am", available: 5 },
  { name: "AUT City Library", suburb: "Auckland CBD", type: "Campus", hours: "8am – 10pm", available: 3 },
];
const SLOTS_PER_STATION = 8;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = id => document.getElementById(id);
const money = n => "$" + (Number.isInteger(n) ? n : n.toFixed(2));

// Mobile nav
const toggle = document.querySelector(".nav__toggle");
const links = $("nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open);
});
links.addEventListener("click", e => {
  if (e.target.closest("a")) {
    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Nav battery charges as you scroll down the page
const battFill = $("batt-fill");
const battPct = $("batt-pct");
function updateBattery() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const pct = Math.round(5 + 95 * Math.min(1, max > 0 ? scrollY / max : 1));
  battFill.style.width = pct + "%";
  battFill.classList.toggle("is-full", pct >= 98);
  battPct.textContent = String(pct).padStart(3, "0") + "%";
}
addEventListener("scroll", updateBattery, { passive: true });
addEventListener("resize", updateBattery);
updateBattery();

// Hero: charge from 5% to 100% on load. The markup already shows 100%,
// so the page reads correctly before (or without) this animation.
const meter = $("meter");
const meterNum = $("meter-num");
const meterCap = $("meter-cap");
const meterSegs = [...$("meter-bar").children];
function setCharge(pct) {
  meterNum.textContent = Math.round(pct);
  meterSegs.forEach((seg, i) => seg.classList.toggle("on", pct >= (i + 1) * 10 - 5));
  meter.classList.toggle("is-full", pct >= 100);
  meterCap.textContent = pct >= 100 ? "Fully charged. Go." : "Charging…";
}
if (!reduceMotion) {
  const start = performance.now() + 500;
  const dur = 2200;
  setCharge(5);
  (function tick(now) {
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    setCharge(5 + 95 * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  })(performance.now());

  const hero = $("hero");
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
    hero.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
  });
}

// How it works: steps drive the station illustration and auto-advance
const STEP_COPY = {
  1: { msg: "Insert or tap your card to rent", reader: "tap", cap: "Step 01 / Rent" },
  2: { msg: "Slot 4 unlocked. Take your powerbank", reader: "paid", cap: "Step 02 / Charge" },
  3: { msg: "Returned. Thanks! Rental stopped", reader: "done", cap: "Step 03 / Go further" },
};
const DWELL = 4500;
const stepsList = $("steps");
const stepBtns = [...stepsList.querySelectorAll(".step")];
const unit = $("unit");
let current = 1;
let timer = null;
stepsList.style.setProperty("--dwell", DWELL + "ms");

function showStep(n) {
  current = n;
  stepBtns.forEach(b => {
    const on = Number(b.dataset.step) === n;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", on);
    // Restart the progress bar animation
    const bar = b.querySelector(".step__bar i");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "";
  });
  unit.dataset.step = n;
  $("unit-msg").textContent = STEP_COPY[n].msg;
  $("reader-screen").textContent = STEP_COPY[n].reader;
  $("unit-cap").textContent = STEP_COPY[n].cap;
}
function autoplay() {
  clearInterval(timer);
  if (reduceMotion) { stepsList.classList.add("is-paused"); return; }
  timer = setInterval(() => showStep(current % 3 + 1), DWELL);
}
stepBtns.forEach(b => b.addEventListener("click", () => {
  showStep(Number(b.dataset.step));
  stepsList.classList.add("is-paused");
  clearInterval(timer);
}));
showStep(1);
autoplay();

// Pricing labels and cost estimator
$("p-hourly").textContent = money(PRICING.perHour);
$("p-cap").textContent = money(PRICING.maxPerRental);
$("p-lost").textContent = money(PRICING.notReturned);

const hours = $("hours");
function updateCost() {
  const h = Number(hours.value);
  const raw = h * PRICING.perHour;
  const cost = Math.min(raw, PRICING.maxPerRental);
  const capped = raw >= PRICING.maxPerRental;
  $("hours-out").textContent = h === 1 ? "1 hour" : `${h} hours`;
  $("cost-out").textContent = money(cost);
  $("cap-fill").style.width = (cost / PRICING.maxPerRental) * 100 + "%";
  $("cap").classList.toggle("is-capped", capped);
  $("cap-note").textContent = capped ? `${money(PRICING.maxPerRental)} cap reached. Return within 24 hours.` : `${money(PRICING.maxPerRental - cost)} below the ${money(PRICING.maxPerRental)} cap`;
  hours.style.setProperty("--p", ((h - 1) / 23) * 100 + "%");
}
hours.addEventListener("input", updateCost);
updateCost();

// Station finder
const list = $("station-list");
const empty = $("station-empty");
const search = $("station-search");
const chips = document.querySelectorAll(".chip");
let filter = "all";

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function slotPips(available) {
  return Array.from({ length: SLOTS_PER_STATION }, (_, i) =>
    `<span class="pip${i < available ? " pip--on" : ""}"></span>`).join("");
}

function renderStations() {
  const q = search.value.trim().toLowerCase();
  const matches = STATIONS.filter(s =>
    (filter === "all" || s.type === filter) &&
    (!q || `${s.name} ${s.suburb}`.toLowerCase().includes(q))
  );
  list.innerHTML = matches.map(s => {
    const free = SLOTS_PER_STATION - s.available;
    const txt = s.available === 0 ? "None to rent" : `${s.available} to rent · ${free} free`;
    return `
    <li class="row">
      <span class="row__name">${escapeHtml(s.name)}</span>
      <span class="row__where">${escapeHtml(s.suburb)}<small>${escapeHtml(s.hours)}</small></span>
      <span class="row__type">${escapeHtml(s.type)}</span>
      <span class="slots__wrap">
        <span class="slots" aria-hidden="true">${slotPips(s.available)}</span>
        <span class="slots__txt${s.available === 0 ? " is-out" : ""}">${txt}</span>
      </span>
    </li>`;
  }).join("");
  empty.hidden = matches.length > 0;
}

chips.forEach(chip => chip.addEventListener("click", () => {
  chips.forEach(c => {
    c.classList.toggle("is-active", c === chip);
    c.setAttribute("aria-pressed", c === chip);
  });
  filter = chip.dataset.filter;
  renderStations();
}));
search.addEventListener("input", renderStations);
renderStations();

// Contact form: client-side validation only. Connect the submit to your
// backend or a form service (Formspree, Netlify Forms, etc.) to receive messages.
const form = $("contact");
const status = form.querySelector(".form__status");
form.addEventListener("submit", e => {
  e.preventDefault();
  let ok = true;
  form.querySelectorAll("[required]").forEach(field => {
    const valid = field.checkValidity();
    field.setAttribute("aria-invalid", !valid);
    ok = ok && valid;
  });
  status.className = "form__status " + (ok ? "is-ok" : "is-err");
  if (!ok) {
    status.textContent = "Add your name and a valid email, then send again.";
    return;
  }
  status.textContent = "Thanks. We'll be in touch within one business day.";
  form.reset();
});

$("year").textContent = new Date().getFullYear();

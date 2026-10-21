// Rates (NZD), as shown on the station screen.
const PRICING = { perHour: 5, maxPerRental: 15, notReturned: 30 };

// Placeholder stations: replace with your real venues (or load from an API).
// Each station holds 8 powerbanks; `available` is how many are ready to rent.
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
const money = n => "$" + (Number.isInteger(n) ? n : n.toFixed(2));

// Mobile nav
const toggle = document.querySelector(".nav__toggle");
const links = document.getElementById("nav-links");
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

// How it works: each step drives the station illustration, and the steps
// advance on their own until someone picks one.
const STEP_COPY = {
  1: { msg: "Insert or tap your card to rent", reader: "tap", cap: "Step 01 · Rent" },
  2: { msg: "Slot 4 unlocked. Take your powerbank", reader: "paid", cap: "Step 02 · Charge" },
  3: { msg: "Returned. Thanks! Rental stopped", reader: "done", cap: "Step 03 · Go further" },
};
const DWELL = 5000;
const stepsList = document.getElementById("steps");
const stepBtns = [...stepsList.querySelectorAll(".step")];
const unit = document.getElementById("unit");
let current = 1;
let timer = null;
stepsList.style.setProperty("--dwell", DWELL + "ms");

function showStep(n) {
  current = n;
  stepBtns.forEach(b => {
    const on = Number(b.dataset.step) === n;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", on);
    // Restart the progress bar
    const bar = b.querySelector(".step__bar i");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "";
  });
  unit.dataset.step = n;
  document.getElementById("unit-msg").textContent = STEP_COPY[n].msg;
  document.getElementById("reader-screen").textContent = STEP_COPY[n].reader;
  document.getElementById("unit-cap").textContent = STEP_COPY[n].cap;
}
stepBtns.forEach(b => b.addEventListener("click", () => {
  clearInterval(timer);
  stepsList.classList.add("is-paused");
  showStep(Number(b.dataset.step));
}));
showStep(1);
if (reduceMotion) stepsList.classList.add("is-paused");
else timer = setInterval(() => showStep(current % 3 + 1), DWELL);

// Pricing labels + cost calculator
document.querySelector('[data-price="hourly"]').textContent = money(PRICING.perHour);
document.querySelector('[data-price="cap"]').textContent = money(PRICING.maxPerRental);
document.querySelector('[data-price="lost"]').textContent = money(PRICING.notReturned);

const hours = document.getElementById("hours");
const hoursOut = document.getElementById("hours-out");
const costOut = document.getElementById("cost-out");
const costNote = document.getElementById("cost-note");
function updateCost() {
  const h = Number(hours.value);
  const capped = h * PRICING.perHour >= PRICING.maxPerRental;
  hoursOut.textContent = h === 1 ? "1 hour" : `${h} hours`;
  costOut.textContent = money(Math.min(h * PRICING.perHour, PRICING.maxPerRental));
  costNote.textContent = capped ? "price cap reached" : "estimated";
}
hours.addEventListener("input", updateCost);
updateCost();

// Station finder
const list = document.getElementById("station-list");
const empty = document.getElementById("station-empty");
const search = document.getElementById("station-search");
const chips = document.querySelectorAll(".chip");
let filter = "all";

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

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

// Contact form: client-side validation only. Wire the submit to your
// backend or a form service (Formspree, Netlify Forms, etc.) to receive messages.
const form = document.getElementById("contact");
const status = form.querySelector(".form__status");
form.addEventListener("submit", e => {
  e.preventDefault();
  let ok = true;
  form.querySelectorAll("[required]").forEach(field => {
    const valid = field.checkValidity();
    field.setAttribute("aria-invalid", !valid);
    ok = ok && valid;
  });
  if (!ok) {
    status.textContent = "Please add your name and a valid email.";
    status.style.color = "var(--red)";
    return;
  }
  status.textContent = "Thanks! We'll be in touch within one business day.";
  status.style.color = "#2ecc71";
  form.reset();
});

document.getElementById("year").textContent = new Date().getFullYear();

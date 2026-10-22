// Shared UI pieces: header, fields, progress path, depth-check panel, modals.

const UI = {
  modal: null, // () => Element
  toast: null,
  dashView: "cards",
  dashFilter: "all",
  dashSearch: "",
  showArchived: false,
  open: {}, // expanded sections, keyed by name
  draft: {},
};
let toastTimer;
function toast(msg, kind = "info") {
  UI.toast = { msg, kind };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    UI.toast = null;
    render();
  }, 4200);
  render();
}
// Modals re-render with the app, so typed-but-unsaved values live in UI.draft.
function openModal(fn, draft = {}) {
  UI.modal = fn;
  UI.draft = draft;
  render();
}
function closeModal() {
  UI.modal = null;
  render();
}

// ---- formatting ----
function fmtDate(iso, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, opts);
}
function timeAgo(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} days ago`;
  return fmtDate(iso);
}
function daysLabel(n) {
  if (n == null) return "No date set";
  if (n < 0) return `${-n} day${n === -1 ? "" : "s"} ago`;
  if (n === 0) return "Today";
  return `In ${n} day${n === 1 ? "" : "s"}`;
}

// ---- header ----
function saveIndicator() {
  const s = Store.saveState;
  const saved = Store.hosted ? "Saved for the team" : "Saved";
  const label = s === "saving" ? "Saving…" : s === "error" ? "Not saved" : s === "offline" ? "Offline · will retry" : `${saved}${Store.lastSavedAt ? " · " + timeAgo(Store.lastSavedAt.toISOString()) : ""}`;
  const tip = Store.saveError || (Store.hosted ? "Your work saves automatically to the team planner." : "Your work saves automatically in this browser.");
  return h("div", { class: `save-ind save-${s === "offline" ? "error" : s}`, title: tip }, h("span", { class: "save-dot" }), label);
}

function appHeader(active, extra) {
  return h(
    "header",
    { class: "app-header" },
    h("a", { class: "brand", href: "#/" }, h("img", { src: LOGO_WHITE, alt: "Heartland Dental", class: "brand-logo" }), h("span", { class: "brand-divider" }), h("span", { class: "brand-name" }, "Study Club ", h("b", {}, "Depth Flow"))),
    h(
      "nav",
      { class: "app-nav" },
      h("a", { href: "#/", class: ["nav-link", active === "clubs" && "active"] }, "Study clubs"),
      h("a", { href: "#/progress", class: ["nav-link", active === "progress" && "active"] }, "Team progress"),
      h("a", { href: "#/about", class: ["nav-link", active === "about" && "active"] }, "The framework")
    ),
    h("div", { class: "header-right" }, extra, saveIndicator(), userChip())
  );
}

function userChip() {
  const name = Store.settings.userName;
  return h("button", { class: "user-chip", title: "Change your name", onClick: () => openModal(nameModal, { name }) }, icon("user", 15), name || "Add your name");
}

function nameModal() {
  const d = UI.draft;
  return modalShell(
    d.first ? "Welcome. Who’s working?" : "Who’s working?",
    h("p", { class: "muted" }, "Your name is stamped on the study clubs you edit, so teammates can see who moved things forward. This browser remembers it."),
    h("form", { onSubmit: (e) => { e.preventDefault(); Store.setUserName(d.name || ""); closeModal(); } },
      h("input", { class: "input", autofocus: true, value: d.name, placeholder: "Your name", onInput: (e) => (d.name = e.target.value) }),
      h("div", { class: "modal-actions" }, h("button", { type: "button", class: "btn ghost", onClick: closeModal }, "Cancel"), h("button", { class: "btn gold", type: "submit" }, "Save"))
    )
  );
}

function modalShell(title, ...body) {
  return h("div", { class: "modal-backdrop", onClick: (e) => e.target === e.currentTarget && closeModal() },
    h("div", { class: "modal", role: "dialog", "aria-modal": "true" },
      h("div", { class: "modal-head" }, h("h2", {}, title), h("button", { class: "icon-btn", onClick: closeModal, "aria-label": "Close" }, icon("x", 18))),
      ...body
    )
  );
}

function confirmModal({ title, message, confirm = "Confirm", danger = false, onConfirm }) {
  openModal(() =>
    modalShell(title, h("p", { class: "muted" }, message),
      h("div", { class: "modal-actions" },
        h("button", { class: "btn ghost", onClick: closeModal }, "Cancel"),
        h("button", { class: ["btn", danger ? "danger" : "gold"], onClick: () => { closeModal(); onConfirm(); } }, confirm)
      )
    )
  );
}

// ---- fields ----
function field({ label, hint, value, placeholder, onInput, multiline = true, rows = 3, cls = "", type = "text", big = false }) {
  const input = multiline
    ? h("textarea", { class: ["input", big && "input-big"], rows, value, placeholder, onInput: (e) => onInput(e.target.value) })
    : h("input", { class: "input", type, value, placeholder, onInput: (e) => onInput(e.target.value) });
  return h("label", { class: `field ${cls}` }, label && h("span", { class: "field-label" }, label), hint && h("span", { class: "field-hint" }, hint), input);
}

function segmented({ options, value, onChange, size = "", colorOf }) {
  return h("div", { class: `segmented ${size}`, role: "radiogroup" },
    options.map((o) =>
      h("button", {
        type: "button",
        role: "radio",
        "aria-checked": String(value === o.id),
        class: ["seg", value === o.id && "on", `seg-${o.id}`],
        style: value === o.id && colorOf ? { "--seg": colorOf(o.id) } : null,
        onClick: () => onChange(value === o.id ? "" : o.id),
      }, o.label)
    )
  );
}

function roadTag(roadId, { small = false } = {}) {
  const r = ROAD[roadId];
  return h("span", { class: ["road-tag", small && "small"], style: { "--road": r.color } }, roadIcon(roadId, small ? 13 : 15), r.name);
}

// ---- step scaffolding ----
function stepHeader(step) {
  return h("div", { class: "step-head" },
    h("div", { class: "eyebrow" }, step.eyebrow),
    h("h1", { class: "step-title" }, step.headline)
  );
}

function whyBox(step) {
  const key = "why-" + step.id;
  const open = UI.open[key] !== false;
  return h("div", { class: ["why", open && "open"] },
    h("button", { class: "why-toggle", onClick: () => { UI.open[key] = !open; render(); } }, icon("bulb", 16, "#CAA977"), "Why this matters", icon(open ? "chevronDown" : "chevronRight", 14)),
    open && h("p", {}, step.why)
  );
}

function outputCard(step, content, { iconName = "target" } = {}) {
  return h("section", { class: "output-card" },
    h("div", { class: "output-icon" }, icon(iconName, 30, "#5A96FF")),
    h("div", { class: "output-body" }, h("div", { class: "eyebrow gold" }, `Output: ${step.output}`), content)
  );
}

function ruleLine(step) {
  return h("p", { class: "rule-line" }, step.rule);
}

function earlierGapsBanner(p, stepId) {
  const gaps = earlierGaps(p, stepId);
  if (!gaps.length) return null;
  const first = gaps[0];
  return h("div", { class: "banner warn" },
    icon("alert", 18, "#F2C46D"),
    h("div", {},
      h("b", {}, first.report.gaps[0].text),
      gaps.length > 1 || first.report.gaps.length > 1
        ? h("span", { class: "muted" }, ` ${gaps.map((g) => g.step.name).join(", ")} ${gaps.length > 1 ? "are" : "is"} not finished. You can keep going, but depth builds on earlier moves.`)
        : h("span", { class: "muted" }, ` ${first.step.name} isn’t finished yet. Depth builds on earlier moves.`)
    ),
    h("a", { class: "btn small ghost", href: `#/p/${p.id}/${first.step.id}` }, `Go to ${first.step.num === "✓" ? "" : "Move " + first.step.num + ": "}${first.step.name}`)
  );
}

function depthCheckPanel(report) {
  const order = { gap: 0, flag: 1, ok: 2 };
  const items = [...report.items].sort((a, b) => order[a.level] - order[b.level]);
  const label = report.status === "complete" ? (report.flags.length ? "Complete, with things to think about" : "Complete") : report.status === "empty" ? "Not started" : `${report.gaps.length} to go`;
  return h("aside", { class: "depth-check" },
    h("div", { class: "dc-head" }, h("div", { class: "eyebrow" }, "Depth check"), h("span", { class: `status-pill st-${report.status}` }, label)),
    h("ul", { class: "dc-list" },
      items.map((i) => h("li", { class: `dc-item dc-${i.level}` },
        icon(i.level === "ok" ? "circleCheck" : i.level === "flag" ? "flag" : "clock", 15),
        h("span", {}, i.text)
      ))
    ),
    h("p", { class: "dc-foot" }, "Flags don’t block you. They’re the questions a sharp colleague would ask.")
  );
}

// The glowing progress path across the top of every project screen.
function progressPath(p, report, activeStep) {
  const nodes = STEPS.map((s, i) => {
    const r = report.steps[i];
    const isActive = s.id === activeStep;
    return h("a", { href: `#/p/${p.id}/${s.id}`, class: ["pp-node", `st-${r.status}`, isActive && "active"], title: `${s.name}: ${r.status === "complete" ? "complete" : r.status === "empty" ? "not started" : r.gaps.length + " to go"}` },
      h("span", { class: "pp-dot" }, r.status === "complete" && !isActive ? icon("check", 18) : s.num, r.flags.length && r.status !== "empty" ? h("span", { class: "pp-flag", title: `${r.flags.length} flag(s)` }) : null),
      h("span", { class: "pp-name" }, s.name),
      h("span", { class: "pp-output" }, s.output)
    );
  });
  const pct = (report.complete / STEPS.length) * 100;
  return h("nav", { class: "progress-path", "aria-label": "Depth Flow progress" },
    h("div", { class: "pp-track" }, h("div", { class: "pp-fill", style: { width: `${pct}%` } })),
    h("div", { class: "pp-stakeholders" }, icon("chat", 13), "Key stakeholders weigh in here"),
    nodes,
    h("a", { href: `#/p/${p.id}/blueprint`, class: ["pp-node pp-blueprint", activeStep === "blueprint" && "active"] },
      h("span", { class: "pp-dot" }, icon("file", 18)),
      h("span", { class: "pp-name" }, "Blueprint"),
      h("span", { class: "pp-output" }, "Share it")
    )
  );
}

// Small path used on dashboard cards and in the progress table.
function miniPath(report) {
  return h("div", { class: "mini-path" },
    report.steps.map((s, i) => h("span", { class: `mp-dot st-${s.status}`, title: `${STEPS[i].name}: ${s.status === "complete" ? "complete" : s.status === "empty" ? "not started" : "in progress"}` }))
  );
}

function healthRing(pct, size = 44) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  const color = pct >= 80 ? "#4FD6A0" : pct >= 50 ? "#CAA977" : "#5A96FF";
  return raw(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.1)" stroke-width="4" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="filter:drop-shadow(0 0 4px ${color})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${size * 0.27}" font-weight="700" fill="#fff" font-family="Segoe UI, Arial, sans-serif">${pct}</text></svg>`,
    "span",
    { class: "health-ring", title: `Depth health ${pct}%: share of depth checks passed` }
  );
}

function footer() {
  return h("footer", { class: "app-footer" }, raw(footerRoadsSvg(), "div", { class: "footer-art" }), h("p", {}, FRAMEWORK.closing[0], " ", h("span", { class: "gold" }, FRAMEWORK.closing[1])));
}

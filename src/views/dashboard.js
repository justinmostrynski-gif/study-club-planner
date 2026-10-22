// Dashboard (study club cards), Team progress (portfolio view), and the
// framework reference page.

function newProjectModal() {
  const d = UI.draft;
  const set = (k) => (v) => (d[k] = v);
  const submit = (e) => {
    e.preventDefault();
    if (!(d.title || "").trim()) {
      d.error = "Give the study club a working title.";
      render();
      return;
    }
    if ((d.developer || "").trim() && !Store.settings.userName) Store.settings.userName = d.developer.trim();
    const p = Store.create({ title: d.title.trim(), topic: (d.topic || "").trim(), audience: (d.audience || "").trim(), sessionDate: d.sessionDate || "", developer: (d.developer || "").trim() });
    closeModal();
    location.hash = `#/p/${p.id}/destination`;
  };
  return modalShell(
    "New study club",
    h("p", { class: "muted" }, "Start with the basics. The topic is where most designs start. The Depth Flow will push you to start from the behavior instead."),
    h("form", { class: "form-grid", onSubmit: submit },
      field({ label: "Study club title", value: d.title, placeholder: "e.g. Confident Case Conversations", multiline: false, onInput: set("title"), cls: "span-2" }),
      field({ label: "Topic", value: d.topic, placeholder: "e.g. case acceptance", multiline: false, onInput: set("topic") }),
      field({ label: "Audience", value: d.audience, placeholder: "e.g. Doctors and treatment coordinators", multiline: false, onInput: set("audience") }),
      field({ label: "Session date", value: d.sessionDate, type: "date", multiline: false, onInput: set("sessionDate") }),
      field({ label: "Developer", value: d.developer, placeholder: "Your name", multiline: false, onInput: set("developer") }),
      d.error && h("p", { class: "form-error span-2" }, d.error),
      h("div", { class: "modal-actions span-2" }, h("button", { type: "button", class: "btn ghost", onClick: closeModal }, "Cancel"), h("button", { class: "btn gold", type: "submit" }, "Start the Depth Flow", icon("arrowRight", 16)))
    )
  );
}

function importButton(label = "Import project files") {
  const inputId = "import-" + label.length;
  return h("label", { class: "btn ghost", for: inputId, title: "Load .depthflow.json files from teammates" },
    icon("upload", 16), label,
    h("input", {
      id: inputId, type: "file", accept: ".json,application/json", multiple: true, class: "visually-hidden",
      onChange: async (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;
        const r = await Store.importFiles(files);
        e.target.value = "";
        const parts = [r.added && `${r.added} added`, r.updated && `${r.updated} updated`, r.skipped && `${r.skipped} already up to date`].filter(Boolean);
        if (r.errors.length) toast(`Some files couldn’t be read. ${r.errors.join("; ")}`, "error");
        else toast(parts.length ? `Imported: ${parts.join(", ")}.` : "Nothing to import.", "ok");
      },
    })
  );
}

function projectMenu(p) {
  const key = "menu-" + p.id;
  const open = UI.open[key];
  const act = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); UI.open[key] = false; fn(); };
  return h("div", { class: "menu-wrap" },
    h("button", { class: "icon-btn", "aria-label": "More actions", onClick: (e) => { e.preventDefault(); e.stopPropagation(); UI.open = { ...UI.open, [key]: !open }; render(); } }, raw('<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>')),
    open && h("div", { class: "menu" },
      h("button", { onClick: act(() => Store.exportProject(p.id)) }, icon("download", 15), "Export project file"),
      h("button", { onClick: act(() => { const c = Store.duplicate(p.id); toast(`Duplicated as “${c.title}”.`, "ok"); }) }, icon("copy", 15), "Duplicate"),
      h("button", { onClick: act(() => Store.update(p.id, (x) => (x.status = x.status === "archived" ? "active" : "archived"))) }, icon("archive", 15), p.status === "archived" ? "Restore" : "Archive"),
      h("button", { class: "danger", onClick: act(() => confirmModal({ title: "Delete this study club?", message: `“${p.title}” will be removed from this browser. Export the project file first if you might need it.`, confirm: "Delete", danger: true, onConfirm: () => Store.remove(p.id) })) }, icon("trash", 15), "Delete")
    )
  );
}

function projectCard(p) {
  const rep = projectReport(p);
  const next = rep.currentStep ? STEP[rep.currentStep] : null;
  const pri = ROADS.filter((r) => p.roads[r.id].priority);
  const hasDest = filled(p.destination.what);
  return h("a", { class: ["club-card", p.status === "archived" && "archived"], href: `#/p/${p.id}/${p.lastStep || "destination"}`, key: p.id },
    h("div", { class: "cc-top" },
      h("div", { class: "cc-titles" }, h("h3", {}, p.title || "Untitled study club"), h("p", { class: "muted small" }, [p.topic, p.audience].filter(Boolean).join(" · ") || "No topic yet")),
      healthRing(rep.health),
      projectMenu(p)
    ),
    h("p", { class: ["cc-dest", !hasDest && "empty"] }, hasDest ? destinationStatement(p, { blanks: false }) : "No destination statement yet. Start with the behavior."),
    pri.length ? h("div", { class: "cc-roads" }, pri.map((r) => roadTag(r.id, { small: true }))) : null,
    h("div", { class: "cc-progress" }, miniPath(rep), h("span", { class: "cc-next" }, next ? `Next: ${next.name}` : "Ready to launch")),
    h("div", { class: "cc-meta" },
      h("span", {}, icon("calendar", 14), p.sessionDate ? `${fmtDate(p.sessionDate)} · ${daysLabel(rep.daysToSession)}` : "No session date"),
      h("span", {}, icon("user", 14), p.developer || "No developer"),
      rep.atRisk && h("span", { class: "risk" }, icon("alert", 14), "At risk")
    )
  );
}

function dashboardView() {
  const q = UI.dashSearch.trim().toLowerCase();
  let list = Store.projects.filter((p) => (UI.showArchived ? true : p.status === "active"));
  if (q) list = list.filter((p) => [p.title, p.topic, p.audience, p.developer].join(" ").toLowerCase().includes(q));
  const reports = new Map(list.map((p) => [p.id, projectReport(p)]));
  if (UI.dashFilter === "progress") list = list.filter((p) => reports.get(p.id).complete < 5);
  if (UI.dashFilter === "attention") list = list.filter((p) => reports.get(p.id).atRisk || reports.get(p.id).health < 50);
  if (UI.dashFilter === "complete") list = list.filter((p) => reports.get(p.id).complete === 5);
  const total = Store.active().length;

  return h("div", { class: "page" },
    appHeader("clubs"),
    h("section", { class: "hero" },
      raw(heroRoadsSvg(), "div", { class: "hero-art" }),
      h("div", { class: "hero-copy" },
        h("h1", { class: "hero-title" }, "GOING", h("br"), h("span", { class: "gold" }, "DEEPER")),
        h("p", { class: "hero-sub" }, "The Study Club Depth Flow"),
        h("p", { class: "hero-lede" }, "Design study clubs that change behavior, not just share content. Start from the destination, ask the roads, prioritize few, and design for depth."),
        h("div", { class: "hero-actions" },
          h("button", { class: "btn gold lg", onClick: () => openModal(newProjectModal, { developer: Store.settings.userName }) }, icon("plus", 18), "New study club"),
          importButton()
        )
      )
    ),
    total === 0
      ? emptyState()
      : h("section", { class: "content" },
          h("div", { class: "toolbar" },
            h("div", { class: "search" }, icon("search", 16), h("input", { class: "input bare", placeholder: "Search study clubs", value: UI.dashSearch, onInput: (e) => { UI.dashSearch = e.target.value; render(); } })),
            segmented({
              options: [{ id: "all", label: "All" }, { id: "progress", label: "In progress" }, { id: "attention", label: "Needs attention" }, { id: "complete", label: "Complete" }],
              value: UI.dashFilter,
              onChange: (v) => { UI.dashFilter = v || "all"; render(); },
            }),
            h("label", { class: "check" }, h("input", { type: "checkbox", checked: UI.showArchived, onChange: (e) => { UI.showArchived = e.target.checked; render(); } }), "Show archived")
          ),
          list.length ? h("div", { class: "card-grid" }, list.map(projectCard)) : h("p", { class: "muted center pad" }, "No study clubs match.")
        ),
    footer()
  );
}

function emptyState() {
  return h("section", { class: "content" },
    h("div", { class: "empty" },
      h("div", { class: "eyebrow" }, "The process flow"),
      h("h2", {}, "Four moves from concept to content"),
      h("div", { class: "flow-row" },
        STEPS.map((s) => h("div", { class: "flow-step" }, h("span", { class: "pp-dot" }, s.num), h("b", {}, s.name), h("span", { class: "muted small" }, s.summary), h("span", { class: "flow-output" }, h("small", {}, "OUTPUT"), s.output)))
      ),
      h("p", { class: "rule-line" }, "Every study club receives the same level of intentional design.")
    )
  );
}

// ---- Team progress ----
function progressView() {
  const projects = Store.active();
  const rows = projects.map((p) => ({ p, rep: projectReport(p) }));
  const attention = rows.filter((r) => r.rep.atRisk || r.rep.health < 50);
  const shown = UI.dashFilter === "attention" ? attention : rows;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.rep.health, 0) / rows.length) : 0;
  const reqGroups = projects.flatMap((p) => p.stakeholders.groups.filter((g) => g.required));
  const reqDone = reqGroups.filter((g) => g.status === "done").length;

  const statusCell = (rep, i, p) => {
    const s = rep.steps[i];
    const tip = s.status === "complete" ? `Complete${s.flags.length ? `, ${s.flags.length} flag(s)` : ""}` : s.status === "empty" ? "Not started" : s.gaps.map((g) => "• " + g.text).join("\n");
    return h("td", { class: "pt-step" }, h("a", { href: `#/p/${p.id}/${STEPS[i].id}`, class: `pt-dot st-${s.status}`, title: tip }, s.status === "complete" ? icon("check", 13) : s.status === "progress" ? String(s.gaps.length) : ""));
  };

  return h("div", { class: "page" },
    appHeader("progress"),
    h("section", { class: "content" },
      h("div", { class: "page-head" },
        h("div", {}, h("div", { class: "eyebrow" }, "Team progress"), h("h1", { class: "step-title" }, "Is every study club going deeper?"),
          h("p", { class: "muted lede" }, "Every study club, every move, in one place. Each dot shows whether a move is done, and the depth health score shows whether it was done well.")),
        h("div", { class: "head-actions" }, importButton("Import teammates’ files"), h("button", { class: "btn ghost", onClick: () => Store.exportAll() }, icon("download", 16), "Back up everything"))
      ),
      h("div", { class: "how-share" },
        icon("info", 18, "#8CBEFF"),
        h("div", {}, h("b", {}, "How team progress works. "), "Each developer’s work saves in their own browser. Developers export their project file (⋯ › Export project file) and drop it in your shared Teams or OneDrive folder. Import those files here to see where every club stands. Re-importing a newer file updates it.")
      ),
      h("div", { class: "stat-row" },
        stat(rows.length, "Active study clubs"),
        stat(rows.length ? avg + "%" : "–", "Average depth health"),
        stat(attention.length, "Need attention", attention.length ? "warn" : ""),
        stat(reqGroups.length ? `${reqDone}/${reqGroups.length}` : "–", "Required partner interviews done")
      ),
      rows.length === 0
        ? h("p", { class: "muted center pad" }, "No study clubs yet. Create one, or import teammates’ project files.")
        : h("div", { class: "panel" },
            h("div", { class: "panel-head" }, h("h2", {}, "Study clubs by move"),
              segmented({ options: [{ id: "all", label: "All" }, { id: "attention", label: `Needs attention (${attention.length})` }], value: UI.dashFilter === "attention" ? "attention" : "all", onChange: (v) => { UI.dashFilter = v || "all"; render(); } })),
            h("div", { class: "table-wrap" },
              h("table", { class: "ptable" },
                h("thead", {}, h("tr", {}, h("th", {}, "Study club"), h("th", {}, "Session"), STEPS.map((s) => h("th", { class: "pt-step", title: s.name }, s.num === "✓" ? "✓" : s.num, h("small", {}, s.name))), h("th", {}, "Priority roads"), h("th", {}, "Health"), h("th", {}, "Last update"))),
                h("tbody", {},
                  shown.map(({ p, rep }) =>
                    h("tr", { key: p.id, class: rep.atRisk ? "at-risk" : "" },
                      h("td", {}, h("a", { href: `#/p/${p.id}/${p.lastStep || "destination"}`, class: "pt-title" }, p.title || "Untitled"), h("div", { class: "muted small" }, p.developer || "No developer")),
                      h("td", {}, p.sessionDate ? fmtDate(p.sessionDate, { month: "short", day: "numeric" }) : "–", h("div", { class: ["small", rep.atRisk ? "risk" : "muted"] }, rep.atRisk ? "At risk · " + daysLabel(rep.daysToSession) : p.sessionDate ? daysLabel(rep.daysToSession) : "")),
                      STEPS.map((s, i) => statusCell(rep, i, p)),
                      h("td", {}, h("div", { class: "cc-roads" }, ROADS.filter((r) => p.roads[r.id].priority).map((r) => roadTag(r.id, { small: true })))),
                      h("td", {}, healthRing(rep.health, 36)),
                      h("td", { class: "small muted" }, timeAgo(p.updatedAt), p.updatedBy ? h("div", {}, "by " + p.updatedBy) : null)
                    )
                  )
                )
              )
            ),
            h("div", { class: "legend" }, legendDot("complete", "Complete"), legendDot("progress", "In progress (number = items to go)"), legendDot("empty", "Not started"), h("span", { class: "muted small" }, "Hover a dot to see what’s missing."))
          ),
      rows.length ? roadPatterns(projects) : null
    ),
    footer()
  );
}

function stat(value, label, cls = "") {
  return h("div", { class: `stat ${cls}` }, h("div", { class: "stat-value" }, String(value)), h("div", { class: "stat-label" }, label));
}
function legendDot(st, label) {
  return h("span", { class: "legend-item" }, h("span", { class: `pt-dot st-${st} sm` }), label);
}

// Which roads keep coming up missing across the portfolio?
function roadPatterns(projects) {
  const rated = projects.filter((p) => ROADS.some((r) => p.roads[r.id].rating));
  const data = ROADS.map((r) => {
    const c = { strong: 0, partial: 0, missing: 0, priority: 0 };
    rated.forEach((p) => {
      const x = p.roads[r.id];
      if (x.rating) c[x.rating]++;
      if (x.priority) c.priority++;
    });
    return { r, ...c };
  });
  const worst = [...data].sort((a, b) => b.missing + b.partial * 0.5 - (a.missing + a.partial * 0.5))[0];
  const n = rated.length;
  return h("div", { class: "panel" },
    h("div", { class: "panel-head" }, h("div", {}, h("h2", {}, "Road patterns across the team"), h("p", { class: "muted small" }, n ? `From ${n} study club${n > 1 ? "s" : ""} with a road check.` : "Patterns appear once study clubs reach Move 03."))),
    n
      ? h("div", { class: "patterns" },
          data.map((d) => h("div", { class: "pattern-row" },
            h("div", { class: "pattern-label" }, roadTag(d.r.id)),
            h("div", { class: "pattern-bar" },
              ["strong", "partial", "missing"].map((k) => d[k] ? h("span", { class: `pb pb-${k}`, style: { width: `${(100 * d[k]) / n}%`, "--road": d.r.color }, title: `${RATING[k].label}: ${d[k]}` }, String(d[k])) : null)
            ),
            h("div", { class: "pattern-pri small muted" }, d.priority ? `Priority in ${d.priority}` : "")
          )),
          h("div", { class: "legend" }, h("span", { class: "legend-item" }, h("span", { class: "pb-swatch pb-strong" }), "Strong"), h("span", { class: "legend-item" }, h("span", { class: "pb-swatch pb-partial" }), "Partial"), h("span", { class: "legend-item" }, h("span", { class: "pb-swatch pb-missing" }), "Missing")),
          n >= 2 && worst && worst.missing + worst.partial > 0 && h("p", { class: "insight" }, icon("bulb", 16, "#CAA977"), `${worst.r.name} is missing or partial in ${worst.missing + worst.partial} of ${n} study clubs. That may be a team-level gap worth designing for once, not every time.`)
        )
      : null
  );
}

// ---- framework reference ----
function aboutView() {
  return h("div", { class: "page" },
    appHeader("about"),
    h("section", { class: "content narrow" },
      h("div", { class: "eyebrow" }, "Why this matters"),
      h("h1", { class: "step-title" }, "A great topic does not guarantee depth"),
      h("div", { class: "compare" },
        h("div", { class: "compare-card" }, h("h3", {}, "COVERAGE"), h("p", { class: "muted italic" }, "Attendees heard it"), h("ul", {}, ["Design starts with the topic", "More slides, more speakers, more content", "Success is attendance and ratings", "Stakeholders review the finished product"].map((t) => h("li", {}, t)))),
        h("div", { class: "compare-arrow" }, icon("arrowRight", 30, "#CAA977")),
        h("div", { class: "compare-card depth" }, h("h3", {}, "DEPTH"), h("p", { class: "gold italic" }, "Attendees do something differently"), h("ul", {}, ["Design starts with the destination", "Content targets the roads that are missing", "Success is behavior back in the office", "Stakeholders shape it from the start"].map((t) => h("li", {}, t))))
      ),
      h("p", { class: "rule-line" }, "Covering the content is only the beginning."),
      h("div", { class: "eyebrow mt" }, "The five roads"),
      h("div", { class: "road-grid" },
        ROADS.map((r) => h("div", { class: "road-card", style: { "--road": r.color } }, roadIcon(r.id, 26), h("h3", {}, r.name.toUpperCase()), h("p", { class: "muted italic small" }, r.lens), h("div", { class: "eyebrow tiny" }, "If missing"), h("p", { class: "small" }, r.ifMissing)))
      ),
      h("div", { class: "eyebrow mt" }, "The process flow"),
      h("div", { class: "flow-row" },
        STEPS.map((s) => h("div", { class: "flow-step" }, h("span", { class: "pp-dot" }, s.num), h("b", {}, s.name), h("span", { class: "muted small" }, s.summary), h("span", { class: "flow-output" }, h("small", {}, "OUTPUT"), s.output)))
      )
    ),
    footer()
  );
}

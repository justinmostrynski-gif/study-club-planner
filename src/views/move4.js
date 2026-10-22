// MOVE 04 · Design for depth

function decisionRow(p, d) {
  const up = (fn) => Store.update(p.id, (x) => fn(x.design.decisions.find((y) => y.id === d.id)));
  return h("div", { class: "decision", key: d.id },
    h("textarea", { class: "input", rows: 2, value: d.text, placeholder: "A specific design decision someone else could build from", onInput: (e) => up((y) => (y.text = e.target.value)) }),
    h("div", { class: "decision-side" },
      h("select", { class: ["input sm", !d.segment && "unplaced"], value: d.segment, onChange: (e) => up((y) => (y.segment = e.target.value)) },
        h("option", { value: "" }, "Place it in…"),
        SEGMENTS.map((s) => h("option", { value: s.id }, s.name))
      ),
      h("button", { class: "icon-btn subtle", "aria-label": "Delete decision", onClick: () => Store.update(p.id, (x) => (x.design.decisions = x.design.decisions.filter((y) => y.id !== d.id))) }, icon("trash", 15))
    )
  );
}

function addDecision(p, road, text = "", segment = "") {
  Store.update(p.id, (x) => x.design.decisions.push({ id: uid(), road, text, segment }));
}

function priorityDesignCard(p, r) {
  const decisions = p.design.decisions.filter((d) => d.road === r.id);
  const used = new Set(decisions.map((d) => d.text.trim()));
  return h("section", { class: "design-card", style: { "--road": r.color }, key: r.id },
    h("div", { class: "dc-top" },
      roadIcon(r.id, 30),
      h("div", {}, h("h2", {}, r.name.toUpperCase()), h("p", { class: "muted italic small" }, r.lens)),
      p.roads[r.id].why && h("p", { class: "dc-why small" }, h("span", { class: "eyebrow tiny" }, "Why it’s a priority"), p.roads[r.id].why)
    ),
    h("div", { class: "if-missing" }, h("span", { class: "eyebrow tiny" }, "If missing"), h("p", {}, r.ifMissing)),
    h("div", { class: "starting" },
      h("span", { class: "eyebrow tiny" }, "Starting points. Click to adapt one, or write your own."),
      h("div", { class: "chip-row" }, r.startingPoints.filter((t) => !used.has(t)).map((t) => h("button", { class: "chip road-chip", onClick: () => addDecision(p, r.id, t) }, icon("plus", 12), t)))
    ),
    h("div", { class: "decisions" },
      h("div", { class: "eyebrow tiny" }, `Your design decisions (${decisions.length})`),
      decisions.map((d) => decisionRow(p, d)),
      h("button", { class: "btn ghost small", onClick: () => addDecision(p, r.id) }, icon("plus", 14), `Add a decision`)
    )
  );
}

function segmentBoard(p) {
  const decisions = p.design.decisions;
  const cols = [...SEGMENTS, ...(decisions.some((d) => !d.segment) ? [{ id: "", name: "Not placed yet" }] : [])];
  const drop = (segId) => (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const id = e.dataTransfer.getData("text/plain");
    Store.update(p.id, (x) => {
      const d = x.design.decisions.find((y) => y.id === id);
      if (d) d.segment = segId;
    });
  };
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("div", {}, h("div", { class: "eyebrow" }, "The study club, segment by segment"), h("h2", {}, "Where each decision lives"), h("p", { class: "muted small" }, "Drag a decision to move it. Depth usually lives before and after the core content, not just inside it."))),
    h("div", { class: "seg-board" },
      cols.map((s) => {
        const items = decisions.filter((d) => d.segment === s.id);
        return h("div", {
          class: ["seg-col", !s.id && "unplaced"],
          key: "col-" + s.id,
          onDragover: (e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); },
          onDragleave: (e) => e.currentTarget.classList.remove("drag-over"),
          onDrop: drop(s.id),
        },
          h("div", { class: "seg-head" }, s.name, h("span", { class: "seg-count" }, String(items.length))),
          items.map((d) => h("div", { class: "seg-chip", draggable: "true", style: { "--road": ROAD[d.road].color }, key: d.id, title: d.text, onDragstart: (e) => e.dataTransfer.setData("text/plain", d.id) }, roadIcon(d.road, 13), h("span", {}, d.text || "(empty decision)"))),
          !items.length && h("div", { class: "seg-empty" }, "—")
        );
      })
    )
  );
}

function move4View(p) {
  const pri = ROADS.filter((r) => p.roads[r.id].priority);
  const offRoads = ROADS.filter((r) => !p.roads[r.id].priority && p.design.decisions.some((d) => d.road === r.id));
  const n = p.design.decisions.filter((d) => filled(d.text)).length;
  const segs = new Set(p.design.decisions.filter((d) => d.segment).map((d) => d.segment)).size;

  if (!pri.length)
    return h("div", { class: "step-body" },
      h("div", { class: "banner" }, icon("info", 18, "#8CBEFF"), h("div", {}, h("b", {}, "Choose your priority roads first."), h("span", { class: "muted" }, " Each missing road becomes a design decision, so Move 04 starts from the one or two roads you chose in Move 03.")), h("a", { class: "btn small gold", href: `#/p/${p.id}/prioritize` }, "Go to Prioritize few")),
      h("div", { class: "road-grid" }, ROADS.map((r) => h("div", { class: "road-card", style: { "--road": r.color } }, roadIcon(r.id, 26), h("h3", {}, r.name.toUpperCase()), h("p", { class: "muted italic small" }, r.lens), h("div", { class: "eyebrow tiny" }, "If missing"), h("p", { class: "small" }, r.ifMissing))))
    );

  return h("div", { class: "step-body" },
    h("div", { class: "design-grid" }, pri.map((r) => priorityDesignCard(p, r))),
    offRoads.length
      ? h("section", { class: "panel off-roads" },
          h("div", { class: "panel-head" }, h("div", {}, h("div", { class: "eyebrow" }, "Not a priority"), h("h2", {}, "Decisions for other roads"), h("p", { class: "muted small" }, "These target roads you didn’t prioritize. Keep them only if they directly serve your priority roads."))),
          p.design.decisions.filter((d) => !p.roads[d.road].priority).map((d) => h("div", { class: "off-item", key: d.id }, roadTag(d.road, { small: true }), decisionRow(p, d)))
        )
      : null,
    segmentBoard(p),
    outputCard(STEP.design, h("p", { class: "output-text" }, `${n} design decision${n === 1 ? "" : "s"} across ${segs} segment${segs === 1 ? "" : "s"}, built for ${pri.map((r) => r.name).join(" and ")}.`), { iconName: "tools" })
  );
}

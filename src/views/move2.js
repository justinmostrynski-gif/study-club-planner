// MOVE 02 · Ask the roads

function groupCard(p, g) {
  const up = (fn) => Store.update(p.id, (x) => fn(x.stakeholders.groups.find((y) => y.id === g.id)));
  const remove = () =>
    confirmModal({
      title: `Remove “${g.name || "this partner"}”?`,
      message: g.required ? "This is one of the three required partners. Every study club should hear from them before design starts." : "Their contact, status and date will be removed.",
      confirm: "Remove",
      danger: true,
      onConfirm: () => Store.update(p.id, (x) => (x.stakeholders.groups = x.stakeholders.groups.filter((y) => y.id !== g.id))),
    });
  return h("div", { class: ["group-card", `gs-${g.status}`], key: g.id },
    h("div", { class: "gc-head" },
      h("span", { class: "gc-icon" }, icon(g.status === "done" ? "circleCheck" : "user", 18, g.status === "done" ? "#4FD6A0" : "#8CBEFF")),
      h("div", { class: "gc-names" },
        h("input", { class: "input bare gc-name", value: g.name, placeholder: "Stakeholder group", onInput: (e) => up((y) => (y.name = e.target.value)) }),
        h("input", { class: "input bare gc-desc", value: g.description, placeholder: "What they bring", onInput: (e) => up((y) => (y.description = e.target.value)) })
      ),
      g.required && h("span", { class: "req-badge", title: "Required for every study club" }, "Required"),
      h("button", { class: "icon-btn subtle", onClick: remove, "aria-label": "Remove" }, icon("trash", 15))
    ),
    h("div", { class: "gc-body" },
      h("input", { class: "input", value: g.contact, placeholder: "Who you’re talking to (name, role)", onInput: (e) => up((y) => (y.contact = e.target.value)) }),
      h("div", { class: "gc-row" },
        segmented({ options: INTERVIEW_STATUS, value: g.status, size: "sm", onChange: (v) => up((y) => (y.status = v || "not_started")) }),
        h("input", { class: "input date", type: "date", value: g.date, title: "Interview date", onInput: (e) => up((y) => (y.date = e.target.value)) })
      )
    )
  );
}

function move2View(p) {
  const groups = p.stakeholders.groups;
  const existing = new Set(groups.map((g) => g.name.toLowerCase()));
  const suggestions = SUGGESTED_GROUPS.filter((s) => !existing.has(s.name.toLowerCase()));
  const addGroup = (g) => Store.update(p.id, (x) => x.stakeholders.groups.push({ id: uid(), name: g.name, description: g.description, required: false, contact: "", status: "not_started", date: "" }));
  const done = groups.filter((g) => g.status === "done").length;
  const roadsDone = ROADS.filter((r) => filled(p.stakeholders.insights[r.id], 15)).length;

  return h("div", { class: "step-body" },
    h("section", { class: "panel" },
      h("div", { class: "panel-head" },
        h("div", {}, h("div", { class: "eyebrow" }, "Who we ask"), h("h2", {}, "Your stakeholders"), h("p", { class: "muted small" }, "Every study club hears from its three partners. Add anyone else whose view you need.")),
        h("span", { class: "count-pill" }, `${done} of ${groups.length} interviewed`)
      ),
      h("div", { class: "group-grid" }, groups.map((g) => groupCard(p, g))),
      h("div", { class: "add-groups" },
        h("button", { class: "btn ghost small", onClick: () => addGroup({ name: "", description: "" }) }, icon("plus", 15), "Add a stakeholder group"),
        suggestions.length ? h("span", { class: "muted small" }, "Suggested:") : null,
        suggestions.map((s) => h("button", { class: "chip", onClick: () => addGroup(s), title: s.description }, icon("plus", 12), s.name))
      )
    ),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" },
        h("div", {}, h("div", { class: "eyebrow" }, "The interview guide"), h("h2", {}, "Same five questions in every conversation"), h("p", { class: "muted small" }, "Ask each stakeholder all five. Then capture what you heard for each road: where answers line up, and where they don’t."))
      ),
      h("div", { class: "road-rows" },
        ROADS.map((r) =>
          h("div", { class: "road-row", style: { "--road": r.color }, key: r.id },
            h("div", { class: "rr-road" }, roadIcon(r.id, 22), h("div", {}, h("b", {}, r.name.toUpperCase()), h("span", { class: "muted italic small" }, r.lens))),
            h("div", { class: "rr-ask" }, h("div", { class: "eyebrow tiny" }, "Ask stakeholders"), h("p", {}, "“" + roadQuestion(r, p.topic) + "”")),
            h("div", { class: "rr-heard" },
              h("div", { class: "eyebrow tiny" }, "What we heard"),
              h("textarea", { class: "input", rows: 3, value: p.stakeholders.insights[r.id], placeholder: "Themes, quotes, and disagreements across your conversations", onInput: (e) => Store.update(p.id, (x) => (x.stakeholders.insights[r.id] = e.target.value)) })
            )
          )
        )
      )
    ),
    outputCard(STEP.roads,
      h("div", {},
        h("p", { class: "output-text" }, `${done} stakeholder${done === 1 ? "" : "s"} interviewed · ${roadsDone} of 5 roads with insights`),
        h("div", { class: "insight-chips" }, ROADS.map((r) => h("span", { class: ["ins-chip", filled(p.stakeholders.insights[r.id], 15) && "on"], style: { "--road": r.color } }, roadIcon(r.id, 13), r.name)))
      ),
      { iconName: "chat" }
    )
  );
}

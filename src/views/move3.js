// MOVE 03 · Prioritize few

const RATING_COLORS = { strong: "#4FD6A0", partial: "#CAA977", missing: "#FF8A7A" };

function suggestedRoads(p) {
  return ROADS.filter((r) => ["partial", "missing"].includes(p.roads[r.id].rating) && p.roads[r.id].impact && p.roads[r.id].effort)
    .map((r) => {
      const x = p.roads[r.id];
      return { id: r.id, score: LEVEL[x.impact].score * 2 - LEVEL[x.effort].score + (x.rating === "missing" ? 0.5 : 0) };
    })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.id);
}

function togglePriority(p, roadId) {
  const x = p.roads[roadId];
  if (x.priority) return Store.update(p.id, (y) => (y.roads[roadId].priority = false));
  const current = ROADS.filter((r) => p.roads[r.id].priority);
  if (current.length < 2) return Store.update(p.id, (y) => (y.roads[roadId].priority = true));
  // Push back: one or two roads at a time.
  openModal(() =>
    modalShell("Pick one or two. Not five.",
      h("p", { class: "muted" }, `You already have ${current.map((r) => r.name).join(" and ")}. One connected design beats five thin ones. If ${ROAD[roadId].name} matters more, swap it in.`),
      h("div", { class: "swap-list" },
        current.map((r) =>
          h("button", { class: "btn ghost", onClick: () => { Store.update(p.id, (y) => { y.roads[r.id].priority = false; y.roads[roadId].priority = true; }); closeModal(); } },
            icon("swap", 15), "Swap ", roadTag(r.id, { small: true }), " for ", roadTag(roadId, { small: true }))
        )
      ),
      h("div", { class: "modal-actions" }, h("button", { class: "btn gold", onClick: closeModal }, "Keep my two"))
    )
  );
}

function move3View(p) {
  const up = (roadId, fn) => Store.update(p.id, (x) => fn(x.roads[roadId]));
  // Candidates: partial/missing roads, plus any priority that has since been re-rated.
  const candidates = ROADS.filter((r) => ["partial", "missing"].includes(p.roads[r.id].rating) || p.roads[r.id].priority);
  const suggested = suggestedRoads(p);
  const pri = ROADS.filter((r) => p.roads[r.id].priority);

  return h("div", { class: "step-body" },
    h("section", { class: "rc-layout" },
      h("div", { class: "panel rc-panel" }, h("div", { class: "eyebrow" }, "Your road check"), raw(roadCheckSvg(p), "div", { class: "rc-graphic" })),
      h("div", { class: "panel choose-panel" },
        h("div", { class: "eyebrow gold" }, icon("funnel", 14, "#CAA977"), " How to choose"),
        h("div", { class: "choose-item" }, h("b", {}, "Impact"), h("p", { class: "muted small" }, "Which missing road most blocks the destination behavior?")),
        h("div", { class: "choose-item" }, h("b", {}, "Effort"), h("p", { class: "muted small" }, "Which can we realistically design for in this study club?")),
        h("p", { class: "gold strong" }, "Pick one or two. Not five.")
      )
    ),

    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("div", {}, h("div", { class: "eyebrow" }, "Step 1"), h("h2", {}, "Rate each road from what stakeholders said"))),
      h("div", { class: "rate-rows" },
        ROADS.map((r) => {
          const x = p.roads[r.id];
          const heard = p.stakeholders.insights[r.id];
          return h("div", { class: "rate-row", style: { "--road": r.color }, key: r.id },
            h("div", { class: "rate-road" }, roadIcon(r.id, 22), h("div", {}, h("b", {}, r.name.toUpperCase()), h("span", { class: "muted italic small" }, r.lens))),
            h("div", { class: "rate-evidence" },
              h("div", { class: "eyebrow tiny" }, "What stakeholders said"),
              filled(heard) ? h("p", { class: "evidence" }, heard) : h("p", { class: "evidence empty" }, "No insight captured for this road. ", h("a", { href: `#/p/${p.id}/roads` }, "Add it in Move 02"))
            ),
            h("div", { class: "rate-control" },
              segmented({ options: RATINGS, value: x.rating, onChange: (v) => up(r.id, (y) => (y.rating = v)), colorOf: (id) => RATING_COLORS[id] }),
              h("input", { class: "input sm", value: x.evidence, placeholder: "Why this rating?", onInput: (e) => up(r.id, (y) => (y.evidence = e.target.value)) })
            )
          );
        })
      )
    ),

    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("div", {}, h("div", { class: "eyebrow" }, "Step 2"), h("h2", {}, "Weigh impact and effort, then lock in one or two"), h("p", { class: "muted small" }, "Only partial and missing roads are candidates. The top-left of the grid is the sweet spot: high impact, low effort."))),
      candidates.length === 0
        ? h("p", { class: "muted pad-sm" }, "Rate the roads above. Any road you mark Partial or Missing shows up here.")
        : h("div", { class: "ie-layout" },
            h("div", { class: "ie-rows" },
              candidates.map((r) => {
                const x = p.roads[r.id];
                return h("div", { class: ["ie-row", x.priority && "is-priority"], style: { "--road": r.color }, key: r.id },
                  h("div", { class: "ie-road" }, roadTag(r.id), h("span", { class: `rating-badge rb-${x.rating || "none"}` }, x.rating ? RATING[x.rating].label : "Not rated"), suggested.includes(r.id) && !x.priority && h("span", { class: "suggest-badge" }, icon("bulb", 12), "Suggested")),
                  h("div", { class: "ie-controls" },
                    h("div", { class: "ie-ctl" }, h("span", { class: "eyebrow tiny" }, "Impact"), segmented({ options: LEVELS, value: x.impact, size: "sm", onChange: (v) => up(r.id, (y) => (y.impact = v)) })),
                    h("div", { class: "ie-ctl" }, h("span", { class: "eyebrow tiny" }, "Effort"), segmented({ options: LEVELS, value: x.effort, size: "sm", onChange: (v) => up(r.id, (y) => (y.effort = v)) })),
                    h("button", { class: ["btn small", x.priority ? "gold" : "ghost"], onClick: () => togglePriority(p, r.id) }, x.priority ? [icon("check", 14), "Priority"] : [icon("plus", 14), "Make priority"])
                  ),
                  x.priority && h("input", { class: "input sm why-input", value: x.why, placeholder: `Why ${r.name}? What does it block in the destination behavior?`, onInput: (e) => up(r.id, (y) => (y.why = e.target.value)) })
                );
              })
            ),
            h("div", { class: "ie-chart" }, raw(impactEffortSvg(p), "div"), h("p", { class: "muted tiny center" }, "Gold ring = priority"))
          )
    ),

    outputCard(STEP.prioritize,
      pri.length
        ? h("div", { class: "pri-out" }, pri.map((r) => h("div", { class: "pri-item" }, roadTag(r.id), h("span", { class: "muted small" }, p.roads[r.id].why || "Add why this road is a priority."))))
        : h("p", { class: "output-text muted" }, "No priority roads yet."),
      { iconName: "funnel" }
    )
  );
}

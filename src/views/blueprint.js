// Depth Design Blueprint: the shareable summary. White, print-ready, and the
// same structure as the Word export.

function blueprintData(p) {
  const rep = projectReport(p);
  const pri = ROADS.filter((r) => p.roads[r.id].priority);
  const bySegment = SEGMENTS.map((s) => ({ seg: s, items: p.design.decisions.filter((d) => d.segment === s.id && filled(d.text)) }));
  const unplaced = p.design.decisions.filter((d) => !d.segment && filled(d.text));
  const open = rep.steps.flatMap((s) => s.items.filter((i) => i.level !== "ok").map((i) => ({ ...i, step: STEP[s.stepId] })));
  const shifts = SHIFTS.filter((s) => filled(p.destination.shift[s.id])).map((s) => ({ label: s.label, text: p.destination.shift[s.id] }));
  const measure = MEASURE_TYPES.find((m) => m.id === p.prove.measureType);
  return { rep, pri, bySegment, unplaced, open, shifts, measure };
}

function blueprintView(p, rep) {
  const b = blueprintData(p);
  const gapCount = b.open.filter((i) => i.level === "gap").length;
  const dash = (v) => (filled(v) ? v : h("span", { class: "doc-empty" }, "Not yet answered"));
  const sec = (num, title, ...body) => h("section", { class: "doc-sec" }, h("h2", {}, h("span", { class: "doc-num" }, num), title), ...body);

  return h("div", { class: "page blueprint-page" },
    appHeader("clubs"),
    h("div", { class: "project no-print" }, projectBar(p, rep), progressPath(p, rep, "blueprint")),
    h("div", { class: "doc-toolbar no-print" },
      h("div", {},
        h("b", {}, "Depth Design Blueprint"),
        h("span", { class: "muted small" }, gapCount ? ` · ${gapCount} open item${gapCount === 1 ? "" : "s"} listed at the end` : " · Every move is complete")
      ),
      h("div", { class: "head-actions" },
        h("button", { class: "btn ghost", onClick: () => exportBlueprintDocx(p).catch((e) => { console.error(e); toast("Couldn’t create the Word file. " + e.message, "error"); }) }, icon("download", 16), "Download Word"),
        h("button", { class: "btn gold", onClick: () => window.print() }, icon("printer", 16), "Print or save as PDF")
      )
    ),
    h("article", { class: "doc" },
      h("header", { class: "doc-head" },
        h("div", {}, h("div", { class: "doc-eyebrow" }, "Depth Design Blueprint"), h("h1", {}, p.title || "Untitled study club"),
          h("div", { class: "doc-meta" },
            [["Topic", p.topic], ["Audience", p.audience], ["Session", fmtDate(p.sessionDate)], ["Developer", p.developer], ["Updated", fmtDate(p.updatedAt)]]
              .filter(([, v]) => v).map(([k, v]) => h("span", {}, h("b", {}, k + " "), v)))),
        h("img", { src: LOGO_COLOR, alt: "Heartland Dental", class: "doc-logo" })
      ),
      h("div", { class: "doc-status" },
        STEPS.map((s, i) => h("span", { class: `ds-item st-${b.rep.steps[i].status}` }, h("span", { class: "ds-dot" }, b.rep.steps[i].status === "complete" ? "✓" : s.num), s.name)),
        h("span", { class: "ds-health" }, `Depth health ${b.rep.health}%`)
      ),

      sec("01", "The destination",
        h("blockquote", { class: "doc-dest" }, destinationStatement(p)),
        h("table", { class: "doc-table kv" },
          h("tr", {}, h("th", {}, "What we’re solving"), h("td", {}, dash(p.destination.solving))),
          h("tr", {}, h("th", {}, "Who we’re solving it for"), h("td", {}, dash(p.destination.solvingFor))),
          h("tr", {}, h("th", {}, "The shift"), h("td", {}, b.shifts.length ? h("ul", { class: "doc-list" }, b.shifts.map((s) => h("li", {}, h("b", {}, s.label + ": "), s.text))) : dash("")))
        )
      ),

      sec("02", "Stakeholders engaged",
        h("table", { class: "doc-table" },
          h("thead", {}, h("tr", {}, h("th", {}, "Stakeholder group"), h("th", {}, "Who we talked to"), h("th", {}, "Status"), h("th", {}, "Date"))),
          h("tbody", {}, p.stakeholders.groups.map((g) => h("tr", {}, h("td", {}, h("b", {}, g.name), g.required ? h("span", { class: "doc-req" }, " Required") : null), h("td", {}, g.contact || "–"), h("td", {}, INTERVIEW_STATUS.find((s) => s.id === g.status).label), h("td", {}, fmtDate(g.date) || "–"))))
        ),
        h("h3", {}, "What we heard, by road"),
        h("div", { class: "doc-roads" }, ROADS.map((r) => h("div", { class: "doc-road", style: { "--road": shade(r.color) } }, h("div", { class: "doc-road-name" }, r.name, h("span", {}, r.lens)), h("p", {}, dash(p.stakeholders.insights[r.id])))))
      ),

      sec("03", "Road check and priority roads",
        raw(roadCheckSvg(p, { light: true }), "div", { class: "doc-rc" }),
        h("table", { class: "doc-table" },
          h("thead", {}, h("tr", {}, h("th", {}, "Road"), h("th", {}, "Rating"), h("th", {}, "Why"))),
          h("tbody", {}, ROADS.map((r) => h("tr", {}, h("td", { style: { color: shade(r.color), fontWeight: 700 } }, r.name), h("td", {}, p.roads[r.id].rating ? RATING[p.roads[r.id].rating].label : "–"), h("td", {}, p.roads[r.id].evidence || "–"))))
        ),
        h("h3", {}, "Priority roads"),
        b.pri.length
          ? b.pri.map((r) => h("div", { class: "doc-pri", style: { "--road": shade(r.color) } },
              h("div", { class: "doc-pri-head" }, h("b", {}, r.name), h("span", {}, `Impact ${LEVEL[p.roads[r.id].impact]?.label || "–"} · Effort ${LEVEL[p.roads[r.id].effort]?.label || "–"}`)),
              h("p", {}, dash(p.roads[r.id].why))))
          : h("p", { class: "doc-empty" }, "No priority roads chosen yet.")
      ),

      sec("04", "Design for depth",
        h("p", { class: "doc-note" }, b.pri.length ? `Designed for ${b.pri.map((r) => r.name).join(" and ")}. ` : "", "Each decision is placed in the segment of the study club where it happens."),
        h("table", { class: "doc-table segs" },
          h("thead", {}, h("tr", {}, h("th", {}, "Segment"), h("th", {}, "Design decisions"))),
          h("tbody", {},
            [...b.bySegment, ...(b.unplaced.length ? [{ seg: { name: "Not placed yet" }, items: b.unplaced }] : [])].map(({ seg, items }) =>
              h("tr", {}, h("th", {}, seg.name), h("td", {}, items.length ? h("ul", { class: "doc-list" }, items.map((d) => h("li", {}, h("span", { class: "doc-tag", style: { "--road": shade(ROAD[d.road].color) } }, ROAD[d.road].name), d.text))) : h("span", { class: "doc-empty" }, "–")))
            )
          )
        )
      ),

      sec("05", "Prove + sustain",
        h("table", { class: "doc-table kv" },
          h("tr", {}, h("th", {}, "What success looks like"), h("td", {}, dash(p.prove.success))),
          h("tr", {}, h("th", {}, "How we’ll measure it"), h("td", {}, b.measure ? h("b", {}, b.measure.name + ": ") : null, dash(p.prove.measureDetail)))
        ),
        h("h3", {}, "How we’ll reinforce it"),
        p.prove.actions.length
          ? h("table", { class: "doc-table" },
              h("thead", {}, h("tr", {}, h("th", {}, "Who follows up"), h("th", {}, "When"), h("th", {}, "With what"))),
              h("tbody", {}, p.prove.actions.map((a) => h("tr", {}, h("td", {}, a.owner || "–"), h("td", {}, fmtDate(a.when) || "–"), h("td", {}, a.what || "–")))))
          : h("p", { class: "doc-empty" }, "No reinforcement plan yet.")
      ),

      b.open.length
        ? h("section", { class: "doc-sec doc-open" },
            h("h2", {}, h("span", { class: "doc-num" }, "!"), "Open items before launch"),
            h("ul", { class: "doc-list" }, b.open.map((i) => h("li", {}, h("b", {}, i.step.name + ": "), i.text, i.level === "flag" ? h("span", { class: "doc-flag" }, " (to consider)") : null)))
          )
        : null,

      h("footer", { class: "doc-foot" }, h("p", {}, FRAMEWORK.closing[0], " ", h("b", {}, FRAMEWORK.closing[1])), h("span", {}, "The Study Club Depth Flow · Heartland Dental"))
    )
  );
}

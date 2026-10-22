// PROVE + SUSTAIN

function proveView(p) {
  const pr = p.prove;
  const up = (fn) => Store.update(p.id, (x) => fn(x.prove));
  const hasDest = filled(p.destination.what);
  const actions = pr.actions;

  return h("div", { class: "step-body" },
    h("div", { class: ["pinned-dest", !hasDest && "empty"] },
      icon("target", 22, "#5A96FF"),
      h("div", {}, h("div", { class: "eyebrow gold" }, "Your destination"), h("p", {}, hasDest ? destinationStatement(p, { blanks: false }) : "No destination statement yet. Success has nothing to tie back to.")),
      !hasDest && h("a", { class: "btn small ghost", href: `#/p/${p.id}/destination` }, "Define it")
    ),
    h("div", { class: "prove-grid" },
      h("section", { class: "prove-card" },
        icon("check", 30, "#4FD6A0"),
        h("h3", {}, "What does success look like?"),
        h("p", { class: "muted small" }, "Go back to the destination statement. What would we see in the office?"),
        field({ value: pr.success, rows: 5, placeholder: "Describe what someone walking into the office would see or hear, and how often.", onInput: (v) => up((x) => (x.success = v)) })
      ),
      h("section", { class: "prove-card" },
        icon("trend", 30, "#4FD6A0"),
        h("h3", {}, "How will we measure it?"),
        h("p", { class: "muted small" }, "Pick one signal beyond ratings: a behavior, a metric, or a follow-up check."),
        h("div", { class: "measure-types" },
          MEASURE_TYPES.map((m) => h("button", { class: ["measure-type", pr.measureType === m.id && "on"], onClick: () => up((x) => (x.measureType = x.measureType === m.id ? "" : m.id)) }, h("b", {}, m.name), h("span", { class: "small muted" }, m.hint)))
        ),
        field({ value: pr.measureDetail, rows: 3, placeholder: "What exactly will you look at, where does it come from, and when?", onInput: (v) => up((x) => (x.measureDetail = v)) })
      ),
      h("section", { class: "prove-card wide" },
        icon("people", 30, "#4FD6A0"),
        h("h3", {}, "How will we reinforce it?"),
        h("p", { class: "muted small" }, "Name who follows up, when, and with what, so it doesn’t end at the session."),
        h("div", { class: "actions-table" },
          actions.length ? h("div", { class: "at-head" }, h("span", {}, "Who follows up"), h("span", {}, "When"), h("span", {}, "With what"), h("span")) : null,
          actions.map((a) => {
            const ua = (fn) => up((x) => fn(x.actions.find((y) => y.id === a.id)));
            return h("div", { class: "at-row", key: a.id },
              h("input", { class: ["input sm", !filled(a.owner) && "missing"], value: a.owner, placeholder: "Owner (name or role)", onInput: (e) => ua((y) => (y.owner = e.target.value)) }),
              h("input", { class: ["input sm date", !filled(a.when) && "missing"], type: "date", value: a.when, onInput: (e) => ua((y) => (y.when = e.target.value)) }),
              h("input", { class: ["input sm", !filled(a.what) && "missing"], value: a.what, placeholder: "e.g. 30-day check-in call using the case review sheet", onInput: (e) => ua((y) => (y.what = e.target.value)) }),
              h("button", { class: "icon-btn subtle", "aria-label": "Remove", onClick: () => up((x) => (x.actions = x.actions.filter((y) => y.id !== a.id))) }, icon("trash", 15))
            );
          }),
          h("div", { class: "at-add" },
            h("button", { class: "btn ghost small", onClick: () => up((x) => x.actions.push({ id: uid(), owner: "", when: "", what: "" })) }, icon("plus", 14), "Add a follow-up"),
            !actions.length && p.sessionDate && h("button", { class: "chip", onClick: () => up((x) => x.actions.push({ id: uid(), owner: "", when: addDays(p.sessionDate, 30), what: "30-day follow-up check-in" })) }, icon("plus", 12), "30-day follow-up after the session")
          )
        )
      )
    ),
    outputCard(STEP.prove,
      h("p", { class: "output-text" }, actions.length ? `${actions.length} follow-up${actions.length === 1 ? "" : "s"}${actions.filter((a) => a.owner && a.when).length === actions.length ? ", each with an owner and a date" : ". Some still need an owner or date"}.` : "No reinforcement plan yet."),
      { iconName: "circleCheck" }
    )
  );
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

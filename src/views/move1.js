// MOVE 01 · Define the destination

const SHIFTS = [
  { id: "feel", label: "Feel", placeholder: "e.g. Confident raising cost with patients" },
  { id: "believe", label: "Believe", placeholder: "e.g. Patients want the full picture" },
  { id: "understand", label: "Understand", placeholder: "e.g. Why patients say “let me think about it”" },
  { id: "know", label: "Know", placeholder: "e.g. The three-step case conversation" },
  { id: "do", label: "Do", placeholder: "e.g. Present the full treatment plan in one visit, with options" },
];

function move1View(p) {
  const d = p.destination;
  const up = (fn) => Store.update(p.id, (x) => fn(x.destination));
  const q = (num, title, hint, body) =>
    h("section", { class: "q-card" }, h("div", { class: "q-num" }, num), h("h3", {}, title), h("p", { class: "muted small" }, hint), body);

  return h("div", { class: "step-body" },
    h("div", { class: "q-grid" },
      q("01", "What are we solving?", "The problem or gap this study club exists to close",
        field({ value: d.solving, rows: 4, placeholder: "What’s happening in offices today that shouldn’t be, or isn’t happening that should?", onInput: (v) => up((x) => (x.solving = v)) })),
      q("02", "Who are we solving it for?", "The specific audience, and what is true for them today",
        field({ value: d.solvingFor, rows: 4, placeholder: p.audience ? `${p.audience}: what’s true for them right now?` : "Which roles? What do they already do, believe, or struggle with?", onInput: (v) => up((x) => (x.solvingFor = v)) })),
      h("section", { class: "q-card wide" },
        h("div", { class: "q-num" }, "03"),
        h("h3", {}, "What must they feel, believe, understand, know, or do?"),
        h("p", { class: "muted small" }, "The shift we need to see when they leave. Fill in what applies. “Do” is required."),
        h("div", { class: "shift-grid" },
          SHIFTS.map((s) => h("label", { class: ["shift", s.id === "do" && "shift-do"] },
            h("span", { class: "shift-label" }, s.label, s.id === "do" && h("em", {}, "does the heavy lifting")),
            h("textarea", { class: "input", rows: 2, value: d.shift[s.id], placeholder: s.placeholder, onInput: (e) => up((x) => (x.shift[s.id] = e.target.value)) })
          ))
        )
      )
    ),
    outputCard(STEP.destination,
      h("div", { class: "dest-builder" },
        h("p", { class: "dest-madlib" },
          "“After this study club, ",
          h("input", { class: "blank blank-who", value: d.who, placeholder: "who", "aria-label": "Who", onInput: (e) => up((x) => (x.who = e.target.value)) }),
          " will ",
          h("input", { class: "blank blank-what", value: d.what, placeholder: "do what", "aria-label": "Do what", onInput: (e) => up((x) => (x.what = e.target.value)) }),
          " differently in their office, ",
          h("input", { class: "blank blank-when", value: d.when, placeholder: "by when", "aria-label": "By when", onInput: (e) => up((x) => (x.when = e.target.value)) }),
          ".”"
        ),
        h("div", { class: "dest-hints" },
          h("span", {}, h("b", { class: "c-who" }, "Who"), " A specific role, not “attendees”"),
          h("span", {}, h("b", { class: "c-what" }, "Do what"), " An action you could watch happen"),
          h("span", {}, h("b", { class: "c-when" }, "By when"), " e.g. within 30 days")
        ),
        !filled(d.what) && filled(d.shift.do) && h("button", { class: "link-btn", onClick: () => up((x) => (x.what = x.shift.do.trim().replace(/^[A-Z]/, (c) => c.toLowerCase()))) }, icon("arrowRight", 13), "Use your “do” answer as the behavior")
      )
    )
  );
}

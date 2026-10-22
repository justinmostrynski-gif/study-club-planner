// Project shell: header, glowing progress path, step content + depth check,
// and back/next navigation.

const STEP_VIEWS = {
  destination: () => move1View,
  roads: () => move2View,
  prioritize: () => move3View,
  design: () => move4View,
  prove: () => proveView,
};

function detailsModal(p) {
  return () => {
    const d = UI.draft;
    const set = (k) => (v) => (d[k] = v);
    return modalShell("Study club details",
      h("form", { class: "form-grid", onSubmit: (e) => { e.preventDefault(); Store.update(p.id, (x) => Object.assign(x, { title: (d.title || "").trim() || x.title, topic: (d.topic || "").trim(), audience: (d.audience || "").trim(), sessionDate: d.sessionDate || "", developer: (d.developer || "").trim() })); closeModal(); } },
        field({ label: "Study club title", value: d.title, multiline: false, onInput: set("title"), cls: "span-2" }),
        field({ label: "Topic", value: d.topic, multiline: false, onInput: set("topic") }),
        field({ label: "Audience", value: d.audience, multiline: false, onInput: set("audience") }),
        field({ label: "Session date", value: d.sessionDate, type: "date", multiline: false, onInput: set("sessionDate") }),
        field({ label: "Developer", value: d.developer, multiline: false, onInput: set("developer") }),
        h("div", { class: "modal-actions span-2" }, h("button", { type: "button", class: "btn ghost", onClick: closeModal }, "Cancel"), h("button", { class: "btn gold", type: "submit" }, "Save details"))
      )
    );
  };
}

function projectBar(p, rep) {
  return h("div", { class: "project-bar" },
    h("a", { href: "#/", class: "back-link" }, icon("arrowLeft", 15), "All study clubs"),
    h("div", { class: "pb-main" },
      h("div", {},
        h("h1", { class: "pb-title" }, p.title || "Untitled study club"),
        h("div", { class: "pb-meta" },
          p.topic && h("span", {}, p.topic),
          p.audience && h("span", {}, p.audience),
          h("span", {}, icon("calendar", 13), p.sessionDate ? `${fmtDate(p.sessionDate)} · ${daysLabel(rep.daysToSession)}` : "No session date"),
          p.developer && h("span", {}, icon("user", 13), p.developer),
          h("button", { class: "link-btn", onClick: () => openModal(detailsModal(p), { title: p.title, topic: p.topic, audience: p.audience, sessionDate: p.sessionDate, developer: p.developer }) }, icon("pencil", 13), "Edit details")
        )
      ),
      h("div", { class: "pb-actions" },
        healthRing(rep.health, 46),
        h("button", { class: "btn ghost small", onClick: () => Store.exportProject(p.id), title: "Download this study club as a file to share with your lead or a teammate" }, icon("download", 15), "Export file"),
        h("a", { class: "btn gold small", href: `#/p/${p.id}/blueprint` }, icon("file", 15), "Blueprint")
      )
    )
  );
}

function projectView(id, stepId) {
  const p = Store.get(id);
  if (!p) return notFoundView();
  if (!STEP[stepId] && stepId !== "blueprint") stepId = p.lastStep || "destination";
  if (p.lastStep !== stepId) Store.quietUpdate(p.id, (x) => (x.lastStep = stepId));
  const rep = projectReport(p);

  if (stepId === "blueprint") return blueprintView(p, rep);

  const step = STEP[stepId];
  const idx = STEPS.indexOf(step);
  const prev = STEPS[idx - 1];
  const next = STEPS[idx + 1];
  const stepRep = rep.steps[idx];

  return h("div", { class: "page" },
    appHeader("clubs"),
    h("div", { class: "project" },
      projectBar(p, rep),
      progressPath(p, rep, stepId),
      h("div", { class: "step-layout" },
        h("main", { class: "step-main" },
          earlierGapsBanner(p, stepId),
          stepHeader(step),
          whyBox(step),
          STEP_VIEWS[stepId]()(p, rep),
          ruleLine(step),
          h("div", { class: "step-nav" },
            prev ? h("a", { class: "btn ghost", href: `#/p/${p.id}/${prev.id}` }, icon("arrowLeft", 16), prev.name) : h("span"),
            next
              ? h("a", { class: "btn gold", href: `#/p/${p.id}/${next.id}` }, `Next: ${next.name}`, icon("arrowRight", 16))
              : h("a", { class: "btn gold", href: `#/p/${p.id}/blueprint` }, "View the Depth Design Blueprint", icon("arrowRight", 16))
          )
        ),
        h("div", { class: "step-side" }, depthCheckPanel(stepRep))
      )
    ),
    footer()
  );
}

function notFoundView() {
  return h("div", { class: "page" }, appHeader("clubs"),
    h("section", { class: "content center pad" }, h("h2", {}, "That study club isn’t in this browser."), h("p", { class: "muted" }, "It may have been deleted, or it lives in a teammate’s browser. Ask them to export the project file, then import it."), h("a", { class: "btn gold", href: "#/" }, "Back to study clubs")));
}

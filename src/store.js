// Data layer. Projects live in the browser's local storage and autosave on
// every change. Project files (.json) move work between people: developers
// export, a lead imports to see progress across the team.
//
// All reads and writes go through Store, so swapping local storage for a
// shared database later only touches this file.

const STORAGE_KEY = "studyClubDepthFlow.v1";
const FILE_APP_ID = "study-club-depth-flow";
const SCHEMA_VERSION = 1;

function blankProject(fields = {}) {
  const now = new Date().toISOString();
  return normalizeProject({
    id: uid(),
    createdAt: now,
    updatedAt: now,
    status: "active",
    lastStep: "destination",
    ...fields,
    stakeholders: {
      groups: DEFAULT_GROUPS.map((g) => ({ id: uid(), ...g })),
    },
  });
}

// Fills in any missing fields so older or hand-edited files always load.
function normalizeProject(p) {
  const s = (v) => (typeof v === "string" ? v : "");
  const out = {
    id: p.id || uid(),
    schema: SCHEMA_VERSION,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
    updatedBy: s(p.updatedBy),
    status: p.status === "archived" ? "archived" : "active",
    lastStep: STEP[p.lastStep] || p.lastStep === "blueprint" ? p.lastStep : "destination",
    title: s(p.title),
    topic: s(p.topic),
    audience: s(p.audience),
    sessionDate: s(p.sessionDate),
    developer: s(p.developer),
  };
  const d = p.destination || {};
  const shift = d.shift || {};
  out.destination = {
    solving: s(d.solving),
    solvingFor: s(d.solvingFor),
    shift: { feel: s(shift.feel), believe: s(shift.believe), understand: s(shift.understand), know: s(shift.know), do: s(shift.do) },
    who: s(d.who),
    what: s(d.what),
    when: s(d.when),
  };
  const st = p.stakeholders || {};
  out.stakeholders = {
    groups: (Array.isArray(st.groups) ? st.groups : DEFAULT_GROUPS.map((g) => ({ ...g }))).map((g) => ({
      id: g.id || uid(),
      name: s(g.name),
      description: s(g.description),
      required: !!g.required,
      contact: s(g.contact),
      status: INTERVIEW_STATUS.some((x) => x.id === g.status) ? g.status : "not_started",
      date: s(g.date),
    })),
    insights: Object.fromEntries(ROADS.map((r) => [r.id, s((st.insights || {})[r.id])])),
  };
  out.roads = Object.fromEntries(
    ROADS.map((r) => {
      const x = (p.roads || {})[r.id] || {};
      return [
        r.id,
        {
          rating: RATING[x.rating] ? x.rating : "",
          evidence: s(x.evidence),
          impact: LEVEL[x.impact] ? x.impact : "",
          effort: LEVEL[x.effort] ? x.effort : "",
          priority: !!x.priority,
          why: s(x.why),
        },
      ];
    })
  );
  const ds = p.design || {};
  out.design = {
    decisions: (Array.isArray(ds.decisions) ? ds.decisions : []).map((x) => ({
      id: x.id || uid(),
      road: ROAD[x.road] ? x.road : "meaning",
      text: s(x.text),
      segment: SEGMENT[x.segment] ? x.segment : "",
    })),
  };
  const pr = p.prove || {};
  out.prove = {
    success: s(pr.success),
    measureType: MEASURE_TYPES.some((m) => m.id === pr.measureType) ? pr.measureType : "",
    measureDetail: s(pr.measureDetail),
    actions: (Array.isArray(pr.actions) ? pr.actions : []).map((a) => ({ id: a.id || uid(), owner: s(a.owner), when: s(a.when), what: s(a.what) })),
  };
  return out;
}

const Store = {
  projects: [],
  settings: { userName: "" },
  saveState: "saved", // saved | saving | error
  saveError: "",
  lastSavedAt: null,
  listeners: [],

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.projects = (data.projects || []).map(normalizeProject);
        this.settings = { userName: "", ...(data.settings || {}) };
      }
      this.lastSavedAt = new Date();
    } catch (e) {
      this.saveState = "error";
      this.saveError = "Could not read saved work from this browser.";
      console.error(e);
    }
  },

  persistNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, projects: this.projects, settings: this.settings }));
      this.saveState = "saved";
      this.saveError = "";
      this.lastSavedAt = new Date();
    } catch (e) {
      this.saveState = "error";
      this.saveError = "This browser refused to save. Export your project file now so nothing is lost.";
      console.error(e);
    }
    this.emit();
  },

  touch() {
    this.saveState = "saving";
    this.persist();
    this.emit();
  },

  subscribe(fn) {
    this.listeners.push(fn);
  },
  emit() {
    this.listeners.forEach((fn) => fn());
  },

  active() {
    return this.projects.filter((p) => p.status === "active");
  },
  get(id) {
    return this.projects.find((p) => p.id === id);
  },

  create(fields) {
    const p = blankProject({ ...fields, updatedBy: this.settings.userName });
    this.projects.unshift(p);
    this.touch();
    return p;
  },

  // Mutate a project in place, then stamp and autosave it.
  update(id, mutate) {
    const p = this.get(id);
    if (!p) return;
    mutate(p);
    p.updatedAt = new Date().toISOString();
    p.updatedBy = this.settings.userName || p.updatedBy;
    this.touch();
  },

  // UI-only change (e.g. remembering the last step) that shouldn't count as an edit.
  quietUpdate(id, mutate) {
    const p = this.get(id);
    if (!p) return;
    mutate(p);
    this.persist();
  },

  remove(id) {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.touch();
  },

  duplicate(id) {
    const src = this.get(id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy = normalizeProject({ ...JSON.parse(JSON.stringify(src)), id: uid(), title: `${src.title} (copy)`, createdAt: now, updatedAt: now });
    this.projects.unshift(copy);
    this.touch();
    return copy;
  },

  setUserName(name) {
    this.settings.userName = name.trim();
    this.touch();
  },

  // ---- files ----
  exportProject(id) {
    const p = this.get(id);
    if (!p) return;
    downloadFile(`${fileSlug(p.title || "study-club")}.depthflow.json`, JSON.stringify({ app: FILE_APP_ID, kind: "project", version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), exportedBy: this.settings.userName, project: p }, null, 2), "application/json");
  },

  exportAll() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`study-club-depth-flow-backup-${stamp}.json`, JSON.stringify({ app: FILE_APP_ID, kind: "bundle", version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), exportedBy: this.settings.userName, projects: this.projects }, null, 2), "application/json");
  },

  // Newer copy wins, so re-importing a teammate's latest file updates it.
  async importFiles(fileList) {
    const result = { added: 0, updated: 0, skipped: 0, errors: [] };
    for (const file of Array.from(fileList)) {
      try {
        const data = JSON.parse(await file.text());
        if (data.app !== FILE_APP_ID) throw new Error("not a Study Club Depth Flow file");
        const incoming = data.kind === "bundle" ? data.projects || [] : [data.project];
        for (const raw of incoming) {
          const p = normalizeProject(raw);
          const existing = this.get(p.id);
          if (!existing) {
            this.projects.unshift(p);
            result.added++;
          } else if (p.updatedAt > existing.updatedAt) {
            Object.assign(existing, p);
            result.updated++;
          } else result.skipped++;
        }
      } catch (e) {
        result.errors.push(`${file.name}: ${e.message}`);
      }
    }
    this.touch();
    return result;
  },
};
Store.persist = debounce(() => Store.persistNow(), 400);

// Keep two open tabs in sync.
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    Store.load();
    Store.emit();
  }
});
window.addEventListener("beforeunload", () => {
  if (Store.saveState === "saving") Store.persist.flush();
});

function downloadFile(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fileSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "study-club";
}

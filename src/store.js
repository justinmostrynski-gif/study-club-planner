// Data layer. Two modes, same interface:
//
//   Hosted (opened from a web address): study clubs live in the shared team
//   database. Each edit is sent as a small change (see ops.js), and the app
//   checks for teammates' changes every few seconds.
//
//   Standalone (opened as a file from disk): study clubs live in this
//   browser's local storage.
//
// Project files (.json) work in both modes: export to share or back up,
// import to bring work in.

const STORAGE_KEY = "studyClubDepthFlow.v1";
const PREFS_KEY = "studyClubDepthFlow.prefs";
const FILE_APP_ID = "study-club-depth-flow";
const SCHEMA_VERSION = 1;
const HOSTED = location.protocol === "http:" || location.protocol === "https:";
const POLL_MS = 8000;

function blankProject(fields = {}) {
  const now = new Date().toISOString();
  return normalizeProject({
    id: uid(),
    createdAt: now,
    updatedAt: now,
    status: "active",
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
    createdBy: s(p.createdBy),
    status: p.status === "archived" ? "archived" : "active",
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
      return [r.id, { rating: RATING[x.rating] ? x.rating : "", evidence: s(x.evidence), impact: LEVEL[x.impact] ? x.impact : "", effort: LEVEL[x.effort] ? x.effort : "", priority: !!x.priority, why: s(x.why) }];
    })
  );
  const ds = p.design || {};
  out.design = {
    decisions: (Array.isArray(ds.decisions) ? ds.decisions : []).map((x) => ({ id: x.id || uid(), road: ROAD[x.road] ? x.road : "meaning", text: s(x.text), segment: SEGMENT[x.segment] ? x.segment : "" })),
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

const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------- hosted: talking to the team server ----------
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (res.status === 401) {
    // Passcode cookie expired or was cleared: back to the passcode screen.
    location.reload();
    throw new Error("Signed out");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Server error ${res.status}`), { status: res.status });
  return data;
}

const Store = {
  hosted: HOSTED,
  ready: !HOSTED,
  loadError: "",
  projects: [],
  settings: { userName: "" },
  lastStep: {}, // per-person, never synced: where *you* left off
  saveState: "saved", // saved | saving | offline | error
  saveError: "",
  lastSavedAt: null,
  lastSyncedAt: null,
  listeners: [],

  // hosted-only bookkeeping
  versions: {}, // id -> server version
  pending: {}, // id -> ops not yet sent
  inflight: {}, // id -> ops sent, awaiting reply
  creating: new Set(),

  // ---- startup ----
  async load() {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      this.settings = { userName: "", ...(prefs.settings || {}) };
      this.lastStep = prefs.lastStep || {};
    } catch (e) {}
    if (!HOSTED) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          this.projects = (data.projects || []).map(normalizeProject);
          if (data.settings && !this.settings.userName) this.settings.userName = data.settings.userName || "";
          (data.projects || []).forEach((p) => { if (p.lastStep && !this.lastStep[p.id]) this.lastStep[p.id] = p.lastStep; });
        }
        this.lastSavedAt = new Date();
      } catch (e) {
        this.saveState = "error";
        this.saveError = "Could not read saved work from this browser.";
      }
      return;
    }
    try {
      await this.pull();
      this.ready = true;
      this.lastSavedAt = new Date();
    } catch (e) {
      this.loadError = e.message;
    }
    this.emit();
    setInterval(() => this.pull().catch(() => {}), POLL_MS);
    window.addEventListener("focus", () => this.pull().catch(() => {}));
  },

  // Fetch everyone's latest. Projects with unsent local edits keep the local
  // copy until those edits land.
  async pull() {
    const { projects } = await api("GET", "/api/projects");
    const seen = new Set();
    let changed = false;
    for (const row of projects) {
      seen.add(row.id);
      if (this.pending[row.id]?.length || this.inflight[row.id] || this.creating.has(row.id)) continue;
      if (this.versions[row.id] === row.version) continue;
      this.versions[row.id] = row.version;
      const p = normalizeProject(row.data);
      const i = this.projects.findIndex((x) => x.id === p.id);
      if (i >= 0) this.projects[i] = p;
      else this.projects.push(p);
      changed = true;
    }
    const before = this.projects.length;
    this.projects = this.projects.filter((p) => seen.has(p.id) || this.creating.has(p.id));
    if (this.projects.length !== before) changed = true;
    this.projects.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    this.lastSyncedAt = new Date();
    if (this.saveState === "offline") this.saveState = "saved";
    if (changed) this.emit();
  },

  // Send queued edits for every project, one request per project.
  async flush() {
    for (const id of Object.keys(this.pending)) {
      if (!this.pending[id].length || this.inflight[id] || this.creating.has(id)) continue;
      const ops = compactOps(this.pending[id]);
      this.pending[id] = [];
      this.inflight[id] = ops;
      try {
        const res = await api("PATCH", `/api/projects/${encodeURIComponent(id)}`, { ops, actor: this.settings.userName });
        // Adopt the merged server copy, then replay anything typed meanwhile.
        const merged = normalizeProject(res.data);
        applyOps(merged, this.pending[id] || []);
        const i = this.projects.findIndex((x) => x.id === id);
        if (i >= 0) this.projects[i] = merged;
        this.versions[id] = res.version;
        delete this.inflight[id];
      } catch (e) {
        delete this.inflight[id];
        this.pending[id] = [...ops, ...(this.pending[id] || [])];
        if (e.status === 404) {
          delete this.pending[id];
          toast("That study club was deleted by a teammate.", "error");
          this.projects = this.projects.filter((p) => p.id !== id);
        } else {
          this.saveState = "offline";
          this.saveError = "Can’t reach the team server. Your changes are kept here and will be sent when the connection is back.";
          this.emit();
          setTimeout(() => this.flush(), 5000);
          return;
        }
      }
    }
    const anyLeft = Object.values(this.pending).some((o) => o.length) || Object.keys(this.inflight).length;
    if (!anyLeft) {
      this.saveState = "saved";
      this.saveError = "";
      this.lastSavedAt = new Date();
    }
    this.emit();
  },

  // ---- standalone: local storage ----
  persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, projects: this.projects }));
      this.saveState = "saved";
      this.saveError = "";
      this.lastSavedAt = new Date();
    } catch (e) {
      this.saveState = "error";
      this.saveError = "This browser refused to save. Export your project file now so nothing is lost.";
    }
    this.emit();
  },

  savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ settings: this.settings, lastStep: this.lastStep }));
    } catch (e) {}
  },

  // Something changed: queue it and save soon.
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

  // ---- writes ----
  create(fields) {
    const p = blankProject({ ...fields, createdBy: this.settings.userName, updatedBy: this.settings.userName });
    this.projects.unshift(p);
    if (HOSTED) this.sendNew(p);
    else this.touch();
    return p;
  },

  async sendNew(p, { replace = false } = {}) {
    this.creating.add(p.id);
    this.saveState = "saving";
    this.emit();
    try {
      const res = await api(replace ? "PUT" : "POST", replace ? `/api/projects/${encodeURIComponent(p.id)}` : "/api/projects", { project: p, actor: this.settings.userName });
      this.versions[p.id] = res.version;
      this.creating.delete(p.id);
      // Edits made while it was being created are still queued; send them now.
      this.flush();
    } catch (e) {
      this.creating.delete(p.id);
      this.saveState = "offline";
      this.saveError = "Couldn’t save the new study club to the team server. Retrying…";
      this.emit();
      setTimeout(() => this.sendNew(p, { replace }), 5000);
    }
  },

  // Mutate a project, then stamp and save it.
  update(id, mutate) {
    const p = this.get(id);
    if (!p) return;
    const before = HOSTED ? clone(p) : null;
    mutate(p);
    p.updatedAt = new Date().toISOString();
    p.updatedBy = this.settings.userName || p.updatedBy;
    if (HOSTED) {
      const ops = diffOps(before, p);
      (this.pending[id] = this.pending[id] || []).push(...ops);
    }
    this.touch();
  },

  setLastStep(id, step) {
    if (this.lastStep[id] === step) return;
    this.lastStep[id] = step;
    this.savePrefs();
  },

  remove(id) {
    this.projects = this.projects.filter((p) => p.id !== id);
    delete this.pending[id];
    if (HOSTED) {
      api("DELETE", `/api/projects/${encodeURIComponent(id)}`, { actor: this.settings.userName }).catch((e) => toast("Couldn’t delete on the team server: " + e.message, "error"));
      this.emit();
    } else this.touch();
  },

  duplicate(id) {
    const src = this.get(id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy = normalizeProject({ ...clone(src), id: uid(), title: `${src.title} (copy)`, createdAt: now, updatedAt: now, createdBy: this.settings.userName, updatedBy: this.settings.userName });
    this.projects.unshift(copy);
    if (HOSTED) this.sendNew(copy);
    else this.touch();
    return copy;
  },

  setUserName(name) {
    this.settings.userName = name.trim();
    this.savePrefs();
    this.emit();
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
            if (HOSTED) this.sendNew(p);
            result.added++;
          } else if (p.updatedAt > existing.updatedAt) {
            Object.assign(existing, p);
            if (HOSTED) {
              delete this.pending[p.id];
              this.sendNew(existing, { replace: true });
            }
            result.updated++;
          } else result.skipped++;
        }
      } catch (e) {
        result.errors.push(`${file.name}: ${e.message}`);
      }
    }
    if (!HOSTED) this.touch();
    else this.emit();
    return result;
  },
};

Store.persist = debounce(() => (HOSTED ? Store.flush() : Store.persistLocal()), HOSTED ? 700 : 400);

if (!HOSTED) {
  // Keep two open tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      Store.load();
      Store.emit();
    }
  });
}
window.addEventListener("beforeunload", (e) => {
  if (Store.saveState === "saving") Store.persist.flush();
  if (HOSTED && (Object.values(Store.pending).some((o) => o.length) || Object.keys(Store.inflight).length)) {
    e.preventDefault();
    e.returnValue = "";
  }
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

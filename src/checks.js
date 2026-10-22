// Depth checks: is each study club following the process, engaging the right
// people, and producing output that is actually deep? These power the per-step
// "Depth check" panel, the progress path, earlier-step warnings, and the team
// progress dashboard.
//
// Each check is one of:
//   ok   – passed
//   gap  – required for the step to be complete
//   flag – a depth warning: doesn't block, but pushes the developer to think harder

const UNDERSTANDING_VERBS = /^(to\s+)?(understand|know|learn|be aware|become aware|appreciate|recognize|realize|feel|believe|see the value|value|grasp|comprehend|be familiar|be comfortable|be confident|think about|consider|explore|discover|gain|hear|be exposed|be introduced|remember)\b/i;
const VAGUE_WHO = /^(the\s+)?(attendees|participants|everyone|people|they|them|learners|all|audience|the audience|staff|teams?)\.?$/i;
const TIMEFRAME = /\d|day|week|month|quarter|\bq[1-4]\b|year|january|february|march|april|may|june|july|august|september|october|november|december|end of|within|next|before|after|by\s/i;
const RATING_ONLY = /survey|rating|satisf|smile sheet|evaluation|eval\b|feedback form|nps|net promoter|reaction/i;

const filled = (v, min = 1) => (v || "").trim().length >= min;

function destinationStatement(p, { blanks = true } = {}) {
  const d = p.destination;
  const b = (v, label) => (filled(v) ? v.trim().replace(/[.\s]+$/, "") : blanks ? `[${label}]` : "");
  return `After this study club, ${b(d.who, "who")} will ${b(d.what, "do what")} differently in their office, ${b(d.when, "by when")}.`;
}

function checkDestination(p) {
  const d = p.destination;
  const items = [];
  const add = (level, text) => items.push({ level, text });
  filled(d.solving, 10) ? add("ok", "The problem is named") : add("gap", "Name the problem or gap this study club exists to close.");
  filled(d.solvingFor, 5) ? add("ok", "The audience is described") : add("gap", "Describe who you’re solving it for, and what’s true for them today.");
  filled(d.shift.do, 5) ? add("ok", "The “do” shift is named") : add("gap", "Answer the “do” question. It does the heavy lifting.");
  const shiftCount = ["feel", "believe", "understand", "know"].filter((k) => filled(d.shift[k])).length;
  if (filled(d.shift.do) && shiftCount === 0) add("flag", "Only “do” is filled in. What must they feel or believe first for the behavior to stick?");

  if (!filled(d.who)) add("gap", "Your destination statement needs a who.");
  else if (VAGUE_WHO.test(d.who.trim())) add("flag", `“${d.who.trim()}” is broad. Which role, exactly? Doctors, hygienists, office managers?`);
  else add("ok", "The destination names a specific who");

  if (!filled(d.what)) add("gap", "You haven’t named the behavior yet.");
  else if (UNDERSTANDING_VERBS.test(d.what.trim())) add("flag", "Your destination describes understanding, not a behavior. What would you actually see them do?");
  else if (d.what.trim().split(/\s+/).length < 3) add("flag", "The behavior is very short. Could someone watching the office tell whether it happened?");
  else add("ok", "The destination names an observable behavior");

  if (!filled(d.when)) add("gap", "Add a by-when. Without one, there is no point to check back.");
  else if (!TIMEFRAME.test(d.when)) add("flag", "The by-when is vague. Try something like “within 30 days.”");
  else add("ok", "The destination has a timeframe");
  return items;
}

function checkRoads(p) {
  const items = [];
  const add = (level, text) => items.push({ level, text });
  const groups = p.stakeholders.groups;
  const required = groups.filter((g) => g.required);
  const done = groups.filter((g) => g.status === "done");
  required.forEach((g) => {
    if (g.status === "done") add("ok", `${g.name} interviewed`);
    else add("gap", `Interview your ${g.name.toLowerCase()}${g.status === "scheduled" ? " (scheduled)" : ""}.`);
  });
  if (done.length < 3) add("gap", `Talk to at least three stakeholders. ${done.length} of 3 interviewed so far.`);
  groups.forEach((g) => {
    if (g.status === "done" && !filled(g.contact)) add("flag", `Who did you talk to in “${g.name}”? Add a name so others can follow up.`);
  });
  const missing = ROADS.filter((r) => !filled(p.stakeholders.insights[r.id], 15));
  if (missing.length === 0) add("ok", "Insights captured for all five roads");
  else add("gap", `Capture what you heard for ${missing.map((r) => r.name).join(", ")}.`);
  if (done.length === 0 && ROADS.some((r) => filled(p.stakeholders.insights[r.id]))) add("flag", "You have insights but no completed interviews. Ask before we build, not after.");
  return items;
}

function checkPrioritize(p) {
  const items = [];
  const add = (level, text) => items.push({ level, text });
  const unrated = ROADS.filter((r) => !p.roads[r.id].rating);
  if (unrated.length) add("gap", `Rate ${unrated.map((r) => r.name).join(", ")}.`);
  else add("ok", "All five roads rated");
  const rated = ROADS.filter((r) => p.roads[r.id].rating);
  const noEvidence = rated.filter((r) => !filled(p.stakeholders.insights[r.id], 15) && !filled(p.roads[r.id].evidence, 10));
  if (noEvidence.length) add("flag", `${noEvidence.map((r) => r.name).join(", ")}: rated without stakeholder evidence. What did you hear?`);
  const open = ROADS.filter((r) => ["partial", "missing"].includes(p.roads[r.id].rating));
  if (rated.length === 5 && open.length === 0) add("flag", "Every road is strong. Then what is this study club for? Re-check with your stakeholders.");
  const pri = ROADS.filter((r) => p.roads[r.id].priority);
  if (pri.length === 0) add("gap", "Choose one or two priority roads.");
  else if (pri.length > 2) add("gap", "Pick one or two. Not five.");
  else add("ok", `${pri.length} priority road${pri.length > 1 ? "s" : ""} chosen`);
  pri.forEach((r) => {
    const x = p.roads[r.id];
    if (x.rating === "strong") add("flag", `${r.name} is rated Strong. A strong road rarely needs to be a priority.`);
    if (!x.impact || !x.effort) add("gap", `Rate impact and effort for ${r.name}.`);
    if (!filled(x.why, 10)) add("gap", `Say why ${r.name} is a priority.`);
  });
  const missingNotChosen = ROADS.filter((r) => p.roads[r.id].rating === "missing" && !p.roads[r.id].priority && p.roads[r.id].impact === "high");
  missingNotChosen.forEach((r) => add("flag", `${r.name} is missing and high impact, but not a priority. Is that on purpose?`));
  return items;
}

function checkDesign(p) {
  const items = [];
  const add = (level, text) => items.push({ level, text });
  const pri = ROADS.filter((r) => p.roads[r.id].priority);
  if (!pri.length) {
    add("gap", "Choose priority roads in Move 03 first.");
    return items;
  }
  const decisions = p.design.decisions.filter((d) => filled(d.text));
  pri.forEach((r) => {
    const n = decisions.filter((d) => d.road === r.id).length;
    n ? add("ok", `${r.name} has ${n} design decision${n > 1 ? "s" : ""}`) : add("gap", `Add at least one design decision for ${r.name}.`);
  });
  const unmapped = decisions.filter((d) => !d.segment);
  if (decisions.length && !unmapped.length) add("ok", "Every decision is placed in the study club");
  if (unmapped.length) add("gap", `Place ${unmapped.length} decision${unmapped.length > 1 ? "s" : ""} in a segment of the study club.`);
  const outsideCore = decisions.filter((d) => d.segment && d.segment !== "core");
  if (decisions.length >= 2 && decisions.every((d) => d.segment === "core")) add("flag", "Everything sits in core content. Depth usually lives in pre-work, practice, and follow-up too.");
  else if (decisions.length && outsideCore.length) add("ok", "Design reaches beyond the core content");
  const offPriority = decisions.filter((d) => !p.roads[d.road].priority);
  if (offPriority.length) add("flag", `${offPriority.length} decision${offPriority.length > 1 ? "s target roads" : " targets a road"} you didn’t prioritize. Prioritize few.`);
  const thin = decisions.filter((d) => d.text.trim().split(/\s+/).length < 5);
  if (thin.length) add("flag", "Some decisions are very short. Make each one specific enough that someone else could build it.");
  return items;
}

function checkProve(p) {
  const items = [];
  const add = (level, text) => items.push({ level, text });
  const pr = p.prove;
  filled(pr.success, 15) ? add("ok", "Success is described") : add("gap", "Describe what success looks like in the office.");
  if (filled(pr.success) && !filled(p.destination.what)) add("flag", "Success should tie back to the destination statement, which isn’t written yet.");
  if (!pr.measureType || !filled(pr.measureDetail, 8)) add("gap", "Pick one signal beyond ratings, and say how you’ll measure it.");
  else if (RATING_ONLY.test(pr.measureDetail) && !/observ|metric|track|report|check|audit|count|schedule|chart|data/i.test(pr.measureDetail)) add("flag", "That sounds like a rating or survey. What signal shows the behavior happened?");
  else add("ok", "There is a signal beyond ratings");
  const actions = pr.actions.filter((a) => filled(a.what) || filled(a.owner) || filled(a.when));
  if (!actions.length) add("gap", "Name who follows up, when, and with what.");
  actions.forEach((a, i) => {
    const label = filled(a.what) ? `“${a.what.trim().slice(0, 40)}”` : `Follow-up ${i + 1}`;
    const missing = [!filled(a.owner) && "an owner", !filled(a.when) && "a date", !filled(a.what) && "what happens"].filter(Boolean);
    if (missing.length) add("gap", `${label} needs ${missing.join(" and ")}.`);
  });
  if (actions.length && actions.every((a) => filled(a.owner) && filled(a.when) && filled(a.what))) add("ok", "Every follow-up has an owner and a date");
  if (p.sessionDate && actions.length && actions.every((a) => a.when && a.when <= p.sessionDate)) add("flag", "Every follow-up happens on or before the session. Who checks in after it?");
  return items;
}

const STEP_CHECKS = { destination: checkDestination, roads: checkRoads, prioritize: checkPrioritize, design: checkDesign, prove: checkProve };

// Has the developer touched this step at all?
function stepStarted(p, stepId) {
  switch (stepId) {
    case "destination": {
      const d = p.destination;
      return [d.solving, d.solvingFor, d.who, d.what, d.when, ...Object.values(d.shift)].some((v) => filled(v));
    }
    case "roads":
      return p.stakeholders.groups.some((g) => g.status !== "not_started" || filled(g.contact)) || ROADS.some((r) => filled(p.stakeholders.insights[r.id]));
    case "prioritize":
      return ROADS.some((r) => p.roads[r.id].rating || p.roads[r.id].priority);
    case "design":
      return p.design.decisions.length > 0;
    case "prove":
      return filled(p.prove.success) || !!p.prove.measureType || p.prove.actions.length > 0;
  }
  return false;
}

function stepReport(p, stepId) {
  const items = STEP_CHECKS[stepId](p);
  const gaps = items.filter((i) => i.level === "gap");
  const flags = items.filter((i) => i.level === "flag");
  const started = stepStarted(p, stepId);
  const status = !started ? "empty" : gaps.length ? "progress" : "complete";
  return { stepId, items, gaps, flags, status };
}

function projectReport(p) {
  const steps = STEPS.map((s) => stepReport(p, s.id));
  const all = steps.flatMap((s) => s.items);
  const ok = all.filter((i) => i.level === "ok").length;
  const flags = all.filter((i) => i.level === "flag").length;
  const gaps = all.filter((i) => i.level === "gap").length;
  // Flags count half: they don't block, but they cost depth.
  const health = Math.round((100 * ok) / Math.max(1, ok + gaps + flags * 0.5));
  const complete = steps.filter((s) => s.status === "complete").length;
  const current = steps.find((s) => s.status !== "complete");
  const daysToSession = p.sessionDate ? Math.ceil((new Date(p.sessionDate + "T12:00:00") - new Date()) / 86400000) : null;
  // "At risk": the session is close and the design isn't done.
  const atRisk = daysToSession != null && daysToSession >= 0 && ((daysToSession <= 14 && complete < 5) || (daysToSession <= 30 && complete < 3));
  return { steps, ok, flags, gaps, health, complete, currentStep: current ? current.stepId : null, daysToSession, atRisk };
}

// Earlier steps that still have gaps, for the "you skipped something" banner.
function earlierGaps(p, stepId) {
  const idx = STEPS.findIndex((s) => s.id === stepId);
  return STEPS.slice(0, idx)
    .map((s) => ({ step: s, report: stepReport(p, s.id) }))
    .filter((x) => x.report.gaps.length);
}

// The Study Club Depth Flow. Single source of truth for framework language,
// road colors and icons, steps, and starting design moves. Every screen, the
// blueprint export, and (later) the AI prompts read from here.

const FRAMEWORK = {
  name: "The Study Club Depth Flow",
  coreIdea: "A great topic does not guarantee depth.",
  coverage: "Coverage means attendees heard it.",
  depth: "Depth means attendees do something differently in their office.",
  closing: ["Design delivers the content.", "Galvanization creates the depth around it."],
};

const ROADS = [
  {
    id: "meaning",
    name: "Meaning",
    lens: "Do they care?",
    color: "#5A96FF",
    icon: "heart",
    ask: "Why does {topic} matter to doctors and teams right now?",
    ifMissing: "Open with a real patient case or story that makes the stakes personal",
    startingPoints: [
      "Open with a real patient case where this went right, or went wrong",
      "Have a doctor share why this changed how they practice",
      "Show the cost of not doing it: to the patient, the team, the office",
      "Connect the topic to something attendees already care about",
    ],
  },
  {
    id: "readiness",
    name: "Readiness",
    lens: "Do they believe and feel prepared?",
    color: "#8CBEFF",
    icon: "brain",
    ask: "What pushback or skepticism will we hear in the room about {topic}?",
    ifMissing: "Use pre-work or a self-check, and name the objection out loud early",
    startingPoints: [
      "Send a short self-check before the session so attendees see their own gap",
      "Name the most common objection out loud in the first ten minutes",
      "Show evidence from offices like theirs, not ideal conditions",
      "Give a small, low-risk first step so it feels doable",
    ],
  },
  {
    id: "capability",
    name: "Capability",
    lens: "Do they know what to do?",
    color: "#3CC8BE",
    icon: "tools",
    ask: "Where do people get stuck when they try {topic} in the office?",
    ifMissing: "Shift from lecture to practice, case walk-throughs, and application",
    startingPoints: [
      "Replace a lecture block with a case walk-through attendees work in pairs",
      "Practice the exact moment people get stuck, with real language",
      "Model it live, then have attendees try it and get feedback",
      "Use a simple step-by-step job aid they practice with in the room",
    ],
  },
  {
    id: "influence",
    name: "Influence",
    lens: "Are others modeling and reinforcing it?",
    color: "#CAA977",
    icon: "people",
    ask: "Who is already doing {topic} well that we could feature?",
    ifMissing: "Feature peers and doctors who are already doing it well",
    startingPoints: [
      "Feature a peer doctor or team already doing it, in their own words",
      "Build a short panel or interview with an office that made it work",
      "Pair attendees with a peer who can be a go-to after the session",
      "Show what leaders will notice and recognize when they see it",
    ],
  },
  {
    id: "enablement",
    name: "Enablement",
    lens: "Can they act and sustain it?",
    color: "#4FD6A0",
    icon: "unlock",
    ask: "What gets in the way of {topic} on Monday morning?",
    ifMissing: "Send them home with tools, a 30-day follow-up, and leader talking points",
    startingPoints: [
      "Send attendees home with a ready-to-use tool, script, or checklist",
      "Schedule a 30-day follow-up check-in before the session ends",
      "Give field leaders talking points to reinforce it in office visits",
      "Remove one Monday-morning barrier: a template, a system setting, a huddle slot",
    ],
  },
];
const ROAD = Object.fromEntries(ROADS.map((r) => [r.id, r]));

const RATINGS = [
  { id: "strong", label: "Strong", bar: 0.92 },
  { id: "partial", label: "Partial", bar: 0.55 },
  { id: "missing", label: "Missing", bar: 0.2 },
];
const RATING = Object.fromEntries(RATINGS.map((r) => [r.id, r]));

const LEVELS = [
  { id: "high", label: "High", score: 3 },
  { id: "medium", label: "Med", score: 2 },
  { id: "low", label: "Low", score: 1 },
];
const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

const STEPS = [
  {
    id: "destination",
    num: "01",
    eyebrow: "Move 01 · Define the destination",
    name: "Define the destination",
    headline: "Start with the behavior, not the topic",
    summary: "Name the behavior the study club should change",
    output: "Destination statement",
    rule: "If we cannot name the behavior, we are not ready to design.",
    why: "Before anyone opens PowerPoint, answer three questions. The third one does the heavy lifting, because it forces us past “they will understand X” into what they will actually do. The output is one sentence, and that sentence becomes the anchor for every conversation and every design choice that follows.",
  },
  {
    id: "roads",
    num: "02",
    eyebrow: "Move 02 · Ask the roads",
    name: "Ask the roads",
    headline: "The five roads become our stakeholder interview guide",
    summary: "Use the five roads to interview key stakeholders",
    output: "Stakeholder insights",
    rule: "Ask before we build, not after.",
    why: "This is the stakeholder step. We are not asking for feedback on a finished deck. We are asking stakeholders to help us diagnose before we design anything. Ask the same five questions in every conversation so you can see where answers line up and where they don’t.",
  },
  {
    id: "prioritize",
    num: "03",
    eyebrow: "Move 03 · Prioritize few",
    name: "Prioritize few",
    headline: "Which roads are strong, and which roads are missing?",
    summary: "Find which roads are strong and which are missing",
    output: "1–2 priority roads",
    rule: "Pick one or two. Not five.",
    why: "Map what you heard against the five roads. Some roads will already be strong: a topic doctors care about doesn’t need more Meaning. The point is to find the one or two that are missing and design for those, rather than trying to fix everything in one study club.",
  },
  {
    id: "design",
    num: "04",
    eyebrow: "Move 04 · Design for depth",
    name: "Design for depth",
    headline: "Each missing road becomes a design decision",
    summary: "Turn each priority road into a content decision",
    output: "Depth design plan",
    rule: "Same topic. Different design, depending on what is missing.",
    why: "This is where the framework turns into content. For each priority road, here is the kind of design move it calls for. These are starting points, not a checklist. Two study clubs on the same topic could look very different depending on which roads were missing for that audience.",
  },
  {
    id: "prove",
    num: "✓",
    eyebrow: "Prove + sustain",
    name: "Prove + sustain",
    headline: "Before we launch, we answer three more questions",
    summary: "Decide how we measure and reinforce it",
    output: "Reinforcement plan",
    rule: "Design delivers the content. Galvanization creates the depth around it.",
    why: "Close the loop. Success should tie straight back to the destination statement from Move 01. Measurement needs at least one signal beyond the session survey. And reinforcement needs a name and a date attached, or it won’t happen.",
  },
];
const STEP = Object.fromEntries(STEPS.map((s) => [s.id, s]));

const SEGMENTS = [
  { id: "prework", name: "Pre-work" },
  { id: "opening", name: "Opening" },
  { id: "core", name: "Core content" },
  { id: "practice", name: "Practice" },
  { id: "close", name: "Close" },
  { id: "followup", name: "Follow-up" },
];
const SEGMENT = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));

const MEASURE_TYPES = [
  { id: "behavior", name: "A behavior", hint: "Something you can observe people doing in the office" },
  { id: "metric", name: "A metric", hint: "A number that moves if the behavior changes" },
  { id: "followup", name: "A follow-up check", hint: "A planned check-in that asks what they actually did" },
];

// Every project starts with these three required partners.
const DEFAULT_GROUPS = [
  { name: "Operational partner", description: "What happens in offices day to day", required: true },
  { name: "Learning & development partner", description: "How people learn, and what lands in the room", required: true },
  { name: "Cross-departmental SME partner", description: "Subject expertise from across the organization", required: true },
];

// One-click extras, from the deck's "Who we ask".
const SUGGESTED_GROUPS = [
  { name: "Presenting doctors", description: "Clinical expertise" },
  { name: "Field leaders", description: "What they see in offices" },
  { name: "Facilitators", description: "What lands in the room" },
  { name: "Past attendees", description: "What stuck, what didn’t" },
];

const INTERVIEW_STATUS = [
  { id: "not_started", label: "Not started" },
  { id: "scheduled", label: "Scheduled" },
  { id: "done", label: "Interviewed" },
];

function roadQuestion(road, topic) {
  const t = (topic || "").trim();
  return road.ask.replace("{topic}", t ? t : "this topic");
}

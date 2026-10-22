# Study Club Depth Flow

A planner that walks Heartland Dental training developers from a study club concept to a well-thought-out, stakeholder-informed design, using **the Study Club Depth Flow**.

> A great topic does not guarantee depth. Coverage means attendees heard it. Depth means attendees do something differently in their office.

There are two ways to use it. Both run the same app:

- **Hosted (recommended):** one shared planner at a web address, behind a team passcode. Everyone's study clubs are in one place, edits save for the whole team, and Team progress updates live. It runs free on Cloudflare. See [Put it online](#put-it-online-cloudflare-free).
- **Standalone:** a single HTML file you double-click. No server and no account. Work saves in that browser only.

---

## Put it online (Cloudflare, free)

You do this once, in about 10 minutes, all in a web browser. After that, every update pushed to GitHub goes live automatically.

### 1. Create a free Cloudflare account
Go to https://dash.cloudflare.com/sign-up and sign up with your email. You don't need a credit card.

### 2. Connect this GitHub repo
1. In the Cloudflare dashboard, open **Compute (Workers)** › **Workers & Pages**, then click **Create**.
2. Choose **Import a repository** (sometimes labeled "Connect to Git"). When asked, sign in to GitHub and allow Cloudflare to see **study-club-planner**.
3. Pick the **study-club-planner** repository. On the settings screen:
   - **Project name:** `study-club-planner`
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy` (usually filled in already)
   - Leave everything else as it is.
4. Click **Deploy**. The first deploy takes a minute or two. It also creates the team database automatically.

### 3. Set the team passcode
1. Open the new **study-club-planner** Worker, then **Settings** › **Variables and Secrets** › **Add**.
2. Type: **Secret**. Name: `TEAM_PASSCODE`. Value: your team passcode.
3. Click **Deploy** (or **Save and deploy**).

The passcode is stored privately in Cloudflare, never in the code. To change it later, edit the secret. Everyone will need to enter the new one.

### 4. Open it
Your planner's address is shown on the Worker's page, something like `https://study-club-planner.<your-account>.workers.dev`. Open it, enter the passcode, and add your name. Then share the link and passcode with your developers.

### Check that it's live
- In Cloudflare, open the **study-club-planner** Worker › **Deployments**. The latest one should say **Success**.
- On GitHub, each commit gets a green check (✓) once Cloudflare has deployed it.
- Open your planner's address. You should see the **GOING DEEPER** passcode screen. If you see "Almost there," the `TEAM_PASSCODE` secret isn't set yet.

### If the first deploy says something about the database
Cloudflare normally creates the database on its own. If the deploy log shows an error about `d1_databases` or `database_id`:
1. In Cloudflare open **Storage & Databases** › **D1 SQL Database** › **Create**, and name it `study-club-planner-db`.
2. Copy its **Database ID** and add it to `wrangler.jsonc`, under `"database_name"`: `"database_id": "paste-it-here"`. Or send the ID to whoever maintains the code.
3. Deploy again (Worker › **Deployments** › **Retry**, or push any change).

### Moving work in from the standalone file
On the standalone file, export each project file (or use **Back up everything** on Team progress). In the hosted planner, open **Team progress** › **Import teammates' files** and select them.

---

## Using the standalone file

The standalone app is a **single HTML file**. There is nothing to install and no server or account. Double-click it and it opens in your browser.

---

## For developers using the planner

### Open it
1. Download `Study-Club-Depth-Flow.html` (from the `dist` folder, or from the zip you were sent).
2. Save it somewhere you'll find it again, for example `Documents\Study Club Planner`.
3. Double-click it. It opens in Microsoft Edge or Google Chrome.
   - If Windows asks how to open it, choose **Microsoft Edge**.
   - Tip: bookmark the page so you can come back to it in one click.

### Use it
1. Click **New study club** and fill in the basics.
2. Work through the moves in order. The glowing path at the top shows where you are:
   - **01 Define the destination**: name the behavior, not the topic.
   - **02 Ask the roads**: interview your three partners (Operational, L&D, Cross-departmental SME) using the five road questions.
   - **03 Prioritize few**: rate each road Strong / Partial / Missing, weigh impact and effort, and pick one or two.
   - **04 Design for depth**: turn each priority road into specific design decisions and place them in the study club.
   - **✓ Prove + sustain**: define success, one signal beyond ratings, and who follows up and when.
3. The **Depth check** panel on the right of each move tells you what's left and asks the questions a sharp colleague would ask.
4. Open the **Blueprint** to download a Word file or print or save a PDF to share with stakeholders and leaders.

### Your work saves automatically
Everything saves as you type. The indicator in the top right shows **Saving…** and then **Saved** (or **Saved for the team** in the hosted planner).

In the **hosted planner**, edits go to the shared team database. Two people can work on the same study club at once, and each person's changes are merged field by field. Teammates' changes appear within a few seconds. If your connection drops, the indicator says **Offline · will retry**, and your changes are sent when it's back.

In the **standalone file**, things to know:
- Your work lives in **this browser on this computer**. If you switch computers or browsers, bring a project file with you (see below).
- Clearing your browser history and site data can erase saved work, so **export your project files regularly** as a backup.
- Keep using the same copy of the HTML file from the same place. If you move or rename the file, your browser may treat it as a new app and your projects won't show. Import your project files to get them back.

### Share your progress with your lead (standalone file only)
The hosted planner shares automatically. With the standalone file: on a study club card, click **⋯ › Export project file**, or use **Export file** inside a project. Save the `.depthflow.json` file to your team's shared Teams or OneDrive folder.

---

## For leads: seeing everyone's progress

In the hosted planner, just open **Team progress**. It always shows everyone's study clubs.

With standalone files:
1. Open **Team progress**.
2. Click **Import teammates' files** and select the `.depthflow.json` files from the shared folder. You can select many at once.
3. You'll see every study club by move, its depth health score, which clubs need attention, and which roads keep coming up missing across the team.

Re-importing a newer file from a developer updates that study club. Use **Back up everything** to save one file with all study clubs in your browser.

**Depth health** is the share of depth checks a study club passes. Gaps count fully, and flags (depth warnings) count half. A study club is **at risk** when its session is within 14 days and it isn't finished, or within 30 days and fewer than three moves are done.

---

## For whoever maintains the code

### How it's built
- Plain JavaScript, HTML and CSS, with no framework and no package installs. A tiny built-in renderer (`src/dom.js`) re-draws the screen on every change, without losing your place in a text box.
- `scripts/build.mjs` stitches everything into one self-contained file, `dist/Study-Club-Depth-Flow.html` (also written as `dist/index.html` for hosting). Styles, scripts, the Heartland logos and the Word-export library are all inlined.
- **Storage.** `src/store.js` picks a mode automatically. Opened from a web address, it uses the team server. Opened from disk, it uses the browser's `localStorage`.
- **Team server.** `worker/index.js` is a Cloudflare Worker. It checks the team passcode (a hashed, HttpOnly cookie), serves the app, and stores each study club as one JSON row in a Cloudflare D1 (SQLite) database. It creates its own tables, so there are no migrations to run. Deletes are soft (`deleted = 1`), so an accidental delete can be recovered from the database. An `activity` table records creates, imports and deletes.
- **Merging edits.** The browser turns each edit into small change operations (`src/ops.js`: set a field, add or remove a list item by id). The server applies them to its latest copy. People editing different fields of the same study club never overwrite each other. The browser checks for teammates' changes every 8 seconds and when the window regains focus.

### Rebuild after editing
You need [Node.js](https://nodejs.org) 18 or newer. Then, in a terminal in this folder:

```
node scripts/build.mjs
```

Open the new `dist/Study-Club-Depth-Flow.html` to check your change. **Commit the `dist` and `worker/ops.generated.js` files.** Cloudflare deploys exactly what's in the repo, with no build step.

### Try the hosted version locally
With Node.js 22.5 or newer:

```
node scripts/build.mjs
node scripts/preview-hosted.mjs
```

Then open http://localhost:8787 (passcode `preview`). It runs the real server code with a local SQLite file standing in for Cloudflare's database (`.preview/preview.db`).

### Where things live
| File | What it holds |
|---|---|
| `src/framework.js` | **The framework itself**: roads, colors, icons, questions, steps, starting design moves, default stakeholder groups. Edit language here and it updates everywhere. |
| `src/checks.js` | The depth checks behind the Depth check panel, the progress path, and Team progress |
| `src/store.js` | Saving, loading, syncing with the team server, and project file import/export |
| `src/ops.js` | Change operations used to merge teammates' edits (shared with the server) |
| `worker/index.js` | The team server: passcode, API, database |
| `wrangler.jsonc` | Cloudflare deployment settings |
| `src/views/*.js` | One file per screen |
| `src/export-docx.js` | The Word blueprint |
| `src/graphics.js` | The glowing-road graphics (hero, road check, impact × effort grid) |
| `src/styles.css` | All styling, including the print layout for the PDF blueprint |
| `vendor/docx.iife.js` | The [docx](https://github.com/dolanmiu/docx) library (MIT) used for Word export |

### Roadmap
- **Phase 1 (this version):** projects, the guided flow through all four moves plus Prove + sustain, autosave, Team progress, and the blueprint export.
- **Phase 2:** per-partner interview guides (printable), notes by road for each person, and a side-by-side comparison.
- **Phase 3:** collaboration polish: comments, task owners and due dates, an activity history view. The hosted team planner and live sharing are already in place.
- **Phase 4:** the AI thinking partner ("Go deeper").
- **Phase 5:** visual polish and a finished sample project.

# Study Club Depth Flow

A planner that walks Heartland Dental training developers from a study club concept to a well-thought-out, stakeholder-informed design, using **the Study Club Depth Flow**.

> A great topic does not guarantee depth. Coverage means attendees heard it. Depth means attendees do something differently in their office.

The app is a **single HTML file**. There is nothing to install and no server or account. Double-click it and it opens in your browser.

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
Everything saves in your browser as you type. The indicator in the top right shows **Saving…** and then **Saved**.

Things to know:
- Your work lives in **this browser on this computer**. If you switch computers or browsers, bring a project file with you (see below).
- Clearing your browser history and site data can erase saved work, so **export your project files regularly** as a backup.
- Keep using the same copy of the HTML file from the same place. If you move or rename the file, your browser may treat it as a new app and your projects won't show. Import your project files to get them back.

### Share your progress with your lead
On a study club card, click **⋯ › Export project file**, or use **Export file** inside a project. Save the `.depthflow.json` file to your team's shared Teams or OneDrive folder.

---

## For leads: seeing everyone's progress

1. Open **Team progress**.
2. Click **Import teammates' files** and select the `.depthflow.json` files from the shared folder. You can select many at once.
3. You'll see every study club by move, its depth health score, which clubs need attention, and which roads keep coming up missing across the team.

Re-importing a newer file from a developer updates that study club. Use **Back up everything** to save one file with all study clubs in your browser.

**Depth health** is the share of depth checks a study club passes. Gaps count fully, and flags (depth warnings) count half. A study club is **at risk** when its session is within 14 days and it isn't finished, or within 30 days and fewer than three moves are done.

---

## For whoever maintains the code

### How it's built
- Plain JavaScript, HTML and CSS, with no framework and no package installs. A tiny built-in renderer (`src/dom.js`) re-draws the screen on every change, without losing your place in a text box.
- `scripts/build.mjs` stitches everything into one self-contained file, `dist/Study-Club-Depth-Flow.html`. Styles, scripts, the Heartland logos and the Word-export library are all inlined.
- Data lives in the browser's `localStorage` (key `studyClubDepthFlow.v1`). Every read and write goes through `src/store.js`, so moving to a shared database later means changing only that file.

### Rebuild after editing
You need [Node.js](https://nodejs.org) 18 or newer. Then, in a terminal in this folder:

```
node scripts/build.mjs
```

Open the new `dist/Study-Club-Depth-Flow.html` to check your change.

### Where things live
| File | What it holds |
|---|---|
| `src/framework.js` | **The framework itself**: roads, colors, icons, questions, steps, starting design moves, default stakeholder groups. Edit language here and it updates everywhere. |
| `src/checks.js` | The depth checks behind the Depth check panel, the progress path, and Team progress |
| `src/store.js` | Saving, loading, and project file import/export |
| `src/views/*.js` | One file per screen |
| `src/export-docx.js` | The Word blueprint |
| `src/graphics.js` | The glowing-road graphics (hero, road check, impact × effort grid) |
| `src/styles.css` | All styling, including the print layout for the PDF blueprint |
| `vendor/docx.iife.js` | The [docx](https://github.com/dolanmiu/docx) library (MIT) used for Word export |

### Roadmap
- **Phase 1 (this version):** projects, the guided flow through all four moves plus Prove + sustain, autosave, Team progress, and the blueprint export.
- **Phase 2:** per-partner interview guides (printable), notes by road for each person, and a side-by-side comparison.
- **Phase 3:** collaboration polish: comments, task owners and due dates, an activity history.
- **Phase 4:** the AI thinking partner ("Go deeper").
- **Phase 5:** visual polish and a finished sample project.

// Word export of the Depth Design Blueprint (uses the bundled docx library).

async function exportBlueprintDocx(p) {
  const D = window.docx;
  if (!D) throw new Error("Word library didn’t load.");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, ImageRun, AlignmentType, Footer, PageNumber, TableLayoutType } = D;
  const b = blueprintData(p);
  const PAGE_W = 12240 - 2 * 1100; // letter width minus margins, in twips
  const NAVY = "041E41", GOLD = "9C7A45", GRAY = "545861", LIGHT = "E6EAF0";
  const hex = (c) => shade(c).replace("#", "");

  const t = (text, o = {}) => new TextRun({ text: String(text ?? ""), font: "Arial", size: o.size || 20, color: o.color || GRAY, bold: o.bold, italics: o.italics });
  const para = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 120, before: o.before ?? 0 }, alignment: o.align, border: o.border });
  const val = (v) => (filled(v) ? t(v) : t("Not yet answered", { italics: true, color: "9AA1AB" }));
  const h2 = (num, title) => para([t(num + "  ", { color: GOLD, bold: true, size: 26 }), t(title, { color: NAVY, bold: true, size: 28 })], { before: 320, after: 140, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CAA977", space: 4 } } });
  const h3 = (title) => para(t(title, { color: NAVY, bold: true, size: 22 }), { before: 200, after: 80 });

  const border = { style: BorderStyle.SINGLE, size: 4, color: "D5DAE1" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (children, o = {}) =>
    new TableCell({
      children: (Array.isArray(children) ? children : [children]).map((c) => (c instanceof Paragraph ? c : para(c, { after: 40 }))),
      shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
      width: o.width ? { size: Math.round(o.width * PAGE_W / 100), type: WidthType.DXA } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      borders,
    });
  const headRow = (labels, widths) => new TableRow({ tableHeader: true, children: labels.map((l, i) => cell(t(l, { bold: true, color: "FFFFFF", size: 18 }), { fill: NAVY, width: widths && widths[i] })) });
  const table = (rows, widths) => new Table({ rows, width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: widths.map((w) => Math.round((w * PAGE_W) / 100)), layout: TableLayoutType.FIXED });
  const kv = (pairs) => table(pairs.map(([k, v]) => new TableRow({ children: [cell(t(k, { bold: true, color: NAVY }), { fill: "F4F1EA", width: 28 }), cell(v, { width: 72 })] })), [28, 72]);

  const logoBytes = Uint8Array.from(atob(LOGO_COLOR.split(",")[1]), (c) => c.charCodeAt(0));
  const children = [];

  children.push(
    new Paragraph({ children: [new ImageRun({ type: "png", data: logoBytes, transformation: { width: 140, height: 62 } })], alignment: AlignmentType.RIGHT, spacing: { after: 120 } }),
    para(t("DEPTH DESIGN BLUEPRINT", { color: GOLD, bold: true, size: 18 }), { after: 40 }),
    para(t(p.title || "Untitled study club", { color: NAVY, bold: true, size: 44 }), { after: 80 }),
    para(
      [["Topic", p.topic], ["Audience", p.audience], ["Session", fmtDate(p.sessionDate)], ["Developer", p.developer], ["Updated", fmtDate(p.updatedAt)]]
        .filter(([, v]) => v)
        .flatMap(([k, v], i) => [i ? t("   ·   ", { color: "B0B6BF" }) : null, t(k + " ", { bold: true, color: NAVY, size: 18 }), t(v, { size: 18 })].filter(Boolean)),
      { after: 80 }
    ),
    para(
      STEPS.flatMap((s, i) => {
        const st = b.rep.steps[i].status;
        return [t((st === "complete" ? "✓ " : "○ ") + s.name + "     ", { size: 17, color: st === "complete" ? "24A271" : st === "progress" ? GOLD : "9AA1AB", bold: st === "complete" })];
      }).concat([t(`Depth health ${b.rep.health}%`, { bold: true, color: NAVY, size: 17 })]),
      { after: 200 }
    )
  );

  // 01 Destination
  children.push(
    h2("01", "The destination"),
    new Paragraph({
      children: [t(destinationStatement(p), { size: 26, color: NAVY, bold: true })],
      spacing: { after: 200 },
      shading: { type: ShadingType.CLEAR, fill: "F4F1EA", color: "auto" },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: "CAA977", space: 8 } },
    }),
    kv([
      ["What we’re solving", val(p.destination.solving)],
      ["Who we’re solving it for", val(p.destination.solvingFor)],
      ["The shift", b.shifts.length ? b.shifts.map((s) => para([t(s.label + ": ", { bold: true, color: NAVY }), t(s.text)], { after: 40 })) : val("")],
    ])
  );

  // 02 Stakeholders
  children.push(
    h2("02", "Stakeholders engaged"),
    table([
      headRow(["Stakeholder group", "Who we talked to", "Status", "Date"], [34, 30, 18, 18]),
      ...p.stakeholders.groups.map((g) => new TableRow({ children: [cell([t(g.name, { bold: true, color: NAVY }), ...(g.required ? [t("  Required", { size: 16, color: GOLD })] : [])]), cell(t(g.contact || "–")), cell(t(INTERVIEW_STATUS.find((s) => s.id === g.status).label)), cell(t(fmtDate(g.date) || "–"))] })),
    ], [34, 30, 18, 18]),
    h3("What we heard, by road"),
    ...ROADS.flatMap((r) => [
      para([t(r.name.toUpperCase() + "  ", { bold: true, color: hex(r.color), size: 19 }), t(r.lens, { italics: true, size: 18, color: "8A919B" })], { after: 30 }),
      para(val(p.stakeholders.insights[r.id]), { after: 140 }),
    ])
  );

  // 03 Road check
  const bars = { strong: 12, partial: 7, missing: 2 };
  children.push(
    h2("03", "Road check and priority roads"),
    table([
      headRow(["Road", "Road check", "Rating", "Why"], [16, 26, 12, 46]),
      ...ROADS.map((r) => {
        const x = p.roads[r.id];
        return new TableRow({
          children: [
            cell([t(r.name, { bold: true, color: hex(r.color) }), ...(x.priority ? [t("  PRIORITY", { bold: true, size: 14, color: GOLD })] : [])]),
            cell(t(x.rating ? "█".repeat(bars[x.rating]) : "–", { color: hex(r.color), size: 16 })),
            cell(t(x.rating ? RATING[x.rating].label : "–")),
            cell(t(x.evidence || "–")),
          ],
        });
      }),
    ], [16, 26, 12, 46]),
    h3("Priority roads"),
    ...(b.pri.length
      ? b.pri.flatMap((r) => [
          para([t(r.name, { bold: true, color: hex(r.color), size: 22 }), t(`   Impact ${LEVEL[p.roads[r.id].impact]?.label || "–"} · Effort ${LEVEL[p.roads[r.id].effort]?.label || "–"}`, { size: 18, color: "8A919B" })], { after: 40 }),
          para(val(p.roads[r.id].why), { after: 140 }),
        ])
      : [para(t("No priority roads chosen yet.", { italics: true, color: "9AA1AB" }))])
  );

  // 04 Design
  const segRows = [...b.bySegment, ...(b.unplaced.length ? [{ seg: { name: "Not placed yet" }, items: b.unplaced }] : [])];
  children.push(
    h2("04", "Design for depth"),
    para(t((b.pri.length ? `Designed for ${b.pri.map((r) => r.name).join(" and ")}. ` : "") + "Each decision is placed in the segment of the study club where it happens.", { italics: true })),
    table([
      headRow(["Segment", "Design decisions"], [22, 78]),
      ...segRows.map(({ seg, items }) =>
        new TableRow({
          children: [
            cell(t(seg.name, { bold: true, color: NAVY }), { fill: "F4F1EA" }),
            cell(items.length ? items.map((d) => para([t(ROAD[d.road].name.toUpperCase() + "  ", { bold: true, size: 15, color: hex(ROAD[d.road].color) }), t(d.text)], { after: 60 })) : t("–", { color: "9AA1AB" })),
          ],
        })
      ),
    ], [22, 78])
  );

  // 05 Prove + sustain
  children.push(
    h2("05", "Prove + sustain"),
    kv([
      ["What success looks like", val(p.prove.success)],
      ["How we’ll measure it", [para([...(b.measure ? [t(b.measure.name + ": ", { bold: true, color: NAVY })] : []), filled(p.prove.measureDetail) ? t(p.prove.measureDetail) : t("Not yet answered", { italics: true, color: "9AA1AB" })], { after: 40 })]],
    ]),
    h3("How we’ll reinforce it"),
    p.prove.actions.length
      ? table([headRow(["Who follows up", "When", "With what"], [28, 18, 54]), ...p.prove.actions.map((a) => new TableRow({ children: [cell(t(a.owner || "–")), cell(t(fmtDate(a.when) || "–")), cell(t(a.what || "–"))] }))], [28, 18, 54])
      : para(t("No reinforcement plan yet.", { italics: true, color: "9AA1AB" }))
  );

  if (b.open.length) {
    children.push(h2("!", "Open items before launch"), ...b.open.map((i) => para([t("•  " + i.step.name + ": ", { bold: true, color: NAVY }), t(i.text), ...(i.level === "flag" ? [t(" (to consider)", { italics: true, color: "8A919B" })] : [])], { after: 60 })));
  }

  children.push(para([t(FRAMEWORK.closing[0] + " ", { color: NAVY, size: 22 }), t(FRAMEWORK.closing[1], { color: GOLD, bold: true, size: 22 })], { before: 400, align: AlignmentType.CENTER }));

  const doc = new Document({
    creator: p.developer || "Study Club Depth Flow",
    title: `Depth Design Blueprint: ${p.title}`,
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Depth Design Blueprint · " + (p.title || "") + " · Page ", { size: 16, color: "8A919B" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A919B", font: "Arial" })] })],
          }),
        },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  downloadFile(`${fileSlug(p.title)}-depth-design-blueprint.docx`, blob);
  toast("Word blueprint downloaded.", "ok");
}

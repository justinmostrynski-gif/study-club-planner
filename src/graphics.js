// SVG graphics in the deck's glowing-road style. All return trusted markup
// strings built from our own data; user text is always escaped.

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Title-slide streaks: five road-colored light trails converging on a flare.
function heroRoadsSvg() {
  const colors = ["#5A96FF", "#8CBEFF", "#3CC8BE", "#CAA977", "#4FD6A0", "#5A96FF", "#3CC8BE"];
  const paths = colors
    .map((c, i) => {
      const y0 = 250 + i * 22;
      const bend = 160 + i * 12;
      return `<path d="M -20 ${y0} C 300 ${y0 - 10}, 560 ${bend}, 900 96" stroke="url(#hg${i})" stroke-width="${i % 2 ? 1.2 : 2}" fill="none" filter="url(#hblur)"/>
              <path d="M -20 ${y0} C 300 ${y0 - 10}, 560 ${bend}, 900 96" stroke="url(#hg${i})" stroke-width="${i % 2 ? 0.8 : 1.1}" fill="none"/>`;
    })
    .join("");
  const grads = colors
    .map((c, i) => `<linearGradient id="hg${i}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".45" stop-color="${c}" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>`)
    .join("");
  return `<svg class="hero-roads" viewBox="0 0 1000 360" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>${grads}
      <filter id="hblur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
      <radialGradient id="flare"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".25" stop-color="#cfe2ff" stop-opacity=".55"/><stop offset="1" stop-color="#5A96FF" stop-opacity="0"/></radialGradient>
    </defs>
    ${paths}
    <circle cx="900" cy="96" r="70" fill="url(#flare)"/>
  </svg>`;
}

// Footer streaks used along the bottom of every slide.
function footerRoadsSvg() {
  const colors = ["#5A96FF", "#8CBEFF", "#3CC8BE", "#CAA977", "#4FD6A0"];
  const lines = colors
    .map((c, i) => `<path d="M0 ${30 + i * 5} C 300 ${10 + i * 7}, 700 ${50 - i * 6}, 1200 ${26 + i * 4}" stroke="${c}" stroke-opacity=".55" stroke-width="1.2" fill="none" filter="url(#fblur)"/><path d="M0 ${30 + i * 5} C 300 ${10 + i * 7}, 700 ${50 - i * 6}, 1200 ${26 + i * 4}" stroke="${c}" stroke-opacity=".7" stroke-width=".6" fill="none"/>`)
    .join("");
  return `<svg class="footer-roads" viewBox="0 0 1200 70" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><filter id="fblur"><feGaussianBlur stdDeviation="2"/></filter></defs>${lines}</svg>`;
}

// The Move 03 road check: one glowing bar per road. `light` renders for print.
function roadCheckSvg(p, { light = false } = {}) {
  const W = 640, rowH = 46, top = 8, labelW = 128, barX = labelW + 8, barW = 300, H = top + ROADS.length * rowH;
  const track = light ? "#E6EAF0" : "rgba(255,255,255,.07)";
  const text = light ? "#545861" : "#B7C3D6";
  const rows = ROADS.map((r, i) => {
    const x = p.roads[r.id];
    const y = top + i * rowH;
    const rating = RATING[x.rating];
    const w = rating ? barW * rating.bar : 0;
    const label = rating ? rating.label : "Not rated";
    const pill = x.priority
      ? `<rect x="${barX + barW + 92}" y="${y + 8}" width="74" height="20" rx="10" fill="#CAA977"/><text x="${barX + barW + 129}" y="${y + 22}" text-anchor="middle" font-size="9.5" font-weight="700" letter-spacing="1" fill="#041E41">PRIORITY</text>`
      : "";
    return `<g>
      <text x="0" y="${y + 22}" font-size="12" font-weight="700" letter-spacing="1" fill="${light ? shade(r.color) : r.color}">${r.name.toUpperCase()}</text>
      <rect x="${barX}" y="${y + 9}" width="${barW}" height="18" rx="9" fill="${track}" ${light ? "" : 'stroke="rgba(255,255,255,.06)"'}/>
      ${w ? `${light ? "" : `<rect x="${barX}" y="${y + 9}" width="${w}" height="18" rx="9" fill="${r.color}" opacity=".55" filter="url(#rcglow)"/>`}<rect x="${barX}" y="${y + 9}" width="${w}" height="18" rx="9" fill="url(#rc-${r.id}${light ? "-l" : ""})"/>` : ""}
      <text x="${barX + barW + 14}" y="${y + 22}" font-size="12" fill="${rating ? text : light ? "#9aa1ab" : "#6f7f99"}" ${rating ? "" : 'font-style="italic"'}>${label}</text>
      ${pill}
    </g>`;
  }).join("");
  const grads = ROADS.map((r) => `<linearGradient id="rc-${r.id}${light ? "-l" : ""}" x1="0" x2="1"><stop offset="0" stop-color="${r.color}" stop-opacity="${light ? 1 : 0.85}"/><stop offset="1" stop-color="${light ? r.color : "#ffffff"}" stop-opacity="${light ? 0.75 : 0.95}"/></linearGradient>`).join("");
  return `<svg class="road-check" viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Road check" font-family="Segoe UI, Arial, sans-serif">
    <defs>${grads}<filter id="rcglow" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="5"/></filter></defs>${rows}</svg>`;
}

// Darker version of a road color so it reads on white paper.
function shade(hex) {
  const map = { "#5A96FF": "#2F6FE0", "#8CBEFF": "#3D7FCC", "#3CC8BE": "#1E958D", "#CAA977": "#9C7A45", "#4FD6A0": "#24A271" };
  return map[hex] || hex;
}

// Impact × effort: where each open road sits. Top-left is the sweet spot.
function impactEffortSvg(p) {
  const S = 260, pad = 34, cell = (S - pad) / 3;
  const pos = { low: 0, medium: 1, high: 2 };
  const placed = ROADS.filter((r) => p.roads[r.id].impact && p.roads[r.id].effort);
  const buckets = {};
  const dots = placed.map((r) => {
    const x = p.roads[r.id];
    const k = x.impact + x.effort;
    const n = (buckets[k] = (buckets[k] || 0) + 1) - 1;
    const cx = pad + cell * pos[x.effort] + cell / 2 + (n % 2 ? 14 : -14) * (n ? 1 : 0);
    const cy = pad - pad + cell * (2 - pos[x.impact]) + cell / 2 + (n > 1 ? 16 : 0);
    return `<g>${x.priority ? `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="#CAA977" stroke-width="2"/>` : ""}
      <circle cx="${cx}" cy="${cy}" r="10" fill="${r.color}" opacity=".35" filter="url(#ieglow)"/>
      <circle cx="${cx}" cy="${cy}" r="9" fill="#0b2a55" stroke="${r.color}" stroke-width="2"/>
      <g transform="translate(${cx - 6} ${cy - 6}) scale(.5)" stroke="${r.color}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[r.icon]}</g></g>`;
  }).join("");
  const grid = [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => `<rect x="${pad + cell * j}" y="${cell * i}" width="${cell}" height="${cell}" fill="${i === 0 && j === 0 ? "rgba(202,169,119,.13)" : "rgba(255,255,255,.025)"}" stroke="rgba(255,255,255,.07)"/>`)).join("");
  return `<svg class="ie-matrix" viewBox="0 0 ${S} ${S}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Impact and effort" font-family="Segoe UI, Arial, sans-serif">
    <defs><filter id="ieglow"><feGaussianBlur stdDeviation="4"/></filter></defs>
    ${grid}
    <text x="${pad + 6}" y="14" font-size="9" font-weight="700" letter-spacing=".8" fill="#CAA977">SWEET SPOT</text>
    <text x="10" y="${(S - pad) / 2}" font-size="9.5" fill="#8a9ab3" transform="rotate(-90 10 ${(S - pad) / 2})" text-anchor="middle" letter-spacing="1">IMPACT ↑</text>
    <text x="${pad + (S - pad) / 2}" y="${S - 10}" font-size="9.5" fill="#8a9ab3" text-anchor="middle" letter-spacing="1">EFFORT →</text>
    ${dots}
  </svg>`;
}

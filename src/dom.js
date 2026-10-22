// Minimal UI layer: h() builds DOM elements, morph() patches the live page to
// match a freshly rendered tree. The whole screen re-renders on every change;
// morph keeps focus, cursor position and scroll intact while people type.

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  el.__on = {};
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.__on[k.slice(2).toLowerCase()] = v;
      else if (k === "value") el.__value = String(v);
      else if (k === "checked") el.__checked = !!v;
      else if (k === "key") el.__key = v;
      else if (k === "class") el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : v);
      else if (k === "style" && typeof v === "object") el.setAttribute("style", styleString(v));
      else el.setAttribute(k, v === true ? "" : String(v));
    }
  }
  appendChildren(el, children);
  bindEvents(el);
  if (el.__value !== undefined) el.value = el.__value;
  if (el.__checked !== undefined) el.checked = el.__checked;
  return el;
}

function styleString(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`)
    .join(";");
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Trusted markup only (our own SVG icons/graphics). Never pass user text here.
function raw(html, tag = "span", props = {}) {
  const el = h(tag, props);
  el.innerHTML = html;
  el.__raw = html;
  return el;
}

// Event listeners read the current handler from el.__on, so morph can swap
// handlers without re-binding.
const EVENTS = ["click", "input", "change", "keydown", "blur", "focus", "submit", "dragstart", "dragover", "drop", "dragleave"];
function bindEvents(el) {
  for (const ev of EVENTS) {
    el.addEventListener(ev, (e) => {
      const fn = el.__on && el.__on[ev];
      if (fn) fn(e);
    });
  }
}

function morph(oldEl, newEl) {
  if (oldEl.nodeType !== newEl.nodeType || oldEl.nodeName !== newEl.nodeName || oldEl.__key !== newEl.__key) {
    oldEl.replaceWith(newEl);
    return newEl;
  }
  if (oldEl.nodeType === Node.TEXT_NODE) {
    if (oldEl.nodeValue !== newEl.nodeValue) oldEl.nodeValue = newEl.nodeValue;
    return oldEl;
  }
  // attributes
  for (const a of Array.from(oldEl.attributes)) if (!newEl.hasAttribute(a.name)) oldEl.removeAttribute(a.name);
  for (const a of Array.from(newEl.attributes)) if (oldEl.getAttribute(a.name) !== a.value) oldEl.setAttribute(a.name, a.value);
  oldEl.__on = newEl.__on;
  // form state: never fight the person typing in the focused field
  if (newEl.__value !== undefined && document.activeElement !== oldEl && oldEl.value !== newEl.__value) oldEl.value = newEl.__value;
  if (newEl.__checked !== undefined && oldEl.checked !== newEl.__checked) oldEl.checked = newEl.__checked;
  if (newEl.__raw !== undefined || oldEl.__raw !== undefined) {
    if (oldEl.__raw !== newEl.__raw) {
      oldEl.innerHTML = newEl.innerHTML;
      oldEl.__raw = newEl.__raw;
    }
    return oldEl;
  }
  const oldKids = Array.from(oldEl.childNodes);
  const newKids = Array.from(newEl.childNodes);
  newKids.forEach((nk, i) => {
    if (i < oldKids.length) morph(oldKids[i], nk);
    else oldEl.appendChild(nk);
  });
  for (let i = newKids.length; i < oldKids.length; i++) oldKids[i].remove();
  return oldEl;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function debounce(fn, ms) {
  let t;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  d.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return d;
}

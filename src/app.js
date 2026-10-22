// Router and render loop. Routes:
//   #/                     study clubs
//   #/progress             team progress
//   #/about                the framework
//   #/p/:id/:step          a move (destination | roads | prioritize | design | prove)
//   #/p/:id/blueprint      the Depth Design Blueprint

function currentView() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "p" && parts[1]) return projectView(parts[1], parts[2]);
  if (parts[0] === "progress") return progressView();
  if (parts[0] === "about") return aboutView();
  return dashboardView();
}

function render() {
  const root = document.getElementById("app");
  const tree = h("div", { class: "app-root" },
    currentView(),
    UI.modal ? UI.modal() : null,
    UI.toast ? h("div", { class: `toast toast-${UI.toast.kind}`, role: "status" }, UI.toast.msg) : null
  );
  if (root.firstChild) morph(root.firstChild, tree);
  else root.appendChild(tree);
}

let lastRoute = location.hash;
window.addEventListener("hashchange", () => {
  UI.modal = null;
  UI.open = Object.fromEntries(Object.entries(UI.open).filter(([k]) => !k.startsWith("menu-")));
  // Moving between screens of the same project keeps the path in view; other moves start at the top.
  const sameProject = lastRoute.split("/")[2] && lastRoute.split("/")[2] === location.hash.split("/")[2];
  lastRoute = location.hash;
  render();
  if (!sameProject) window.scrollTo(0, 0);
  else {
    const path = document.querySelector(".progress-path");
    if (path && path.getBoundingClientRect().top < 0) path.scrollIntoView({ block: "start" });
  }
});

// Close any open ⋯ menu on an outside click.
document.addEventListener("click", (e) => {
  if (e.target.closest && e.target.closest(".menu-wrap")) return;
  const openMenus = Object.keys(UI.open).filter((k) => k.startsWith("menu-") && UI.open[k]);
  if (openMenus.length) {
    openMenus.forEach((k) => (UI.open[k] = false));
    render();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && UI.modal) closeModal();
});

Store.load();
Store.subscribe(render);
render();
// Keep "Saved · 2 min ago" honest.
setInterval(render, 30000);

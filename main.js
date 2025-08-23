/**********************
 * Storage & Migration
 **********************/
const RAW = JSON.parse(localStorage.getItem("scoutData")) || { links: [], visited: [] };

// New shape: links = [{url, visited, tags:[], note:"", title:""}]
let links = [];
if (Array.isArray(RAW.links) && RAW.links.length && typeof RAW.links[0] === "string") {
  // migrate old format (strings + visited indices)
  const visitedIdx = Array.isArray(RAW.visited) ? RAW.visited : [];
  links = RAW.links.map((u, i) => ({
    url: u,
    visited: visitedIdx.includes(i),
    tags: [],
    note: "",
    title: ""
  }));
} else if (Array.isArray(RAW.links)) {
  links = RAW.links.map(item => ({
    url: item.url,
    visited: !!item.visited,
    tags: Array.isArray(item.tags) ? item.tags : [],
    note: item.note || "",
    title: item.title || ""
  }));
} else {
  links = [];
}

function persist() {
  localStorage.setItem("scoutData", JSON.stringify({ links }));
}

/**********************
 * Elements & State
 **********************/
const linkList = document.getElementById("linkList");
const preview = document.getElementById("preview");
const counterEl = document.querySelector(".counter");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const statusText = document.getElementById("statusText");
const sidebar = document.getElementById("sidebar");

const searchInput = document.getElementById("searchInput");
const visitedFilter = document.getElementById("visitedFilter");
const tagFilter = document.getElementById("tagFilter");

let currentIndex = -1;

/**********************
 * Helpers
 **********************/
function updateStats() {
  const visitedCount = links.filter(l => l.visited).length;
  counterEl.textContent = `${visitedCount} / ${links.length}`;
  const pct = links.length ? Math.round((visitedCount / links.length) * 100) : 0;
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${pct}% completed`;
}

function hostnameFromUrl(u){
  try { return new URL(u).hostname; } catch { return u; }
}

function collectAllTags() {
  const set = new Set();
  links.forEach(l => (l.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function applyTagFilterOptions(){
  const all = collectAllTags();
  const current = tagFilter.value;
  tagFilter.innerHTML = `<option value="all">All tags</option>` + all.map(t=>`<option value="${t}">${t}</option>`).join("");
  if ([...tagFilter.options].some(o=>o.value===current)) tagFilter.value = current;
}

/**********************
 * Rendering
 **********************/
function renderLinks() {
  linkList.innerHTML = "";

  const q = (searchInput.value || "").toLowerCase().trim();
  const vMode = visitedFilter.value; // all | yes | not
  const tagMode = tagFilter.value;   // all or tag

  links.forEach((link, index) => {
    // filtering
    if (vMode === "yes" && !link.visited) return;
    if (vMode === "not" && link.visited) return;
    if (tagMode !== "all" && !(link.tags || []).includes(tagMode)) return;

    const hay = `${link.url} ${link.title || ""} ${link.note || ""} ${(link.tags||[]).join(" ")}`.toLowerCase();
    if (q && !hay.includes(q)) return;

    const li = document.createElement("li");
    li.className = "link-item" + (index === currentIndex ? " active" : "") + (link.visited ? " visited" : "");
    li.onclick = () => openLink(index);

    const icon = document.createElement("div");
    icon.className = "icon-small";
    icon.innerHTML = link.visited ? `<i class="fa-regular fa-circle-check"></i>` : `<i class="fa-regular fa-circle"></i>`;

    const main = document.createElement("div");
    main.className = "link-main";

    const title = document.createElement("div");
    title.className = "link-title";
    title.textContent = link.title || hostnameFromUrl(link.url);

    const meta = document.createElement("div");
    meta.className = "link-meta";
    meta.textContent = link.url;

    const badges = document.createElement("div");
    badges.className = "tag-badges";
    (link.tags || []).forEach(t => {
      const b = document.createElement("span");
      b.className = "tag";
      b.textContent = t;
      badges.appendChild(b);
    });

    const actions = document.createElement("div");
    actions.className = "link-actions";
    // Quick controls (stop propagation to not open immediately)
    const openBtn = document.createElement("button");
    openBtn.className = "icon-small";
    openBtn.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i>`;
    openBtn.title = "Open in new tab";
    openBtn.onclick = (e)=>{ e.stopPropagation(); window.open(link.url, "_blank"); };

    const toggleVisited = document.createElement("button");
    toggleVisited.className = "icon-small";
    toggleVisited.innerHTML = link.visited ? `<i class="fa-solid fa-rotate-left"></i>` : `<i class="fa-solid fa-check"></i>`;
    toggleVisited.title = link.visited ? "Mark unvisited" : "Mark visited";
    toggleVisited.onclick = (e)=>{
      e.stopPropagation();
      link.visited = !link.visited;
      persist(); renderAll();
    };

    actions.appendChild(openBtn);
    actions.appendChild(toggleVisited);

    main.appendChild(title);
    main.appendChild(meta);
    if ((link.tags||[]).length) main.appendChild(badges);

    li.appendChild(icon);
    li.appendChild(main);
    li.appendChild(actions);

    linkList.appendChild(li);
  });

  updateStats();
  applyTagFilterOptions();
}

/**********************
 * Actions
 **********************/
function addLink() {
  const input = document.getElementById("urlInput");
  const tagsRaw = (document.getElementById("tagsInput").value || "").trim();
  const noteRaw = (document.getElementById("noteInput").value || "").trim();

  const tags = tagsRaw ? tagsRaw.split(",").map(t=>t.trim()).filter(Boolean) : [];

  const raw = (input.value || "").trim();
  if (!raw) { return; }

  const newLinks = raw.split(/[\n,\s]+/).map(l => {
    if (!l) return null;
    if (!/^https?:\/\//i.test(l)) return "https://" + l;
    return l;
  }).filter(Boolean);

  newLinks.forEach(url => {
    if (!links.some(x => x.url === url)) {
      links.push({ url, visited:false, tags:[...tags], note:noteRaw, title:"" });
    }
  });

  persist();
  renderAll();
  input.value = "";
  // keep tags/note inputs for next batch if desired
}

function openLink(index) {
  currentIndex = index;
  preview.classList.add("loading");
  preview.src = links[index].url;

  // mark visited
  if (!links[index].visited) {
    links[index].visited = true;
    persist();
  }
  renderLinks();
}

function nextLink() {
  for (let i = currentIndex + 1; i < links.length; i++) {
    if (!links[i].visited) { openLink(i); return; }
  }
  // if none left, show status
  statusText.textContent = "All links visited. Great job!";
}

function refreshIframe() {
  if (preview.src) preview.src = preview.src;
}

function deleteAllLinks() {
  if (!confirm("Delete ALL links?")) return;
  links = [];
  currentIndex = -1;
  preview.src = "";
  persist();
  renderAll();
}

function exportLinksTXT() {
  const remaining = links.filter(l => !l.visited).map(l => l.url);
  const textContent = remaining.join("\n");
  const blob = new Blob([textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "scouted_links.txt"; a.click();
  URL.revokeObjectURL(url);
}

function exportLinksJSON() {
  const blob = new Blob([JSON.stringify({links}, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "scouted_links.json"; a.click();
  URL.revokeObjectURL(url);
}

function importLinks(event) {
  const file = event.target.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      let imported = [];
      if (ext === "json") {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          // simple array of urls
          imported = parsed.map(u => ({ url: normalizeUrl(u), visited:false, tags:[], note:"", title:"" }));
        } else if (parsed && Array.isArray(parsed.links)) {
          // our shape
          imported = parsed.links.map(l => ({
            url: normalizeUrl(l.url || l),
            visited: !!l.visited,
            tags: Array.isArray(l.tags) ? l.tags : [],
            note: l.note || "",
            title: l.title || ""
          }));
        } else {
          throw new Error("Invalid JSON format");
        }
      } else if (ext === "txt" || ext === "pdf") {
        // basic text extraction for PDF; not extracting embedded URLs specifically
        const arr = e.target.result.split(/[\n,\s]+/).filter(Boolean);
        imported = arr.map(u => ({ url: normalizeUrl(u), visited:false, tags:[], note:"", title:"" }));
      }

      // merge unique
      imported.forEach(item => {
        if (item && item.url && !links.some(x=>x.url===item.url)) {
          links.push(item);
        }
      });

      persist();
      renderAll();
      alert("Links imported successfully!");
    } catch (err) {
      console.error(err);
      alert("Error importing file.");
    } finally {
      event.target.value = ""; // reset
    }
  };

  // read as text for all allowed types (PDF text content included)
  reader.readAsText(file);
}

function normalizeUrl(u){
  if (!u) return "";
  let s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

/**********************
 * Theme + Sidebar
 **********************/
const themeSwitch = document.getElementById("themeSwitch");
const savedTheme = localStorage.getItem("fhg_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeSwitch.checked = savedTheme === "dark";

themeSwitch.addEventListener("change", () => {
  const mode = themeSwitch.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("fhg_theme", mode);
});

document.getElementById("sidebarToggle").addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

/**********************
 * Iframe handling
 **********************/
preview.addEventListener("load", () => {
  preview.classList.remove("loading");
  const i = currentIndex;
  if (i < 0 || !links[i]) return;

  // Try to grab title if same-origin allowed; fallback to hostname
  try {
    const doc = preview.contentDocument || preview.contentWindow.document;
    if (doc && doc.title) {
      links[i].title = doc.title.trim().slice(0, 120);
      persist();
      renderLinks();
      statusText.textContent = "Loaded: " + (links[i].title || hostnameFromUrl(links[i].url));
      return;
    }
  } catch (err) {
    // cross-domain, ignore
  }
  statusText.textContent = "Loaded: " + hostnameFromUrl(links[i].url);
});

// If site blocks iframe entirely, optionally auto-open
setTimeout(() => {
  // noop by default; uncomment to enable fallback
  // if (!preview.contentDocument && preview.src) window.open(preview.src, "_blank");
}, 1500);

/**********************
 * Filters bindings
 **********************/
[searchInput, visitedFilter, tagFilter].forEach(el => {
  el.addEventListener("input", renderLinks);
  el.addEventListener("change", renderLinks);
});

/**********************
 * Keyboard Shortcuts
 *  N: next unvisited
 *  R: refresh iframe
 **********************/
document.addEventListener("keydown", (e)=>{
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key.toLowerCase() === "n") nextLink();
  if (e.key.toLowerCase() === "r") refreshIframe();
});

/**********************
 * Init
 **********************/
function renderAll(){
  applyTagFilterOptions();
  renderLinks();
}
renderAll();

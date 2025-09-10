/***************
 * Load / Migrate
 ***************/
const RAW = JSON.parse(localStorage.getItem("scoutData")) || { links: [], visited: [] };
let links = [];
if (Array.isArray(RAW.links) && RAW.links.length && typeof RAW.links[0] === "string") {
  const visitedIdx = Array.isArray(RAW.visited) ? RAW.visited : [];
  links = RAW.links.map((u, i) => ({
    url: normalizeUrl(u),
    visited: visitedIdx.includes(i),
    tags: [],
    note: "",
    title: ""
  }));
} else if (Array.isArray(RAW.links)) {
  links = RAW.links.map(item => ({
    url: normalizeUrl(item.url || item),
    visited: !!item.visited,
    tags: Array.isArray(item.tags) ? item.tags : [],
    note: item.note || "",
    title: item.title || ""
  }));
}
function persist(){ localStorage.setItem("scoutData", JSON.stringify({ links })); }

/***************
 * Elements
 ***************/
const linkList = document.getElementById("linkList");
const preview = document.getElementById("preview");
const counterEl = document.querySelector(".counter");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const statusText = document.getElementById("statusText");
const infoPanel = document.getElementById("infoPanel");
const toggleInfoBtn = document.getElementById("toggleInfoBtn");
const toggleInfoIcon = document.getElementById("toggleInfoIcon");
const sidebar = document.getElementById("sidebar");

const searchInput = document.getElementById("searchInput");
const visitedFilter = document.getElementById("visitedFilter");
const tagFilter = document.getElementById("tagFilter");

let currentIndex = -1;

/***************
 * Translator (NEW)
 ***************/
const translatorWrapper = document.createElement("div");
translatorWrapper.id = "translatorWrapper";

const translatorLabel = document.createElement("label");
translatorLabel.setAttribute("for", "languageSelect");
translatorLabel.textContent = "Translate to: ";

const languageSelect = document.createElement("select");
languageSelect.id = "languageSelect";

const languages = {
  en: "English",
  fr: "French",
  es: "Spanish",
  ha: "Hausa",
  ar: "Arabic",
  de: "German",
  zh: "Chinese",
  hi: "Hindi"
};

Object.entries(languages).forEach(([code, name])=>{
  const opt = document.createElement("option");
  opt.value = code;
  opt.textContent = name;
  languageSelect.appendChild(opt);
});

translatorWrapper.appendChild(translatorLabel);
translatorWrapper.appendChild(languageSelect);

// Insert translator dropdown into sidebar (at the top)
sidebar.prepend(translatorWrapper);

/***************
 * Theme & Sidebar
 ***************/
const themeSwitch = document.getElementById("themeSwitch");
const savedTheme = localStorage.getItem("fhg_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeSwitch.checked = savedTheme === "dark";
themeSwitch.addEventListener("change", ()=>{
  const mode = themeSwitch.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("fhg_theme", mode);
});
document.getElementById("sidebarToggle").addEventListener("click", ()=>{
  sidebar.classList.toggle("collapsed");
});

/***************
 * Helpers
 ***************/
function normalizeUrl(u){
  if (!u) return "";
  let s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}
function hostnameFromUrl(u){ try { return new URL(u).hostname; } catch { return u; } }
function updateStats(){
  const v = links.filter(l => l.visited).length;
  counterEl.textContent = `${v} / ${links.length}`;
  const pct = links.length ? Math.round((v/links.length)*100) : 0;
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${pct}% completed`;
}
function collectAllTags(){
  const s = new Set();
  links.forEach(l => (l.tags||[]).forEach(t => s.add(t)));
  return [...s].sort();
}
function applyTagFilterOptions(){
  const tags = collectAllTags();
  const keep = tagFilter.value;
  tagFilter.innerHTML = `<option value="all">All tags</option>` + tags.map(t=>`<option value="${t}">${t}</option>`).join("");
  if ([...tagFilter.options].some(o=>o.value===keep)) tagFilter.value = keep;
}

/***************
 * Rendering
 ***************/
function renderLinks(){
  linkList.innerHTML = "";

  const q = (searchInput.value||"").toLowerCase().trim();
  const vMode = visitedFilter.value; // all | yes | not
  const tMode = tagFilter.value;     // all or tag

  links.forEach((link, index) => {
    if (vMode === "yes" && !link.visited) return;
    if (vMode === "not" && link.visited) return;
    if (tMode !== "all" && !(link.tags||[]).includes(tMode)) return;

    const hay = `${link.url} ${link.title||""} ${link.note||""} ${(link.tags||[]).join(" ")}`.toLowerCase();
    if (q && !hay.includes(q)) return;

    const li = document.createElement("li");
    li.className = `link-item${index===currentIndex?' active':''}${link.visited?' visited':''}`;
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
    (link.tags||[]).forEach(t=>{
      const b = document.createElement("span");
      b.className="tag"; b.textContent=t;
      badges.appendChild(b);
    });

    const actions = document.createElement("div");
    actions.className = "link-actions";
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
      link.visited = !link.visited; persist(); renderAll();
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
function renderAll(){ applyTagFilterOptions(); renderLinks(); }

/***************
 * Actions
 ***************/
function addLink(){
  const input = document.getElementById("urlInput");
  const tagsRaw = (document.getElementById("tagsInput").value||"").trim();
  const noteRaw = (document.getElementById("noteInput").value||"").trim();
  const tags = tagsRaw ? tagsRaw.split(",").map(t=>t.trim()).filter(Boolean) : [];

  const raw = (input.value||"").trim();
  if (!raw) return;

  const arr = raw.split(/[\n,\s]+/).map(s=>s.trim()).filter(Boolean);
  arr.forEach(u=>{
    const url = normalizeUrl(u);
    if (!links.some(x=>x.url===url)){
      links.push({ url, visited:false, tags:[...tags], note:noteRaw, title:"" });
    }
  });

  persist(); renderAll();
  input.value = ""; // keep tags/note for batching
}

function openLink(index){
  currentIndex = index;
  hideInfoPanel(); 
  preview.classList.add("loading");

  // ✅ NEW: wrap with Google Translate
  const targetLang = document.getElementById("languageSelect")?.value || "en";
  const originalUrl = links[index].url;
  preview.src = `https://translate.google.com/translate?sl=auto&tl=${targetLang}&u=${encodeURIComponent(originalUrl)}`;

  if (!links[index].visited){ links[index].visited = true; persist(); }
  renderLinks();
}

function nextLink(){
  for (let i=currentIndex+1; i<links.length; i++){
    if (!links[i].visited){ openLink(i); return; }
  }
  statusText.textContent = "All links visited. Great job!";
}

function refreshIframe(){
  if (preview.src){
    hideInfoPanel();
    preview.classList.add("loading");
    preview.src = preview.src;
  }
}

function deleteAllLinks(){
  if (!confirm("Delete ALL links?")) return;
  links = []; currentIndex = -1; preview.src = "";
  persist(); renderAll(); showInfoPanel();
}

function exportLinksTXT(){
  const remaining = links.filter(l=>!l.visited).map(l=>l.url);
  const blob = new Blob([remaining.join("\n")], { type:"text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="scouted_links.txt"; a.click();
  URL.revokeObjectURL(url);
}
function exportLinksJSON(){
  const blob = new Blob([JSON.stringify({links}, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="scouted_links.json"; a.click();
  URL.revokeObjectURL(url);
}

function importLinks(event){
  const file = event.target.files[0]; if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = e => {
    try{
      let imported = [];
      if (ext === "json"){
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)){
          imported = parsed.map(u=>({ url: normalizeUrl(u), visited:false, tags:[], note:"", title:"" }));
        } else if (parsed && Array.isArray(parsed.links)){
          imported = parsed.links.map(l=>({
            url: normalizeUrl(l.url || l),
            visited: !!l.visited,
            tags: Array.isArray(l.tags)? l.tags : [],
            note: l.note || "",
            title: l.title || ""
          }));
        } else throw new Error("Invalid JSON format");
      } else if (ext === "txt" || ext === "pdf"){
        const arr = e.target.result.split(/[\n,\s]+/).filter(Boolean);
        imported = arr.map(u=>({ url: normalizeUrl(u), visited:false, tags:[], note:"", title:"" }));
      }

      imported.forEach(item=>{
        if (item && item.url && !links.some(x=>x.url===item.url)) links.push(item);
      });

      persist(); renderAll();
      alert("Links imported successfully!");
    }catch(err){
      console.error(err); alert("Error importing file.");
    }finally{
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

/***************
 * Info Panel Toggle
 ***************/
function hideInfoPanel(){
  if (!infoPanel.classList.contains("hidden")){
    infoPanel.classList.add("hidden");
    toggleInfoIcon.classList.remove("fa-eye");
    toggleInfoIcon.classList.add("fa-eye-slash");
  }
}
function showInfoPanel(){
  if (infoPanel.classList.contains("hidden")){
    infoPanel.classList.remove("hidden");
    toggleInfoIcon.classList.remove("fa-eye-slash");
    toggleInfoIcon.classList.add("fa-eye");
  }
}
toggleInfoBtn.addEventListener("click", ()=>{
  if (infoPanel.classList.contains("hidden")) showInfoPanel();
  else hideInfoPanel();
});

/***************
 * Iframe events
 ***************/
preview.addEventListener("load", ()=>{
  preview.classList.remove("loading");
  const i = currentIndex;
  if (i < 0 || !links[i]) return;

  // Try to set title (same-origin only)
  try{
    const doc = preview.contentDocument || preview.contentWindow.document;
    if (doc && doc.title){
      links[i].title = doc.title.trim().slice(0,120);
      persist(); renderLinks();
      statusText.textContent = "Loaded: " + (links[i].title || hostnameFromUrl(links[i].url));
      return;
    }
  }catch(_){}
  statusText.textContent = "Loaded: " + hostnameFromUrl(links[i].url);
});

/***************
 * Filters & Shortcuts
 ***************/
[searchInput, visitedFilter, tagFilter].forEach(el=>{
  el.addEventListener("input", renderLinks);
  el.addEventListener("change", renderLinks);
});

document.addEventListener("keydown", (e)=>{
  const tag = (e.target.tagName||"").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  const key = e.key.toLowerCase();
  if (key === "n") nextLink();
  if (key === "r") refreshIframe();
});

/***************
 * Init
 ***************/
function renderAll(){ applyTagFilterOptions(); renderLinks(); }
(function init(){ renderAll(); })();

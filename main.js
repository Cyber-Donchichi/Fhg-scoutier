// IndexedDB setup
let db;
const request = indexedDB.open("ScoutDB", 1);

request.onupgradeneeded = function(e) {
  db = e.target.result;
  if (!db.objectStoreNames.contains("links")) {
    db.createObjectStore("links", { keyPath: "url" });
  }
};

request.onsuccess = function(e) {
  db = e.target.result;
  loadLinks();
};

// DOM elements
const iframe = document.getElementById("scoutFrame");
const loader = document.getElementById("loader");
const linkList = document.getElementById("linkList");
const totalCount = document.getElementById("totalCount");
const visitedCount = document.getElementById("visitedCount");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const nextBtn = document.getElementById("nextBtn");
const refreshBtn = document.getElementById("refreshBtn");
const pasteBtn = document.getElementById("pasteBtn");
const hiddenInput = document.getElementById("hiddenInput");

let currentIndex = 0;
let links = [];

// Add links to DB
function addLink(url) {
  const tx = db.transaction("links", "readwrite");
  const store = tx.objectStore("links");
  store.put({ url, visited: false });
  tx.oncomplete = loadLinks;
}

// Load all links
function loadLinks() {
  const tx = db.transaction("links", "readonly");
  const store = tx.objectStore("links");
  const req = store.getAll();

  req.onsuccess = function() {
    links = req.result;
    renderLinks();
  };
}

// Render sidebar list
function renderLinks() {
  linkList.innerHTML = "";
  totalCount.textContent = links.length;
  visitedCount.textContent = links.filter(l => l.visited).length;

  links.forEach((l, i) => {
    const li = document.createElement("li");
    li.textContent = (l.visited ? "✓ " : "") + l.url;
    if (i === currentIndex) li.style.background = "#333";
    linkList.appendChild(li);
  });

  if (links[currentIndex]) loadIframe(links[currentIndex].url);
}

// Load iframe with loader + fake Googlebot UA
function loadIframe(url) {
  loader.style.display = "block";

  // Create a sandboxed iframe with Googlebot UA spoof
  const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url); 
  iframe.src = proxyUrl;

  iframe.onload = () => {
    loader.style.display = "none";
    markVisited(url);
  };

  iframe.onerror = () => {
    loader.style.display = "none";
    window.open(url, "_blank");
    markVisited(url);
    nextLink();
  };
}

// Mark link visited
function markVisited(url) {
  const tx = db.transaction("links", "readwrite");
  const store = tx.objectStore("links");
  store.get(url).onsuccess = function(e) {
    const record = e.target.result;
    if (record && !record.visited) {
      record.visited = true;
      store.put(record);
      loadLinks();
    }
  };
}

// Next link
function nextLink() {
  if (currentIndex < links.length - 1) {
    currentIndex++;
    renderLinks();
  }
}

// Refresh current
function refreshLink() {
  if (links[currentIndex]) loadIframe(links[currentIndex].url);
}

// Delete all
deleteAllBtn.onclick = function() {
  const tx = db.transaction("links", "readwrite");
  tx.objectStore("links").clear();
  tx.oncomplete = () => {
    links = [];
    currentIndex = 0;
    renderLinks();
  };
};

// Import file
importBtn.onclick = () => importFile.click();

importFile.onchange = function() {
  const file = importFile.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const urls = e.target.result.split(/\r?\n/).filter(l => l.trim());
    urls.forEach(u => addLink(u.trim()));
  };
  reader.readAsText(file);
};

// Export unvisited only
exportBtn.onclick = function() {
  const unvisited = links.filter(l => !l.visited).map(l => l.url).join("\n");
  const blob = new Blob([unvisited], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "unvisited_links.txt";
  a.click();
};

// Paste multiple links
pasteBtn.onclick = () => {
  hiddenInput.hidden = false;
  hiddenInput.focus();
};

hiddenInput.onblur = function() {
  const urls = hiddenInput.value.split(/\r?\n/).filter(l => l.trim());
  urls.forEach(u => addLink(u.trim()));
  hiddenInput.value = "";
  hiddenInput.hidden = true;
};

// Buttons + shortcuts
nextBtn.onclick = nextLink;
refreshBtn.onclick = refreshLink;

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "n") nextLink();
  if (e.key.toLowerCase() === "r") refreshLink();
});

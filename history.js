// ---------- Setup IndexedDB ----------
let db;
const request = indexedDB.open("FHG_History", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("history")) {
    const store = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    store.createIndex("url", "url", { unique: false });
    store.createIndex("timestamp", "timestamp", { unique: false });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  syncFromLocalStorage();
};

request.onerror = (e) => console.error("DB error", e);

// ---------- Sync localStorage → IndexedDB ----------
function syncFromLocalStorage() {
  const stored = JSON.parse(localStorage.getItem("fhgLinks") || "[]");
  if (!stored.length) {
    loadHistory();
    return;
  }

  const tx = db.transaction("history", "readwrite");
  const store = tx.objectStore("history");

  stored.forEach(item => {
    // Add with timestamp if not already present
    store.add({
      url: item.url,
      title: item.title || item.url,
      timestamp: Date.now()
    }).onsuccess = () => {
      // Clear localStorage after syncing
      localStorage.removeItem("fhgLinks");
    };
  });

  tx.oncomplete = () => loadHistory();
}

// ---------- Load history from IndexedDB ----------
function loadHistory() {
  const tx = db.transaction("history", "readwrite");
  const store = tx.objectStore("history");
  const request = store.getAll();

  request.onsuccess = () => {
    let items = request.result || [];

    // Auto-delete older than 1 month
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    items.forEach(item => {
      if (now - item.timestamp > oneMonth) {
        store.delete(item.id);
      }
    });

    renderHistory(items.filter(item => now - item.timestamp <= oneMonth));
  };
}

// ---------- Render UI ----------
function renderHistory(items) {
  const list = document.getElementById("historyList");
  const search = document.getElementById("searchHistory").value.toLowerCase();
  list.innerHTML = "";

  items
    .filter(item =>
      item.url.toLowerCase().includes(search) ||
      (item.title || "").toLowerCase().includes(search)
    )
    .sort((a, b) => b.timestamp - a.timestamp) // latest first
    .forEach(item => {
      const li = document.createElement("li");
      li.className = "link-item";

      li.innerHTML = `
        <div class="link-main">
          <div class="link-title">${item.title || item.url}</div>
          <div class="link-meta">${item.url}</div>
          <small>${new Date(item.timestamp).toLocaleString()}</small>
        </div>
      `;

      li.onclick = () => window.open(item.url, "_blank");
      list.appendChild(li);
    });
}

document.getElementById("searchHistory").addEventListener("input", loadHistory);

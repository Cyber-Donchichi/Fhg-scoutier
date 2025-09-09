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
  styleFixedHeader();
  createClearButton();
  syncFromLocalStorage();
  loadHistory();
};

request.onerror = (e) => console.error("DB error", e);

// ---------- Sync localStorage → IndexedDB ----------
function syncFromLocalStorage() {
  const stored = JSON.parse(localStorage.getItem("fhgLinks") || "[]");
  if (!stored.length) return;

  const tx = db.transaction("history", "readwrite");
  const store = tx.objectStore("history");

  stored.forEach(item => {
    store.add({
      url: item.url,
      title: item.title || item.url,
      timestamp: Date.now()
    });
  });

  localStorage.removeItem("fhgLinks"); // clear after sync
}

// ---------- Highlight matched text ----------
function highlight(text, search) {
  if (!search) return text;
  const regex = new RegExp(`(${search})`, "gi");
  return text.replace(regex, `<mark>$1</mark>`);
}

// ---------- Load history ----------
function loadHistory() {
  const tx = db.transaction("history", "readwrite");
  const store = tx.objectStore("history");
  const request = store.getAll();

  request.onsuccess = () => {
    let items = request.result || [];
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    items = items.filter(item => {
      if (now - item.timestamp > oneMonth) {
        store.delete(item.id);
        return false;
      }
      return true;
    });

    renderHistory(items);
  };
}

// ---------- Render ----------
function renderHistory(items) {
  const list = document.getElementById("historyList");
  const search = document.getElementById("searchHistory").value.toLowerCase();
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = "<li class='empty'>No history found.</li>";
    return;
  }

  items
    .filter(item =>
      item.url.toLowerCase().includes(search) ||
      (item.title || "").toLowerCase().includes(search)
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach(item => {
      const li = document.createElement("li");
      li.className = "link-item";

      const title = highlight(item.title || item.url, search);
      const url = highlight(item.url, search);

      li.innerHTML = `
        <div class="link-main">
          <div class="link-title">${title}</div>
          <div class="link-meta">${url}</div>
          <small>${new Date(item.timestamp).toLocaleString()}</small>
        </div>
        <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
      `;

      // Open link
      li.querySelector(".link-main").onclick = () => window.open(item.url, "_blank");

      // Delete only this item
      li.querySelector(".delete-btn").onclick = (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      };

      // Style delete button
      const btn = li.querySelector(".delete-btn");
      btn.style.background = "transparent";
      btn.style.border = "none";
      btn.style.color = "#e63946";
      btn.style.fontSize = "18px";
      btn.style.cursor = "pointer";
      btn.style.marginLeft = "10px";
      btn.style.transition = "0.3s";
      btn.onmouseover = () => (btn.style.color = "#d62828");
      btn.onmouseout = () => (btn.style.color = "#e63946");

      list.appendChild(li);
    });
}

// ---------- Delete single ----------
function deleteHistoryItem(id) {
  const tx = db.transaction("history", "readwrite");
  const store = tx.objectStore("history");
  const req = store.delete(id);
  req.onsuccess = () => loadHistory();
}

// ---------- Clear All Button ----------
function createClearButton() {
  const header = document.querySelector(".panel");
  const clearBtn = document.createElement("button");

  clearBtn.textContent = "Clear All History";
  clearBtn.style.background = "#e63946";
  clearBtn.style.color = "#fff";
  clearBtn.style.border = "none";
  clearBtn.style.padding = "8px 16px";
  clearBtn.style.marginLeft = "10px";
  clearBtn.style.borderRadius = "6px";
  clearBtn.style.cursor = "pointer";
  clearBtn.style.fontWeight = "bold";
  clearBtn.style.transition = "0.3s";

  clearBtn.onmouseover = () => (clearBtn.style.background = "#d62828");
  clearBtn.onmouseout = () => (clearBtn.style.background = "#e63946");

  clearBtn.onclick = () => {
    if (confirm("Are you sure you want to clear all history?")) {
      const tx = db.transaction("history", "readwrite");
      const store = tx.objectStore("history");
      const clearReq = store.clear();
      clearReq.onsuccess = () => loadHistory();
    }
  };

  header.appendChild(clearBtn);
}

// ---------- Fix Header + Scroll ----------
function styleFixedHeader() {
  const panel = document.querySelector(".panel");
  panel.style.position = "sticky";
  panel.style.top = "0";
  panel.style.zIndex = "100";
  panel.style.background = "#fff";
  panel.style.display = "flex";
  panel.style.alignItems = "center";
  panel.style.padding = "10px";

  const list = document.getElementById("historyList");
  list.style.maxHeight = "70vh";
  list.style.overflowY = "auto";
  list.style.marginTop = "10px";
  list.style.padding = "0 10px";
}

// ---------- Events ----------
document.getElementById("searchHistory").addEventListener("input", loadHistory);
window.onload = loadHistory;

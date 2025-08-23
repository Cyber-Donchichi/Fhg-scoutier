// Load saved data from localStorage
let data = JSON.parse(localStorage.getItem("scoutData")) || { links: [] };
let { links } = data;

const linkList = document.getElementById("linkList");
const iframeDisplay = document.getElementById("iframeDisplay");
const urlInput = document.getElementById("urlInput");

// Render saved links
function renderLinks() {
  linkList.innerHTML = "";
  links.forEach((link, index) => {
    let li = document.createElement("li");
    li.className = "flex justify-between items-center bg-gray-100 px-2 py-1 rounded";
    li.innerHTML = `
      <span class="truncate w-40 cursor-pointer text-blue-600 hover:underline">${link}</span>
      <button class="text-red-500 hover:text-red-700"><i class="fa-solid fa-xmark"></i></button>
    `;
    li.querySelector("span").onclick = () => loadIframe(link);
    li.querySelector("button").onclick = () => removeLink(index);
    linkList.appendChild(li);
  });
}

// Save to localStorage
function saveData() {
  localStorage.setItem("scoutData", JSON.stringify({ links }));
}

// Load URL in iframe
function loadIframe(url) {
  if (!url.startsWith("http")) url = "https://" + url;
  iframeDisplay.src = url;
}

// Add new link
document.getElementById("addBtn").onclick = () => {
  let url = urlInput.value.trim();
  if (url) {
    links.push(url);
    saveData();
    renderLinks();
    loadIframe(url);
    urlInput.value = "";
  }
};

// Remove link
function removeLink(index) {
  links.splice(index, 1);
  saveData();
  renderLinks();
}

// Clear all
document.getElementById("clearBtn").onclick = () => {
  links = [];
  saveData();
  renderLinks();
};

// Export links
document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify({ links }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "links.json";
  a.click();
  URL.revokeObjectURL(url);
};

// Import links
document.getElementById("importFile").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      let imported = JSON.parse(event.target.result);
      if (imported.links) {
        links = [...links, ...imported.links];
        saveData();
        renderLinks();
      }
    } catch {
      alert("Invalid file format.");
    }
  };
  reader.readAsText(file);
};

// Translate button (simulate clicking Google widget)
document.getElementById("translateBtn").onclick = () => {
  let frame = document.querySelector("iframe");
  if (frame) {
    alert("Google Translate will translate this page into English. Look at the top bar.");
    document.querySelector("#google_translate_element select")?.value = "en";
    document.querySelector("#google_translate_element select")?.dispatchEvent(new Event("change"));
  }
};

// Initial render
renderLinks();

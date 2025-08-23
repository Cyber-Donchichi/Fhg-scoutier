// Dark/Light mode toggle
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// Iframe loading overlay
const iframe = document.getElementById("iframeDisplay");
const overlay = document.getElementById("overlay");
iframe.addEventListener("load", () => {
  overlay.style.display = "none";
});

// Toggle iframe boxes
const toggleBtn = document.getElementById("toggleBoxes");
let boxesVisible = true;
toggleBtn.addEventListener("click", () => {
  const sections = document.querySelectorAll("section:not(:last-child)");
  boxesVisible = !boxesVisible;
  sections.forEach(sec => sec.style.display = boxesVisible ? "block" : "none");
  toggleBtn.innerHTML = boxesVisible
    ? '<i class="fas fa-eye-slash"></i> Hide Boxes'
    : '<i class="fas fa-eye"></i> Show Boxes';
});

// Translate to English
function translateToEnglish() {
  const select = document.querySelector("#google_translate_element select");
  if (select) {
    select.value = "en";
    select.dispatchEvent(new Event("change"));
  }
}

// Saved links handling
let data = JSON.parse(localStorage.getItem("scoutData")) || { links: [] };
const linkList = document.getElementById("linkList");

function renderLinks() {
  linkList.innerHTML = "";
  data.links.forEach((url, i) => {
    const li = document.createElement("li");
    li.className = "flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded";
    li.innerHTML = `<span>${url}</span>
      <button onclick="removeLink(${i})" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>`;
    linkList.appendChild(li);
  });
  localStorage.setItem("scoutData", JSON.stringify(data));
}
function removeLink(i) {
  data.links.splice(i, 1);
  renderLinks();
}
document.getElementById("addBtn").addEventListener("click", () => {
  const url = document.getElementById("urlInput").value.trim();
  if (url) {
    data.links.push(url);
    renderLinks();
    iframe.src = url;
  }
});
document.getElementById("clearBtn").addEventListener("click", () => {
  data.links = [];
  renderLinks();
});
document.getElementById("refreshBtn").addEventListener("click", () => iframe.contentWindow.location.reload());
document.getElementById("nextBtn").addEventListener("click", () => {
  if (data.links.length > 0) {
    const next = data.links.shift();
    data.links.push(next);
    iframe.src = next;
    renderLinks();
  }
});
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scoutData.json";
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (imported.links) {
        data.links = imported.links;
        renderLinks();
      }
    } catch (err) {
      alert("Invalid file format");
    }
  };
  reader.readAsText(file);
});

renderLinks();

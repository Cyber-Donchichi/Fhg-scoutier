let data = JSON.parse(localStorage.getItem("scoutData")) || { links: [], visited: [] };
let { links, visited } = data;

const linkList = document.getElementById("linkList");
const preview = document.getElementById("preview");
const counterEl = document.querySelector(".counter");
let currentIndex = -1;

function saveData() {
  localStorage.setItem("scoutData", JSON.stringify({ links, visited }));
}

function renderLinks() {
  linkList.innerHTML = "";
  
  links.forEach((url, index) => {
    const li = document.createElement("li");
    li.textContent = url;
    
    if (visited.includes(index)) {
      li.classList.add("visited");
    } else {
      li.onclick = () => openLink(index);
    }
    
    if (index === currentIndex) li.classList.add("active");
    linkList.appendChild(li);
  });
  
  updateCounter();
}

function updateCounter() {
  counterEl.textContent = `${visited.length} / ${links.length} links scouted`;
}

function addLink() {
  const input = document.getElementById("urlInput");
  const raw = input.value.trim();
  if (raw) {
    const newLinks = raw.split(/[\n,\s]+/).map(l => {
      if (!l.startsWith("http://") && !l.startsWith("https://")) {
        return "https://" + l;
      }
      return l;
    });
    newLinks.forEach(url => {
      if (!links.includes(url)) links.push(url);
    });
    saveData();
    renderLinks();
  }
  input.value = "";
}

function openLink(index) {
  if (!visited.includes(index)) {
    preview.src = links[index];
    currentIndex = index;
    visited.push(index);
    saveData();
    renderLinks();
    checkReset();
  }
}

function nextLink() {
  for (let i = currentIndex + 1; i < links.length; i++) {
    if (!visited.includes(i)) return openLink(i);
  }
}

function prevLink() {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (!visited.includes(i)) return openLink(i);
  }
}

function deleteAllLinks() {
  if (confirm("Delete ALL links?")) {
    links = [];
    visited = [];
    localStorage.removeItem("scoutData");
    preview.src = "";
    currentIndex = -1;
    renderLinks();
  }
}

function exportLinks() {
  const remaining = links.filter((_, i) => !visited.includes(i));
  const textContent = remaining.join("\n"); // each link on new line
  const blob = new Blob([textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "scouted_links.txt"; // Save as TXT
  a.click();
  
  URL.revokeObjectURL(url);
}

function importLinks(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        imported.forEach(url => {
          if (!links.includes(url)) links.push(url);
        });
        saveData();
        renderLinks();
        alert("Links imported successfully!");
      } else {
        alert("Invalid file format.");
      }
    } catch {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}

function checkReset() {
  if (visited.length >= links.length && links.length > 0) {
    visited = [];
    saveData();
    renderLinks();
    alert("All links scouted! Resetting for a new round.");
  }
}

// Status display for iframe
const statusEl = document.createElement("div");
statusEl.style.padding = "6px";
statusEl.style.fontSize = "14px";
statusEl.style.color = "#555";
document.querySelector(".sidebar").appendChild(statusEl);

preview.addEventListener("load", () => {
  try {
    const doc = preview.contentDocument || preview.contentWindow.document;
    if (!doc) return;
    
    statusEl.textContent = "";
    
    if (locationMatchesContact(preview.src)) {
      statusEl.textContent = "On contact page";
      return;
    }
    
    const linksOnPage = [...doc.querySelectorAll("a")];
    const contactLink = linksOnPage.find(link =>
      /contact/i.test(link.textContent) || /contact/i.test(link.href)
    );
    
    if (contactLink) {
      statusEl.textContent = "Jumping to contact page...";
      preview.src = contactLink.href;
    } else {
      statusEl.textContent = "No contact link detected";
    }
  } catch (err) {
    console.log("Cross-domain restriction:", err.message);
    console.log("Contact page may exist (cannot check)");
  }
});

function locationMatchesContact(url) {
  return /contact/i.test(url);
}

renderLinks();

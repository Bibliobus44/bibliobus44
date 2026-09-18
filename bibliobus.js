const APPSCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbEQyVU3c6O12vMksWvl4wr-vIxsvPc1XByxrYhWrK343zDG0-8zh4TiZ4x-dmDWA/exec";

function convertirUrlImageDrive(url) {
  if (!url) return "";

  return url.replace(
    /https:\/\/drive\.google\.com\/uc\?export=view&id=([^&"'\s]+)/g,
    "https://drive.google.com/thumbnail?id=$1&sz=w1200"
  );
}

let articles = [];


function parseCSV(csv) {
  csv = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = csv.split("\n").slice(1).filter(l => l.trim() !== "");
  return lines;
}

function parseCSVLine(line) {
  const cols = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "\t" && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else current += char;
  }
  cols.push(current.trim());
  return cols;
}


function ouvrirArticle(index) {
  const article = articles[index];
  if (!article) return;

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('article-titre').textContent = article.titre;
  document.getElementById('article-date').textContent = article.date;
  document.getElementById('article-categorie-view').textContent = article.categorie;
  document.getElementById('article-texte').innerHTML = convertirUrlImageDrive(article.contenu);
  document.getElementById('page-article').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  activerLiensAuto();
  
  setTimeout(() => {
    const imgs = document.querySelectorAll('.article-contenu img');
    imgs.forEach((img, index) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => ouvrirLightbox(img, index));
    });
  }, 100);
}

function fermerArticle() {
  document.getElementById('page-article').classList.remove('active');
  showTab('articles');
}


function normalizeCategory(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}


function afficherArticlesParCategorie(categorie, gridId) {
  let ordre = "recent";

  if(categorie==="news"){

    ordre =
    document.getElementById("sort-news").value;

  }

  else if(categorie==="tan'ecdotes"){

    ordre =
    document.getElementById("sort-tanecdotes").value;

  }

  else if(categorie==="archives"){

    ordre =
    document.getElementById("sort-archives").value;

  }

  else if(categorie==="extras"){

    ordre =
    document.getElementById("sort-extras").value;

  }

  let filtres = articles.filter(a => normalizeCategory(a.categorie) === normalizeCategory(categorie));

  filtres = 
  trierArticles(
    filtres,
    ordre
  );

  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (filtres.length === 0) {
    grid.innerHTML = `
      <div class="placeholder">
        <h3>Aucun article dans cette catégorie</h3>
        <p>Les contenus seront publiés prochainement.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtres.map(article => {
    const index = articles.indexOf(article);
    return `
      <div class="article-card" onclick="ouvrirArticle(${index})">
        ${article.image ? `<img src="${article.image}" alt="${article.titre}" />` : ""}
        <span class="article-badge">${article.categorie}</span>
        <h3>${article.titre}</h3>
        <div class="article-footer">
          <span>${article.date}</span>
          <span class="article-lire">Lire →</span>
        </div>
      </div>`;
  }).join("");
}

function afficherDerniersArticles(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const recents = [...articles]
  .sort((a, b) => b.dateTri - a.dateTri)
  .slice(0, 8);
  
  if (recents.length === 0) {
    grid.innerHTML = `
      <div class="placeholder">
        <h3>Aucun article pour le moment</h3>
        <p>Les contenus seront publiés prochainement.</p>
      </div>`;
    return;
  }

  grid.innerHTML = recents.map(article => {
    const index = articles.indexOf(article);
    return `
      <div class="article-card" onclick="ouvrirArticle(${index})">
        ${article.image ? `<img src="${article.image}" alt="${article.titre}" />` : ""}
        <span class="article-badge">${article.categorie}</span>
        <h3>${article.titre}</h3>
        <div class="article-footer">
          <span>${article.date}</span>
          <span class="article-lire">Lire →</span>
        </div>
      </div>`;
  }).join("");
}


function formaterDate(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString);

  if (isNaN(d.getTime())) return dateString;

  const jour = String(d.getDate()).padStart(2, "0");
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const annee = d.getFullYear();

  const heures = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
}


async function chargerArticles() {
  try {
    const res = await fetch(APPSCRIPT_URL + "?action=list");
    if (!res.ok) throw new Error("Erreur API Apps Script");

    const articlesData = await res.json();

    articles = articlesData.map(a => ({
      titre: a.title || "",
      date: formaterDate(a.date),
      dateTri: new Date(a.date),
      categorie: a.categorie || "",
      image: convertirUrlImageDrive(a.img || ""),
      contenu: convertirUrlImageDrive(a.content || "")
    }));

    afficherDerniersArticles("articles-grid");
    afficherArticlesParCategorie("tan'ecdotes", "tanecdotes-grid");
    afficherArticlesParCategorie("extras", "extras-grid");
    afficherArticlesParCategorie("archives", "archives-grid");
    afficherArticlesParCategorie("news", "news-grid");

  } catch (e) {
    console.error("Erreur chargement articles :", e);
    document.getElementById("articles-grid").innerHTML = `
      <div class="placeholder">
        <h3>Impossible de charger les articles</h3>
        <p>Erreur de connexion au serveur.</p>
      </div>`;
  }
}


function activerLiensAuto() {
  const zone = document.querySelector(".article-contenu");
  if (!zone) return;

  const urlRegex = /((https?:\/\/|www\.)[^\s]+)/gi;

  function remplacer(node) {
    if (node.nodeType === 3) {
      const texte = node.nodeValue;
      if (texte.match(urlRegex)) {
        const span = document.createElement("span");
        span.innerHTML = texte.replace(urlRegex, function(url) {
          let lien = url;
          if (!url.startsWith("http")) lien = "https://" + url;
          return '<a href="' + lien + '" target="_blank">' + url + '</a>';
        });
        node.replaceWith(span);
      }
    } else if (node.nodeType === 1 && node.tagName !== "A" && node.tagName !== "IMG") {
      node.childNodes.forEach(remplacer);
    }
  }

  remplacer(zone);
}


chargerArticles();


let lightboxImages = [];
let lightboxIndex = 0;

function ouvrirLightbox(img, index) {
  lightboxImages = Array.from(document.querySelectorAll('.article-contenu img'));
  lightboxIndex = index;
  document.getElementById('lightbox-img').src = img.src;
  document.getElementById('lightbox').style.display = 'flex';
}

function fermerLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

function lightboxNav(direction) {
  lightboxIndex += direction;
  if (lightboxIndex < 0) lightboxIndex = lightboxImages.length - 1;
  if (lightboxIndex >= lightboxImages.length) lightboxIndex = 0;
  document.getElementById('lightbox-img').src = lightboxImages[lightboxIndex].src;
}


const lightbox = document.getElementById('lightbox');

if (lightbox) {
  lightbox.addEventListener('click', function(e) {
    if (e.target === this) fermerLightbox();
  });
}

document.addEventListener("keydown", (e) => {

  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {

    e.preventDefault();

    document
      .querySelectorAll(".tab-panel")
      .forEach(p => p.classList.remove("active"));

    document
      .getElementById("page-admin")
      .classList.add("active");

    window.scrollTo(0,0);

  }

});

const menuBtn =
    document.getElementById("mobile-menu-btn");

const navLinks =
    document.querySelector(".nav-links");

menuBtn.addEventListener("click",()=>{

    navLinks.classList.toggle("active");
  
menuBtn.textContent =
    navLinks.classList.contains("active")
        ? "✕"
        : "☰";

});

document.querySelectorAll(".nav-links button").forEach(btn => {

    btn.addEventListener("click", () => {

        navLinks.classList.remove("active");

        menuBtn.textContent = "☰";

    });

});

document.addEventListener("click",function(e){

    const preview =
        e.target.closest(
            ".youtube-preview"
        );

    if(!preview) return;

    const id =
        preview.dataset.video;

    document
        .getElementById(
            "video-container"
        ).innerHTML = `
<iframe
src="https://www.youtube.com/embed/${id}?autoplay=1"
allowfullscreen>
</iframe>
`;

    document
        .getElementById(
            "video-lightbox"
        )
        .classList
        .remove("hidden");

});

document.addEventListener("click",(e)=>{

    if(e.target.id==="close-video"){

        document
        .getElementById("video-lightbox")
        .classList
        .add("hidden");

        document
        .getElementById("video-container")
        .innerHTML="";

    }

});

function rechercherArticles(){

    const recherche =
        document.getElementById(
            "article-search"
        ).value.toLowerCase();

    if(recherche===""){

        afficherDerniersArticles(
            "articles-grid"
        );

        return;

    }

    const resultats =
        articles.filter(article => {

        return (

            article.titre
                .toLowerCase()
                .includes(recherche)

            ||

            article.contenu
                .toLowerCase()
                .includes(recherche)

            ||

            article.categorie
                .toLowerCase()
                .includes(recherche)

        );

    });

    afficherResultatsRecherche(
        resultats
    );

}

function afficherResultatsRecherche(resultats){

    const grid =
        document.getElementById(
            "articles-grid"
        );

    if(resultats.length===0){

        grid.innerHTML = `
        <div class="placeholder">

        <h3>
        Aucun article trouvé
        </h3>

        </div>
        `;

        return;

    }

    grid.innerHTML =
        resultats.map(article => {

        const index =
            articles.indexOf(article);

        return `

        <div
        class="article-card"
        onclick="ouvrirArticle(${index})">

        ${article.image ?
        `<img src="${article.image}">`
        : ""}

        <span class="article-badge">
        ${article.categorie}
        </span>

        <h3>
        ${article.titre}
        </h3>

        <div class="article-footer">

        <span>
        ${article.date}
        </span>

        <span class="article-lire">
        Lire →
        </span>

        </div>

        </div>

        `;

    }).join("");

}

document.addEventListener(
    "input",
    function(e){

    if(
        e.target.id==="article-search"
    ){

        rechercherArticles();

    }

});


const searchBtn = document.getElementById("search-btn");
const searchOverlay = document.getElementById("search-overlay");
const closeSearch = document.getElementById("close-search");
const searchInput = document.getElementById("article-search");
const searchResults = document.getElementById("search-results");

if (searchBtn && searchOverlay) {

    searchBtn.addEventListener("click", () => {

        searchOverlay.classList.add("active");

        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);

    });

}

if (closeSearch && searchOverlay) {

    closeSearch.addEventListener("click", () => {
        searchOverlay.classList.remove("active");
    });

}

if (searchOverlay) {

    searchOverlay.addEventListener("click", (e) => {

        if (e.target === searchOverlay) {
            searchOverlay.classList.remove("active");
        }

    });

}

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape" && searchOverlay) {
        searchOverlay.classList.remove("active");
    }

});

function trierArticles(liste, ordre){

    const copie = [...liste];

    copie.sort((a,b)=>{

        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if(ordre==="old"){

            return dateA - dateB;

        }

        return dateB - dateA;

    });

    return copie;

}

document.querySelectorAll(
"select[id^='sort-']"
).forEach(select=>{

    select.addEventListener(
        "change",
        ()=>{

            afficherDerniersArticles(
                "articles-grid"
            );

            afficherArticlesParCategorie(
                "news",
                "news-grid"
            );

            afficherArticlesParCategorie(
                "tan'ecdotes",
                "tanecdotes-grid"
            );

            afficherArticlesParCategorie(
                "archives",
                "archives-grid"
            );

            afficherArticlesParCategorie(
                "extras",
                "extras-grid"
            );

        }
    );

});


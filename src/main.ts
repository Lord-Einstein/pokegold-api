import './styles/style.css'
import './components/poke-list-card'

import { pokeListApiFetcher, pokeLiteApiFetcher } from './services/details-api'

const displayLimit = 12;
const NOT_FOUND_IMAGE = "https://cdn3d.iconscout.com/3d/premium/thumb/poke-ball-3d-icon-png-download-4198044.png";

type LitePokemon = {
  name: string;
  url: string;
}

let currentOffset = 0;
let totalPokemons = 0;
let onSearchMode = false;

//je fais un pseudo cache pour optimiser la recherche instantanée et je le vide par sécu
let pokeCache: LitePokemon[] = [];
let currentSearchResults: LitePokemon[] = [];

const appDiv = document.querySelector<HTMLDivElement>('#app')!;

appDiv.innerHTML = `
  <div class="app-container">
    <h1 class="app-title">Pokédex</h1>

    <div class="search-container">
        <input type="text" id="search-input" class="search-input" placeholder="Rechercher un Pokémon (par Nom ou ID)...">
    </div>
    
    <div class="pagination-container" id="pagination-controls">
      <button id="btn-prev" disabled>◀</button>
      
      <div class="page-selector">
          Page <input type="number" id="page-input" class="page-input" value="1" min="1"> 
          <span style="color: var(--text-muted)">sur</span> <span id="total-pages">...</span>
      </div>

      <button id="btn-next">▶</button>
    </div>

    <div id="pokemon-container" class="cards-grid">
    </div>
    
  </div>
`;

const container = document.getElementById('pokemon-container')!;
const btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
const pageInput = document.getElementById('page-input') as HTMLInputElement;
const totalPagesSpan = document.getElementById('total-pages')!;
const paginationControls = document.getElementById('pagination-controls')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;


/**
 * Affichage des squelettes pour éviter l'effet qui casse
 */
function renderSkeletons() {
  const skeletons = Array(displayLimit).fill('<div class="skeleton-card"></div>').join('');
  container.innerHTML = skeletons;
}

function calculateTotalPages(totalRecups: number) {
  return Math.ceil(totalRecups / displayLimit);
}

function updatePaginationUI() {

  let maxCount = 0;

  if(onSearchMode){
    maxCount = currentSearchResults.length;
  } else {
    maxCount = totalPokemons;
  }

  if (maxCount === 0) {
    paginationControls.style.display = 'none';
  } else {
    paginationControls.style.display = 'inline-flex';
  }

  const currentPage = (currentOffset / displayLimit) + 1;
  const totalPages = calculateTotalPages(maxCount);

  pageInput.value = currentPage.toString();
  pageInput.max = totalPages.toString();
  totalPagesSpan.textContent = totalPages.toString();

  btnPrev.disabled = (currentPage <= 1);
  btnNext.disabled = (currentPage >= totalPages);
}

function getIdFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 2];
}

/**
 * Fonction principale pour charger et afficher une page
*/
async function loadPage(offset: number) {

  onSearchMode = false;
  searchInput.value = "";

  renderSkeletons();

  const data = await pokeListApiFetcher(offset, displayLimit);

  if (!data) {
    container.innerHTML = '<p>Erreur de chargement.</p>';
    return;
  }

  //mettre à jour le total des eléments poke
  totalPokemons = data.count;

  const cardsHtml = data.results.map(pokemon => {
    const id = getIdFromUrl(pokemon.url);
    return `<pokemon-card pokemon-id="${id}"></pokemon-card>`;
  }).join('');

  container.innerHTML = cardsHtml;

  updatePaginationUI();
}

function displaySearchResultsPage() {
    const pageItems = currentSearchResults.slice(currentOffset, currentOffset + displayLimit);

    const cardsHtml = pageItems.map(p => {
        return `<pokemon-card pokemon-id="${getIdFromUrl(p.url)}"></pokemon-card>`;
    }).join('');

    container.innerHTML = cardsHtml;
    updatePaginationUI();
}

async function instantSearchManager() {
  const searchEntry = searchInput.value.trim().toLowerCase();

  if(searchEntry === "") {
    if(!onSearchMode) return;
    
    onSearchMode = false;
    currentOffset = 0; //revenir au début de l'affichage
    loadPage(currentOffset);
    return;

  }

  onSearchMode = true;
  currentOffset = 0; //pour revenir à la first page dès qu'on lance une recherche;


  //Filtre automatique sur mon cache dans filter
  const filter = pokeCache.filter(p => {
    const id = getIdFromUrl(p.url);
    return p.name.includes(searchEntry) || id === searchEntry;
  });

  // Merde fallait mettre à jour ! putaiiiiiiiiiin !!!! Il m'a fait chier celui là!!!!!
  currentSearchResults = filter;

  //Si il le trouve pas..
  if (filter.length === 0) {
    container.innerHTML = `
      <div class="not-found-container">
        <img src="${NOT_FOUND_IMAGE}" alt="Introuvable" class="bounce-img">
        <div class="shadow-pulse"></div>
        <h3>Introuvable...</h3>
        <p>Aucun Pokémon ne correspond à "<strong>${searchEntry}</strong>"</p>
      </div>
    `;
    // je cache aussi la pagin
    updatePaginationUI();
    return;
  }

  displaySearchResultsPage();

}


function goToNextPage() {
  const maxCount = onSearchMode ? currentSearchResults.length : totalPokemons;

  if (currentOffset + displayLimit < maxCount) {
    currentOffset += displayLimit;
    
    if (onSearchMode) {
      displaySearchResultsPage();
    } else {
      loadPage(currentOffset);
    }
  }
}

function goToPreviousPage() {
  if (currentOffset > 0) {
    currentOffset -= displayLimit;
      
    if (onSearchMode) {
      displaySearchResultsPage();
    } else {
      loadPage(currentOffset);
    }
  }
}


/**
 * Changer de page à partir de l'input
 */
function handleInputNavigation() {

  let page = parseInt(pageInput.value);
    
  // ensuite calculer max selon le mode
  const maxCount = onSearchMode ? currentSearchResults.length : totalPokemons;
  const maxPages = calculateTotalPages(maxCount);

  if (isNaN(page) || page < 1) page = 1;
  if (page > maxPages) page = maxPages;

  currentOffset = (page - 1) * displayLimit;

  if (onSearchMode) {
    displaySearchResultsPage();
  } else {
    loadPage(currentOffset);
  }
}

(async function initApp() {
  //charger ma page
  loadPage(0);
  
  // pendant le chargement de base je télécharge la liste complète pour la recherche..mo cache
  const fullList = await pokeLiteApiFetcher();
  pokeCache = fullList; //récupérer le tableau en LitePokemon
  console.log("Base de données Pokémon chargée : ", pokeCache.length, "entrées."); //Ligne de debug
})();


btnPrev.addEventListener('click', goToPreviousPage);
btnNext.addEventListener('click', goToNextPage);

pageInput.addEventListener('change', handleInputNavigation);
searchInput.addEventListener('input', instantSearchManager);
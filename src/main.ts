import './styles/style.css'
import './components/poke-list-card'

import { pokeLiteApiFetcher, fetchFiltersList, fetchPokemonByFilter } from './services/details-api'

const displayLimit = 12;
const NOT_FOUND_IMAGE = "https://cdn3d.iconscout.com/3d/premium/thumb/poke-ball-3d-icon-png-download-4198044.png";

type LitePokemon = { name: string; url: string; };
type SortMode = 'id' | 'name';
type OrderMode = 'asc' | 'desc';

let masterList: LitePokemon[] = []; 
let currentDisplayList: LitePokemon[] = []; 

let currentOffset = 0;

let activeSort: SortMode = 'id';
let activeOrder: OrderMode = 'asc';

const appDiv = document.querySelector<HTMLDivElement>('#app')!;

appDiv.innerHTML = `
  <div class="app-container">
    <h1 class="app-title">Pokédex Pro</h1>

    <div class="search-container">
        <input type="text" id="search-input" class="search-input" placeholder="✨ Chercher un Pokémon...">
    </div>

    <div class="filter-wrapper">
        <button id="toggle-filters" class="filter-toggle-btn">
            Filtres & Tris
        </button>
        <div id="filter-panel" class="filter-panel">
            <div class="filter-grid">
                
                <select id="select-type" class="custom-select">
                    <option value="all"> Tous les Types</option>
                </select>
                <select id="select-gen" class="custom-select">
                    <option value="all"> Toutes Générations</option>
                </select>
                <select id="select-ability" class="custom-select">
                    <option value="all"> Toutes Capacités</option>
                </select>

                <button id="sort-id" class="sort-btn active">
                    <span></span> ID <span id="icon-id">▲</span>
                </button>
                <button id="sort-name" class="sort-btn">
                    <span></span> Nom <span id="icon-name"></span>
                </button>

            </div>
        </div>
    </div>
    
    <div class="pagination-container" id="pagination-controls">
      <button id="btn-prev" disabled>◀</button>
      <div class="page-selector">
          Page <input type="number" id="page-input" class="page-input" value="1" min="1"> 
          <span style="color: var(--text-muted)">sur</span> <span id="total-pages">...</span>
      </div>
      <button id="btn-next">▶</button>
    </div>

    <div id="pokemon-container" class="cards-grid"></div>
  </div>
`;

const container = document.getElementById('pokemon-container')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const paginationControls = document.getElementById('pagination-controls')!;
const btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
const pageInput = document.getElementById('page-input') as HTMLInputElement;
const totalPagesSpan = document.getElementById('total-pages')!;
const filterPanel = document.getElementById('filter-panel')!;
const btnToggleFilters = document.getElementById('toggle-filters')!;

const selectType = document.getElementById('select-type') as HTMLSelectElement;
const selectGen = document.getElementById('select-gen') as HTMLSelectElement;
const selectAbility = document.getElementById('select-ability') as HTMLSelectElement;
const btnSortId = document.getElementById('sort-id') as HTMLButtonElement;
const btnSortName = document.getElementById('sort-name') as HTMLButtonElement;



function getIdFromUrl(url: string): number {
    const parts = url.split('/').filter(Boolean); //avec le .filter(Boolean) je peut direct enlever les espaces et les strings nulls donc dans tous les cas je retrouverai l'id dans las dernière case
    return parseInt(parts[parts.length - 1]);
}

function renderSkeletons() {
    container.innerHTML = Array(displayLimit).fill('<div class="skeleton-card"></div>').join('');
}


/**
 * Je prend la `masterList`, j'applique la recherche texte et applique le tri puis ensuite
 * met à jour `currentDisplayList`.
 */
function mainProcess() {
    const term = searchInput.value.trim().toLowerCase();

    //filtrer par texte
    let temp = masterList;
    if (term !== "") {
        temp = masterList.filter(p => {
            const id = getIdFromUrl(p.url).toString();
            return p.name.includes(term) || id === term;
        });
    }

    //tri en sort
    temp.sort((a, b) => {
        let valA, valB;
        if (activeSort === 'id') {
            valA = getIdFromUrl(a.url);
            valB = getIdFromUrl(b.url);
        } else {
            valA = a.name;
            valB = b.name;
        }

        if (activeOrder === 'asc') return valA > valB ? 1 : -1;
        else return valA < valB ? 1 : -1;
    });

    currentDisplayList = temp;
    
    currentOffset = 0;
    updatePaginationUI();
    renderPage();
}

/**
 * Affiche la page courante basée sur currentDisplayList et currentOffset
 */
function renderPage() {
    if (currentDisplayList.length === 0) {
        container.innerHTML = `
            <div class="not-found-container">
                <img src="${NOT_FOUND_IMAGE}" alt="Introuvable" class="bounce-img">
                <div class="shadow-pulse"></div>
                <p>Aucun résultat...</p>
            </div>`;
        return;
    }

    //Découper l'affichage en fonction de la limite
    const pageItems = currentDisplayList.slice(currentOffset, currentOffset + displayLimit);
    
    const html = pageItems.map(p => 
        `<pokemon-card pokemon-id="${getIdFromUrl(p.url)}"></pokemon-card>`
    ).join('');

    container.innerHTML = html;
}

function updatePaginationUI() {
    const total = currentDisplayList.length;
    const totalPages = Math.ceil(total / displayLimit);
    const currentPage = Math.floor(currentOffset / displayLimit) + 1;

    if (total === 0) {
        paginationControls.style.display = 'none';
        return;
    }
    paginationControls.style.display = 'inline-flex';

    pageInput.value = currentPage.toString();
    pageInput.max = totalPages.toString();
    totalPagesSpan.textContent = totalPages.toString();
    
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
}


//filtres
async function loadFilterOptions() {
    const types = await fetchFiltersList('type');
    types.forEach((t: any) => {
        selectType.innerHTML += `<option value="${t.url}">${t.name.toUpperCase()}</option>`;
    });

    const gens = await fetchFiltersList('generation');
    gens.forEach((g: any) => {
        selectGen.innerHTML += `<option value="${g.url}">Génération ${g.name.split('-')[1].toUpperCase()}</option>`;
    });

    const abilities = await fetchFiltersList('ability');
    abilities.forEach((a: any) => {
        selectAbility.innerHTML += `<option value="${a.url}">Capacité: ${a.name}</option>`;
    });
}

// Quand on change un Select
async function handleFilterSelect(type: 'type' | 'gen' | 'ability', url: string) {
    renderSkeletons();
    
    // Réinitialiser les autres selects pour éviter les confusions (API limitation)
    if(type !== 'type') selectType.value = 'all';
    if(type !== 'gen') selectGen.value = 'all';
    if(type !== 'ability') selectAbility.value = 'all';

    if (url === 'all') {
        masterList = await pokeLiteApiFetcher();
    } else {
        masterList = await fetchPokemonByFilter(url);
    }

    mainProcess();
}



btnToggleFilters.addEventListener('click', () => {
    filterPanel.classList.toggle('open');
});

selectType.addEventListener('change', (e) => handleFilterSelect('type', (e.target as HTMLSelectElement).value));
selectGen.addEventListener('change', (e) => handleFilterSelect('gen', (e.target as HTMLSelectElement).value));
selectAbility.addEventListener('change', (e) => handleFilterSelect('ability', (e.target as HTMLSelectElement).value));

function updateSortUI() {
    btnSortId.classList.remove('active');
    btnSortName.classList.remove('active');
    document.getElementById('icon-id')!.innerText = '';
    document.getElementById('icon-name')!.innerText = '';

    const arrow = activeOrder === 'asc' ? '▲' : '▼';

    if (activeSort === 'id') {
        btnSortId.classList.add('active');
        document.getElementById('icon-id')!.innerText = arrow;
    } else {
        btnSortName.classList.add('active');
        document.getElementById('icon-name')!.innerText = arrow;
    }
    mainProcess();
}

btnSortId.addEventListener('click', () => {
    if (activeSort === 'id') {
        activeOrder = activeOrder === 'asc' ? 'desc' : 'asc';
    } else {
        activeSort = 'id';
        activeOrder = 'asc';
    }
    updateSortUI();
});

btnSortName.addEventListener('click', () => {
    if (activeSort === 'name') {
        activeOrder = activeOrder === 'asc' ? 'desc' : 'asc';
    } else {
        activeSort = 'name';
        activeOrder = 'asc';
    }
    updateSortUI();
});

searchInput.addEventListener('input', mainProcess);

pageInput.addEventListener('change', () => {
    let page = parseInt(pageInput.value);
    const totalPages = Math.ceil(currentDisplayList.length / displayLimit);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentOffset = (page - 1) * displayLimit;
    renderPage();
    updatePaginationUI();
});

btnPrev.addEventListener('click', () => {
    currentOffset -= displayLimit;
    renderPage();
    updatePaginationUI();
});

btnNext.addEventListener('click', () => {
    currentOffset += displayLimit;
    renderPage();
    updatePaginationUI();
});


(async function init() {
    renderSkeletons();
    // je pré-charge les listes de filtre
    loadFilterOptions();
    
    //charger les pokemons
    masterList = await pokeLiteApiFetcher();
    
    mainProcess();
})();
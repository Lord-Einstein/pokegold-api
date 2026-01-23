import './styles/style.css'
import './components/poke-list-card'

import { pokeLiteApiFetcher, fetchFiltersList, fetchPokemonByFilter } from './services/details-api'

const isMobile = window.innerWidth < 768;
const displayLimit = isMobile ? 4 : 4;
const NOT_FOUND_IMAGE = "https://cdn3d.iconscout.com/3d/premium/thumb/poke-ball-3d-icon-png-download-4198044.png";

type LitePokemon = { name: string; url: string; };
type SortMode = 'id' | 'name';
type OrderMode = 'asc' | 'desc';

let fullRepository: LitePokemon[] = []; 
let filteredRepository: LitePokemon[] = [];
let currentDisplayList: LitePokemon[] = []; 

let currentOffset = 0;

let activeSort: SortMode = 'id';
let activeOrder: OrderMode = 'asc';

const appDiv = document.querySelector<HTMLDivElement>('#app')!;

appDiv.innerHTML = `
  <div class="app-container">
    <h1>
      <i class="fa-solid fa-dragon" style="font-size: 0.9em;"></i> 
      Pokédex
    </h1>

    <div class="controls-wrapper">
      <div class="search-container">
        <i class="fa-solid fa-search search-icon"></i>
        <input type="text" id="search-input" class="search-input" placeholder="Rechercher...">
      </div>

      <button id="toggle-filters" class="filter-toggle-btn">
        <i class="fa-solid fa-sliders"></i> Filtres
      </button>
    </div>

    <div id="filter-panel" class="filter-panel">
      <div class="filter-grid">
        <select id="select-type" class="custom-select">
          <option value="all">Tous Types</option>
        </select>
        <select id="select-gen" class="custom-select">
          <option value="all">Générations</option>
        </select>
        <select id="select-ability" class="custom-select">
          <option value="all">Capacités</option>
        </select>
        <button id="sort-id" class="sort-btn active">
          <i class="fa-solid fa-hashtag"></i> ID <span id="icon-id">▲</span>
        </button>
        <button id="sort-name" class="sort-btn">
          <i class="fa-solid fa-font"></i> Nom <span id="icon-name"></span>
        </button>
      </div>
    </div>
    
    <div class="pagination-container" id="pagination-controls">
      <button id="btn-prev" disabled><i class="fa-solid fa-chevron-left"></i></button>
      <div class="page-selector">
        <input type="number" id="page-input" class="page-input" value="1" min="1">
        <span style="color: var(--text-secondary)"> / </span>
        <span id="total-pages">...</span>
      </div>
      <button id="btn-next"><i class="fa-solid fa-chevron-right"></i></button>
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
    const parts = url.split('/').filter(Boolean);
    return parseInt(parts[parts.length - 1]);
}

function renderSkeletons() {
    container.innerHTML = Array(displayLimit).fill('<div class="skeleton-card"></div>').join('');
}

function mainProcess() {
    const term = searchInput.value.trim().toLowerCase();

    let temp = filteredRepository;
    if (term !== "") {
        temp = filteredRepository.filter(p => {
            const id = getIdFromUrl(p.url).toString();
            return p.name.includes(term) || id.includes(term);
        });
    }

    temp.sort((a, b) => {
        let valA: number | string, valB: number | string;
        
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
    
    if(currentOffset >= currentDisplayList.length) {
        currentOffset = 0;
    }
    
    updatePaginationUI();
    renderPage();
}

function renderPage() {
    if (currentDisplayList.length === 0) {
        container.style.opacity = '1';
        container.innerHTML = `
            <div class="not-found-container">
                <img src="${NOT_FOUND_IMAGE}" alt="Introuvable" class="bounce-img">
                <h3>Aucun Pokémon trouvé</h3>
                <p>Modifiez vos critères de recherche</p>
            </div>`;
        return;
    }

    const pageItems = currentDisplayList.slice(currentOffset, currentOffset + displayLimit);
    
    // Transition fluide instantanée
    container.style.opacity = '0';
    
    setTimeout(() => {
        const html = pageItems.map((p, index) => 
            `<pokemon-card pokemon-id="${getIdFromUrl(p.url)}" style="animation-delay: ${index * 0.05}s"></pokemon-card>`
        ).join('');

        container.innerHTML = html;
        container.style.opacity = '1';

        // Scroll instantané vers le haut des cartes
        window.scrollTo({
            top: container.offsetTop - 120,
            behavior: 'instant'
        });
    }, 200);
}

function updatePaginationUI() {
    const total = currentDisplayList.length;
    const totalPages = Math.ceil(total / displayLimit);
    const currentPage = Math.floor(currentOffset / displayLimit) + 1;

    if (total === 0) {
        paginationControls.style.display = 'none';
        return;
    }
    paginationControls.style.display = 'flex';

    pageInput.value = currentPage.toString();
    pageInput.max = totalPages.toString();
    totalPagesSpan.textContent = totalPages.toString();
    
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
}


async function loadFilterOptions() {
    const [types, gens, abilities] = await Promise.all([
        fetchFiltersList('type'),
        fetchFiltersList('generation'),
        fetchFiltersList('ability')
    ]);

    types.forEach((t: any) => {
        selectType.innerHTML += `<option value="${t.url}">${t.name.toUpperCase()}</option>`;
    });

    gens.forEach((g: any) => {
        const genNum = g.name.split('-')[1];
        selectGen.innerHTML += `<option value="${g.url}">Gen ${genNum.toUpperCase()}</option>`;
    });

    abilities.forEach((a: any) => {
        selectAbility.innerHTML += `<option value="${a.url}">${a.name}</option>`;
    });
}

async function applyAllFilters() {
    renderSkeletons();

    const typeUrl = selectType.value;
    const genUrl = selectGen.value;
    const abilityUrl = selectAbility.value;

    let listsToIntersect: LitePokemon[][] = [];

    try {
        if (typeUrl !== 'all') {
            const response = await fetchPokemonByFilter(typeUrl);
            listsToIntersect.push(response);
        }

        if (genUrl !== 'all') {
            const response = await fetchPokemonByFilter(genUrl);
            listsToIntersect.push(response);
        }

        if (abilityUrl !== 'all') {
            const response = await fetchPokemonByFilter(abilityUrl);
            listsToIntersect.push(response);
        }

        if (listsToIntersect.length === 0) {
            filteredRepository = [...fullRepository];
        } else {
            let result = listsToIntersect[0];

            for (let i = 1; i < listsToIntersect.length; i++) {
                const currentSet = new Set(listsToIntersect[i].map(p => p.name));
                result = result.filter(p => currentSet.has(p.name));
            }
            
            filteredRepository = result;
        }

        currentOffset = 0;
        mainProcess();

    } catch (e) {
        console.error("Erreur de filtrage.", e);
        container.innerHTML = `<p style="color:#c03028; grid-column: 1 / -1;">Erreur lors du filtrage</p>`;
    }
}


btnToggleFilters.addEventListener('click', () => {
    filterPanel.classList.toggle('open');
});

selectType.addEventListener('change', applyAllFilters);
selectGen.addEventListener('change', applyAllFilters);
selectAbility.addEventListener('change', applyAllFilters);

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
    loadFilterOptions();
    
    fullRepository = await pokeLiteApiFetcher();
    filteredRepository = [...fullRepository];
    
    mainProcess();
})();
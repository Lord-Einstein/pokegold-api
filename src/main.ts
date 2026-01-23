import './styles/style.css'
import './components/poke-list-card'
import { POKEPEDIA_TYPE_IMAGES, GEN_ICONS } from './global-consts/pokepedia-icons' // Importe le fichier créé étape 1
import { pokeLiteApiFetcher, fetchFiltersList, fetchPokemonByFilter } from './services/details-api'

const isMobile = window.innerWidth < 768;
const displayLimit = isMobile ? 4 : 8; // J'ai remis 8 pour desktop, plus sympa
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

// --- Gestion d'état des filtres (plus de .value sur les select) ---
let activeFilters = {
    type: 'all',
    gen: 'all',
    ability: 'all'
};

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
        
        <div id="dropdown-type" class="custom-select-container">
            <div class="select-trigger">
                <span>Tous Types</span>
                <i class="fa-solid fa-chevron-down arrow"></i>
            </div>
            <div class="select-options">
                <div class="select-option selected" data-value="all">Tous Types</div>
                </div>
        </div>

        <div id="dropdown-gen" class="custom-select-container">
            <div class="select-trigger">
                <span>Générations</span>
                <i class="fa-solid fa-chevron-down arrow"></i>
            </div>
            <div class="select-options">
                <div class="select-option selected" data-value="all">Toutes Générations</div>
            </div>
        </div>

        <div id="dropdown-ability" class="custom-select-container">
             <div class="select-trigger">
                <span>Capacités</span>
                <i class="fa-solid fa-chevron-down arrow"></i>
            </div>
            <div class="select-options">
                <div class="select-option selected" data-value="all">Toutes Capacités</div>
            </div>
        </div>

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

// -- Selecteurs --
const container = document.getElementById('pokemon-container')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const paginationControls = document.getElementById('pagination-controls')!;
const btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
const pageInput = document.getElementById('page-input') as HTMLInputElement;
const totalPagesSpan = document.getElementById('total-pages')!;
const filterPanel = document.getElementById('filter-panel')!;
const btnToggleFilters = document.getElementById('toggle-filters')!;
const btnSortId = document.getElementById('sort-id') as HTMLButtonElement;
const btnSortName = document.getElementById('sort-name') as HTMLButtonElement;


// --- LOGIQUE CUSTOM DROPDOWN ---
function setupDropdown(id: string, onSelect: (val: string) => void) {
    const container = document.getElementById(id)!;
    const trigger = container.querySelector('.select-trigger')!;
    const optionsContainer = container.querySelector('.select-options')!;
    const triggerText = trigger.querySelector('span')!;

    // Toggle ouverture
    trigger.addEventListener('click', (e) => {
        e.stopPropagation(); // Empêche la fermeture immédiate
        // Ferme les autres
        document.querySelectorAll('.custom-select-container').forEach(el => {
            if(el !== container) el.classList.remove('open');
        });
        container.classList.toggle('open');
    });

    // Sélection d'une option (Event Delegation)
    optionsContainer.addEventListener('click', (e) => {
        const option = (e.target as HTMLElement).closest('.select-option');
        if (!option) return;

        const val = option.getAttribute('data-value');
        if (!val) return;

        // Visuel
        optionsContainer.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        // Mise à jour du texte du trigger (on clone le contenu HTML pour garder l'image)
        triggerText.innerHTML = option.innerHTML;

        container.classList.remove('open');
        onSelect(val);
    });
}

// Fermeture au clic dehors
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-container').forEach(el => el.classList.remove('open'));
});


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
    
    container.style.opacity = '0';
    
    setTimeout(() => {
        const html = pageItems.map((p, index) => 
            `<pokemon-card pokemon-id="${getIdFromUrl(p.url)}" style="animation-delay: ${index * 0.05}s"></pokemon-card>`
        ).join('');

        container.innerHTML = html;
        container.style.opacity = '1';

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

    // --- Remplissage TYPES avec Images Pokepedia ---
    const typesContainer = document.querySelector('#dropdown-type .select-options')!;
    types.forEach((t: any) => {
        const imgUrl = POKEPEDIA_TYPE_IMAGES[t.name] || ''; 
        // Si on a une image, on l'affiche, sinon juste le texte
        const content = imgUrl 
            ? `<img src="${imgUrl}" alt="${t.name}" class="option-type-img"> ${t.name.toUpperCase()}`
            : t.name.toUpperCase();

        typesContainer.innerHTML += `
            <div class="select-option" data-value="${t.url}">
                ${content}
            </div>`;
    });

    // --- Remplissage GENERATIONS ---
    const gensContainer = document.querySelector('#dropdown-gen .select-options')!;
    gens.forEach((g: any) => {
        const genNum = g.name.split('-')[1] || ''; // ex: generation-i -> i
        // Petit icône de chiffre ou texte simple
        const icon = GEN_ICONS[g.name] || '🎮';
        
        gensContainer.innerHTML += `
            <div class="select-option" data-value="${g.url}">
                <span>${icon} Gen ${genNum.toUpperCase()}</span>
            </div>`;
    });

    // --- Remplissage ABILITIES ---
    const abilitiesContainer = document.querySelector('#dropdown-ability .select-options')!;
    abilities.forEach((a: any) => {
        abilitiesContainer.innerHTML += `
            <div class="select-option" data-value="${a.url}">
                📜 ${a.name}
            </div>`;
    });

    // --- Initialisation des événements Dropdown ---
    setupDropdown('dropdown-type', (val) => {
        activeFilters.type = val;
        applyAllFilters();
    });
    setupDropdown('dropdown-gen', (val) => {
        activeFilters.gen = val;
        applyAllFilters();
    });
    setupDropdown('dropdown-ability', (val) => {
        activeFilters.ability = val;
        applyAllFilters();
    });
}

async function applyAllFilters() {
    renderSkeletons();

    // On utilise notre objet d'état au lieu de .value
    const typeUrl = activeFilters.type;
    const genUrl = activeFilters.gen;
    const abilityUrl = activeFilters.ability;

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

// Les événements 'change' sont maintenant gérés dans setupDropdown via callback

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
    loadFilterOptions(); // Va charger les listes et construire les dropdowns
    
    fullRepository = await pokeLiteApiFetcher();
    filteredRepository = [...fullRepository];
    
    mainProcess();
})();
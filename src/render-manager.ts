import './styles/style.css'
import './components/poke-list-card'
import './components/poke-details-modal'
import './global-consts/components-style-consts'
import { DEFAULT_IMAGE, TYPE_ICONS, GEN_ICONS } from './global-consts/consts'
import { fetchFiltersList, fetchPokemonByFilter, pokeLiteApiFetcher } from './services/details-api'

import "./components/team-builder";

const isMobile = window.innerWidth < 768;
const displayLimit = isMobile ? 1 : 8;

type LitePokemon = { name: string; url: string; };
type SortMode = 'id' | 'name';
type OrderMode = 'asc' | 'desc';

let fullRepository: LitePokemon[] = []; 
let filteredRepository: LitePokemon[] = [];
let currentDisplayList: LitePokemon[] = []; 

const corrruptedTypes = ["unknown", "stellar", "shadow"];

let currentOffset = 0;
let activeSort: SortMode = 'id';
let activeOrder: OrderMode = 'asc';

let activeFilters = {
    type: 'all',
    gen: 'all',
    ability: 'all'
};


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

// 👇 AJOUT : Récupération du bouton Équipe
const btnTeamOpen = document.getElementById('btn-team-open') as HTMLButtonElement;


function setupDropdown(id: string, onSelect: (val: string) => void) {
    const container = document.getElementById(id)!;
    const trigger = container.querySelector('.select-trigger')!;
    const optionsContainer = container.querySelector('.select-options')!;
    const triggerText = trigger.querySelector('span')!;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-container').forEach(el => {
            if(el !== container) el.classList.remove('open');
        });
        container.classList.toggle('open');
    });

    optionsContainer.addEventListener('click', (e) => {
        const option = (e.target as HTMLElement).closest('.select-option');
        if (!option) return;

        const val = option.getAttribute('data-value');
        if (!val) return;

        optionsContainer.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        triggerText.innerHTML = option.innerHTML;

        container.classList.remove('open');
        onSelect(val);
    });
}

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
                <img src="${DEFAULT_IMAGE}" alt="Introuvable" class="bounce-img">
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

    //remplir le select des types 
    const typesContainer = document.querySelector('#dropdown-type .select-options')!;
    types.forEach((t: any) => {

        //Condition pour ne pas mettre les types corrompus
        if(!(corrruptedTypes.includes(t.name))) {

            const imgUrl = TYPE_ICONS[t.name] || ''; 
            const content = imgUrl 
                ? `<img src="${imgUrl}" alt="${t.name}" class="option-type-img">`
                : t.name.toUpperCase();

            typesContainer.innerHTML += `
                <div class="select-option" data-value="${t.url}">
                    ${content}
                </div>
            `;
        }
       
    });

    //remplir les générations
    const gensContainer = document.querySelector('#dropdown-gen .select-options')!;
    gens.forEach((g: any) => {
        const genNum = g.name.split('-')[1] || '?';
        const icon = GEN_ICONS[g.name] || '❓';
        
        gensContainer.innerHTML += `
            <div class="select-option" data-value="${g.url}">
                <span>${icon} Gen ${genNum.toUpperCase()}</span>
            </div>
        `;
    });

    //Afficher les abilities
    const abilitiesContainer = document.querySelector('#dropdown-ability .select-options')!;
    abilities.forEach((a: any) => {
        abilitiesContainer.innerHTML += `
            <div class="select-option" data-value="${a.url}">
                📜 ${a.name}
            </div>`;
    });

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


//gérer la modale
let activeKeyListener: ((e: KeyboardEvent) => void) | null = null;

function openModal(pokemonId: number | string) {
    const oldModal = document.querySelector('pokemon-detail');
    if (oldModal) oldModal.remove();

    if (activeKeyListener) {
        document.removeEventListener('keydown', activeKeyListener);
        activeKeyListener = null;
    }

    const targetId = Number(pokemonId);

    const currentIndex = currentDisplayList.findIndex(p => getIdFromUrl(p.url) === targetId);

    let prevId: number | null = null;
    let nextId: number | null = null;
    let canNavigate = false;
    if (currentIndex !== -1) {
        canNavigate = true;
        
        const targetPageOffset = Math.floor(currentIndex / displayLimit) * displayLimit;
        if (targetPageOffset !== currentOffset) {
            currentOffset = targetPageOffset;
            renderPage();
            updatePaginationUI();
        }

        const total = currentDisplayList.length;
        const prevIndex = (currentIndex - 1 + total) % total;
        const nextIndex = (currentIndex + 1) % total;

        prevId = getIdFromUrl(currentDisplayList[prevIndex].url);
        nextId = getIdFromUrl(currentDisplayList[nextIndex].url);
    }
    const detailElement = document.createElement('pokemon-detail');
    detailElement.setAttribute('pokemon-id', targetId.toString());

    if (canNavigate && prevId !== null && nextId !== null) {
        detailElement.setAttribute('prev-id', prevId.toString());
        detailElement.setAttribute('next-id', nextId.toString());
    }

    detailElement.addEventListener('navigate-pokemon', (e: Event) => {
        const customEvent = e as CustomEvent;
        openModal(Number(customEvent.detail.id));
    });

    activeKeyListener = (e: KeyboardEvent) => {
        if (canNavigate) {
            if (e.key === 'ArrowLeft' && prevId) {
                openModal(prevId);
            } else if (e.key === 'ArrowRight' && nextId) {
                openModal(nextId);
            }
        }
        if (e.key === 'Escape') {
            detailElement.remove();
            if (activeKeyListener) document.removeEventListener('keydown', activeKeyListener);
        }
    };
    document.addEventListener('keydown', activeKeyListener);

    detailElement.addEventListener('close-modal', () => {
        detailElement.remove();
        if (activeKeyListener) document.removeEventListener('keydown', activeKeyListener);
    });

    document.body.appendChild(detailElement);
}

document.addEventListener('pokemon-clicked', (e: Event) => {
    const customEvent = e as CustomEvent;
    const pokemonId = Number(customEvent.detail.id);
    if (pokemonId) openModal(pokemonId);
});

document.addEventListener('open-modal', (e: Event) => {
    const customEvent = e as CustomEvent;
    const pokemonId = customEvent.detail;
    
    openModal(pokemonId);
});

export async function init() {
    renderSkeletons();
    loadFilterOptions();
    
    fullRepository = await pokeLiteApiFetcher();
    filteredRepository = [...fullRepository];

    const builder = document.createElement('team-builder') as any;
    document.body.appendChild(builder);
    
    if (btnTeamOpen) {
        btnTeamOpen.addEventListener('click', () => {
            builder.toggleOpen();
        });
    }

    mainProcess();
};
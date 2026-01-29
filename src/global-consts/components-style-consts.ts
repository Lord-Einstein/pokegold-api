export const POKE_CARD_COMPONENT_STYLE = `
  <style>
    :host {
      display: block;
      width: 100%;
      perspective: 1000px;
    }
    
    .card {
      position: relative;
      background: linear-gradient(135deg, #2a2f36 0%, #1e2329 100%);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid rgba(139, 92, 46, 0.4);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      transform-style: preserve-3d;
      min-height: 360px;
      min-width: 250px;

      transform: rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg));
      transform-style: preserve-3d;
    }

    /* Bordure décorative intérieure */
    .card::before {
      content: '';
      position: absolute;
      inset: 6px;
      border-radius: 6px;
      border: 1px solid rgba(139, 92, 46, 0.2);
      pointer-events: none;
      z-index: 1;
    }

    /* Gradient de type en haut */
    .card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: radial-gradient(
        ellipse at top,
        var(--type-color, rgba(201, 168, 106, 0.15)) 0%,
        transparent 70%
      );
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 0;
    }

    .card:hover {
      transform: translateY(-8px) rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg));
      border-color: var(--type-color, #c9a86a);
      box-shadow: 
        0 12px 24px rgba(0, 0, 0, 0.7),
        0 0 20px var(--type-glow, rgba(201, 168, 106, 0.3));
    }

    .card:hover::after {
      opacity: 1;
    }

    /* Coins décoratifs */
    .corner {
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid var(--type-color, #8b5c2e);
      opacity: 0.4;
      z-index: 2;
      transition: opacity 0.3s;
    }

    .card:hover .corner {
      opacity: 1;
    }

    .corner-tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
    .corner-tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
    .corner-bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
    .corner-br { bottom: 8px; right: 8px; border-left: none; border-top: none; }

    .card-content {
      position: relative;
      z-index: 3;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ID Badge en haut */
    .card-id {
      display: inline-block;
      padding: 0.3rem 0.8rem;
      background: rgba(139, 92, 46, 0.3);
      border: 1px solid rgba(201, 168, 106, 0.4);
      border-radius: 4px;
      color: var(--type-color, #c9a86a);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
      text-shadow: 0 0 8px var(--type-glow, rgba(201, 168, 106, 0.4));
    }

    /* Image du Pokemon */
    .card-img-wrapper {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0.5rem 0;
      position: relative;
    }

    .card-img {
      width: 90%;
      height: 150%;
      //max-height: 100%;
      object-fit: contain;
      filter: 
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.8))
        drop-shadow(0 0 20px var(--type-glow, rgba(201, 168, 106, 0.2)));
      transition: transform 0.3s ease;
    }

    .card:hover .card-img {
      //transform: scale(1.1);
      filter: 
        drop-shadow(0 10px 20px rgba(0, 0, 0, 0.9))
        drop-shadow(0 0 30px var(--type-glow, rgba(201, 168, 106, 0.4)));
    }

    /* Nom du Pokemon */
    .card-name {
      text-transform: capitalize;
      font-size: 1.1rem;
      font-weight: 700;
      color: #e8e6e3;
      letter-spacing: 0.5px;
      margin: 0.6rem 0;
      text-align: center;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
    }

    /* Types */
    .types {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: nowrap;
      margin-top: auto;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.6rem;
      background: transparent;
      border: 0px solid rgba(139, 92, 46, 0.3);
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      color: #a09b93;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-icon {
      font-size: 0.85rem;
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    }

    .type-img{
      width: auto;
      height: 18px;
      object-fit: contain;
      filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
    }

    .loading, .error {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      color: #666;
    }

    .error {
      color: #c03028;
    }

    @media (max-width: 767px) {
      .card {
        padding: 0.8rem;
      }

      .card-id {
        font-size: 0.7rem;
        padding: 0.25rem 0.6rem;
      }

      .card-name {
        font-size: 0.95rem;
      }

      .type-badge {
        font-size: 0.6rem;
        padding: 0.2rem 0.5rem;
      }
    }
  </style>
`;

export const appDiv = document.querySelector<HTMLDivElement>('#app')!;
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


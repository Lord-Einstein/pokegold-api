import type { Pokemon } from "../types/poke-type.ts";
import { pokeApiFetcher } from "../services/poke-api.ts";
import { DEFAULT_IMAGE, TYPE_COLORS, TYPE_ICONS } from "../global-consts/consts.ts"
import { POKE_CARD_COMPONENT_STYLE } from "../global-consts/components-style-consts.ts"

export class PokemonGridCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    const pokemonId = this.getAttribute("pokemon-id");

    if (!pokemonId) {
      this.renderError("Aucun ID");
      return;
    }

    try {
      const data = await pokeApiFetcher(pokemonId);
      if (data) {
        this.renderGridPokemon(data);
        this.attachInteractions(data);
      } else {
        this.renderError("Erreur");
      }
    } catch (error) {
      this.renderError("Erreur");
      console.error(error);
    }
  }

  attachInteractions(data: Pokemon) {
    const card = this.shadowRoot?.querySelector('.card') as HTMLElement;
    if (!card) return;

    
    card.addEventListener('mousemove', (e: MouseEvent) => {
      card.style.transition = 'none';
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 10;
      const rotateX = ((centerY - y) / centerY) * 10;
      const propX = (x / rect.width) * 100;
      const propY = (y / rect.height) * 100;

      card.style.setProperty('--rotate-x', `${rotateX}deg`);
      card.style.setProperty('--rotate-y', `${rotateY}deg`);
      card.style.setProperty('--pointer-x', `${propX}%`);
      card.style.setProperty('--pointer-y', `${propY}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s ease';
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
      card.style.setProperty('--pointer-x', '50%');
      card.style.setProperty('--pointer-y', '50%');
    });

    
    card.addEventListener('click', (e) => {
      
      if ((e.target as HTMLElement).closest('#add-btn')) return;

      const pokemonID = this.getAttribute("pokemon-id");
      this.dispatchEvent(new CustomEvent("pokemon-clicked", {
        detail: { id : pokemonID },
        bubbles: true,
        composed: true,
      }));
    });

    
    const addBtn = this.shadowRoot?.querySelector('#add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            const pokemonID = Number(this.getAttribute("pokemon-id"));
            const name = this.shadowRoot?.querySelector('.card-name')?.textContent || '';
            const img = this.shadowRoot?.querySelector('.card-img') as HTMLImageElement;
            const sprite = img ? img.src : '';
            
            const typeNames = data.types.map(t => t.type.name);

            addBtn.animate([
                { transform: 'scale(0.9)' },
                { transform: 'scale(1.4)' },
                { transform: 'scale(1)' }
            ], { duration: 300 });

            this.dispatchEvent(new CustomEvent('add-to-team', {
                detail: { 
                    id: pokemonID,
                    name: name,
                    sprite: sprite,
                    types: typeNames
                },
                bubbles: true,
                composed: true
            }));
        });
    }
  }

  renderError(msg: string): void {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${POKE_CARD_COMPONENT_STYLE}
        <div class="card"><p class="error">${msg}</p></div>
      `;
    }
  }

  renderGridPokemon(pokemon: Pokemon) {
    const mainType = pokemon.types[0].type.name;
    const typeColor = TYPE_COLORS[mainType] || '#c9a86a';
    const typeGlow = typeColor.startsWith('#') 
        ? typeColor
        : typeColor.replace(")", ", 0.6)").replace('rgb', 'rgba'); 

    const typesHtml = pokemon.types.map((element) => {
        const typeName = element.type.name;
        const icon = TYPE_ICONS[typeName] || '❓';
        const specificColor = TYPE_COLORS[typeName] || '#777';
        return `
          <span class="type-badge" style="--badge-color: ${specificColor}">
            <img class="type-img" src="${icon}" alt="${typeName}">
            <span class="type-name">${typeName}</span>
          </span>
        `;
    }).join("");

    const sprites = pokemon.sprites;
    const image = 
      sprites.other?.home?.front_default ||
      sprites.other?.["official-artwork"]?.front_default ||
      sprites.front_default ||
      DEFAULT_IMAGE;

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${POKE_CARD_COMPONENT_STYLE}
        
        <style>
            /* ANIMATION HEARTBEAT (Le bouton respire) */
            @keyframes heartbeat {
                0% { transform: scale(1); filter: drop-shadow(0 0 1px var(--type-glow)); }
                50% { transform: scale(1.15); filter: drop-shadow(0 0 6px var(--type-glow)); }
                100% { transform: scale(1); filter: drop-shadow(0 0 1px var(--type-glow)); }
            }

            /* STYLE DU BOUTON SVG */
            .add-team-btn {
                background: none;
                border: none;
                padding: 0;
                margin-left: 12px;
                cursor: pointer;
                
                /* Taille de l'icône */
                width: 35px;
                height: 35px;
                
                /* Couleur dynamique selon le type */
                color: var(--type-color, #c9a86a);
                
                display: flex;
                align-items: center;
                justify-content: center;
                
                /* Animation permanente */
                animation: heartbeat 2s infinite ease-in-out;
                z-index: 10;
                transition: all 0.3s ease;
            }

            /* L'icône SVG elle-même */
            .add-team-btn svg {
                width: 100%;
                height: 100%;
                fill: currentColor; /* Prend la couleur du bouton */
                filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8)); /* Ombre noire pour contraste */
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            /* --- AU SURVOL --- */
            .add-team-btn:hover {
                animation: none; /* Stop le heartbeat */
                color: #ffffff; /* Devient blanc brillant */
                filter: drop-shadow(0 0 10px var(--type-color)); /* Glow intense de la couleur du type */
                transform: scale(1.2);
            }

            .add-team-btn:hover svg {
                transform: rotate(90deg); /* Rotation fun */
            }

            .add-team-btn:active {
                transform: scale(0.9);
            }

            /* Ajustement conteneur types */
            .types {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                margin-top: auto;
            }
        </style>

        <div class="card" style="--type-color: ${typeColor}; --type-glow: ${typeGlow}">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
          
          <div class="card-content">
            <div class="card-id">#${pokemon.id.toString().padStart(4, "0")}</div>
            <div class="card-img-wrapper">
              <img class="card-img" src="${image}" alt="${pokemon.name}" loading="lazy" />
            </div>
            <h2 class="card-name">${pokemon.name}</h2>
            
            <div class="types">
              ${typesHtml}
              
              <button class="add-team-btn" id="add-btn" title="Ajouter à l'équipe">
                 <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 11H13V5C13 4.45 12.55 4 12 4C11.45 4 11 4.45 11 5V11H5C4.45 11 4 11.45 4 12C4 12.55 4.45 13 5 13H11V19C11 19.55 11.45 20 12 20C12.55 20 13 19.55 13 19V13H19C19.55 13 20 12.55 20 12C20 11.45 19.55 11 19 11Z"/>
                 </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }
}

if (!customElements.get("pokemon-card")) {
  customElements.define("pokemon-card", PokemonGridCard);
}
import { DEFAULT_IMAGE, TYPE_COLORS, TYPE_ICONS, POKE_CARD_COMPONENT_STYLE } from "../global-consts/consts.ts"
import { pokeApiFetcher } from "../services/poke-api.ts";
import type { Pokemon } from "../types/poke-type.ts";


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

    this.renderLoading();

    try {
      const data = await pokeApiFetcher(pokemonId);
      if (data) {
        this.renderGridPokemon(data);
        this.attachInteractions();
      } else {
        this.renderError("Erreur");
      }
    } catch (error) {
      this.renderError("Erreur");
      console.error(error);
    }
  }

  attachInteractions() {
    const card = this.shadowRoot?.querySelector('.card') as HTMLElement;
    if (!card) return;

    card.addEventListener('mousemove', (e: MouseEvent) => {
      card.style.transition = 'none'; // Stop la transition pour la réactivité

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
  }

  renderLoading() {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${POKE_CARD_COMPONENT_STYLE}
        <div class="card">
          <div class="loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
        </div>
      `;
    }
  }

  renderError(msg: string): void {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${POKE_CARD_COMPONENT_STYLE}
        <div class="card">
          <p class="error">${msg}</p>
        </div>
      `;
    }
  }

  renderGridPokemon(pokemon: Pokemon) {
   
    const mainType = pokemon.types[0].type.name;
    const typeColor = TYPE_COLORS[mainType] || '#c9a86a';
    const typeGlow = typeColor.replace(')', ', 0.4)').replace('rgb', 'rgba');

    const typesHtml = pokemon.types
      .map((element) => {
        const typeName = element.type.name;
        const icon = TYPE_ICONS[typeName] || '⭐';
        return `
          <span class="type-badge">
            <span class="type-icon">${icon}</span>
            ${typeName}
          </span>
        `;
      })
      .join("");

    const sprites = pokemon.sprites;
    const image = 
      sprites.other?.home?.front_default ||
      sprites.other?.["official-artwork"]?.front_default ||
      sprites.front_default ||
      DEFAULT_IMAGE;

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${POKE_CARD_COMPONENT_STYLE}

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
// src/components/pokemon-card.ts
import { pokeApiFetcher } from "../services/poke-api.ts";
import type { Pokemon } from "../types/poke-type.ts";

const COMPONENT_STYLE = `
  <style>
    :host {
      display: block;
    }
    
    .card {
      /* Background Glass Dark */
      background: linear-gradient(145deg, rgba(40,40,40,0.8), rgba(20,20,20,0.95));
      backdrop-filter: blur(10px);
      color: #fff;
      
      width: 170px;
      border-radius: 16px;
      padding: 15px;
      text-align: center;
      
      /* Bordure fine dorée */
      border: 1px solid rgba(212, 175, 55, 0.15);
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    /* Effet de brillance au survol */
    .card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        transform: scale(0);
        transition: transform 0.4s;
        pointer-events: none;
    }

    .card:hover {
      transform: translateY(-8px) scale(1.02);
      border-color: #D4AF37; /* Gold */
      box-shadow: 0 12px 25px rgba(0,0,0,0.7), 0 0 10px rgba(212, 175, 55, 0.3);
    }
    
    .card:hover::before {
        transform: scale(1);
    }

    .card-img {
      width: 110px;
      height: 110px;
      object-fit: contain;
      filter: drop-shadow(0 8px 8px rgba(0,0,0,0.6));
      margin-bottom: 10px;
      transition: transform 0.3s;
    }

    .card:hover .card-img {
        transform: scale(1.1);
    }

    .card-id {
      color: #D4AF37; /* Gold ID */
      font-size: 0.75rem;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 5px;
      font-family: monospace;
    }

    .card-name {
      text-transform: capitalize;
      margin: 5px 0 10px 0;
      font-size: 1rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #f0f0f0;
    }

    .types {
      display: flex;
      justify-content: center;
      gap: 5px;
      flex-wrap: wrap;
    }

    .type-badge {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.65rem;
      color: #ccc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading, .error {
      font-size: 0.8rem;
      color: #888;
      padding: 30px 0;
    }
  </style>
`;

export class PokemonGridCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    const pokemonId = this.getAttribute("pokemon-id");

    if (!pokemonId) {
      this.renderError("Aucun ID correspondant");
      return;
    }

    this.renderLoading();

    try {
      const data = await pokeApiFetcher(pokemonId);
      if (data) {
        this.renderGridPokemon(data);
      } else {
        this.renderError("Erreur de requête.");
      }
    } catch (error) {
      this.renderError("Message d'erreur : ");
      console.error(error);
    }
  }

  renderLoading() {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${COMPONENT_STYLE}
        <div class="card">
          <div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>
        </div>
      `;
    }
  }

  renderError(msg: string): void {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${COMPONENT_STYLE}
        <div class="card" style="border-color: #ff4444;">
        <p class="error">${msg}</p>
        </div>
      `;
    }
  }

  renderGridPokemon(pokemon: Pokemon) {
    const DEFAULT_IMAGE = "https://cdn3d.iconscout.com/3d/premium/thumb/poke-ball-3d-icon-png-download-4198044.png";

    const typesHtml = pokemon.types
      .map((element) => `<span class="type-badge">${element.type.name}</span>`)
      .join("");

    const sprites = pokemon.sprites;
    const image =
      sprites.other?.home?.front_default ||
      sprites.other?.["official-artwork"]?.front_default ||
      sprites.front_default ||
      DEFAULT_IMAGE;

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        ${COMPONENT_STYLE}
        <div class="card">
          <div class="card-id">#${pokemon.id.toString().padStart(4, "0")}</div>
          <img class="card-img" src="${image}" alt="${pokemon.name}" loading="lazy" />
          <h2 class="card-name">${pokemon.name}</h2>
          <div class="types">
            ${typesHtml}
          </div>
        </div>
      `;
    }
  }
}

if (!customElements.get("pokemon-card")) {
  customElements.define("pokemon-card", PokemonGridCard);
}
import { pokeApiFetcher } from "../services/poke-api";
import { DEFAULT_IMAGE, TYPE_COLORS } from "../global-consts/consts.ts"
import type { Pokemon } from "../types/poke-type";



export class PokemonModalDetails extends HTMLElement {

    private _id: string | null = null;
    private _pokemon: Pokemon | null = null;

    constructor(){
        super();
        this.attachShadow({mode : 'open'});
    }

    //renvoyer l'attribut à surveiller pour le dynamisme de mon component, en static il devient un élément de la classe pas de l'objet même
    static get observedAttributes() {
        return ["pokemon-id"];
    }

    attributeChangedCallback( name: string, oldValue: string, newValue: string ) {
        if( (name === "pokemon-id") && (oldValue !== newValue) ) {
            this._id = newValue;
            this.fetchData();
        }
    }

    //Récupérer les infos avec l'id avec la fonction de poke-api
    async fetchData() {

        if(!this._id) return;

        this.renderLoading() //Fonction de chargement pendant le fetch
        try {
            this._pokemon = await pokeApiFetcher(this._id);
            if(this._pokemon) this.render();

        } catch(error) {
            console.error(error);
            if(this.shadowRoot) this.shadowRoot.innerHTML = `<div class="error">Impossible de charger le détails de ce Pokémon</div>`;
        }

    }

    private getStatsHTML(stats: any[]) {
        return stats.map(s => {
        const val = s.base_stat;
        const percent = Math.min((val / 255) * 100, 100); 
        
        let color = '#ff4d4d'; 
        if(val >= 60) color = '#ffa600';
        if(val >= 90) color = '#4caf50';

        return `
            <div class="stat-row">
            <span class="stat-name">${s.stat.name}</span>
            <span class="stat-val">${val}</span>
            <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width: ${percent}%; background-color: ${color};"></div>
            </div>
            </div>
        `;
        }).join('');
    }

    renderLoading() {
        if(this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>.modal-backdrop { position: fixed; inset:0; background: rgba(0,0,0,0.8); color: white; display:flex; justify-content:center; align-items:center; z-index:1000; }</style>
                <div class="modal-backdrop">Chargement...</div>
            `;
        }
    }

    render() {
        if (!this._pokemon || !this.shadowRoot) return;
        const pokemon = this._pokemon;

        const img = 
        pokemon.sprites.other?.home?.front_default ||
        pokemon.sprites.other?.["official-artwork"]?.front_default ||
        pokemon.sprites.front_default ||
        DEFAULT_IMAGE;

        const mainType = pokemon.types[0].type.name;
        const themeColor = TYPE_COLORS[mainType] || '#c9a86a';
        
        const cryUrl = pokemon.cries.latest;

        this.shadowRoot.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            
            .modal-backdrop {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center;
            z-index: 1000; /* Au dessus de tout */
            }

            .modal-content {
            background: #1e2329;
            border: 1px solid ${themeColor}; /* Bordure de la couleur du type */
            border-radius: 12px;
            width: 90%; max-width: 800px; height: 80vh;
            display: grid;
            grid-template-columns: 1fr 1fr; /* 2 colonnes : Image | Infos */
            box-shadow: 0 0 30px ${themeColor}40;
            position: relative;
            overflow: hidden;
            }

            /* Bouton Fermer */
            .close-btn {
                position: absolute; top: 15px; right: 20px;
                font-size: 2rem; color: #fff; cursor: pointer; z-index: 10;
                opacity: 0.7; transition: 0.2s;
            }
            .close-btn:hover { opacity: 1; transform: scale(1.1); }

            /* Colonne Gauche (Image) */
            .left-panel {
                background: linear-gradient(135deg, ${themeColor}30, transparent);
                display: flex; align-items: center; justify-content: center;
                position: relative;
            }
            .pokemon-img { 
                width: 85%; height: auto; 
                filter: drop-shadow(0 10px 15px rgba(0,0,0,0.6)); 
                animation: float 3s ease-in-out infinite;
            }

            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

            /* Colonne Droite (Infos) */
            .right-panel { 
                padding: 2rem; 
                overflow-y: auto; /* Scroll si trop long */
                color: #e8e6e3;
                font-family: 'Inter', sans-serif;
            }

            h2 { 
                font-size: 2.5rem; text-transform: capitalize; margin: 0; 
                color: ${themeColor}; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            .id-pill { 
                background: #111; padding: 4px 8px; border-radius: 4px; 
                font-size: 0.9rem; color: #666; font-family: monospace;
            }

            /* Lecteur Audio */
            .cry-container { margin: 20px 0; display: flex; align-items: center; gap: 10px; }
            .cry-btn {
                background: ${themeColor}; border: none; padding: 10px 20px; border-radius: 30px;
                color: #fff; font-weight: bold; cursor: pointer; 
                display: flex; align-items: center; gap: 8px;
                transition: filter 0.2s;
            }
            .cry-btn:hover { filter: brightness(1.2); }

            /* Stats Bars */
            .stats-container { 
                background: rgba(0,0,0,0.3); padding: 20px; 
                border-radius: 8px; margin-top: 10px; 
            }
            .stat-row { display: flex; align-items: center; margin-bottom: 10px; font-size: 0.9rem; }
            .stat-name { width: 100px; text-transform: capitalize; color: #aaa; }
            .stat-val { width: 35px; font-weight: bold; text-align: right; margin-right: 10px;}
            .stat-bar-bg { flex-grow: 1; height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
            .stat-bar-fill { height: 100%; border-radius: 3px; }

            /* Mobile */
            @media (max-width: 768px) {
                .modal-content { grid-template-columns: 1fr; grid-template-rows: 250px 1fr; height: 90vh; }
                .pokemon-img { width: 150px; }
            }
        </style>

        <div class="modal-backdrop" id="backdrop">
            <div class="modal-content">
            <span class="close-btn" id="close">&times;</span>
            
            <div class="left-panel">
                <img class="pokemon-img" src="${img}" alt="${pokemon.name}" />
            </div>

            <div class="right-panel">
                <div class="header">
                    <span class="id-pill">#${pokemon.id.toString().padStart(4, '0')}</span>
                    <h2>${pokemon.name}</h2>
                </div>

                <div class="cry-container">
                    <button class="cry-btn" id="play-cry">
                        <span>🔊</span> Cri
                    </button>
                </div>

                <div class="stats-container">
                    <h3 style="margin-top:0; font-size:1.1rem; color:#ccc;">Statistiques</h3>
                    ${this.getStatsHTML(pokemon.stats)}
                </div>
            </div>
            </div>
        </div>
        `;

        this.addInteractions(cryUrl);
    }

    addInteractions(cryUrl: string) {
        //fermeture au clic
        this.shadowRoot?.getElementById('close')?.addEventListener('click', () => this.close());
      
        //et cerise sur le cake ^^ fermeture au lic sur l'extérieur
        this.shadowRoot?.getElementById('backdrop')?.addEventListener('click', (e) => {
          if(e.target === this.shadowRoot?.getElementById('backdrop')) this.close();
        });
        //lire le son
        const btn = this.shadowRoot?.getElementById('play-cry');
        if(btn && cryUrl) {
            const audio = new Audio(cryUrl);
            audio.volume = 0.4;
            btn.addEventListener('click', () => {
                audio.play().catch(err => console.error("Erreur de lecture de l'audio:", err));
            });
        }
    }

    close() {
      this.dispatchEvent(new CustomEvent('close-detail', { bubbles: true, composed: true }));
      this.remove(); 
    }
}

if(!customElements.get('pokemon-detail')){
    customElements.define('pokemon-detail', PokemonModalDetails);
}

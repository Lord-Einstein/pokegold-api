import { pokeApiFetcher } from "../services/poke-api";
import { DEFAULT_IMAGE, TYPE_COLORS, TYPE_ICONS } from "../global-consts/consts.ts";
import type { Pokemon } from "../types/poke-type";

interface DamageRelation { name: string; url: string; }
interface TypeResponse { damage_relations: { double_damage_from: DamageRelation[]; half_damage_from: DamageRelation[]; no_damage_from: DamageRelation[]; }; }

export class PokemonModalDetails extends HTMLElement {
    private _id: string | null = null;
    private _pokemon: Pokemon | null = null;
    private _species: any | null = null;
    private _weaknesses: Map<string, number> = new Map();

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static get observedAttributes() { return ["pokemon-id"]; }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === "pokemon-id" && oldValue !== newValue) {
            this._id = newValue;
            this.fetchData();
        }
    }

    async fetchData() {
        if (!this._id) return;
        this.renderLoading();
        try {
            this._pokemon = await pokeApiFetcher(this._id);
            if (this._pokemon) {
                const speciesPromise = fetch(this._pokemon.species.url).then(r => r.json());
                const typesPromises = this._pokemon.types.map(t => fetch(t.type.url).then(r => r.json()));
                const [speciesData, ...typesData] = await Promise.all([speciesPromise, ...typesPromises]);
                
                this._species = speciesData;
                this.calculateWeaknesses(typesData);
                this.render();
            }
        } catch (error) {
            console.error(error);
            if (this.shadowRoot) this.shadowRoot.innerHTML = `<div class="error">Données corrompues.</div>`;
        }
    }

    calculateWeaknesses(typesData: TypeResponse[]) {
        this._weaknesses.clear();
        typesData.forEach(typeData => {
            typeData.damage_relations.double_damage_from.forEach(t => {
                const current = this._weaknesses.get(t.name) || 1;
                this._weaknesses.set(t.name, current * 2);
            });
             typeData.damage_relations.half_damage_from.forEach(t => {
                const current = this._weaknesses.get(t.name) || 1;
                this._weaknesses.set(t.name, current * 0.5);
            });
             typeData.damage_relations.no_damage_from.forEach(t => {
                this._weaknesses.set(t.name, 0);
            });
        });
    }

    renderLoading() {
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
            <style>.backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;justify-content:center;align-items:center;color:white;font-family:'Rajdhani';letter-spacing:2px;}</style>
            <div class="backdrop">CHARGEMENT DES DONNÉES...</div>`;
        }
    }

    getStatIconClass(statName: string): string {
        switch (statName) {
            case 'hp': return 'fa-heart';
            case 'attack': return 'fa-gavel';
            case 'defense': return 'fa-shield-halved';
            case 'special-attack': return 'fa-fire';
            case 'special-defense': return 'fa-shield-heart';
            case 'speed': return 'fa-wind';
            default: return 'fa-star';
        }
    }

    render() {
        if (!this._pokemon || !this.shadowRoot) return;
        const p = this._pokemon;
        
        const img = p.sprites.other?.home?.front_default || p.sprites.other?.["official-artwork"]?.front_default || DEFAULT_IMAGE;
        const mainType = p.types[0].type.name;
        const themeColor = TYPE_COLORS[mainType] || '#c9a86a';
        
        const flavorEntry = this._species?.flavor_text_entries.find((e: any) => e.language.name === 'fr') 
                          || this._species?.flavor_text_entries.find((e: any) => e.language.name === 'en');
        const description = flavorEntry ? flavorEntry.flavor_text.replace(/[\f\n]/g, ' ') : "Aucune description disponible.";

        const typesHTML = p.types.map(t => {
            const color = TYPE_COLORS[t.type.name];
            const icon = TYPE_ICONS[t.type.name];
            return `
                <div class="type-badge" style="--t-color: ${color}">
                    <img src="${icon}" alt="${t.type.name}"/>
                    <span>${t.type.name}</span>
                </div>`;
        }).join('');

        const statsHTML = `<div class="stats-grid-circles">` + p.stats.map(s => {
            const statVal = s.base_stat;
            // rayon
            const radius = 36; 
            const circumference = 2 * Math.PI * radius;
            const percent = Math.min((statVal / 200) * 100, 100);
            const offset = circumference - ((percent / 100) * circumference);
            const color = this.getStatColor(statVal);
            const iconClass = this.getStatIconClass(s.stat.name);
            const label = this.translateStat(s.stat.name);

            return `
                <div class="stat-circle-item">
                    <div class="circle-wrapper">
                        <svg class="progress-ring" width="90" height="90">
                            <circle class="progress-ring__circle-bg"
                                stroke="rgba(255,255,255,0.1)"
                                stroke-width="6"
                                fill="transparent"
                                r="${radius}" cx="45" cy="45"/>
                            <circle class="progress-ring__circle"
                                stroke="${color}"
                                stroke-width="6"
                                fill="transparent"
                                r="${radius}" cx="45" cy="45"
                                style="stroke-dasharray: ${circumference} ${circumference}; --to-offset: ${offset}; --glow-color: ${color};"
                            />
                        </svg>
                        <div class="circle-icon" style="color:${color}">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                    </div>
                    <div class="stat-info-text">
                        <span class="stat-num" style="color:${color}">${statVal}</span>
                        <span class="stat-name">${label}</span>
                    </div>
                </div>`;
        }).join('') + `</div>`;

        let weaknessesHTML = '';
        const categorizedWeaknesses: Record<number, string[]> = {};
        this._weaknesses.forEach((multiplier, type) => {
            if (multiplier > 1) {
                if (!categorizedWeaknesses[multiplier]) categorizedWeaknesses[multiplier] = [];
                categorizedWeaknesses[multiplier].push(type);
            }
        });
        if (Object.keys(categorizedWeaknesses).length === 0) {
            weaknessesHTML = '<p class="empty-msg">Aucune vulnérabilité majeure détectée.</p>';
        } else {
            Object.keys(categorizedWeaknesses).sort((a,b) => Number(b) - Number(a)).forEach(mult => {
                 const typesList = categorizedWeaknesses[Number(mult)].map(tName => {
                     return `<span class="mini-type"><img src="${TYPE_ICONS[tName]}"> ${tName}</span>`
                 }).join(' ');
                 weaknessesHTML += `
                    <div class="weakness-group">
                        <span class="weak-label danger">SENSIBLE AUX DÉGÂTS X${mult} DE :</span>
                        <div class="weak-types">${typesList}</div>
                    </div>`;
            });
        }

        const movesHTML = `<ul class="moves-list">${p.moves.map(m => `<li>${m.move.name.replace('-', ' ')}</li>`).join('')}</ul>`;

        this.shadowRoot.innerHTML = `
        <style>
            /* Import Font Awesome pour les icones */
            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Rajdhani:wght@500;600;700&display=swap');

            :host {
                --theme: ${themeColor};
                --theme-rgb: ${this.hexToRgb(themeColor)};
                --bg-dark: #0a0a0f;
                --text-light: #e0e0e0;
            }
            * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: var(--theme) rgba(0,0,0,0.3); }
            
            .backdrop {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                z-index: 9999;
                display: flex; justify-content: center; align-items: center;
                animation: fadeIn 0.3s ease-out;
            }

            .modal-container {
                overflow: visible;
                width: 90vw; max-width: 950px; height: 80vh; min-height: 550px;
                background: var(--bg-dark);
                border-radius: 20px;
                position: relative;
                display: grid;
                grid-template-columns: 40% 60%;
                box-shadow: 
                    inset 0 0 100px rgba(var(--theme-rgb), 0.2),
                    inset 0 0 20px rgba(var(--theme-rgb), 0.5),
                    0 20px 40px rgba(0,0,0,0.8);
                border: 1px solid rgba(var(--theme-rgb), 0.3);
            }
            .modal-container::before {
                content:''; position:absolute; inset:0;
                background: radial-gradient(circle at 30% 50%, rgba(var(--theme-rgb), 0.15) 0%, transparent 60%);
                pointer-events: none;
            }

            .col-visual {
                position: relative; overflow: visible; 
                display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
                padding-bottom: 40px;
            }
            .poke-img-popout {
                position: absolute; top: -10%; left: -15%;
                width: 130%; height: auto; object-fit: contain;
                z-index: 10;
                filter: drop-shadow(0 30px 25px rgba(0,0,0,0.8));
                pointer-events: none;
            }
            .types-row { display: flex; gap: 10px; z-index: 11; margin-bottom: 20px; }
            .type-badge {
                display: flex; align-items: center; gap: 8px;
                padding: 6px 14px; border-radius: 30px;
                background: rgba(0,0,0,0.5);
                border: 1px solid var(--t-color);
                box-shadow: 0 0 15px rgba(var(--theme-rgb), 0.3);
                backdrop-filter: blur(5px);
            }
            .type-badge img { width: 20px; height: 20px; }
            .type-badge span { 
                font-family: 'Rajdhani'; font-weight: 700; color: #fff; 
                text-transform: uppercase; letter-spacing: 1px;
                text-shadow: 0 0 5px var(--t-color);
            }

            .col-data {
                display: flex; flex-direction: column;
                padding: 30px;
                background: rgba(255,255,255,0.02);
                border-left: 1px solid rgba(var(--theme-rgb), 0.2);
                overflow: hidden;
            }

            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .poke-name {
                font-family: 'Cinzel', serif; font-size: 3rem; color: #fff; margin: 0; line-height: 1;
                text-shadow: 0 0 10px rgba(var(--theme-rgb), 0.5);
            }
            .poke-id { font-family: 'Rajdhani'; font-size: 1.2rem; color: var(--theme); letter-spacing: 2px; font-weight: 700; opacity: 0.8; }
            
            .close-btn {
                background: none; border: none; color: var(--text-light); font-size: 2rem; cursor: pointer; line-height: 0.5;
                transition: 0.3s; opacity: 0.6;
            }
            .close-btn:hover { color: var(--theme); opacity: 1; transform: rotate(90deg); }

            .tabs-nav {
                display: flex; gap: 5px; border-bottom: 2px solid rgba(var(--theme-rgb), 0.2); margin-bottom: 20px;
            }
            .tab-btn {
                background: transparent; border: none; padding: 10px 20px;
                font-family: 'Rajdhani'; font-size: 1.1rem; font-weight: 700; color: #888;
                text-transform: uppercase; letter-spacing: 1px; cursor: pointer; position: relative; transition: 0.3s;
            }
            .tab-btn::after {
                content:''; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px;
                background: var(--theme); transition: 0.3s;
            }
            .tab-btn:hover { color: #fff; }
            .tab-btn.active { color: var(--theme); text-shadow: 0 0 10px var(--theme); }
            .tab-btn.active::after { width: 100%; }

            .tab-content-container { flex-grow: 1; overflow-y: auto; padding-right: 10px; }
            .tab-panel { display: none; animation: fadeIn 0.3s ease-out; }
            .tab-panel.active { display: block; }

            .desc-text { font-family: 'Rajdhani'; font-size: 1.1rem; color: #ccc; font-style: italic; line-height: 1.5; margin-bottom: 25px; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .info-box { 
                background: rgba(var(--theme-rgb), 0.1); border: 1px solid rgba(var(--theme-rgb), 0.2);
                padding: 10px; border-radius: 8px; text-align: center;
            }
            .info-label { font-family: 'Rajdhani'; font-size: 0.8rem; color: var(--theme); text-transform: uppercase; }
            .info-val { font-family: 'Cinzel'; font-size: 1.2rem; color: #fff; font-weight: 700; }

            /* --- STYLE CSS POUR LES CERCLES DE STATS --- */
            .stats-grid-circles {
                display: grid;
                grid-template-columns: repeat(3, 1fr); /* 3 colonnes */
                gap: 20px;
                padding-top: 10px;
            }
            .stat-circle-item {
                display: flex; flex-direction: column; align-items: center; gap: 5px;
            }
            .circle-wrapper {
                position: relative;
                width: 90px; height: 90px;
                display: flex; justify-content: center; align-items: center;
            }
            .progress-ring { transform: rotate(-90deg); /* Commence en haut */ }
            .progress-ring__circle {
                transition: stroke-dashoffset 0.35s;
                transform-origin: 50% 50%;
                /* Animation d'entrée */
                stroke-dashoffset: 226; /* Circumference de base */
                animation: fillCircle 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                animation-delay: 0.2s;
                
                /* LE GLOW MAGIQUE */
                filter: drop-shadow(0 0 4px var(--glow-color));
            }
            .circle-icon {
                position: absolute;
                font-size: 1.8rem;
                display: flex; justify-content: center; align-items: center;
                filter: drop-shadow(0 0 5px currentColor);
            }
            .stat-info-text { text-align: center; margin-top: -5px; }
            .stat-num { font-family: 'Cinzel'; font-weight: 700; font-size: 1.2rem; display: block; line-height: 1; }
            .stat-name { font-family: 'Rajdhani'; font-weight: 600; font-size: 0.85rem; color: #aaa; text-transform: uppercase; }

            @keyframes fillCircle {
                to { stroke-dashoffset: var(--to-offset); }
            }
            /* ------------------------------------------- */

            .weakness-group { margin-bottom: 20px; background: rgba(255, 50, 50, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(255, 50, 50, 0.3); }
            .weak-label.danger { color: #ff5555; font-family: 'Rajdhani'; font-weight: 700; display: block; margin-bottom: 10px; text-shadow: 0 0 5px #ff5555;}
            .weak-types { display: flex; flex-wrap: wrap; gap: 10px; }
            .mini-type { 
                display: inline-flex; align-items: center; gap: 5px; 
                background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 20px; 
                color: #fff; font-family: 'Rajdhani'; font-weight: 600; text-transform: uppercase; font-size: 0.9rem;
            }
            .mini-type img { width: 16px; height: 16px; }
            .ability-item { margin-bottom: 8px; color: #ddd; font-family: 'Rajdhani'; }

            .moves-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
            .moves-list li {
                background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px;
                text-align: center; font-family: 'Rajdhani'; color: #aaa; text-transform: capitalize;
                border: 1px solid transparent; transition: 0.2s;
            }
            .moves-list li:hover { border-color: var(--theme); color: #fff; background: rgba(var(--theme-rgb), 0.1); }
            .empty-msg { color: #888; font-family: 'Rajdhani'; font-style: italic; }

            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            @media (max-width: 900px) {
                .modal-container { grid-template-columns: 1fr; grid-template-rows: 250px 1fr; height: 90vh; width: 95vw; }
                .col-visual { padding-bottom: 10px; justify-content: center; overflow: hidden; }
                .poke-img-popout { position: relative; top: auto; left: auto; width: auto; height: 200px; margin-bottom: 10px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.8)); }
                .col-data { padding: 20px; border-left: none; border-top: 1px solid rgba(var(--theme-rgb), 0.2); }
                .poke-name { font-size: 2.5rem; }
                .tabs-nav { overflow-x: auto; } 
                .tab-btn { padding: 10px 15px; font-size: 1rem; white-space: nowrap;}
                
                /* Ajustement mobile pour les cercles */
                .stats-grid-circles { grid-template-columns: repeat(3, 1fr); gap: 10px; }
                .circle-wrapper { width: 70px; height: 70px; }
                .progress-ring { width: 70px; height: 70px; }
                .progress-ring__circle-bg, .progress-ring__circle { r: 30; cx: 35; cy: 35; stroke-width: 5; }
                .circle-icon { font-size: 1.4rem; }
            }
        </style>

        <div class="backdrop" id="backdrop">
            <div class="modal-container">
                
                <div class="col-visual">
                    <img class="poke-img-popout" src="${img}" alt="${p.name}">
                    <div class="types-row">
                        ${typesHTML}
                    </div>
                </div>

                <div class="col-data">
                    <div class="header">
                        <div>
                            <div class="poke-id">NO. ${p.id.toString().padStart(3,'0')}</div>
                            <h2 class="poke-name">${p.name}</h2>
                        </div>
                        <button class="close-btn" id="close">✕</button>
                    </div>

                    <div class="tabs-nav" id="tabs-header">
                        <button class="tab-btn active" data-target="tab-overview">Aperçu</button>
                        <button class="tab-btn" data-target="tab-stats">Stats</button>
                        <button class="tab-btn" data-target="tab-combat">Combat</button>
                        <button class="tab-btn" data-target="tab-moves">Capacités</button>
                    </div>

                    <div class="tab-content-container">
                        
                        <div class="tab-panel active" id="tab-overview">
                            <p class="desc-text">"${description}"</p>
                            <div class="info-grid">
                                <div class="info-box">
                                    <span class="info-label">Taille</span>
                                    <div class="info-val">${p.height/10} m</div>
                                </div>
                                <div class="info-box">
                                    <span class="info-label">Poids</span>
                                    <div class="info-val">${p.weight/10} kg</div>
                                </div>
                                <div class="info-box" style="cursor:pointer;" id="play-cry">
                                     <span class="info-label">Cri</span>
                                    <div class="info-val">🔊</div>
                                </div>
                            </div>
                        </div>

                        <div class="tab-panel" id="tab-stats">
                             ${statsHTML}
                        </div>

                        <div class="tab-panel" id="tab-combat">
                             <h4 style="color:var(--theme); font-family:'Rajdhani'; margin: 0 0 15px 0;">VULNÉRABILITÉS</h4>
                             ${weaknessesHTML}
                             
                             <h4 style="color:var(--text-light); font-family:'Rajdhani'; margin: 25px 0 10px 0;">TALENTS</h4>
                             ${p.abilities.map(a => `<div class="ability-item"><span style="color:var(--theme)">✦</span> ${a.ability.name} ${a.is_hidden?'(Caché)':''}</div>`).join('')}
                        </div>

                        <div class="tab-panel" id="tab-moves">
                             ${movesHTML}
                        </div>

                    </div>
                </div>
            </div>
        </div>
        `;

        this.addInteractions(p.cries.latest);
    }

    hexToRgb(hex: string) {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r},${g},${b}`;
    }
    
    translateStat(stat: string) {
        const map: any = { 'hp': 'PV', 'attack': 'Attaque', 'defense': 'Défense', 'special-attack': 'Atq. Spé.', 'special-defense': 'Déf. Spé.', 'speed': 'Vitesse' };
        return map[stat] || stat;
    }

    getStatColor(val: number) {
        if(val < 60) return '#ff4f4f';
        if(val < 100) return '#ffb300';
        return '#00ff88';
    }

    addInteractions(cryUrl: string) {
        const shadow = this.shadowRoot!;
        shadow.getElementById("close")?.addEventListener("click", () => this.close());
        shadow.getElementById("backdrop")?.addEventListener("click", (e) => {
            if (e.target === shadow.getElementById("backdrop")) this.close();
        });

        const tabBtns = shadow.querySelectorAll('.tab-btn');
        const tabPanels = shadow.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = (e.target as HTMLElement).dataset.target;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));

                (e.target as HTMLElement).classList.add('active');
                shadow.getElementById(targetId!)?.classList.add('active');
            });
        });

        const btn = shadow.getElementById("play-cry");
        if (btn && cryUrl) {
            const audio = new Audio(cryUrl);
            audio.volume = 0.5;
            btn.addEventListener("click", () => audio.play().catch(e => console.error(e)));
        }
    }

    close() {
        this.dispatchEvent(new CustomEvent("close-detail", { bubbles: true, composed: true }));
        this.remove();
    }
}

if (!customElements.get("pokemon-detail")) {
    customElements.define("pokemon-detail", PokemonModalDetails);
}
import { pokeApiFetcher } from "../services/poke-api";
import { DEFAULT_IMAGE, TYPE_COLORS, TYPE_ICONS } from "../global-consts/consts";
import type { Pokemon, ChainLink } from "../types/poke-type";

interface DamageRelation { name: string; url: string; }
interface TypeResponse { damage_relations: { double_damage_from: DamageRelation[]; half_damage_from: DamageRelation[]; no_damage_from: DamageRelation[]; }; }

async function localFetchEvolutionChain(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Erreur fetch evolution", e);
        return null;
    }
}

export class PokemonModalDetails extends HTMLElement {
    private _id: string | null = null;
    private _prevId: string | null = null;
    private _nextId: string | null = null;
    
    private _pokemon: Pokemon | null = null;
    private _species: any | null = null;
    private _evolutionChain: ChainLink | null = null;
    private _weaknesses: Map<string, number> = new Map();

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    static get observedAttributes() { return ["pokemon-id", "prev-id", "next-id"]; }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            if (name === "pokemon-id") {
                this._id = newValue;
                this.fetchData();
            } else if (name === "prev-id") {
                this._prevId = newValue;
                if (this.shadowRoot) this.updateNavVisibility();
            } else if (name === "next-id") {
                this._nextId = newValue;
                if (this.shadowRoot) this.updateNavVisibility();
            }
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
                this.calculateWeaknesses(typesData as any);

                if (speciesData.evolution_chain?.url) {
                    const evoData = await localFetchEvolutionChain(speciesData.evolution_chain.url);
                    this._evolutionChain = evoData ? evoData.chain : null;
                }

                this.render();
            }
        } catch (error) {
            console.error(error);
            if (this.shadowRoot) this.shadowRoot.innerHTML = `<div class="error" style="color:white; text-align:center; padding:20px;">Données corrompues ou inaccessibles.<br>${error}</div>`;
        }
    }

    getIdFromUrl(url: string): number {
        const parts = url.split('/').filter(Boolean);
        return parseInt(parts[parts.length - 1]);
    }

    getEvolutionHTML(node: ChainLink, currentId: number): string {
        const nodeId = this.getIdFromUrl(node.species.url);
        const nodeName = node.species.name;
        
        const isCurrent = nodeId === currentId;
        const statusClass = isCurrent ? "evo-current" : "";
        const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nodeId}.png`;

        let childrenHTML = "";
        if (node.evolves_to.length > 0) {
            childrenHTML = `<div class="evo-children-group">
                ${node.evolves_to.map(child => this.getEvolutionHTML(child, currentId)).join('')}
            </div>`;
        }

        return `
            <div class="evo-branch">
                <div class="evo-node ${statusClass}">
                    <div class="evo-card nav-trigger" data-id="${nodeId}">
                        <div class="evo-visual">
                            <img src="${imgUrl}" alt="${nodeName}" loading="lazy">
                        </div>
                        <span class="evo-name">${nodeName}</span>
                    </div>
                </div>
                ${childrenHTML}
            </div>
        `;
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
            <style>.backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;justify-content:center;align-items:center;color:white;font-family:'Rajdhani';letter-spacing:2px; z-index: 100000; animation: fadeIn 0.4s ease-out;}</style>
            <div class="backdrop">CHARGEMENT...</div>`;
        }
    }

    getStatIconClass(statName: string): string { switch (statName) { case 'hp': return 'fa-heart'; case 'attack': return 'fa-gavel'; case 'defense': return 'fa-shield-halved'; case 'special-attack': return 'fa-fire'; case 'special-defense': return 'fa-shield-heart'; case 'speed': return 'fa-wind'; default: return 'fa-star'; } }
    hexToRgb(hex: string) { const bigint = parseInt(hex.slice(1), 16); const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255; return `${r},${g},${b}`; }
    translateStat(stat: string) { const map: any = { 'hp': 'PV', 'attack': 'Attaque', 'defense': 'Défense', 'special-attack': 'Atq. Spé.', 'special-defense': 'Déf. Spé.', 'speed': 'Vitesse' }; return map[stat] || stat; }
    getStatColor(val: number) { if(val < 60) return '#ff4f4f'; if(val < 100) return '#ffb300'; return '#00ff88'; }

    render() {
        if (!this._pokemon || !this.shadowRoot) return;
        const p = this._pokemon;
        
        const img = p.sprites.other?.home?.front_default || p.sprites.other?.["official-artwork"]?.front_default || DEFAULT_IMAGE;
        const themeColor = TYPE_COLORS[p.types[0].type.name] || '#c9a86a';
        // Pour l'effet "glow" du bouton
        const typeGlow = themeColor.startsWith('#') ? themeColor : themeColor.replace(")", ", 0.6)").replace('rgb', 'rgba');
        
        const flavorEntry = this._species?.flavor_text_entries.find((e: any) => e.language.name === 'fr') || this._species?.flavor_text_entries.find((e: any) => e.language.name === 'en');
        const description = flavorEntry ? flavorEntry.flavor_text.replace(/[\f\n]/g, ' ') : "Aucune description disponible.";

        let evolutionTabHTML = '<div class="center-msg">Aucune évolution connue.</div>';
        if (this._evolutionChain) {
            evolutionTabHTML = `<div class="evolution-tree-container">
                ${this.getEvolutionHTML(this._evolutionChain, p.id)}
            </div>`;
        }

        const typesHTML = p.types.map(t => {
            const color = TYPE_COLORS[t.type.name];
            return `<div class="type-badge" style="--t-color: ${color}"><img src="${TYPE_ICONS[t.type.name]}" alt="${t.type.name}"/><span>${t.type.name}</span></div>`;
        }).join('');

        const statsHTML = `<div class="stats-grid-circles">` + p.stats.map(s => {
             const statVal = s.base_stat; const radius = 36; const circumference = 2 * Math.PI * radius; const offset = circumference - ((Math.min((statVal / 200) * 100, 100) / 100) * circumference); const color = this.getStatColor(statVal); const iconClass = this.getStatIconClass(s.stat.name); const label = this.translateStat(s.stat.name);
             return `<div class="stat-circle-item"><div class="circle-wrapper"><svg class="progress-ring" width="90" height="90"><circle class="progress-ring__circle-bg" stroke="rgba(255,255,255,0.1)" stroke-width="6" fill="transparent" r="${radius}" cx="45" cy="45"/><circle class="progress-ring__circle" stroke="${color}" stroke-width="6" fill="transparent" r="${radius}" cx="45" cy="45" style="stroke-dasharray: ${circumference} ${circumference}; --to-offset: ${offset}; --glow-color: ${color};" /></svg><div class="circle-icon" style="color:${color}"><i class="fa-solid ${iconClass}"></i></div></div><div class="stat-info-text"><span class="stat-num" style="color:${color}">${statVal}</span><span class="stat-name">${label}</span></div></div>`;
        }).join('') + `</div>`;

        let weaknessesHTML = '';
        const categorizedWeaknesses: Record<number, string[]> = {};
        this._weaknesses.forEach((multiplier, type) => {
            if (multiplier !== 1) {
                if (!categorizedWeaknesses[multiplier]) categorizedWeaknesses[multiplier] = [];
                categorizedWeaknesses[multiplier].push(type);
            }
        });
        
        if (Object.keys(categorizedWeaknesses).length === 0) {
            weaknessesHTML = '<p class="empty-msg">Aucune interaction particulière.</p>';
        } else {
            const sortedKeys = Object.keys(categorizedWeaknesses).sort((a,b) => Number(b) - Number(a));
            weaknessesHTML = `<div class="weakness-compact-list">`;
            sortedKeys.forEach(multKey => {
                const mult = Number(multKey);
                let badgeClass = 'neutral';
                if(mult > 1) badgeClass = 'danger';
                if(mult < 1) badgeClass = 'resist';
                if(mult === 0) badgeClass = 'immune';

                const typesList = categorizedWeaknesses[mult].map(tName => `
                    <div class="compact-type-pill">
                        <img src="${TYPE_ICONS[tName]}" alt="${tName}">
                        <span>${tName}</span>
                    </div>
                `).join('');

                weaknessesHTML += `
                    <div class="weak-row">
                        <div class="weak-badge ${badgeClass}">x${mult}</div>
                        <div class="weak-types-container">${typesList}</div>
                    </div>`;
            });
            weaknessesHTML += `</div>`;
        }

        const movesHTML = `<ul class="moves-list">${p.moves.map(m => `<li>${m.move.name.replace('-', ' ')}</li>`).join('')}</ul>`;

        this.shadowRoot.innerHTML = `
        <style>
            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Rajdhani:wght@500;600;700&display=swap');

            /* Z-INDEX IMPORTANT : Pour passer au dessus du Team Builder */
            :host { 
                --theme: ${themeColor}; 
                --theme-rgb: ${this.hexToRgb(themeColor)}; 
                --bg-dark: #0a0a0f; 
                --text-light: #e0e0e0;
                --type-glow: ${typeGlow}; 
                
                position: relative;
                z-index: 100000; 
                display: block;
            }
            
            * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: var(--theme) rgba(0,0,0,0.3); }
            
            .backdrop { 
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); 
                z-index: 100000; 
                display: flex; justify-content: center; align-items: center; 
                animation: fadeIn 0.4s ease-out; 
            }
            
            /* MODALE LARGE */
            .modal-container { 
                position: relative; overflow: visible; 
                width: 90vw; max-width: 1100px; 
                height: 80vh; min-height: 550px; 
                background: var(--bg-dark); border-radius: 20px; 
                display: grid; grid-template-columns: 40% 60%; 
                box-shadow: inset 0 0 100px rgba(var(--theme-rgb), 0.2), inset 0 0 20px rgba(var(--theme-rgb), 0.5), 0 20px 40px rgba(0,0,0,0.8); border: 1px solid rgba(var(--theme-rgb), 0.3); 
                animation: bounceInDown 0.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards; 
            }
            .modal-container::before { content:''; position:absolute; inset:0; background: radial-gradient(circle at 30% 50%, rgba(var(--theme-rgb), 0.15) 0%, transparent 60%); pointer-events: none; }
            
            /* VISUEL POKEMON */
            .col-visual { 
                position: relative; overflow: visible; 
                display: flex; flex-direction: column; align-items: center; justify-content: flex-end; 
                padding-bottom: 20px; 
                z-index: 5;
            }
            .poke-img-popout { 
                position: absolute; 
                top: -20%; 
                height: 95%; 
                width: 120%; 
                object-fit: contain; 
                z-index: 10; 
                filter: drop-shadow(0 30px 25px rgba(0,0,0,0.8)); 
                pointer-events: none; 
            }
            
            /* TYPES */
            .types-row { 
                display: flex; gap: 10px; z-index: 11; 
                margin-bottom: 30px; 
                margin-top: auto; 
                padding-top: 150px; 
            }
            .type-badge { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 30px; background: rgba(0,0,0,0.7); border: 1px solid var(--t-color); box-shadow: 0 0 15px rgba(var(--theme-rgb), 0.3); backdrop-filter: blur(5px); } .type-badge img { width: 20px; height: 20px; } .type-badge span { font-family: 'Rajdhani'; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 0 5px var(--t-color); }
            
            /* DATA */
            .col-data { 
                display: flex; flex-direction: column; padding: 30px; 
                background: rgba(255,255,255,0.02); border-left: 1px solid rgba(var(--theme-rgb), 0.2); 
                overflow: hidden; 
                position: relative;
                z-index: 20; 
            }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .poke-name { font-family: 'Cinzel', serif; font-size: 3rem; color: #fff; margin: 0; line-height: 1; text-shadow: 0 0 10px rgba(var(--theme-rgb), 0.5); }
            
            /* LIGNE ID + BOUTON SVG */
            .id-row { display: flex; align-items: center; gap: 15px; }
            .poke-id { font-family: 'Rajdhani'; font-size: 1.2rem; color: var(--theme); letter-spacing: 2px; font-weight: 700; opacity: 0.8; }
            
            /* STYLE BOUTON ADD TEAM */
            @keyframes heartbeat {
                0% { transform: scale(1); filter: drop-shadow(0 0 1px var(--type-glow)); }
                50% { transform: scale(1.15); filter: drop-shadow(0 0 6px var(--type-glow)); }
                100% { transform: scale(1); filter: drop-shadow(0 0 1px var(--type-glow)); }
            }
            .add-team-btn {
                background: none; border: none; padding: 0; cursor: pointer;
                width: 40px; height: 40px;
                color: var(--theme);
                display: flex; align-items: center; justify-content: center;
                animation: heartbeat 2s infinite ease-in-out;
                transition: all 0.3s ease;
            }
            .add-team-btn svg {
                width: 100%; height: 100%; fill: currentColor;
                filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .add-team-btn:hover {
                animation: none; color: #ffffff;
                filter: drop-shadow(0 0 10px var(--theme));
                transform: scale(1.2);
            }
            .add-team-btn:hover svg { transform: rotate(90deg); }
            .add-team-btn:active { transform: scale(0.9); }

            .close-btn { background: none; border: none; color: var(--text-light); font-size: 2rem; cursor: pointer; line-height: 0.5; transition: 0.3s; opacity: 0.6; } .close-btn:hover { color: var(--theme); opacity: 1; transform: rotate(90deg); }
            
            /* TABS & SCROLL */
            .tabs-nav { 
                display: flex; gap: 20px; 
                border-bottom: 1px solid rgba(255,255,255,0.1); 
                margin-bottom: 25px; 
                overflow-x: auto;
                scrollbar-width: none; 
                z-index: 50; 
                position: relative;
                flex-shrink: 0;
            }
            .tabs-nav::-webkit-scrollbar { display: none; }

            .tab-btn { 
                background: transparent; border: none; padding: 12px 5px; 
                font-family: 'Rajdhani'; font-size: 1.1rem; font-weight: 700; color: #888; 
                text-transform: uppercase; letter-spacing: 1px; cursor: pointer; 
                position: relative; transition: color 0.3s; white-space: nowrap; 
            }
            .tab-btn::after { 
                content:''; position: absolute; bottom: -1px; left: 0; 
                width: 0%; height: 3px; 
                background: var(--theme); 
                transition: width 0.3s cubic-bezier(0.65, 0, 0.35, 1); 
                box-shadow: 0 -2px 8px var(--theme); 
            }
            .tab-btn:hover { color: #ccc; } 
            .tab-btn.active { color: #fff; text-shadow: 0 0 10px var(--theme); } 
            .tab-btn.active::after { width: 100%; }
            
            .tab-content-container { flex: 1; min-height: 0; overflow-y: auto; padding-right: 10px; }
            .tab-panel { display: none; animation: fadeIn 0.3s ease-out; } 
            .tab-panel.active { display: block; }
            
            .desc-text { font-family: 'Rajdhani'; font-size: 1.1rem; color: #ccc; font-style: italic; line-height: 1.5; margin-bottom: 25px; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; } .info-box { background: rgba(var(--theme-rgb), 0.1); border: 1px solid rgba(var(--theme-rgb), 0.2); padding: 10px; border-radius: 8px; text-align: center; } .info-label { font-family: 'Rajdhani'; font-size: 0.8rem; color: var(--theme); text-transform: uppercase; } .info-val { font-family: 'Cinzel'; font-size: 1.2rem; color: #fff; font-weight: 700; }
            
            .weakness-compact-list { display: flex; flex-direction: column; gap: 8px; }
            .weak-row { display: flex; align-items: center; background: rgba(255,255,255,0.03); padding: 5px 10px; border-radius: 6px; }
            .weak-badge { font-family: 'Cinzel'; font-weight: 700; font-size: 0.9rem; padding: 2px 8px; border-radius: 4px; min-width: 40px; text-align: center; margin-right: 15px; border: 1px solid currentColor; }
            .weak-badge.danger { color: #ff5555; background: rgba(255, 85, 85, 0.1); } .weak-badge.resist { color: #55ff88; background: rgba(85, 255, 136, 0.1); } .weak-badge.immune { color: #aaa; background: rgba(170, 170, 170, 0.1); }
            .weak-types-container { display: flex; flex-wrap: wrap; gap: 10px; }
            .compact-type-pill { display: flex; align-items: center; gap: 5px; font-family: 'Rajdhani'; font-size: 0.85rem; color: #ddd; text-transform: uppercase; letter-spacing: 0.5px; }
            .compact-type-pill img { width: 16px; height: 16px; }

            .evolution-tree-container { display: flex; justify-content: center; align-items: center; padding: 20px 10px; width: 100%; overflow-x: auto; }
            .evo-branch { display: flex; align-items: center; gap: 40px; }
            .evo-node { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; }
            .evo-children-group { display: flex; flex-direction: column; gap: 10px; position: relative; justify-content: center; }
            
            .evo-branch:has(> .evo-children-group) > .evo-node::after { content: ''; position: absolute; right: -40px; top: 50%; width: 40px; height: 2px; background: rgba(255,255,255,0.15); pointer-events: none; }
            .evo-children-group > .evo-branch { position: relative; }
            .evo-children-group > .evo-branch::before { content: ''; position: absolute; left: -40px; top: 50%; width: 40px; height: 2px; background: rgba(255,255,255,0.15); pointer-events: none; border-top-left-radius: 10px; }
            .evo-children-group > .evo-branch:not(:first-child)::after { content: ''; position: absolute; left: -40px; top: -50%; height: 100%; width: 2px; background: rgba(255,255,255,0.15); pointer-events: none; }
            .evo-children-group > .evo-branch:first-child::after { content: ''; position: absolute; left: -40px; top: 50%; height: 50%; width: 2px; background: rgba(255,255,255,0.15); pointer-events: none; }
            .evo-children-group > .evo-branch:only-child::after { display: none; }
            
            .evo-card { width: 70px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s; position: relative; z-index: 10; }
            .evo-card:hover { transform: scale(1.15); z-index: 20; }
            .evo-visual { width: 65px; height: 65px; border-radius: 50%; background: #1a1a20; border: 2px solid #444; display: flex; justify-content: center; align-items: center; box-shadow: 0 5px 10px rgba(0,0,0,0.5); transition: 0.3s; }
            .evo-visual img { width: 80%; height: 80%; object-fit: contain; }
            .evo-name { font-family: 'Rajdhani'; font-size: 0.75rem; color: #aaa; margin-top: 5px; font-weight: 600; text-transform: capitalize; transition: 0.3s; white-space: nowrap; }
            .evo-node.evo-current .evo-visual { border-color: var(--theme); box-shadow: 0 0 15px var(--theme), inset 0 0 10px rgba(var(--theme-rgb), 0.5); background: rgba(var(--theme-rgb), 0.1); transform: scale(1.1); }
            .evo-node.evo-current .evo-name { color: var(--theme); font-weight: 700; }
            .evo-node.evo-current .evo-card { cursor: default; }
            .evo-card:hover .evo-visual { border-color: #fff; background: #333; } .evo-card:hover .evo-name { color: #fff; }

            .stats-grid-circles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-top: 10px; } .stat-circle-item { display: flex; flex-direction: column; align-items: center; gap: 5px; } .circle-wrapper { position: relative; width: 90px; height: 90px; display: flex; justify-content: center; align-items: center; } .progress-ring { transform: rotate(-90deg); } .progress-ring__circle { transition: stroke-dashoffset 0.35s; transform-origin: 50% 50%; stroke-dashoffset: 226; animation: fillCircle 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.2s; filter: drop-shadow(0 0 4px var(--glow-color)); } .circle-icon { position: absolute; font-size: 1.8rem; display: flex; justify-content: center; align-items: center; filter: drop-shadow(0 0 5px currentColor); } .stat-info-text { text-align: center; margin-top: -5px; } .stat-num { font-family: 'Cinzel'; font-weight: 700; font-size: 1.2rem; display: block; line-height: 1; } .stat-name { font-family: 'Rajdhani'; font-weight: 600; font-size: 0.85rem; color: #aaa; text-transform: uppercase; }
            .ability-item { margin-bottom: 8px; color: #ddd; font-family: 'Rajdhani'; } .moves-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; } .moves-list li { background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px; text-align: center; font-family: 'Rajdhani'; color: #aaa; text-transform: capitalize; border: 1px solid transparent; transition: 0.2s; } .moves-list li:hover { border-color: var(--theme); color: #fff; background: rgba(var(--theme-rgb), 0.1); } .empty-msg { color: #888; font-family: 'Rajdhani'; font-style: italic; }
            
            .nav-btn { position: absolute; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: rgba(255,255,255,0.2); font-size: 3.5rem; cursor: pointer; z-index: 20000; transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1); display: none; }
            #btn-prev { left: 30px; } #btn-next { right: 30px; } .nav-btn:hover { color: #fff; text-shadow: 0 0 10px var(--theme), 0 0 20px var(--theme), 0 0 40px var(--theme); }
            #btn-prev:hover { transform: translateY(-50%) translateX(-5px) scale(1.1); } #btn-next:hover { transform: translateY(-50%) translateX(5px) scale(1.1); }
            .nav-btn::after { content: ''; font-family: "Font Awesome 6 Free"; font-weight: 900; position: absolute; top: 0; left: 0; width: 100%; height: 100%; color: var(--theme); opacity: 0; z-index: -1; transition: 0s; } #btn-prev::after { content: '\\f053'; } #btn-next::after { content: '\\f054'; } .nav-btn:hover::after { animation: pulseGhost 1s infinite; }
            @keyframes pulseGhost { 0% { transform: scale(1); opacity: 0.6; filter: blur(0px); } 100% { transform: scale(1.8); opacity: 0; filter: blur(4px); } }
            @keyframes bounceInDown { 0% { opacity: 0; transform: translate3d(0, -3000px, 0); } 60% { opacity: 1; transform: translate3d(0, 25px, 0); } 75% { transform: translate3d(0, -10px, 0); } 90% { transform: translate3d(0, 5px, 0); } 100% { transform: translate3d(0, 0, 0); } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes fillCircle { to { stroke-dashoffset: var(--to-offset); } }
            @media (max-width: 900px) { .modal-container { grid-template-columns: 1fr; grid-template-rows: 250px 1fr; height: 90vh; width: 95vw; } .col-visual { padding-bottom: 10px; justify-content: center; overflow: hidden; } .poke-img-popout { position: relative; top: auto; left: auto; width: auto; height: 200px; margin-bottom: 10px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.8)); } .col-data { padding: 20px; border-left: none; border-top: 1px solid rgba(var(--theme-rgb), 0.2); } .poke-name { font-size: 2.5rem; } .tabs-nav { overflow-x: auto; } .tab-btn { padding: 10px 15px; font-size: 1rem; white-space: nowrap;} .stats-grid-circles { grid-template-columns: repeat(3, 1fr); gap: 10px; } .circle-wrapper { width: 70px; height: 70px; } .progress-ring { width: 70px; height: 70px; } .progress-ring__circle-bg, .progress-ring__circle { r: 30; cx: 35; cy: 35; stroke-width: 5; } .circle-icon { font-size: 1.4rem; } .nav-btn { font-size: 2rem; } #btn-prev { left: 5px; } #btn-next { right: 5px; } 
                .evolution-tree-container { justify-content: flex-start; }
            }
        </style>

        <div class="backdrop" id="backdrop">
            <button class="nav-btn" id="btn-prev"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="nav-btn" id="btn-next"><i class="fa-solid fa-chevron-right"></i></button>

            <div class="modal-container">
                <div class="col-visual">
                    <img class="poke-img-popout" src="${img}" alt="${p.name}">
                    <div class="types-row">${typesHTML}</div>
                </div>

                <div class="col-data">
                    <div class="header">
                        <div>
                            <div class="id-row">
                                <div class="poke-id">NO. ${p.id.toString().padStart(3,'0')}</div>
                                <button class="add-team-btn" id="btn-add-team" title="Ajouter à l'équipe">
                                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M19 11H13V5C13 4.45 12.55 4 12 4C11.45 4 11 4.45 11 5V11H5C4.45 11 4 11.45 4 12C4 12.55 4.45 13 5 13H11V19C11 19.55 11.45 20 12 20C12.55 20 13 19.55 13 19V13H19C19.55 13 20 12.55 20 12C20 11.45 19.55 11 19 11Z"/>
                                    </svg>
                                </button>
                            </div>
                            <h2 class="poke-name">${p.name}</h2>
                        </div>
                        <button class="close-btn" id="close">✕</button>
                    </div>

                    <div class="tabs-nav" id="tabs-header">
                        <button class="tab-btn active" data-target="tab-overview">Aperçu</button>
                        <button class="tab-btn" data-target="tab-stats">Stats</button>
                        <button class="tab-btn" data-target="tab-evol">Évolution</button>
                        <button class="tab-btn" data-target="tab-combat">Combat</button>
                        <button class="tab-btn" data-target="tab-moves">Capacités</button>
                    </div>

                    <div class="tab-content-container">
                        
                        <div class="tab-panel active" id="tab-overview">
                            <p class="desc-text">"${description}"</p>
                            <div class="info-grid">
                                <div class="info-box"><span class="info-label">Taille</span><div class="info-val">${p.height/10} m</div></div>
                                <div class="info-box"><span class="info-label">Poids</span><div class="info-val">${p.weight/10} kg</div></div>
                                <div class="info-box" style="cursor:pointer;" id="play-cry"><span class="info-label">Cri</span><div class="info-val"><i class="fa-solid fa-volume-high"></i></div></div>
                            </div>
                        </div>

                        <div class="tab-panel" id="tab-stats">${statsHTML}</div>

                        <div class="tab-panel" id="tab-evol">
                            ${evolutionTabHTML}
                        </div>

                        <div class="tab-panel" id="tab-combat">
                            <h4 style="color:var(--theme); font-family:'Rajdhani'; margin: 0 0 15px 0;">VULNÉRABILITÉS</h4>
                            ${weaknessesHTML}
                            <h4 style="color:var(--text-light); font-family:'Rajdhani'; margin: 25px 0 10px 0;">TALENTS</h4>
                            ${p.abilities.map(a => `<div class="ability-item"><span style="color:var(--theme)">✦</span> ${a.ability.name} ${a.is_hidden?'(Caché)':''}</div>`).join('')}
                        </div>

                        <div class="tab-panel" id="tab-moves">${movesHTML}</div>

                    </div>
                </div>
            </div>
        </div>
        `;

        this.addInteractions(p.cries.latest);
        this.updateNavVisibility();
    }

    updateNavVisibility() {
        if (!this.shadowRoot) return;
        const btnPrev = this.shadowRoot.getElementById('btn-prev') as HTMLButtonElement;
        const btnNext = this.shadowRoot.getElementById('btn-next') as HTMLButtonElement;
        
        if (btnPrev) btnPrev.style.display = this._prevId ? 'block' : 'none';
        if (btnNext) btnNext.style.display = this._nextId ? 'block' : 'none';
    }

    addInteractions(cryUrl: string) {
        const shadow = this.shadowRoot!;
        
        const handleNav = (id: string | null) => {
            if (id) {
                this.dispatchEvent(new CustomEvent('navigate-pokemon', { detail: { id: id }, bubbles: true, composed: true }));
            }
        };

        const btnAdd = shadow.getElementById('btn-add-team');
        if (btnAdd) {
            btnAdd.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const btn = e.currentTarget as HTMLElement;
                if (btn.hasAttribute('disabled')) return;

                btn.animate([
                    { transform: 'scale(0.9)' },
                    { transform: 'scale(1.4)' },
                    { transform: 'scale(1)' }
                ], { duration: 300 });

                const payload = {
                    id: this._pokemon?.id,
                    name: this._pokemon?.name,
                    sprite: this._pokemon?.sprites.other?.home?.front_default || this._pokemon?.sprites.front_default,
                    types: this._pokemon?.types.map(t => t.type.name)
                };

                this.dispatchEvent(new CustomEvent('add-to-team', {
                    detail: payload,
                    bubbles: true,
                    composed: true
                }));

                btn.setAttribute('disabled', 'true');
                setTimeout(() => btn.removeAttribute('disabled'), 500);
            });
        }

        shadow.getElementById('btn-prev')?.addEventListener('click', (e) => { e.stopPropagation(); handleNav(this._prevId); });
        shadow.getElementById('btn-next')?.addEventListener('click', (e) => { e.stopPropagation(); handleNav(this._nextId); });
        
        const evolTab = shadow.getElementById('tab-evol');
        if (evolTab) {
            evolTab.addEventListener('click', (e) => {
                const target = (e.target as HTMLElement).closest('.nav-trigger') as HTMLElement;
                if (target && target.dataset.id) {
                    e.stopPropagation();
                    handleNav(target.dataset.id);
                }
            });
        }

        shadow.getElementById("close")?.addEventListener("click", () => this.close());
        shadow.getElementById("backdrop")?.addEventListener("click", (e) => { if (e.target === shadow.getElementById("backdrop")) this.close(); });

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
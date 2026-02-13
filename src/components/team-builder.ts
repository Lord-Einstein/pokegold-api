import { DEFAULT_IMAGE, TYPE_ICONS, TYPE_COLORS } from "../global-consts/consts.ts";

const TYPE_WEAKNESSES: Record<string, string[]> = {
    normal: ["fighting"], fire: ["water", "ground", "rock"], water: ["electric", "grass"],
    electric: ["ground"], grass: ["fire", "ice", "poison", "flying", "bug"],
    ice: ["fire", "fighting", "rock", "steel"], fighting: ["flying", "psychic", "fairy"],
    poison: ["ground", "psychic"], ground: ["water", "grass", "ice"],
    flying: ["electric", "ice", "rock"], psychic: ["bug", "ghost", "dark"],
    bug: ["fire", "flying", "rock"], rock: ["water", "grass", "fighting", "ground", "steel"],
    ghost: ["ghost", "dark"], dragon: ["ice", "dragon", "fairy"],
    steel: ["fire", "fighting", "ground"], dark: ["fighting", "bug", "fairy"],
    fairy: ["poison", "steel"], stellar: []
};

interface TeamMember {
    id: number;
    name: string;
    sprite: string;
    types: string[];
}

interface SavedTeam {
    name: string;
    members: TeamMember[];
}

export class TeamBuilder extends HTMLElement {
    private currentTeam: TeamMember[] = [];
    private savedTeams: SavedTeam[] = [];
    private maxSize = 6;
    private isOpen = false;
    private activeTab: 'analysis' | 'save' = 'analysis';
    private toastTimeout: number | undefined;
    private static instance: TeamBuilder | null = null;

    constructor() {
        super();
        if (TeamBuilder.instance) return TeamBuilder.instance;
        this.attachShadow({ mode: 'open' });
        TeamBuilder.instance = this;
    }

    connectedCallback() {
        this.loadData();
        this.render();
        this.setupListeners();
        this.updateUI();
    }

    disconnectedCallback() {
        document.removeEventListener('add-to-team', this.handleAddEvent);
        const openBtn = document.getElementById('btn-team-open');
        if (openBtn) openBtn.replaceWith(openBtn.cloneNode(true));
    }

    private loadData() {
        const active = localStorage.getItem('pokexplore_active_team');
        if (active) {
            try { this.currentTeam = JSON.parse(active); } catch (e) { this.currentTeam = []; }
        }
        const library = localStorage.getItem('pokexplore_saved_teams');
        if (library) {
            try { this.savedTeams = JSON.parse(library); } catch (e) { this.savedTeams = []; }
        }
    }

    private persistActiveTeam() {
        localStorage.setItem('pokexplore_active_team', JSON.stringify(this.currentTeam));
    }

    private persistLibrary() {
        localStorage.setItem('pokexplore_saved_teams', JSON.stringify(this.savedTeams));
    }

    private saveCurrentTeam(name: string) {
        if (!name) return this.showToast("Donnez un nom à l'équipe !", 'warning');
        if (this.currentTeam.length === 0) return this.showToast("L'équipe est vide.", 'warning');

        const existingIndex = this.savedTeams.findIndex(t => t.name === name);
        const newEntry: SavedTeam = { name, members: [...this.currentTeam] };

        if (existingIndex >= 0) {
            this.savedTeams[existingIndex] = newEntry;
            this.showToast(`Équipe "${name}" mise à jour.`, 'success');
        } else {
            this.savedTeams.push(newEntry);
            this.showToast(`Équipe "${name}" sauvegardée !`, 'success');
        }
        this.persistLibrary();
        this.updateSavedListUI();
    }

    private loadSavedTeam(name: string) {
        const target = this.savedTeams.find(t => t.name === name);
        if (target) {
            this.currentTeam = [...target.members];
            this.persistActiveTeam();
            this.updateUI();
            this.showToast(`Équipe "${name}" chargée.`, 'success');
        }
    }

    private deleteSavedTeam(name: string) {
        this.savedTeams = this.savedTeams.filter(t => t.name !== name);
        this.persistLibrary();
        this.updateSavedListUI();
        this.showToast("Sauvegarde supprimée.", 'info');
    }

    private clearTeam() {
        if (this.currentTeam.length === 0) return;
        if (confirm("Voulez-vous vraiment vider toute l'équipe ?")) {
            this.currentTeam = [];
            this.persistActiveTeam();
            this.updateUI();
            this.showToast("Équipe vidée.", 'info');
        }
    }

    setupListeners() {
        document.removeEventListener('add-to-team', this.handleAddEvent);
        document.addEventListener('add-to-team', this.handleAddEvent);

        const openBtn = document.getElementById('btn-team-open');
        if (openBtn) {
            const newBtn = openBtn.cloneNode(true) as HTMLElement;
            openBtn.parentNode?.replaceChild(newBtn, openBtn);
            newBtn.addEventListener('click', () => this.togglePanel());
        }
    }

    private handleAddEvent = (e: any) => {
        this.addPokemon(e.detail);
    }

    togglePanel(forceState?: boolean) {
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        const panel = this.shadowRoot?.querySelector('.team-panel');
        const appBody = document.body;
        const toggleBtn = document.getElementById('btn-team-open');

        if (this.isOpen) {
            panel?.classList.add('open');
            toggleBtn?.classList.add('active');
            appBody.style.transition = "padding-bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
            appBody.style.paddingBottom = "380px"; 
        } else {
            panel?.classList.remove('open');
            toggleBtn?.classList.remove('active');
            appBody.style.paddingBottom = "0";
        }
    }

    addPokemon(pokemon: any) {
        const newId = Number(pokemon.id);
        if (this.currentTeam.some(p => p.id === newId)) {
            this.showToast(`${pokemon.name} est déjà là.`, 'warning');
            return;
        }
        if (this.currentTeam.length >= this.maxSize) {
            this.showToast("L'équipe est complète !", 'error');
            if (!this.isOpen) this.togglePanel(true);
            return;
        }

        const pTypes = Array.isArray(pokemon.types) ? pokemon.types : ['normal'];
        this.currentTeam.push({ id: newId, name: pokemon.name, sprite: pokemon.sprite, types: pTypes });

        this.persistActiveTeam();
        this.updateUI();
        this.showToast(`${pokemon.name} recruté !`, 'success');
        
        if (this.currentTeam.length === 1 && !this.isOpen) {
             this.togglePanel(true);
        }
    }

    removePokemon(index: number) {
        this.currentTeam.splice(index, 1);
        this.persistActiveTeam();
        this.updateUI();
    }

    updateUI() {
        this.updateSlots();
        this.updateAnalysis();
        this.updateSavedListUI();
    }

    updateSlots() {
        if (!this.shadowRoot) return;
        const slots = this.shadowRoot.querySelectorAll('.slot');
        const countBadge = this.shadowRoot.getElementById('count-badge');
        if(countBadge) countBadge.textContent = `${this.currentTeam.length} / ${this.maxSize}`;

        slots.forEach((slot, index) => {
            const member = this.currentTeam[index];
            slot.className = 'slot';
            slot.innerHTML = '';

            if (member) {
                slot.classList.add('filled');
                const mainTypeColor = TYPE_COLORS[member.types[0]] || '#rgba(255,255,255,0.2)';
                const dots = member.types.map(t => `<span class="dot" style="background:${TYPE_COLORS[t]};" title="${t}"></span>`).join('');
                
                slot.innerHTML = `
                    <div class="poke-glow" style="background: radial-gradient(circle, ${mainTypeColor}40 0%, transparent 70%);"></div>
                    <img src="${member.sprite || DEFAULT_IMAGE}" class="poke-sprite" alt="${member.name}">
                    <div class="poke-info">
                        <span class="poke-name">${member.name}</span>
                        <div class="mini-types">${dots}</div>
                    </div>
                    <button class="remove-btn"><i class="fa-solid fa-xmark"></i></button>
                `;
                slot.querySelector('.remove-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removePokemon(index);
                });
            } else {
                slot.classList.add('empty');
                slot.innerHTML = `<div class="empty-state"><span class="slot-num">${index + 1}</span></div>`;
            }
        });
    }

    updateAnalysis() {
        const grid = this.shadowRoot?.getElementById('analysis-grid');
        const emptyMsg = this.shadowRoot?.getElementById('analysis-empty');
        if (!grid || !emptyMsg) return;

        if (this.currentTeam.length === 0) {
            grid.style.display = 'none';
            emptyMsg.style.display = 'flex';
            return;
        }

        grid.style.display = 'flex';
        emptyMsg.style.display = 'none';

        const weaknessMap: Record<string, number> = {};
        this.currentTeam.forEach(m => m.types.forEach(t => {
            (TYPE_WEAKNESSES[t] || []).forEach(w => weaknessMap[w] = (weaknessMap[w] || 0) + 1);
        }));

        const threats = Object.entries(weaknessMap)
            .sort(([, a], [, b]) => b - a)
            .filter(([, c]) => c > 0);

        if (threats.length === 0) {
            grid.innerHTML = `<div class="perfect-balance">✨ Équipe Équilibrée ! ✨</div>`;
        } else {
            
            grid.innerHTML = threats.map(([type, count]) => {
                const percentage = Math.min((count / 6) * 100, 100);
                let severityClass = 'low';
                if (count >= 2) severityClass = 'medium';
                if (count >= 3) severityClass = 'high';

                return `
                    <div class="threat-row">
                        <div class="threat-icon"><img src="${TYPE_ICONS[type]}" alt="${type}"></div>
                        <div class="threat-data">
                            <div class="threat-header">
                                <span class="threat-name">${type}</span>
                                <span class="threat-count ${severityClass}">x${count}</span>
                            </div>
                            <div class="progress-bg">
                                <div class="progress-fill ${severityClass}" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    updateSavedListUI() {
        const listContainer = this.shadowRoot?.getElementById('saved-list');
        if (!listContainer) return;

        if (this.savedTeams.length === 0) {
            listContainer.innerHTML = '<div style="opacity:0.5; text-align:center; padding:10px;">Aucune équipe sauvegardée.</div>';
            return;
        }

        listContainer.innerHTML = this.savedTeams.map(t => `
            <div class="saved-team-row">
                <span class="saved-name">${t.name} <small>(${t.members.length})</small></span>
                <div class="saved-actions">
                    <button class="action-btn load-btn" data-name="${t.name}" title="Charger"><i class="fa-solid fa-upload"></i></button>
                    <button class="action-btn del-btn" data-name="${t.name}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        listContainer.querySelectorAll('.load-btn').forEach(b => 
            b.addEventListener('click', (e) => this.loadSavedTeam((e.currentTarget as HTMLElement).dataset.name!)));
        
        listContainer.querySelectorAll('.del-btn').forEach(b => 
            b.addEventListener('click', (e) => this.deleteSavedTeam((e.currentTarget as HTMLElement).dataset.name!)));
    }

    showToast(msg: string, type: 'success' | 'error' | 'warning' | 'info') {
        const toast = this.shadowRoot?.getElementById('toast');
        if (!toast) return;
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        
        const icons = { success: 'check', error: 'circle-exclamation', warning: 'triangle-exclamation', info: 'info' };
        
        toast.innerHTML = `<i class="fa-solid fa-${icons[type]}"></i> <span>${msg}</span>`;
        toast.className = `toast show ${type}`;
        this.toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    switchTab(tab: 'analysis' | 'save') {
        this.activeTab = tab;
        const tabs = this.shadowRoot?.querySelectorAll('.tab-btn');
        const panels = this.shadowRoot?.querySelectorAll('.tab-panel');
        
        tabs?.forEach(t => t.classList.remove('active'));
        panels?.forEach(p => p.classList.remove('active'));
        
        this.shadowRoot?.getElementById(`tab-${tab}`)?.classList.add('active');
        this.shadowRoot?.getElementById(`panel-${tab}`)?.classList.add('active');
    }

    render() {
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                :host { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 5000; pointer-events: none; font-family: 'Segoe UI', sans-serif; }
                
                /* --- TOAST (EXTERNE AU PANEL POUR ETRE TOUJOURS VISIBLE) --- */
                .toast {
                    position: fixed; /* Fixé à la fenêtre */
                    top: 20px;       /* En haut */
                    left: 50%;
                    transform: translateX(-50%);
                    background: #1e2329;
                    border: 1px solid rgba(139, 92, 46, 0.4);
                    color: #e8e6e3; padding: 12px 24px; border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                    display: flex; align-items: center; gap: 12px;
                    font-size: 0.95rem; z-index: 10000;
                    opacity: 0; visibility: hidden; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .toast.show { opacity: 1; visibility: visible; top: 40px; }
                .toast i { font-size: 1.1rem; }
                .toast.success i { color: #2ecc71; }
                .toast.error i { color: #e74c3c; }
                .toast.warning i { color: #f1c40f; }

                /* --- PANEL --- */
                .team-panel {
                    height: 380px; background: #1e2329;
                    border-top: 2px solid rgba(139, 92, 46, 0.6);
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
                    transform: translateY(110%); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    pointer-events: auto; display: flex; flex-direction: column;
                }
                .team-panel.open { transform: translateY(0); }

                /* HEADER */
                .panel-header {
                    height: 50px; display: flex; justify-content: space-between; align-items: center; padding: 0 1.5rem;
                    background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .panel-title { font-weight: 600; color: #e8e6e3; display: flex; align-items: center; gap: 10px; }
                
                .header-actions { display: flex; gap: 15px; align-items: center; }
                
                .clear-btn {
                    background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1rem;
                    opacity: 0.7; transition: 0.3s;
                }
                .clear-btn:hover { opacity: 1; transform: scale(1.1); }

                .close-btn { background: none; border: none; color: #888; font-size: 1.2rem; cursor: pointer; }
                .close-btn:hover { color: #fff; }

                /* LAYOUT */
                .content-wrapper { display: flex; height: 100%; overflow: hidden; }
                .left-column { flex: 2; padding: 20px; border-right: 1px solid rgba(255,255,255,0.05); overflow-x: auto; }
                .right-column { flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.1); }

                /* SLOTS */
                .slots-container { display: flex; gap: 15px; justify-content: center; min-width: max-content; }
                .slot {
                    width: 110px; height: 150px; position: relative; border-radius: 8px;
                    background: rgba(255, 255, 255, 0.03); border: 1px dashed rgba(255, 255, 255, 0.1);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    transition: 0.3s;
                }
                .slot.filled { background: #15191e; border: 1px solid rgba(139, 92, 46, 0.3); }
                .poke-sprite { width: 80px; height: 80px; object-fit: contain; z-index: 2; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5)); }
                .poke-info { width: 100%; text-align: center; margin-top: auto; padding: 5px 0; background: rgba(0,0,0,0.3); border-radius: 0 0 8px 8px; z-index: 2; }
                .poke-name { font-size: 0.75rem; color: #ccc; text-transform: capitalize; display: block; }
                
                .mini-types { display: flex; justify-content: center; gap: 4px; margin-top: 3px; }
                .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; box-shadow: 0 0 2px rgba(0,0,0,0.5); }
                .poke-glow { position: absolute; top: 20%; width: 60px; height: 60px; border-radius: 50%; opacity: 0.6; }

                .remove-btn {
                    position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; border-radius: 50%;
                    background: #1a1a1a; border: 1px solid #ff4444; color: #ff4444; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; z-index: 10;
                }
                .slot.filled:hover .remove-btn { opacity: 1; }

                /* TABS */
                .tabs-header { display: flex; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .tab-btn {
                    flex: 1; padding: 10px; background: none; border: none; color: #777; cursor: pointer;
                    font-size: 0.9rem; text-transform: uppercase; font-weight: 600; transition: 0.3s;
                }
                .tab-btn:hover { color: #ccc; }
                .tab-btn.active { color: #c9a86a; border-bottom: 2px solid #c9a86a; background: rgba(201, 168, 106, 0.05); }

                .tab-panel { display: none; padding: 15px; overflow-y: auto; height: 100%; }
                .tab-panel.active { display: flex; flex-direction: column; gap: 10px; }

                /* --- PROGRESS BAR ANALYSIS --- */
                .threat-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
                .threat-icon img { width: 24px; height: 24px; }
                .threat-data { flex: 1; }
                .threat-header { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 3px; color: #ccc; }
                .threat-name { text-transform: capitalize; }
                .threat-count { font-weight: bold; }
                
                .progress-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
                .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

                .threat-count.medium { color: #f1c40f; }
                .progress-fill.low { background: #777; }
                .progress-fill.medium { background: #f1c40f; }
                .progress-fill.high { background: #e74c3c; box-shadow: 0 0 5px #e74c3c; }
                .threat-count.high { color: #e74c3c; }
                
                /* SAVE/LOAD */
                .input-group { display: flex; gap: 5px; }
                input[type="text"] {
                    flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                    color: white; padding: 8px; border-radius: 4px; outline: none;
                }
                input[type="text"]:focus { border-color: #c9a86a; }
                .btn-save { background: #c9a86a; color: #000; border: none; padding: 0 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
                
                .saved-team-row {
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 4px;
                }
                .saved-name { font-size: 0.9rem; color: #ddd; }
                .action-btn { background: none; border: none; cursor: pointer; padding: 5px; transition: 0.2s; }
                .load-btn { color: #3498db; }
                .del-btn { color: #e74c3c; }

                /* MOBILE */
                @media (max-width: 768px) {
                    .content-wrapper { flex-direction: column; }
                    .left-column { flex: 1; padding: 10px; }
                    .right-column { height: 200px; }
                    .slot { width: 90px; height: 120px; }
                    .team-panel { height: 90vh; }
                }
            </style>

            <div id="toast" class="toast"></div>

            <div class="team-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <i class="fa-solid fa-users-gear"></i> 
                        GESTION D'ÉQUIPE 
                        <span id="count-badge" style="font-size:0.8em; opacity:0.7; margin-left:10px"></span>
                    </div>
                    
                    <div class="header-actions">
                        <button class="clear-btn" id="btn-clear" title="Tout effacer">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        <button class="close-btn" onclick="this.getRootNode().host.togglePanel()">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    </div>
                </div>

                <div class="content-wrapper">
                    <div class="left-column">
                        <div class="slots-container">
                            <div class="slot"></div><div class="slot"></div><div class="slot"></div>
                            <div class="slot"></div><div class="slot"></div><div class="slot"></div>
                        </div>
                    </div>

                    <div class="right-column">
                        <div class="tabs-header">
                            <button class="tab-btn active" id="tab-analysis">Faiblesses</button>
                            <button class="tab-btn" id="tab-save">Sauvegardes</button>
                        </div>

                        <div class="tab-panel active" id="panel-analysis">
                            <div id="analysis-empty" style="flex:1; display:flex; align-items:center; justify-content:center; opacity:0.5; text-align:center;">
                                <p>Ajoutez des Pokémon<br>pour voir les faiblesses.</p>
                            </div>
                            <div id="analysis-grid" style="display:none; flex-direction:column; gap:5px;"></div>
                        </div>

                        <div class="tab-panel" id="panel-save">
                            <div class="input-group">
                                <input type="text" id="team-name-input" placeholder="Nom de l'équipe...">
                                <button class="btn-save" id="btn-save-action">OK</button>
                            </div>
                            <div class="saved-list" id="saved-list"></div>
                        </div>
                    </div>
                </div>
            </div>
            `;

            this.shadowRoot.getElementById('tab-analysis')?.addEventListener('click', () => this.switchTab('analysis'));
            this.shadowRoot.getElementById('tab-save')?.addEventListener('click', () => this.switchTab('save'));
            this.shadowRoot.getElementById('btn-clear')?.addEventListener('click', () => this.clearTeam());
            
            this.shadowRoot.getElementById('btn-save-action')?.addEventListener('click', () => {
                const input = this.shadowRoot?.getElementById('team-name-input') as HTMLInputElement;
                this.saveCurrentTeam(input.value);
                input.value = '';
            });
        }
    }
}

if (!customElements.get('team-builder')) {
    customElements.define('team-builder', TeamBuilder);
}
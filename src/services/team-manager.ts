import type { TeamMember, SavedTeam } from "../types/poke-type";

const STORAGE_KEY = "pokexplore_teams";

export class TeamManager {
    private currentTeam: TeamMember[] = [];
    private savedTeams: SavedTeam[] = [];

    constructor() {
        this.loadFromStorage();
    }

    addMember(pokemon: TeamMember): boolean {
        if (this.currentTeam.length >= 6) return false;
        if (this.currentTeam.some(p => p.id === pokemon.id)) return false;
        
        this.currentTeam.push(pokemon);
        return true;
    }

    removeMember(id: number): void {
        this.currentTeam = this.currentTeam.filter(p => p.id !== id);
    }

    getCurrentTeam(): TeamMember[] {
        return [...this.currentTeam];
    }

    clearCurrentTeam(): void {
        this.currentTeam = [];
    }

    saveTeam(teamName: string): void {
        if (this.currentTeam.length === 0) return;

        const newTeam: SavedTeam = {
            id: crypto.randomUUID(),
            name: teamName,
            members: [...this.currentTeam],
            createdAt: Date.now()
        };

        this.savedTeams.push(newTeam);
        this.persist();
    }

    loadTeamIntoActive(teamId: string): boolean {
        const teamToLoad = this.savedTeams.find(t => t.id === teamId);
        if (!teamToLoad) return false;

        this.currentTeam = [...teamToLoad.members];
        return true;
    }

    getSavedTeams(): SavedTeam[] {
        return [...this.savedTeams];
    }

    deleteSavedTeam(teamId: string): void {
        this.savedTeams = this.savedTeams.filter(t => t.id !== teamId);
        this.persist();
    }

    private loadFromStorage() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            try {
                this.savedTeams = JSON.parse(data);
            } catch (e) {
                console.error("Erreur lecture LocalStorage", e);
                this.savedTeams = [];
            }
        }
    }

    private persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedTeams));
    }
}
export const teamManager = new TeamManager();
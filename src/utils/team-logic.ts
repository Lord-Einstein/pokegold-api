export const TYPE_WEAKNESSES: Record<string, string[]> = {
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

export interface SimpleTeamMember {
    id: number;
    name: string;
    types: string[];
}


export class TeamLogic {
    private currentTeam: SimpleTeamMember[] = [];
    private maxSize = 6;

    constructor(initialTeam: SimpleTeamMember[] = []) {
        this.currentTeam = initialTeam;
    }

    getTeam(): SimpleTeamMember[] {
        return this.currentTeam;
    }

    addPokemon(pokemon: SimpleTeamMember): { success: boolean; message: string } {
        if (this.currentTeam.some(p => p.id === pokemon.id)) {
            return { success: false, message: "DUPLICATE" };
        }
        if (this.currentTeam.length >= this.maxSize) {
            return { success: false, message: "FULL" };
        }
        this.currentTeam.push(pokemon);
        return { success: true, message: "ADDED" };
    }

    removePokemon(id: number) {
        this.currentTeam = this.currentTeam.filter(p => p.id !== id);
    }

    calculateThreats(): { type: string; count: number }[] {
        const weaknessMap: Record<string, number> = {};
        
        this.currentTeam.forEach(m => m.types.forEach(t => {
            (TYPE_WEAKNESSES[t] || []).forEach(w => weaknessMap[w] = (weaknessMap[w] || 0) + 1);
        }));

        return Object.entries(weaknessMap)
            .sort(([, a], [, b]) => b - a)
            .filter(([, c]) => c > 0)
            .map(([type, count]) => ({ type, count }));
    }
}
import { API_URL } from "../global-consts/consts";
import type { TypeDetail } from "../types/poke-type";

const typeCache: Map<string, TypeDetail> = new Map();

export async function calculateTeamWeakness(teamTypes: string[][]): Promise<Record<string, number>> {
    
    const globalWeakness: Record<string, number> = {};

    const allTypesToFetch = new Set(teamTypes.flat());
    
    for (const typeName of allTypesToFetch) {
        if (!typeCache.has(typeName)) {
            try {
                const response = await fetch(`${API_URL}/type/${typeName}`);
                const data = await response.json();
                typeCache.set(typeName, data);
            } catch (e) {
                console.error(`Impossible de charger le type ${typeName}`);
            }
        }
    }
    const attackingTypes = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "steel", "dark", "fairy"];

    attackingTypes.forEach(attacker => {
        let teamVulnerabilityScore = 0;

        teamTypes.forEach(pokemonTypes => {
            let multiplier = 1;

            pokemonTypes.forEach(defendingType => {
                const typeData = typeCache.get(defendingType);
                if (!typeData) return;
                if (typeData.damage_relations.double_damage_from.some(t => t.name === attacker)) {
                    multiplier *= 2;
                }
                if (typeData.damage_relations.half_damage_from.some(t => t.name === attacker)) {
                    multiplier *= 0.5;
                }
                if (typeData.damage_relations.no_damage_from.some(t => t.name === attacker)) {
                    multiplier *= 0;
                }
            });

            if (multiplier > 1) teamVulnerabilityScore++;
            if (multiplier < 1) teamVulnerabilityScore--;
        });

        if (teamVulnerabilityScore > 0) {
            globalWeakness[attacker] = teamVulnerabilityScore;
        }
    });

    return globalWeakness;
}
import type { Pokemon, EvolutionChainResponse } from "../types/poke-type";
import { API_TYPE, API_URL } from "../global-consts/consts.ts"

export async function pokeApiFetcher(identificator: string | number) : Promise<Pokemon | null> {
    try{

        const url = `${API_URL}/${API_TYPE}/${identificator}`;
        const apiResponse = await fetch(url);

        if(!apiResponse.ok){
            throw new Error(`Retour d'erreur : ${apiResponse.status}`);
        }

        const apiData = await apiResponse.json() as Pokemon;
        return apiData;

    }catch(error){
        console.error("Erreur lors de la requête : ", error);
        return null;
    }
}

export async function fetchEvolutionChain(url: string): Promise<EvolutionChainResponse | null> {
    try {
        const apiResponse = await fetch(url);
        if (!apiResponse.ok) throw new Error(`Err Evo: ${apiResponse.status}`);
        return await apiResponse.json() as EvolutionChainResponse;
    } catch (error) {
        console.error("Erreur chargement évolution:", error);
        return null;
    }
}

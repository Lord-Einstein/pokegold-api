import type { Pokemon } from "../types/poke-type";
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

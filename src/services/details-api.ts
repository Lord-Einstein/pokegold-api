import type { APIListResponse } from "../types/poke-type";
import { API_TYPE, API_URL } from "../global-consts/consts.ts"

export async function pokeListApiFetcher(offset: number = 0, limit: number = 20): Promise<APIListResponse|null> {

    try{

        const url = `${API_URL}/${API_TYPE}?offset=${offset}&limit=${limit}`;
        const apiResponse = await fetch(url);

        if(!apiResponse.ok) {
            //le throw va lancer au try-catch qu'il rentre la suite de l'exécution (du coup on passe dans le cons..error
            //pour faire un return null propre.Un con..err à ce moment aurait mis une erreur puis continuer l'exécution.)
            throw new Error(`Retour d'erreur : ${apiResponse.status}`); 
        }

        const data = await apiResponse.json() as APIListResponse;
        return data;

    } catch(error) {
        console.error("Erreur d'exécution :", error);
        return null;
    }

}

export async function pokeLiteApiFetcher() {
    const url = `${API_URL}/${API_TYPE}?offset=0&limit=10000}`;

    try{

        const response = await fetch(url);

        if(!response.ok) return [];
            
        const data = await response.json();
        return data.results;


    } catch(error) {
        console.error("Erreur de chargement:", error);
        return [];
    }
}

export async function fetchFiltersList(category: 'type' | 'generation' | 'ability') {
    try{
        const apiResponse = await fetch(`${API_URL}/${category}?limit=1000`);
        if(!apiResponse.ok){
            throw new Error(`Message d'erreur : ${apiResponse.status}`);
        }
        const data = await apiResponse.json();

        const sortedResults = data.results.sort((a:any, b:any) => {

            if(category === 'generation') {
                const idA = parseInt(a.url.split('/').filter(Boolean).pop());
                const idB = parseInt(b.url.split('/').filter(Boolean).pop());
                return idA - idB;
            }

            return a.name.localeCompare(b.name);
        });

        return sortedResults;
    } catch(error) {
        console.error(error);
        return [];
    }
}

export async function fetchPokemonByFilter(url: string) {
    try {
        const apiResponse = await fetch(url);

        if(!apiResponse.ok){
            throw new Error(`Message d'erreur : ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        
        if (data.pokemon) { //vu que le type et les ability se présentent avec pokemon mais pas generations
            return data.pokemon.map((element: any) => element.pokemon);
        } else if (data.pokemon_species) {
            return data.pokemon_species;
        }
        return [];
    } catch (error) {
        console.error(error);
        return [];
    }
}
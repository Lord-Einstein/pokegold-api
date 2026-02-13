export interface APINamedRessource{
  name: string;
  url: string;
}

export interface APIListResponse{
  count: number;
  previous: string | null;
  next: string | null;

  results: APINamedRessource[];
}

export interface PokemonSprites{
  front_default: string;
  other?: {
    "official-artwork":{
      front_default: string;
    };
    home?:{
      front_default: string;
    }
  };
  showdown?: {
    front_default: string;
  };
}

export interface PokemonType {
  slot: number;
  type: APINamedRessource;
}

export interface PokemonStat {
  base_stat: number;
  stat: APINamedRessource;
}

export interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: APINamedRessource;
}

export interface PokemonCries {
  latest: string;
  legacy: string;
}


export interface PokemonMove {
  move: APINamedRessource;
}

export interface PokemonSpeciesFlavorText {
  flavor_text: string;
  language: APINamedRessource;
  version: APINamedRessource;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  flavor_text_entries: PokemonSpeciesFlavorText[];
  evolution_chain: { url: string };
}

export interface TypeDamageRelations {
  no_damage_to: APINamedRessource[];
  half_damage_to: APINamedRessource[];
  double_damage_to: APINamedRessource[];
  no_damage_from: APINamedRessource[];
  half_damage_from: APINamedRessource[];
  double_damage_from: APINamedRessource[];
}

export interface TypeDetail {
  id: number;
  name: string;
  damage_relations: TypeDamageRelations;
}

//pour mes évolutions

export interface EvolutionDetail {
  min_level: number;
  item: APINamedRessource | null;
  trigger: APINamedRessource;
}

export interface ChainLink {
  is_baby: boolean;
  species: APINamedRessource;
  evolution_details: EvolutionDetail[];
  evolves_to: ChainLink[];
}

export interface EvolutionChainResponse {
  id: number;
  chain: ChainLink;
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  
  sprites: PokemonSprites;
  types: PokemonType[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  moves: PokemonMove[];
  cries: PokemonCries;

  species: APINamedRessource; 
  
}
export interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

export interface SavedTeam {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: number;
}
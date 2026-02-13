import type { Pokemon } from "./poke-type";

export interface Team {
    id: string;
    name: string;
    members: Pokemon[]; //max 6
    createdAt: number;
}

export type TypeEffectiveness = Record<string, number>;
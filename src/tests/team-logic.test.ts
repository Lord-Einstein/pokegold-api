import { describe, it, expect, beforeEach } from 'vitest';
import { TeamLogic } from '../utils/team-logic';

describe('TeamBuilder Logic', () => {
    let logic: TeamLogic;

    beforeEach(() => {
        logic = new TeamLogic();
    });

    it('Doit commencer avec une équipe vide', () => {
        expect(logic.getTeam().length).toBe(0);
    });

    it('Doit ajouter un Pokémon correctement', () => {
        const pikachu = { id: 25, name: 'pikachu', types: ['electric'] };
        const result = logic.addPokemon(pikachu);

        expect(result.success).toBe(true);
        expect(result.message).toBe("ADDED");
        expect(logic.getTeam().length).toBe(1);
    });

    it('Ne doit pas ajouter de doublons', () => {
        const pikachu = { id: 25, name: 'pikachu', types: ['electric'] };
        logic.addPokemon(pikachu);
        
        const result = logic.addPokemon(pikachu);

        expect(result.success).toBe(false);
        expect(result.message).toBe("DUPLICATE");
        expect(logic.getTeam().length).toBe(1);
    });

    it('Ne doit pas dépasser 6 Pokémon', () => {
        for(let i=1; i<=6; i++) {
            logic.addPokemon({ id: i, name: `Poke ${i}`, types: ['normal'] });
        }

        const result = logic.addPokemon({ id: 7, name: 'Trop', types: ['normal'] });

        expect(result.success).toBe(false);
        expect(result.message).toBe("FULL");
        expect(logic.getTeam().length).toBe(6);
    });

    it('Doit pouvoir supprimer un Pokémon', () => {
        const bulbi = { id: 1, name: 'Bulbizarre', types: ['grass'] };
        logic.addPokemon(bulbi);
        
        expect(logic.getTeam().length).toBe(1);
        logic.removePokemon(1);
        expect(logic.getTeam().length).toBe(0);
    });
    it('Doit pouvoir charger une équipe existante via le constructeur', () => {
        const savedTeam = [
            { id: 4, name: 'Salamèche', types: ['fire'] },
            { id: 7, name: 'Carapuce', types: ['water'] }
        ];

        const loadedLogic = new TeamLogic(savedTeam);

        expect(loadedLogic.getTeam().length).toBe(2);
        expect(loadedLogic.getTeam()[0].name).toBe('Salamèche');
    });

    it('Doit calculer correctement les menaces', () => {
        logic.addPokemon({ id: 1, name: 'Bulbizarre', types: ['grass'] });

        const threats = logic.calculateThreats();
        const fireThreat = threats.find(t => t.type === 'fire');
        
        expect(fireThreat).toBeDefined();
        expect(fireThreat?.count).toBeGreaterThan(0);
    });
});
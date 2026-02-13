# Pokédex & Team Builder ⚡️

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-Rapidité-purple?logo=vite) ![Vitest](https://img.shields.io/badge/Test-Vitest-green?logo=vitest) ![WebComponents](https://img.shields.io/badge/Architecture-WebComponents-orange)

> **Présentation**
>
> Ce projet est une application web moderne de type **SPA (Single Page Application)** conçue pour les dresseurs Pokémon.
> Elle combine une encyclopédie complète (Pokédex) et un outil stratégique de construction d'équipe, le tout développé **sans framework lourd** (pas de React/Vue), en utilisant uniquement la puissance des **Web Components Natifs** et de **TypeScript**.

---

## 🚀 Installation & Démarrage

Suivez ces instructions pour lancer le projet sur votre machine.

### Pré-requis
* **Node.js** (Version récente recommandée)
* **npm**

### Commandes

| Action | Commande | Description |
| :--- | :--- | :--- |
| **1. Installation** | `npm install` | Installe toutes les dépendances listées dans `package.json`. |
| **2. Développement** | `npm run dev` | Lance le serveur local avec rechargement à chaud (HMR). |
| **3. Tests** | `npm test` | **Important :** Lance les tests unitaires (Vitest) pour vérifier la logique. |
| **4. Production** | `npm run build` | Compile le TypeScript et génère la version optimisée. |

---

## ✨ Fonctionnalités

Cliquez sur les sections ci-dessous pour voir les détails.

<details>
<summary><h2>🔍 1. Pokédex Avancé</h2></summary>

Une encyclopédie fluide connectée à la PokéAPI en temps réel.

### 📋 Liste & Navigation
* **Pagination optimisée :** Navigation fluide à travers les centaines de Pokémon.
* **Lazy Loading :** Les images ne se chargent que lorsqu'elles apparaissent à l'écran pour une performance maximale.

### 🔎 Moteur de Recherche Puissant
* **Recherche textuelle :** Filtrage instantané par nom.
* **Filtres Avancés :**
    * Par **Type** (Feu, Eau, Plante...)
    * Par **ID** (Numéro du Pokédex)
    * Par **Talent** (Abilities)
    * Par **Génération**

### 📄 Fiche Détaillée (Modal)
Chaque Pokémon dispose d'une fiche complète :
* **Données :** Stats (PV, Attaque, Vitesse...), Types, ID.
* **Multimédia :** Sprite haute qualité et écoute du **cri officiel** (Audio).
* **Navigation Intuitive :**
    * Visualisation de la **chaîne d'évolution** (cliquable pour naviguer).
    * Boutons **Suivant / Précédent** pour passer au Pokémon voisin sans fermer la fiche.

</details>

<details>
<summary><h2>⚔️ 2. Team Builder Stratégique</h2></summary>

L'outil indispensable pour préparer ses combats.

### 🛡️ Gestion d'Équipe
* **Composition :** Ajout jusqu'à **6 Pokémon** dans l'équipe active.
* **Règles métier :**
    * Interdiction des doublons (un Pokémon ne peut pas être ajouté deux fois).
    * Blocage à 6 membres.

### 💾 Sauvegarde (LocalStorage)
* **Persistance :** Vos équipes sont sauvegardées dans le navigateur.
* **Bibliothèque :** Créez, nommez et rechargez plusieurs équipes différentes (ex: "Team Arène", "Team Feu").
* **Gestion :** Possibilité de supprimer ou d'écraser des sauvegardes existantes.

### 📊 Analyse des Faiblesses (Logique Avancée)
* **Calculateur de Menaces :** L'algorithme analyse les types de vos 6 Pokémon.
* **Feedback Visuel :** Affiche une alerte si votre équipe présente une faiblesse majeure commune (ex: *"Attention : 3 Pokémon craignent le type Glace"*).

</details>

---

## ⚙️ Architecture & Technique

Ce projet respecte des standards de code élevés. Cliquez pour dérouler.

<details>
<summary><h2>💻 Stack Technique & Clean Code</h2></summary>

### 🏗️ Architecture
* **Web Components Natifs :** Utilisation de `HTMLElement`, `Shadow DOM` et `Custom Elements` pour une modularité parfaite et réutilisable.
* **Services :** La logique d'appel API (`poke-api.ts`) est séparée de l'interface utilisateur.
* **Logique Métier :** La gestion d'équipe est isolée dans une classe dédiée (`TeamLogic`), totalement indépendante de l'affichage.

### 🛡️ TypeScript & Qualité
* **Typage Strict :** Interfaces définies pour toutes les structures de données (API Responses, Pokemon, Stats) afin d'éviter les erreurs au runtime.
* **Async / Await :** Gestion moderne des promesses pour les appels réseaux.
* **Gestion d'erreurs :**
    * Blocs `try/catch` sur les appels API.
    * Feedback utilisateur via des notifications ("Toasts") en cas de problème.

### 🧪 Tests Unitaires (Vitest)
Le projet inclut une suite de tests robuste :
1.  **Tests de Logique (`team-logic.test.ts`) :** Vérifie l'ajout, la suppression, la limite de 6 et le calcul de menaces.
2.  **Tests d'API (`poke-api.test.ts`) :** Utilise le **Mocking** pour simuler les réponses serveur et tester sans connexion internet.

</details>

---

## 📂 Structure du Projet

```bash
src/
├── components/      # Web Components (Cartes, Modal, TeamBuilder)
├── utils/           # Logique métier pure (Gestion d'équipe, Calculs)
├── services/        # Appels API et transformation de données
├── global-consts/   # Constantes, Couleurs de types, Assets
├── types/           # Interfaces TypeScript partagées
└── style/           # Variables CSS globales
tests/               # Fichiers de tests Vitest

```

---

*Projet réalisé dans un but éducatif. Données fournies par [PokéAPI](https://pokeapi.co/).*

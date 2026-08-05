# Dossier de Présentation Technique - Application Strategy Cabinet ML

## 1. Introduction
Cette application est une plateforme de gestion stratégique conçue pour le Cabinet du Maire de Libreville. Elle permet le suivi des dossiers, la gestion des unités opérationnelles (RMO), et la coordination des comités techniques.

## 2. Architecture Technique
- **Frontend** : React 18 avec Vite, TypeScript et Tailwind CSS.
- **Backend** : Node.js avec Express, servant les API et le middleware Vite.
- **Base de données** : SQLite (via `better-sqlite3`) pour une persistance rapide et fiable.
- **Animations** : Motion for React (framer-motion).
- **Icônes** : Lucide React.

## 3. Structure de la Base de Données (SQLite)
- `users` : Gère les membres, leurs rôles (ADMIN, ML, RESPONSABLE, etc.) et leurs habilitations JSON.
- `dossiers` : Table centrale contenant l'objet, le statut, les priorités et les références de validation.
- `rmo` : Unités opérationnelles auxquelles sont affectées les dossiers.
- `committees` : Comités techniques pour les processus de digitalisation.
- `parametres` : Configuration dynamique (Nom de l'application, Nom de la Mairie).
- `logs` : Historique complet de toutes les actions sur les dossiers.
- `files` : Métadonnées des pièces jointes.

## 4. Système de Rôles et Workflow ML
L'application implémente un workflow spécifique pour les membres standards (**ML**) :
1. **Création** : Un membre ML peut créer un dossier mais ne peut pas définir le RMO, la priorité ou la date d'échéance.
2. **Attente Validation** : Le dossier est créé avec un statut de validation `PENDING`.
3. **Logiciel de Supervisor** : Le responsable hiérarchique voit une interface dédiée dans les détails du dossier pour :
   - Définir la priorité.
   - Définir la date d'échéance.
   - Approuver le dossier.
4. **Réaffectation** : Une fois validé, le dossier est automatiquement réaffecté au créateur (ML) avec le statut `EN_COURS`.

## 5. Gouvernance et Sécurité
- Les mots de passe sont hachés côté serveur.
- Les accès aux vues (Administration, Comités, RMO) sont filtrés par rôle.
- Un membre **ML** ne voit dans son tableau de bord que les dossiers qu'il a créés ou qui lui sont affectés.

## 6. Guide d'Installation pour un Développeur
1. Installer les dépendances : `npm install`
2. Lancer en mode développement : `npm run dev`
3. Construire pour la production : `npm run build`
4. Lancer en production : `npm start`

---
*Propriété du Cabinet du Maire de Libreville — DIGICAB ML*

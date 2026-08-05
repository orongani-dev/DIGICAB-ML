# Documentation API DIGICAB-ML (V2.2)

Cette API permet aux applications tierces d'interagir avec le système de gestion des dossiers du Cabinet du Maire de Libreville.

## Authentification
Toutes les requêtes doivent inclure les informations d'identification (actuellement gérées par session de base, une version JWT est prévue pour la production).

## Points d'entrée (Endpoints)

### 1. Dossiers
*   **GET `/api/dossiers`** : Liste tous les dossiers.
*   **POST `/api/dossiers`** : Créer un nouveau dossier.
    *   *Payload* : `{ number, object, entreprise, rmo_id, status, priority, circuit, date_instruction }`
*   **GET `/api/dossiers/:id`** : Détails d'un dossier spécifique.
*   **PUT `/api/dossiers/:id`** : Mettre à jour un dossier.

### 2. Recherche Avancée (Réservé aux Décideurs)
*   **POST `/api/search/advanced`** : Recherche complexe avec filtres.
    *   *Payload* : `{ status, rmoId, dateStart, dateEnd, entreprise, object }`
    *   *Rôles autorisés* : ADMIN, ML, SP-ML, DC-ML, SC-ML, CS-ML.

### 3. RMO (Unités Opérationnelles)
*   **GET `/api/rmos`** : Liste des codes RMO (DC-ML, CS-ML, etc.).

### 4. Utilisateurs & Synchronisation
*   **GET `/api/users`** : Liste des utilisateurs du système.
*   **PUT `/api/users/:id`** : Mettre à jour le nom d'un membre du Cabinet (Synchronisation).
    *   *Payload* : `{ name }`

### 5. Fichiers
*   **GET `/api/files/:dossierId`** : Liste des pièces jointes d'un dossier.
*   **GET `/api/files/download/:id`** : Télécharger une pièce jointe.

## Codes de Statut
*   `EN_COURS` : Dossier en traitement.
*   `TRAITÉ ET VALIDÉ` : Dossier signé.
*   `REJETE` : Dossier rejeté par le Cabinet.
*   `SUSPENDU` : Dossier en attente d'éléments complémentaires.

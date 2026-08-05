# Spécifications Techniques - DIGICAB ML

## 1. Vue d'Ensemble
DIGICAB ML est une application de gestion de gouvernance et de suivi des dossiers (portefeuille exécutif) pour la Mairie de Libreville. Elle permet aux décideurs de suivre en temps réel l'avancement des dossiers, de collaborer via un système de chat intégré, et de piloter les indicateurs de performance (KPIs).

## 2. Architecture Technique
- **Frontend**: React 18 avec Vite.
- **Backend**: Serveur Node.js (Express).
- **Base de Données**: SQLite (via `better-sqlite3`).
- **Styles**: Tailwind CSS.
- **Animations**: Motion (framer-motion).
- **Temps Réel**: Socket.io pour les notifications et le chat.

## 3. Structure des Données (Schéma SQLite)

### Table `users`
Stocke les utilisateurs et leurs permissions.
- `id`: Clé primaire.
- `username`: Identifiant unique.
- `password`: Haché avec `bcrypt`.
- `role`: ADMIN, ML, RESPONSABLE, etc.
- `name`: Nom complet.
- `permissions`: JSON stockant les droits fins par unité RMO.
- `is_active`: Statut du compte.
- `is_responsible`: Indicateur de droits étendus.

### Table `dossiers`
Cœur de l'application.
- `number`: Référence unique du dossier.
- `object`: Libellé du dossier.
- `rmo_id`: Liaison avec le collaborateur/unité.
- `status`: En cours, Signé, Transmis, etc.
- `priority`: Normale, Urgente, Critique.
- `date_instruction`: Date de réception.
- `current_holder`: Détenteur actuel du dossier physique.

### Table `rmo`
Unités Collaboratrices (RMO).
- `code`: Code court (ex: RMO-01).
- `name`: Nom du collaborateur.

### Autres Tables
- `files`: Pièces jointes liées aux dossiers.
- `messages`: Historique des conversations.
- `chat_sessions`: Sessions de supervision.
- `committees`: Gestion des comités techniques.
- `logs`: Audit trail complet des actions des utilisateurs.

## 4. Fonctionnalités Clés

### Splash Screen
Ecran de chargement animé avec le logo officiel de la Mairie de Libreville, initialisant les protocoles sécurisés.

### Tableau de Bord (Dashboard)
Visualisation des KPIs globaux :
- Taux de signature global.
- Nombre de dossiers par statut.
- Performance par unité RMO.

### Portefeuille Exécutif
Tableau détaillé style Excel permettant :
- Le filtrage par collaborateur (RMO).
- Le tri par statut ou priorité.
- La visualisation des dossiers en retard (code couleur).

### Gestion Utilisateurs
Interface d'administration pour :
- Créer/Modifier les comptes.
- Définir les permissions spécifiques par unité.
- Activer/Désactiver les accès.

### Messagerie & Supervision
- Chat direct entre collaborateurs et décideurs.
- Possibilité pour les administrateurs de superviser les sessions de chat ouvertes.

## 5. Sécurité
- Authentification par session.
- Chiffrement des données sensibles.
- Triggers SQL pour protéger les comptes critiques (admin).
- Déconnexion automatique après 16h30 en cas d'inactivité (30 mins).

## 6. Installation (Développement)
1. `npm install` pour les dépendances.
2. `npm run dev` pour lancer le serveur (Express + Vite).
3. Le serveur écoute sur le port 3000.

## 7. Déploiement
L'application est optimisée pour Cloud Run. Le build produit un bundle statique dans `dist/` servi par le serveur Express.

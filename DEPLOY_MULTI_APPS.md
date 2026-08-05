# Guide Multi-Applications : Héberger DIGICAB ML et vos autres applications sur une même plateforme

Ce guide vous présente les meilleures alternatives à OVHcloud pour faire tourner **plusieurs applications** (Node.js, PHP, WordPress, etc.) sur une seule et même infrastructure économique.

---

## 📊 Comparatif des solutions Multi-Applications

| Critère | **Hetzner Cloud + Coolify / CapRover** (Option Recommandée) | **LWS (VPS Linux / cPanel)** | **Hostinger (VPS Cloud)** |
| :--- | :--- | :--- | :--- |
| **Prix mensuel** | ~ **4,50 € à 5,00 € / mois** | ~ **5,00 € à 8,00 € / mois** | ~ **5,50 € à 7,00 € / mois** |
| **Gestion visuelle** | ⭐⭐⭐⭐⭐ **Tableau de bord type Heroku/cPanel** (Coolify gratuit) | ⭐⭐⭐⭐ Panel LWS / cPanel | ⭐⭐⭐⭐ hPanel moderne |
| **Support Français** | Communauté / Documentation globale | ⭐⭐⭐⭐⭐ **Support 100% en Français** | ⭐⭐⭐ Support multilingue |
| **Capacité Multi-Apps** | **Illimitée** (dépend de la RAM du VPS) | Dépend de la formule souscrite | **Illimitée** (selon la RAM) |
| **Facilité au quotidien** | Déploiement en 1 clic via navigateur | Très guidé pour le web | Interface intuitive |

---

## 🏆 Solution n°1 : Hetzner + Coolify (La solution la plus puissante pour plusieurs apps)

### Pourquoi cette combinaison est la meilleure ?
1. **Un seul abonnement (4,50 €/mois)** : Vous payez une seule machine Hetzner (ex: serveur CX22 avec 2 vCPU, 4 Go RAM).
2. **Gestionnaire visuel gratuit (Coolify)** : Vous installez Coolify sur votre serveur. Cela transforme votre VPS en un panneau de contrôle complet (accessible sur votre navigateur web).
3. **Multi-Applications simples** : Depuis ce panneau, vous pouvez ajouter DIGICAB ML, une 2ème application Node.js, un site WordPress, une base de données, etc., chacun avec son propre nom de domaine et son certificat HTTPS sécurisé gratuit !

---

## 🛠️ Solution n°2 : LWS (Lignes Web Services) - L'alternative 100% Française

Si vous préférez un interlocuteur et un support client basé entièrement en France :

### Offre conseillée chez LWS :
* **VPS S** ou **VPS M** (avec Ubuntu 22.04 ou Debian 12).
* **Option cPanel / ISPConfig / Node.js Manager** si vous préférez éviter les lignes de commande.

---

## 🚀 Comment déployer DIGICAB ML avec d'autres applications ?

Chaque application tournant sur le serveur utilisera un port différent (ex: DIGICAB ML sur le port `3000`, App 2 sur le port `3001`, App 3 sur le port `8080`).

Le serveur utilise un **Proxy Inverse (Nginx ou Traefik)** pour diriger automatiquement les visiteurs :
- `digicab.votredomaine.com` ➔ Dirige vers DIGICAB ML (Port 3000)
- `app2.votredomaine.com` ➔ Dirige vers l'App 2 (Port 3001)
- `site.votredomaine.com` ➔ Dirige vers le site web (Port 80)

# Guide de Déploiement DIGICAB ML sur OVHcloud

Ce guide pas-à-pas détaille le déploiement de **DIGICAB ML** sur un serveur OVHcloud (VPS Linux).

---

## 1. Choix du serveur chez OVHcloud

Pour faire tourner DIGICAB ML avec SQLite et la gestion des fichiers joints :
* **Option conseillée :** **VPS Starter / Value** (environ 3.50 € à 5.00 € / mois).
* **Système d'exploitation :** Ubuntu 22.04 LTS ou Debian 12.

---

## 2. Déploiement via Docker (Méthode la plus simple)

### Étape 2.1 : Se connecter au serveur
Ouvrez votre terminal ou PuTTY sur Windows et connectez-vous :
```bash
ssh root@IP_DE_VOTRE_SERVEUR_OVH
```

### Étape 2.2 : Installer Docker et Git
Exécutez ces commandes :
```bash
apt update && apt upgrade -y
apt install -y git docker.io docker-compose
```

### Étape 2.3 : Récupérer et démarrer DIGICAB ML
```bash
# Transférez votre code source sur le serveur ou clonez votre dépôt Git
cd /opt
# Démarrez le conteneur DIGICAB ML avec stockage persistant
docker-compose up -d --build
```
L'application sera accessible immédiatement sur : `http://IP_DE_VOTRE_SERVEUR_OVH:3000`

---

## 3. Déploiement direct via Node.js + PM2 (Sans Docker)

Si vous préférez exécuter Node.js directement sur la machine :

### Étape 3.1 : Installer Node.js 20 et PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs build-essential python3
npm install -g pm2
```

### Étape 3.2 : Installer et compiler l'application
Dans le dossier du projet :
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 4. Identifiants par défaut

* **Administrateur :** `admin`
* **Mot de passe :** `admin123`

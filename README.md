# 🏛️ Plateforme DGI IPER — Mbanza-Ngungu
**Gestion numérique des déclarations de l'Impôt Professionnel sur les Rémunérations**

---

## Structure du projet

```
dgi_platform/
├── backend/               ← API REST Django + SQLite 3
│   ├── requirements.txt
│   └── dgi_project/
│       ├── manage.py
│       ├── seed_data.py   ← Données initiales de test
│       ├── dgi_project/   ← Config Django
│       │   ├── settings.py
│       │   ├── urls.py
│       │   └── wsgi.py
│       └── iper_app/      ← Application principale
│           ├── models.py      (T_Utilisateur, T_Contribuable, T_Agent_DGI, T_Declaration, T_Paiement)
│           ├── serializers.py
│           ├── views.py
│           ├── urls.py
│           └── admin.py
└── frontend/              ← Interface React (Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx        ← Application complète
        └── api.js         ← Service API centralisé
```

---

## ⚙️ Installation et démarrage

### 1. Backend Django

```bash
cd dgi_platform/backend

# Créer un environnement virtuel Python
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Installer les dépendances
pip install -r requirements.txt

# Aller dans le dossier projet
cd dgi_project

# Créer les tables SQLite 3
python manage.py makemigrations iper_app
python manage.py migrate

# Insérer les données de test (comptes + déclarations exemples)
python seed_data.py

# Lancer le serveur Django sur le port 8000
python manage.py runserver
```

Le backend sera disponible sur : **http://localhost:8000**

---

### 2. Frontend React

Ouvrir un **second terminal** :

```bash
cd dgi_platform/frontend

# Installer les dépendances Node.js
npm install

# Lancer le serveur de développement sur le port 3000
npm run dev
```

L'application sera disponible sur : **http://localhost:3000**

---

## 🔐 Comptes disponibles après le seed

| Login              | Mot de passe | Rôle         |
|--------------------|-------------|--------------|
| `admin@dgi`        | `admin123`  | Administrateur |
| `agent@dgi`        | `agent123`  | Agent DGI    |
| `entreprise@sarl`  | `sarl123`   | Contribuable (SARL KONGO TRADE) |
| `mines@sprl`       | `mines123`  | Contribuable (SPRL KONGO MINES) |

---

## 🌐 Endpoints API

| Méthode | URL                          | Description              | Accès        |
|---------|------------------------------|--------------------------|--------------|
| POST    | `/api/auth/login/`           | Connexion                | Public       |
| POST    | `/api/auth/logout/`          | Déconnexion              | Authentifié  |
| POST    | `/api/contribuables/register/` | Inscription            | Public       |
| GET     | `/api/contribuables/`        | Liste contribuables      | Agent/Admin  |
| GET     | `/api/contribuables/mon-profil/` | Mon profil           | Contribuable |
| GET/POST| `/api/declarations/`         | Liste / Soumettre        | Selon rôle   |
| GET/PATCH | `/api/declarations/{id}/`  | Détail / Valider/Rejeter | Selon rôle   |
| GET/POST| `/api/paiements/`            | Paiements                | Agent/Admin  |
| GET     | `/api/statistiques/`         | KPIs tableau de bord     | Agent/Admin  |

---

## 🔧 Technologies

- **Backend** : Python 3.x · Django 4.2 · Django REST Framework · SQLite 3
- **Frontend** : React 18 · Vite · JavaScript (ES2022)
- **Sécurité** : Authentification par Token · CORS configuré

---

## 📈 Perspectives d'évolution

1. **Passerelle Mobile Money** — M-Pesa, Orange Money, Airtel Money
2. **Migration PostgreSQL** — pour la mise en production (aucune modification du code nécessaire)
3. **Génération PDF** — quittances officielles avec ReportLab
4. **Centralisation nationale** — interconnexion avec le SI de la DGI Kinshasa

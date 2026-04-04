# secure-postit-app

Projet Application web securisees.

## Architecture retenue

Stack proposee pour le projet:

- Node.js + Express
- Nunjucks pour les vues serveur
- SQLite pour rester simple en developpement
- Sessions avec `express-session`
- `bcrypt` pour les mots de passe
- HTTPS prevu des le depart dans l'architecture

Arborescence de depart:

```text
secure-postit-app/
├── certs/
├── data/
├── public/
│   ├── css/
│   └── js/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── views/
│   │   └── partials/
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## Decoupage logique

- `routes/`: declaration des URLs `/`, `/signup`, `/login`, `/logout`, `/ajouter`, `/effacer`, `/liste`, `/admin`
- `controllers/`: gestion HTTP
- `services/`: logique metier
- `models/`: point d'entree des entites SQL
- `middleware/`: authentification et permissions
- `db/`: schema SQL et initialisation
- `views/`: pages Nunjucks (`.njk`)
- `public/`: CSS et JavaScript client

## Schema de base de donnees prevu

Tables de depart:

- `users`
- `boards`
- `user_permissions`
- `postits`

Ce schema couvre deja les besoins obligatoires IRS:

- utilisateurs et mots de passe
- post-its avec texte, auteur, date, coordonnees
- gestion des droits create, update, delete, admin
- base prete pour plusieurs tableaux

## Strategie de commits conseillee

1. `chore: initialise express project structure`
2. `feat: add sqlite schema and database bootstrap`
3. `feat: implement signup and login with sessions`
4. `feat: display post-its on main board`
5. `feat: create post-its with ajax on double click`
6. `feat: allow owners to delete their post-its`
7. `feat: add role-based permissions and admin page`
8. `feat: enable https in development`
9. `feat: make board responsive and add touch support`
10. `feat: add live updates between browsers`

## Lancement prevu

```bash
npm install
copy .env.example .env
npm run init-db
npm run dev
```

## Fonctionnalites implementees

- Inscription et connexion utilisateurs (`bcrypt` + sessions)
- Compte special `guest` (droits des non-connectes)
- Compte admin de developpement cree a l'init DB (`admin / admin123`)
- Tableau principal + tableaux multiples via URL (`/`, `/:slug`)
- Affichage des post-its avec auteur/date/position
- Creation de post-it par double-clic (ou double tap)
- Suppression avec confirmation
- Modification de ses propres post-its
- Drag and drop de ses propres post-its (remontent au premier plan)
- 4 niveaux de droits IRS: creation, modification, suppression, administration
- Page admin (`/admin`) pour modifier les permissions des utilisateurs
- API AJAX JSON (`/liste`, `/ajouter`, `/modifier`, `/effacer`, `/deplacer`)
- Synchronisation temps reel entre navigateurs (SSE)
- HTTPS configurable (certificats locaux)

## Routes principales

- `GET /` et `GET /:boardSlug`: page principale
- `GET /signup`, `POST /signup`
- `POST /login`, `POST /logout`
- `GET /liste/:boardSlug?`
- `POST /ajouter`
- `POST /modifier`
- `POST /effacer`
- `POST /deplacer`
- `GET /events/:boardSlug?` (temps reel)
- `GET /admin`, `POST /admin/permissions`

## Demarrage rapide

```bash
npm install
copy .env.example .env
npm run init-db
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Verification manuelle conseillee

1. Creer un compte via `/signup`.
2. Se connecter et creer plusieurs post-its par double-clic.
3. Modifier, supprimer et deplacer ses post-its.
4. Ouvrir un second navigateur sur le meme tableau et verifier la mise a jour live.
5. Se connecter avec `admin / admin123`, aller sur `/admin` et changer des droits.
6. Tester un second tableau avec une URL comme `/reseau`.

# Secure Post-it App

A secure, real-time collaborative post-it board application built with Node.js, Express, and PostgreSQL. Features user authentication, role-based permissions, and live updates between browsers.

## 🚀 Features

- **User Authentication**: Secure signup/login with bcrypt password hashing and session management
- **Role-Based Access Control**: Admin, regular users, and guest permissions
- **Real-time Collaboration**: Live updates between browsers using WebSockets
- **Multiple Boards**: Support for multiple post-it boards via URL routing
- **Responsive Design**: Mobile-friendly interface with touch support
- **HTTPS Ready**: Built-in HTTPS support for production deployment
- **PostgreSQL Database**: Robust data persistence with proper schema design

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: bcrypt + express-session
- **Templates**: Nunjucks (server-side rendering)
- **Real-time**: Socket.io for live updates
- **Security**: CSRF protection, input validation, secure headers

## 📁 Project Structure

```
secure-postit-app/
├── public/                 # Static assets (CSS, JS)
│   ├── css/
│   └── js/
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # HTTP request handlers
│   ├── db/               # Database schema and initialization
│   ├── middleware/       # Authentication & permissions
│   ├── models/           # Data models
│   ├── routes/           # URL routing
│   ├── services/         # Business logic
│   ├── views/            # Nunjucks templates
│   │   └── partials/
│   ├── app.js           # Express app setup
│   └── server.js        # Server startup
├── .env                 # Environment variables
├── package.json         # Dependencies and scripts
└── README.md
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts with hashed passwords
- `boards` - Multiple post-it boards
- `postits` - Individual post-it notes with position, content, and metadata
- `user_permissions` - Role-based access control (create, update, delete, admin)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/uvsq22504751/secure-postit-app.git
   cd secure-postit-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**
   - Install and start PostgreSQL
   - Create a database named `postitdb`
   - Update connection settings in `.env` if needed

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

5. **Initialize database**
   ```bash
   npm run init-db
   ```

6. **Start the application**
   ```bash
   npm run dev  # Development mode with auto-reload
   # or
   npm start    # Production mode
   ```

The application will be available at `http://localhost:3000`

### Default Admin Account

After initialization, you can log in with:
- **Username**: `admin`
- **Password**: `Admn@2026Secure!` (configurable in `.env`)

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm start` - Start production server
- `npm run init-db` - Initialize/reset database
- `npm test` - Run tests (when implemented)

### Environment Variables

Key configuration options in `.env`:

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `ADMIN_DEFAULT_PASSWORD` - Default admin password
- `HTTPS_ENABLED` - Enable HTTPS mode (requires certificates)

### HTTPS Setup

For production HTTPS:

1. Place SSL certificates in `certs/` directory:
   - `key.pem` - Private key
   - `cert.pem` - SSL certificate

2. Set `HTTPS_ENABLED=true` in `.env`

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection
- Input validation and sanitization
- Secure headers middleware
- Role-based permissions system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- UVSQ22504751 - Initial development

## 🙏 Acknowledgments

- Built for educational purposes
- Inspired by collaborative whiteboard applications
- Uses modern web development best practices
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

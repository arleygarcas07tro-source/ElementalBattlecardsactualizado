# AGENTS.md — Elemental Battlecards

## Reglas obligatorias

- Usar JavaScript.
- Aplicar POO.
- Aplicar SOLID.
- No modificar código fuera del alcance de la tarea.
- No modificar node_modules.
- No modificar database.sqlite directamente.
- No eliminar archivos sin autorización.
- No cambiar nombres de elementos sin analizar todas sus referencias.
- No introducir lógica de negocio dentro de las Scenes.
- No conectar directamente las entidades del dominio con Phaser.
- No conectar directamente las entidades del dominio con Sequelize.
- Preferir composición sobre herencia cuando corresponda.
- Mantener las escenas enfocadas en presentación/coordinación.
- Toda nueva funcionalidad debe indicar qué responsabilidad agrega.

## Project Structure

Two separate apps sharing a repo (not a monorepo tool — just two folders):

- **Backend/** — Node.js + Express + Socket.io + Sequelize (port 3001)
- **Frontend/** — Phaser 3 card game bundled with Vite (no config file, uses defaults)
- Root `package.json` is vestigial (only `react-icons`). Ignore it.
- `node_modules/` at root is tracked in git — it shouldn't be. Don't add more.

## Running

```powershell
# Backend (start first)
cd Backend; npm install; npm run dev

# Frontend (separate terminal)
cd Frontend; npm install; npm run dev
```

- Backend: `npm run dev` = `nodemon server.js`, listens on `0.0.0.0:3001`.
- Frontend: `npm run dev` = `vite --host`, serves on a random port. Open the printed URL.
- There are **no test, lint, typecheck, or format commands** — `test` scripts just exit 1.

## Backend Key Facts (estructura OOP + SOLID)

- **Entry point:** `Backend/server.js` es un thin wrapper → `Backend/src/bootstrap.js` (composition root). Boot order: dotenv → `AppConfig`/`Logger` → `DatabaseFactory` crea Sequelize → `DatabaseInitializer` conecta y sincroniza → arma auth router → `AppFactory` crea la app Express → crea socket.io → `SocketGateway` registra eventos → listen.
- **Arquitectura por capas en `Backend/src/`:** `core/` (AppConfig, Logger, errores AppError, assertContract), `database/` (DatabaseFactory, DatabaseInitializer, models), `repositories/` (interfaz IUserRepository + SequelizeUserRepository), `services/` (interfaces IPasswordHasher/ITokenService + BcryptPasswordHasher/JwtTokenService + AuthService), `http/` (AuthController, rutas, middleware errorHandler, AppFactory), `socketio/` (IRoomStore + InMemoryRoomStore, RoomCodeGenerator, RoomManager, SocketGateway), `utils/` (NetworkInfo).
- **DI estricto:** las clases altas dependen de interfaces (JSDoc/`assertContract`) inyectadas por constructor. Los contratos (`IUserRepository`, `IPasswordHasher`, `ITokenService`, `IRoomStore`) viven en un archivo aparte con `static assert()` (fail-fast en bootstrap).
- **DB:** Sequelize. SQLite por defecto (`DB_USE_SQLITE=true` en `.env`). File at `Backend/database.sqlite`. Supports Postgres via env vars.
- **Schema management:** `sequelize.sync({ alter: true })` on every boot. Migrations in `migrations/` are **dead code** — never run. New models auto-create/alter tables at startup.
- **Auth routes** (`/api/auth/register`, `/api/auth/login`) only mount if `DB_ENABLED=true` AND db connected.
- **Login uses `username`**, not `email` (contradicts the README). Register uses `email`.
- **Socket.io rooms** (`src/socketio/RoomManager.js`): in-memory only. 6-digit numeric codes, 2-player rooms, `game_event` relay only (no server-side game logic). Room state resets on server restart. `global.activeRooms` enlaza al store vivo para debug.
- **CORS is wide open** (`*`) on both HTTP and sockets (via `config.corsOrigin`). JWT secret has a hardcoded fallback.
- **Error handling:** `src/http/middleware/errorHandler.js` traduce `AppError` → `{ message }` con su status; errores inesperados → 500 `{ message: 'Error en el servidor.' }` y se loguean.

## Frontend Key Facts

- **Entry point:** `Frontend/src/main.js` — Phaser 3.90+ config (1600x1000, Scale.FIT, DOM container).
- **No `vite.config.js`** — Vite runs on pure defaults.
- **14 scenes** in `src/scenes/`. The core is `GameScene.js` (~2000 lines, includes full bot AI). `mainMenu.js` is empty (0 bytes).
- **Game objects:** `Card.js`, `Deck.js` (Fisher-Yates shuffle, 48 cards), `Player.js`.
- **Helpers:** `Constants.js` (type cycle: fuego→planta→agua→fuego; luz→sombra→espiritu→luz), `combat.js` (`resolveCombat`), `Zone.js`.
- **Card definitions:** 18 cards (6 types × 3 levels) in `game_objects/card-definitions.js`.
- **Socket client:** `socket.io-client` connects to the backend. Connection is not gated by JWT — auth and gameplay are completely disconnected systems.
- **Asset filenames contain spaces** (`carta fuego.png`, `campo juego/`) — use proper URL encoding when referencing.

## Gotchas

- **Spanish codebase:** All logs, comments, and user-facing messages are in Spanish.
- **Inconsistent card-type names:** `cardsScene.js` uses `aire/tierra/oscuridad` while `constants.js` uses `planta/sombra/espiritu`.
- **`.env.example` is referenced in README but doesn't exist.**
- **`NetworkInfo` (src/utils) still advertises a `/rooms` HTTP endpoint that doesn't exist.**
- **Root `node_modules/` and `react-icons`** are tracked. Don't commit more deps there.
- **`dist/`** in Frontend is gitignored (correct).
- **Port:** Backend `.env` says `3001`. README mentions `3000` — trust the `.env`.

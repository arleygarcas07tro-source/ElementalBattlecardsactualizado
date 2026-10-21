# Diagrama General de Arquitectura — Elemental Battlecards

> Diagrama generado a partir del código actual (sin modificar archivos).
> Representa los componentes reales de `Frontend/` y `Backend/`, sus capas y su comunicación vía Socket.IO.

```mermaid
flowchart TB
    %% ============================
    %% FRONTEND
    %% ============================
    subgraph FRONTEND["Frontend — Phaser 3 + Vite"]
        direction TB

        main["main.js\n(config Phaser + registro de 19 Scenes)"]

        subgraph SCENES["Scenes (presentación / Phaser.Scene)"]
            direction LR
            menu["BootScene / Preloader / Login /\nHomeScenes / Cards / Profile /\nAbout / Mechanics / Settings /\nMissions / Stats / Loading / Pause / UIScene"]
            roomScene["CreateRoomScene /\nGameSceneLAN\n(socket.io-client)"]
            gameScene["GameScene\n(coordinador de partida)"]
        end

        subgraph PRES_FRONT["presentation/ (reciben ctx por constructor)"]
            direction LR
            renderer["BoardRenderer"]
            interaction["CardInteraction"]
            attackC["AttackController"]
            botRunner["BotTurnRunner"]
            remoteApplier["RemoteEffectApplier"]
            turnController["TurnController"]
        end

        subgraph DOMAIN_FRONT["Motor de juego (dominio Frontend)"]
            direction LR
            composer["GameComposer\n(composition root)"]
            match["GameMatch"]
            playerObj["Player / Deck /\nBattlefield / EssenceManager"]
            turnMgr["TurnManager"]
            services["VictoryEvaluator / ConvergenceService /\nEssencePowerService / CardEntity /\nPoderesRegistry / LANClient / LANEventRouter"]
        end

        main --> menu
        menu --> roomScene
        roomScene -->|"lanza con socket"| gameScene
        menu --> gameScene
        gameScene --- PRES_FRONT
        gameScene --> composer
        composer --> match
        match --> playerObj
        match --> turnMgr
        match --> services
    end

    %% ============================
    %% COMUNICACIÓN
    %% ============================
    COM_SOCKET["COMUNICACIÓN — Socket.IO\n(HTTP / frontend en puerto aleatorio, backend :3001)"]
    COM_SOCKET -->|"eventos: create_room / join_room /\ngame_event / end_turn / disconnect"| FRONTEND
    COM_SOCKET ---|"CORS abierto, socket.io-client ↔ io(Server)"| BACKEND

    %% ============================
    %% BACKEND
    %% ============================
    subgraph BACKEND["Backend — Node.js + Express + Socket.io + Sequelize (:3001)"]
        direction TB

        entry["server.js → src/bootstrap.js\n(thin wrapper)"]

        appComposer["AppComposer\n(composition root)"]

        subgraph CORE["Core"]
            direction LR
            cfg["AppConfig"]
            logger["Logger → ILogger"]
            errs["AppError /\nValidation / Unauthorized / Conflict"]
            assertC["assertContract"]
        end

        subgraph DB_LAYER["Infraestructura de datos + Auth"]
            direction LR
            dbFactory["DatabaseFactory → Sequelize\n(DatabaseInitializer: connect + sync)"]
            userRepo["SequelizeUserRepository"]
            pwd["BcryptPasswordHasher"]
            jwt["JwtTokenService"]
        end

        subgraph PRES_HTTP["Presentation — HTTP"]
            direction LR
            appFactory["AppFactory (Express)"]
            authCtrl["AuthController + routes /api/auth"]
            errHandler["middleware/errorHandler"]
        end

        subgraph PRES_SOCKET["Presentation — Socket"]
            direction LR
            gw["SocketGateway\n(registra eventos + guard)"]
            roomLife["RoomLifecycleController\n(createRoom / joinRoom / disconnect)"]
            gameplay["GameplayController\n(gameEvent / endTurn)"]
            dto["DTOs:\nJoinRoomRequest /\nGameEventRequest"]
        end

        subgraph DOMAIN_BACK["Domain (núcleo Room/Multiplayer)"]
            direction LR
            roomSvc["RoomService"]
            roomEnt["Room"]
            playerEnt["Player"]
            turnEnt["TurnState"]
            contracts["Contratos:\nIRoomService /\nIRoomStore /\nIRoomCodeGenerator /\nILogger"]
        end

        subgraph INFRA_SOCKET["Infrastructure — Socket"]
            direction LR
            store["InMemoryRoomStore"]
            codeGen["RoomCodeGenerator"]
            seqGen["SequentialRoomCodeGenerator"]
        end

        entry --> appComposer
        appComposer --> CORE
        appComposer --> DB_LAYER
        appComposer --> PRES_HTTP
        appComposer --> PRES_SOCKET
        appComposer --> INFRA_SOCKET
        appComposer --> DOMAIN_BACK

        PRES_SOCKET --> gw --> roomLife
        gw --> gameplay
        roomLife --> dto
        gameplay --> dto

        roomLife -->|"usa"| roomSvc
        gameplay -->|"usa"| roomSvc
        roomSvc --- contracts
        roomSvc -->|"crea"| roomEnt
        roomEnt --> playerEnt
        roomEnt --> turnEnt

        roomSvc -->|"DI: roomStore/codeGenerator/logger"| store
        roomSvc -->|"DI"| codeGen
        store -.->|"implementa"| contracts
        codeGen -.->|"implementa"| contracts
        seqGen -.->|"implementa"| contracts
        infra_roomlife["RoomLifecycleController/GameplayController\nreciben {io, roomService, logger} por DI"]
    end
```

---

## Explicación de cada bloque

### 1. Cliente / Frontend
- **main.js** — punto de entrada Phaser: define el `Game` (1600×1000, `Scale.FIT`, DOM container) y registra las 19 escenas. Solo coordina el arranque, sin lógica de negocio.
- **Scenes** — capa de presentación: cada una extiende `Phaser.Scene`. Las de menú (`HomeScenes`, `Cards`, `Profile`, etc.) son pantallas mayormente DOM; `CreateRoomScene`/`GameSceneLAN` son las únicas que crean el socket.io-client; todas navegan vía `scene.start` pasando `playerData`.
- **GameScene** — coordinador de partida: construye el objeto `ctx` (de 18 campos), instancia las 6 clases de `presentation/` (BoardRenderer, CardInteraction, AttackController, BotTurnRunner, RemoteEffectApplier, TurnController) y delega en `GameComposer` para crear el motor. No contiene lógica de negocio.
- **GameComposer** — *composition root* del Frontend: `createMatch()` → `GameMatch` (valida `IGameMatch.assert`), `createBot()` → `BotAI` (valida `IBotAI.assert`), `createLanStack()` → `LANClient` + `LANEventRouter` (valida `ISyncGateway.assert`).
- **GameMatch** — agregado raíz del motor: compone 2× `Player` (con `Deck`, `Battlefield`, `EssenceManager`), 1× `TurnManager` y 1× `EventBus`, y delega reglas en servicios estáticos (`VictoryEvaluator`, `ConvergenceService`, `PoderesRegistry`, `resolveCombat`).

### 2. Comunicación
- **Socket.IO** es el único canal entre apps. El frontend conecta con `io(SERVER_URL)` (URL derivada de `?backend=`, `window.BACKEND_URL` o `http://hostname:3001`). El backend expone `io(server)` con CORS abierto.
- **Eventos en el bus real**: `create_room`, `join_room`, `game_event`, `end_turn`, `disconnect` (cliente→servidor) y `room_created`, `player_joined`, `game_start`, `player_left`, `game_event`, `turn_changed` (servidor→cliente). No hay lógica de juego en el servidor: `game_event` es solo relé entre rivales.

### 3. Backend
- **Bootstrap / entrada** — `server.js` y `src/bootstrap.js` son wrappers finos: cargan `.env` y llaman `AppComposer.build()`.
- **AppComposer** — *composition root*: monta DB (`DatabaseFactory` → `Sequelize`, `DatabaseInitializer` conecta y sincroniza), Express (`AppFactory`), socket.io, el módulo Auth (si `DB_ENABLED`) y el módulo Room (`buildRoomService()`). Devuelve `{ server, io, app, roomService, socketGateway, ... }`.
- **Presentation** — dos caras: HTTP (`AppFactory` + `AuthController` + errorHandler) y Socket (`SocketGateway`).
- **Domain** — núcleo **Room/Multiplayer**: `Room` (compone `Player` 1..2 y `TurnState` 1, con campos `#` privados), y `RoomService` que coordina el ciclo de vida y turnos sobre esos contratos.
- **Infrastructure** — implementaciones concretas de los contratos: `InMemoryRoomStore` (mapa en memoria, se resetea al reiniciar), `RoomCodeGenerator`/`SequentialRoomCodeGenerator` (códigos de 6 dígitos; prueba de polimorfismo), más `SequelizeUserRepository`, `BcryptPasswordHasher`, `JwtTokenService` para Auth.
- **Core** — transversal: `AppConfig` (config desde env), `Logger` (implementa `ILogger`), jerarquía `AppError`, y `assertContract` (verificación de contratos, fail-fast).

### 4. Presentation — Socket
- **SocketGateway** — adaptador puro: registra handlers (`create_room`, `join_room`, `game_event`, `end_turn`, `disconnect`), envuelve cada uno con `guard()` (captura errores y responde `{success:false}` al callback) y delega. Sin SRP violado tras el refactor.
- **RoomLifecycleController** — ciclo de vida: `createRoom` (crea sala + `socket.join(code)` + emite `room_created`), `joinRoom` (valida DTO, une jugador, emite `player_joined` y `game_start` si `canStart`), `disconnect` (quita jugador, borra sala vacía).
- **GameplayController** — juego: `gameEvent` (relé `socket.to(code).emit('game_event')` tras validar tamaño de sala y DTO) y `endTurn` (cambia turno vía `RoomService.toggleTurn` y emite `turn_changed`).
- **DTOs** — `JoinRoomRequest` (normaliza/valida código de 6 dígitos) y `GameEventRequest` (valida tipo `play_card/fuse_cards/fuse_from_hand/attack/direct_attack` e índices de campo 0..5). Rechazan payloads malformados antes de reenviarlos.

### 5. Domain
- **Room** (entidad): encapsula `#code/#players/#turn/#createdAt` con getters de solo lectura; decide `isEmpty/isFull/canStart`, da `hostId/guestId`, `addPlayer/removePlayer`, `toggleTurn`.
- **Player** (entidad): encapsula `#socketId/#role`; `isHost()/isGuest()`.
- **TurnState** (entidad): encapsula `#currentTurn/#turnNumber`; `toggle(fromRole)`/`advanceTo(role)` con validación de rol.
- **RoomService** (servicio, `extends IRoomService`): usa DI `{roomStore, codeGenerator, logger}`; crea `Room`, persiste en el store y expone las 10 operaciones del contrato.
- **Contratos principales**: `IRoomService`, `IRoomStore`, `IRoomCodeGenerator` (dominio) e `ILogger` (core) — con `static assert()` de fail-fast.

### 6. Infrastructure (Socket)
- **InMemoryRoomStore** (`extends IRoomStore`) — `rooms{}`; operaciones `get/set/delete/all`. Estado efímero (se pierde al reiniciar el server).
- **RoomCodeGenerator** (`extends IRoomCodeGenerator`) — `generate()` aleatorio `100000..999999`.
- **SequentialRoomCodeGenerator** (`extends IRoomCodeGenerator`) — `generate()` secuencial `000001..` con reinicio. Ambos son intercambiables vía el contrato (polimorfismo).

### 7. Composition roots
- **AppComposer** — construye y cablea **todo el Backend** (DB, HTTP, Socket, Auth, Room); las clases altas solo dependen de interfaces inyectadas.
- **GameComposer** — construye el motor del **Frontend** (`GameMatch`, `BotAI`, `LANClient`, `LANEventRouter`) y valida contratos por duck-typing antes de devolverlos. `GameScene` lo consume como único punto de entrada al dominio.

> Nota: el diagrama agrupa componentes y capas; no dibuja cada archivo `.js` en una caja. Los archivos funcionales/helpers (`combat`, `constants`, `audioManager`, `playerProgress`, etc.) quedan implícitos en sus capas por claridad.
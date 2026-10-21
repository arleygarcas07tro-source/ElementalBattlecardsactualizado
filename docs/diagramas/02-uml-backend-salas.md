# UML de Clases — Backend · Módulo SALAS/PARTIDAS

Diagrama del módulo central de salas/partidas del backend de Elemental Battlecards.
Modelado sobre el código real de `Backend/src`. No incluye el módulo de autenticación (sin relación estructural con esta capa salvo `ILogger`, compartido por `core/`) ni librerías externas (socket.io se muestra solo como nota).

> **Legenda:** `-atributo` = campo privado (`#campo` en JS) · `+` = público · `{abstract}` = método abstracto (contrato que lanza "no implementado") · `{static}` = método de clase · `<<contract>>` = contrato/interfaz JS (clase con `assert()` fail-fast).

```mermaid
classDiagram
    direction TB

    %% ============================== CORE ==============================
    class ILogger {
        <<contract>>
        +{abstract} info(...args)
        +{abstract} warn(...args)
        +{abstract} error(...args)
        +{static} assert(implementation)
    }
    class Logger {
        <<infrastructure>>
        +info(...args)
        +warn(...args)
        +error(...args)
    }

    %% ========================= DOMAIN: contratos =======================
    class IRoomStore {
        <<contract>>
        +{abstract} get(code)
        +{abstract} set(code, room)
        +{abstract} delete(code)
        +{abstract} all()
        +{static} assert(implementation)
    }
    class IRoomCodeGenerator {
        <<contract>>
        +{abstract} generate()
        +{static} assert(implementation)
    }
    class IRoomService {
        <<contract>>
        +{abstract} createRoom(socketId)
        +{abstract} getRoom(code)
        +{abstract} exists(code)
        +{abstract} joinRoom(code, socketId)
        +{abstract} hostId(room)
        +{abstract} guestId(room)
        +{abstract} toggleTurn(code, currentRole)
        +{abstract} removePlayer(code, socketId)
        +{abstract} playerCount(code)
        +{abstract} activeRooms()
        +{static} assert(implementation)
    }

    %% ========================= DOMAIN: entidades ========================
    class Player {
        <<entity>>
        -socketId: string
        -role: string
        +get socketId() string
        +get role() string
        +isHost() boolean
        +isGuest() boolean
    }
    class TurnState {
        <<entity>>
        -currentTurn: string
        -turnNumber: number
        +get currentTurn() string
        +get turnNumber() number
        +toggle(fromRole) object
        +advanceTo(role) object
        +toJSON() object
    }
    class Room {
        <<entity>>
        -code: string
        -players: Player[]
        -turn: TurnState
        -createdAt: number
        +get code() string
        +get turn() TurnState
        +isEmpty() boolean
        +isFull() boolean
        +canStart() boolean
        +playerCount() number
        +hostId() string|null
        +guestId() string|null
        +addPlayer(socketId) object
        +removePlayer(socketId) boolean
        +toggleTurn(fromRole) object
        +toJSON() object
    }
    class RoomService {
        <<domain service>>
        +roomStore: IRoomStore
        +codeGenerator: IRoomCodeGenerator
        +logger: ILogger
        +createRoom(socketId) object
        +getRoom(code) Room
        +exists(code) boolean
        +joinRoom(code, socketId) object
        +hostId(room) string|null
        +guestId(room) string|null
        +toggleTurn(code, currentRole) object|null
        +removePlayer(code, socketId) object|null
        +playerCount(code) number
        +activeRooms() object
    }

    %% =========================== INFRASTRUCTURE =========================
    class InMemoryRoomStore {
        <<infrastructure>>
        +rooms: object
        +get(code) Room|null
        +set(code, room) Room
        +delete(code) boolean
        +all() object
    }
    class RoomCodeGenerator {
        <<infrastructure>>
        +generate() string
    }
    class SequentialRoomCodeGenerator {
        <<infrastructure>>
        +counter: number
        +generate() string
    }

    %% ============================ PRESENTATION ==========================
    class SocketGateway {
        <<presentation>>
        +io
        +roomService
        +logger
        +roomLifecycle: RoomLifecycleController
        +gameplay: GameplayController
        +registerHandlers()
        +guard(name, handler)
    }
    class RoomLifecycleController {
        <<presentation>>
        +io
        +roomService
        +logger
        +createRoom(socket, cb)
        +joinRoom(socket, data, cb)
        +disconnect(socket)
    }
    class GameplayController {
        <<presentation>>
        +io
        +roomService
        +logger
        +gameEvent(socket, payload)
        +endTurn(socket)
    }
    class JoinRoomRequest {
        <<dto>>
        +code: string|null
        +{static} normalize(code)
        +{static} fromPayload(data)
        +hasCode() boolean
        +isValid() boolean
        +{static} get CODE_LENGTH() number
    }
    class GameEventRequest {
        <<dto>>
        +payload: object|null
        +get type() string|null
        +{static} fromPayload(payload)
        +isAllowedType() boolean
        +isValid() boolean
        +{static} get ALLOWED_TYPES() string[]
    }

    %% ============================== RELACIONES ==========================
    ILogger <|-- Logger
    IRoomStore <|-- InMemoryRoomStore
    IRoomCodeGenerator <|-- RoomCodeGenerator
    IRoomCodeGenerator <|-- SequentialRoomCodeGenerator
    IRoomService <|-- RoomService

    Room *-- "1..2" Player : compone
    Room *-- "1" TurnState : compone
    InMemoryRoomStore o-- "0..*" Room : almacena

    SocketGateway *-- "1" RoomLifecycleController : crea
    SocketGateway *-- "1" GameplayController : crea

    RoomService ..> IRoomStore : inyectado
    RoomService ..> IRoomCodeGenerator : inyectado
    RoomService ..> ILogger : inyectado
    RoomService ..> Room : crea en createRoom()

    SocketGateway ..> IRoomService : assert
    SocketGateway ..> ILogger : assert

    RoomLifecycleController ..> IRoomService : usa
    RoomLifecycleController ..> ILogger : usa
    RoomLifecycleController ..> Room : usa resultado
    RoomLifecycleController ..> JoinRoomRequest : fromPayload()

    GameplayController ..> IRoomService : usa
    GameplayController ..> ILogger : usa
    GameplayController ..> GameEventRequest : fromPayload()
```

## Notas de modelo

- **Composición real:** `Room` crea sus `Player` (1..2) y su `TurnState` (1) dentro del constructor (`Room.js:20-21`) → composición fuerte. `SocketGateway` crea sus dos controladores en su constructor (`SocketGateway.js:19-20`) → composición fuerte.
- **`RoomService` CREA `Room`** (`RoomService.js:27`) pero no la retiene: la delega en `IRoomStore.set` → se modela como **dependencia** (flecha punteada), no como composición fuerte. El almacenamiento real lo hace `InMemoryRoomStore` (agregación `o--` con `0..*`).
- **DIP:** `RoomService` solo conoce contratos (`IRoomStore`, `IRoomCodeGenerator`, `ILogger`). Los concretos (`InMemoryRoomStore`, `RoomCodeGenerator`, `Logger`) son elegidos y ensamblados fuera del diagrama por el composition root `AppComposer.js:93-101`.
- **`io` (socket.io)** es una librería externa: se inyecta en `SocketGateway` y controladores, pero no se modela como clase interna del proyecto.

---

## Elementos de POO demostrables

- **Abstracción:** contratos `ILogger`, `IRoomStore`, `IRoomCodeGenerator`, `IRoomService` — clases abstractas con métodos que lanzan "no implementado" y `static assert()` fail-fast (p. ej. `IRoomService.js:18-65`, contraste con `assertContract.js`). `RoomService` opera contra estas abstracciones, nunca contra concretos.
- **Encapsulamiento:** campos `#privados` expuestos solo por getters: `Room.#code/#players/#turn/#createdAt` (`Room.js:7-10`, getters `code`/`turn` en `:25-31`); `Player.#socketId/#role` (`Player.js:6-7`, getters en `:20-26`); `TurnState.#currentTurn/#turnNumber` (`TurnState.js:6-7`, getters en `:17-23`). El estado interno solo muta por métodos (`Room.toggleTurn` delega en `TurnState.toggle`, `TurnState.js:25-28`).
- **Herencia:** `Logger extends ILogger` (`logger.js:5`); `RoomService extends IRoomService` (`RoomService.js:9`); `InMemoryRoomStore extends IRoomStore` (`InMemoryRoomStore.js:5`); `RoomCodeGenerator` y `SequentialRoomCodeGenerator` extienden `IRoomCodeGenerator` (`RoomCodeGenerator.js:5`, `SequentialRoomCodeGenerator.js:5`).
- **Polimorfismo:** `RoomService.createRoom` (`RoomService.js:23-25`) invoca `this.codeGenerator.generate()` sin saber qué implementación tiene: `RoomCodeGenerator` (aleatorio) o `SequentialRoomCodeGenerator` (secuencial) se despachan por el mismo mensaje. Verificado por `test/room-code-generator.polymorphism.js` (ambas implementaciones inyectadas al mismo `RoomService`).

## Elementos SOLID demostrables

- **SRP:** cada clase una sola responsabilidad: `RoomService` = reglas de dominio de salas (`RoomService.js`); `InMemoryRoomStore` = persistencia en memoria (`InMemoryRoomStore.js`); `SocketGateway` + controladores = presentación/coordinación de sockets; `JoinRoomRequest`/`GameEventRequest` = validación de entrada en la presentación (`dto/JoinRoomRequest.js:30-32`, `dto/GameEventRequest.js:39-61`).
- **OCP:** la familia `IRoomCodeGenerator` permite añadir un generador nuevo (crear clase + registrar en `AppComposer`) **sin modificar** `RoomService` — que ya invoca `generate()` de forma genérica (`RoomService.js:24`).
- **LSP:** `SequentialRoomCodeGenerator` sustituye al base garantizando el contrato de 6 dígitos (`SequentialRoomCodeGenerator.js:11-15`, wrap `% 999999`); probado en el borde de contador en `test/roomService.test.js` y por el smoke test de sustitución.
- **ISP:** en este módulo los contratos ya están segregados por rol (1 método `IRoomCodeGenerator`, 4 en `IRoomStore`, 10 en `IRoomService`, 3 en `ILogger`) y cada cliente depende solo del suyo — ningún cliente carga métodos que no usa. (El caso sincero pendiente, `ITokenService` sign/verify, pertenece al módulo de autenticación y no se incluye aquí.)
- **DIP:** `RoomService` depende de abstracciones inyectadas por constructor (`RoomService.js:10-14` con `IRoomStore.assert`, `IRoomCodeGenerator.assert`, `ILogger.assert`) y `SocketGateway` recibe `IRoomService`/`ILogger` también por inyección (`SocketGateway.js:9-14`); los detalles concretos solo se ensamblan en la composition root (`AppComposer.js:93-101`).
# Evidencia POO — Backend (Módulo de Salas / Autenticación)

Cada concepto se demuestra con **fragmentos reales del código fuente** (sin
modificaciones). Referencia: `archivo:línea` o rango de líneas.

---

## 1. Abstracción

> Definición de contratos/abstractos que las clases de servicio y repositorios
> implementan. Las capas altas **no conocen implementaciones concretas**, solo
> la interfaz, validada con fail-fast (`static assert()`).

### 1.1 Contrato abstracto de generador de códigos
`Backend/src/domain/contracts/IRoomCodeGenerator.js` (líneas 7-18)

```js
class IRoomCodeGenerator {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IRoomCodeGenerator', IRoomCodeGenerator);
  }

  generate() {
    throw new Error('[IRoomCodeGenerator] Método abstracto generate() no implementado.');
  }
}
```

El método `generate()` **no tiene implementación** (lanza error): es la firma
abstracta que todo generador concreto debe proveer. `assert()` valida en runtime
que una implementación cumpla el contrato.

### 1.2 Contrato abstracto de servicio de salas
`Backend/src/domain/contracts/IRoomService.js` (líneas 18-65) — mismo patrón,
11 métodos declarados como abstractos:

```js
class IRoomService {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IRoomService', IRoomService);
  }

  createRoom() {
    throw new Error('[IRoomService] Método abstracto createRoom() no implementado.');
  }
  // getRoom, exists, joinRoom, hostId, guestId, toggleTurn,
  // removePlayer, playerCount, activeRooms — idénticos
}
```

### 1.3 La capa de presentación depende solo de la abstracción
`Backend/src/presentation/socket/SocketGateway.js` (líneas 8-19)

```js
class SocketGateway {
  constructor({ io, roomService, logger }) {
    if (!io) {
      throw new TypeError('[SocketGateway] Falta la instancia de socket.io.');
    }
    IRoomService.assert(roomService);
    ILogger.assert(logger);

    this.io = io;
    this.roomService = roomService;
    this.logger = logger;
  }
```

El gateway recibe `roomService` y lo valida contra `IRoomService`: no instancia
ni conoce `RoomService`, solo su contrato.

### 1.4 El servicio de dominio valida sus dependencias con contratos
`Backend/src/domain/services/RoomService.js` (líneas 10-19)

```js
  constructor({ roomStore, codeGenerator, logger }) {
    super();
    IRoomStore.assert(roomStore);
    IRoomCodeGenerator.assert(codeGenerator);
    ILogger.assert(logger);

    this.roomStore = roomStore;
    this.codeGenerator = codeGenerator;
    this.logger = logger;
  }
```

OTROS contratos equivalentes: `IUserRepository`, `IPasswordHasher`,
`ITokenService`, `IRoomStore`, `ILogger` (todos en `domain/contracts/` y
`core/ILogger.js`).

---

## 2. Encapsulamiento

> El estado interno de las entidades no se manipula directamente: se protege
> con validación de entradas en el constructor, se muta **solo a través de
> métodos con reglas de negocio**, y los datos ajenos salen por DTO (`toJSON`).

### 2.1 Validación de invariantes en el constructor
`Backend/src/domain/entities/Player.js` (líneas 6-15)

```js
  constructor(socketId, role) {
    if (!socketId) {
      throw new TypeError('[Player] Falta socketId.');
    }
    if (!VALID_ROLES.includes(role)) {
      throw new TypeError(`[Player] Rol inválido: ${role}`);
    }
    this.socketId = socketId;
    this.role = role;
  }
```

El rol se valida contra `VALID_ROLES`: no se puede crear un jugador con rol
inválido, la identidad queda controlada en la frontera de la clase.

### 2.2 Mutación controlada del estado del turno
`Backend/src/domain/entities/TurnState.js` (líneas 19-26)

```js
  advanceTo(role) {
    if (!ROLES.includes(role)) {
      throw new TypeError(`[TurnState] Turno destino inválido: ${role}`);
    }
    this.currentTurn = role;
    this.turnNumber++;
    return { currentTurn: this.currentTurn, turnNumber: this.turnNumber };
  }
```

`currentTurn`/`turnNumber` solo cambian por `advanceTo()`/`toggle()` y **nunca**
se asigna un rol no contemplado (la regla de negocio vive en la entidad, no en
quien la usa).

### 2.3 La sala expone comportamiento, no su lista de jugadores
`Backend/src/domain/entities/Room.js` (líneas 46-53)

```js
  addPlayer(socketId) {
    if (this.isFull()) {
      return { success: false, message: 'Sala llena.' };
    }
    const player = new Player(socketId, 'guest');
    this.players.push(player);
    return { success: true, role: player.role, canStart: this.canStart() };
  }
```

Las operaciones del array `players` (dentro de `Room`) quedan encapsuladas en
métodos con reglas (`isFull`, `addPlayer`, `removePlayer`); ningún externo
inserta jugadores a un array directamente.

### 2.4 Exportación de estado mediante DTO (copia, no referencia)
`Backend/src/domain/entities/Room.js` (líneas 65-71)

```js
  toJSON() {
    return {
      players: this.players.map((player) => ({ socketId: player.socketId, role: player.role })),
      gameState: this.turn.toJSON(),
      createdAt: this.createdAt,
    };
  }
```

`toJSON()` devuelve una **copia plana por jugador** (`map` crea objetos nuevos):
mutar el DTO resultante no altera el estado interno de la sala.

### 2.5 La lógica de negocio queda dentro del servicio (DI)
`Backend/src/domain/services/AuthService.js` (líneas 10-20)

```js
  constructor({ userRepository, passwordHasher, tokenService, logger }) {
    IUserRepository.assert(userRepository);
    IPasswordHasher.assert(passwordHasher);
    ITokenService.assert(tokenService);
    ILogger.assert(logger);

    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
    this.logger = logger;
  }
```

Inyección estricta de dependencias: el servicio **no crea** su repositorio/
hasher/token; los recibe por constructor y los consume como caja negra
(encapsula la integración con infraestructura, jamás expone la lógica).

---

## 3. Herencia (relación "es-un")

> Jerarquías lógicas donde una subclase hereda de una base. El ejemplo más puro
> de herencia **con comportamiento compartido** es la jerarquía de errores:
> las subclases heredan el manejo de `statusCode`, `name` y el stack trace y
> solo aportan su código HTTP.

### 3.1 Jerarquía base → subclase con comportamiento compartido
`Backend/src/core/errors.js` (líneas 3-30)

```js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}
```

`ValidationError`, `UnauthorizedError` y `ConflictError` **son** `AppError`:
heredan el comportamiento común (nombre, `statusCode`, stack trace) y solo
pasman un código distinto — **sin duplicar código**.

### 3.2 Servicios y adaptadores que heredan de su contrato

`Backend/src/domain/services/RoomService.js` (línea 9)

```js
class RoomService extends IRoomService {
```

`Backend/src/infrastructure/socketio/RoomCodeGenerator.js` (líneas 5-8)

```js
class RoomCodeGenerator extends IRoomCodeGenerator {
  generate() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

`Backend/src/infrastructure/socketio/SequentialRoomCodeGenerator.js` (líneas 5-8)

```js
class SequentialRoomCodeGenerator extends IRoomCodeGenerator {
  constructor(start = 1) {
    super();
    this.counter = start;
  }
```

`Backend/src/infrastructure/socketio/InMemoryRoomStore.js` (línea 5)

```js
class InMemoryRoomStore extends IRoomStore {
```

Más jerarquías "es-un": `Logger extends ILogger` (`core/logger.js:5`),
`BcryptPasswordHasher extends IPasswordHasher`
(`infrastructure/services/BcryptPasswordHasher.js:6`),
`JwtTokenService extends ITokenService`
(`infrastructure/services/JwtTokenService.js:6`),
`SequelizeUserRepository extends IUserRepository`
(`infrastructure/repositories/SequelizeUserRepository.js:5`).

---

## 4. Polimorfismo

> Mismo nombre de método (y firma) con comportamiento distinto según la clase
> concreta, acoplado por la abstracción (`generate()`) e inyectado en runtime.

### 4.1 Dos subclases con el mismo método y comportamiento distinto

`Backend/src/infrastructure/socketio/RoomCodeGenerator.js` (líneas 5-8)

```js
class RoomCodeGenerator extends IRoomCodeGenerator {
  generate() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

`Backend/src/infrastructure/socketio/SequentialRoomCodeGenerator.js` (líneas 9-13)

```js
  generate() {
    const code = String(this.counter).padStart(6, '0');
    this.counter++;
    return code;
  }
```

Misma firma `generate()`, distinto algoritmo: **aleatorio** vs **secuencial**.

### 4.2 El consumidor acopla por abstracción (estrategia inyectada)

`Backend/src/domain/services/RoomService.js` (líneas 22-28)

```js
  createRoom(socketId) {
    let code;
    do {
      code = this.codeGenerator.generate();
    } while (this.roomStore.get(code));
```

`RoomService` llama a `generate()` sin saber qué subclase se inyectó: el
comportamiento cambia en runtime según la implementación que reciba.

`Backend/src/app/AppComposer.js` (líneas 95-102)

```js
  buildRoomService() {
    const roomStore = new InMemoryRoomStore();
    return new RoomService({
      roomStore,
      codeGenerator: new RoomCodeGenerator(),
      logger: this.logger,
    });
  }
```

El **composition root** decide la implementación concreta; al inyectar
`SequentialRoomCodeGenerator` en lugar de `RoomCodeGenerator`, el resto del
sistema no cambia.

### 4.3 Polimorfismo base/subclase en errores

`Backend/src/core/errors.js` (línea 6)

```js
    this.name = this.constructor.name;
```

Un solo código, distinto resultado por subclase: `new ValidationError(...)` → de
`this.constructor.name` obtiene `'ValidationError'`; `new ConflictError(...)` →
`'ConflictError'`.

### 4.4 Polimorfismo por interfaz en pruebas (mocks duck-typed)

`Backend/test/authService.test.js` (líneas 18-31) — `AuthService` acepta un
objeto **plano** que cumple el contrato `IUserRepository` (misma firma de
métodos, implementación fake):

```js
  const userRepository = {
    _users: users,
    async findByUsername(username) {
      return users.find((u) => u.username === username) || null;
    },
    async findByEmail(email) {
      return users.find((u) => u.email === email) || null;
    },
    async create(data) {
      const user = { id: users.length + 1, ...data };
      users.push(user);
      return user;
    },
  };
```

`AuthService.register/login` (mismas llamadas `findByEmail`, `findByUsername`,
`create`) funcionan igual con `SequelizeUserRepository` (producción) o con el
objeto fake (prueba): el comportamiento se intercambia sin tocar el servicio.

---

### Resumen del mapeo

| Concepto | Ejemplo más representativo | Archivo:Línea |
|---|---|---|
| Abstracción | Contrato abstracto `generate()` + `static assert()` | `domain/contracts/IRoomCodeGenerator.js:16-18` y `:12-14` |
| Abstracción | Consumo solo de la interfaz | `presentation/socket/SocketGateway.js:13` |
| Encapsulamiento | Validación de invariantes en constructor | `domain/entities/Player.js:8-15` |
| Encapsulamiento | Turno mutado solo por métodos con regla | `domain/entities/TurnState.js:19-26` |
| Encapsulamiento | Exp. de estado por DTO (copia) | `domain/entities/Room.js:65-71` |
| Herencia | `extends` + comportamiento compartido | `core/errors.js:3-30` |
| Herencia | `RoomService extends IRoomService` | `domain/services/RoomService.js:9` |
| Polimorfismo | Misma firma, distinto algoritmo | `RoomCodeGenerator.js:5-8` vs `SequentialRoomCodeGenerator.js:9-13` |
| Polimorfismo | Estrategia inyectada en runtime | `app/AppComposer.js:95-102` |
| Polimorfismo | `this.constructor.name` según subclase | `core/errors.js:6` |
# Base de Datos Completa — Elemental Battlecards

Documento técnico: **cómo funciona la base de datos de principio a fin, dónde se aplica ACID y dónde aplica CAP.**

- **Motor:** PostgreSQL 18.6 (`127.0.0.1:5432`), base de datos **`elemental`**.
- **Configuración:** `Backend/.env` → `DB_USE_SQLITE=false` (modo Postgres activo).
- **Guías complementarias:** `Backend/sql/TABLAS.md` (columnas de cada tabla) y `SUSTENTACION_BD.md` (guion de demo en vivo).

---

## 1. Arquitectura general: dónde vive la base de datos

```
┌────────────────────────────┐
│  Frontend (Phaser 3)       │  Ventanas del juego: login, perfil, misiones...
│  src/helpers/profileApi.js │  Adjunta el JWT en cada petición (o no → modo offline)
└─────────────┬──────────────┘
              │  HTTPS/HTTP  (fetch + Authorization: Bearer <jwt>)
              ▼
┌────────────────────────────┐
│  Backend (Express :3001)   │
│  /api/auth    → registro e inicio de sesión
│  /api/profile → perfil, misiones, logros, batallas, fusiones, ataques
│  middleware: authMiddleware (valida JWT) → controllers → services
└─────────────┬──────────────┘
              │  Sequelize (ORM) + SQL parametrizado
              ▼
┌────────────────────────────┐
│  PostgreSQL 18 :5432       │  BD `elemental`
│  10 tablas · 4 vistas ·    │  77 restricciones (PK/FK/CHECK/UNIQUE/NOT NULL)
│  2 procedimientos · 1 trigger │  WAL + synchronous_commit = on
└────────────────────────────┘
```

### Arranque del backend (`Backend/src/bootstrap.js`)

1. `dotenv` carga `.env` → `AppConfig` centraliza la configuración.
2. `DatabaseFactory.build()` crea la instancia Sequelize según el dialecto
   (`DB_USE_SQLITE=false` → `dialect: 'postgres'`, host/puerto/usuario de `.env`).
3. `DatabaseInitializer.connect()` → `sequelize.authenticate()` (si falla, el servidor
   **no se cae**: se marca `databaseAvailable=false`, ver CAP en la sección 6).
4. `DatabaseInitializer.sync()` → `sequelize.sync({alter: true})` alinea los modelos
   con el esquema existente (no crea datos).
5. Se arman routers (solo si hay BD), la app Express, socket.io y se hace `listen`.

---

## 2. Capas de acceso a datos (quién toca la BD y cómo)

La BD **nunca** se toca desde las escenas de Phaser ni desde controllers: hay capas.

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Escenas (presentación) | `Frontend/src/scenes/*` | Dibujo/UI; **no** conoce SQL ni Sequelize |
| Cliente HTTP | `Frontend/src/helpers/profileApi.js` | `fetch('/api/profile...', { headers: { Authorization: Bearer } })`; sin token → modo offline |
| Rutas | `Backend/src/http/routes/profileRoutes.js` | `GET /`, `GET /missions`, `GET /achievements`, `POST /battles`, `POST /fusions`, `POST /attacks`, `POST /field-complete`, `POST /collection` (todas tras `authMiddleware`) |
| Controller | `ProfileController.js` | Traduce HTTP ↔ servicio; manejo de errores |
| **Servicio (reglas de negocio)** | `ProfileService.js` | Valida resultados, calcula niveles/rangos XP, decide misiones y logros |
| Repositorio (puente ORM) | `SequelizeProfileRepository.js` | Único punto que ejecuta `findAll/create/upsert/count` |
| Modelos Sequelize | `Backend/src/database/models/*` | 11 modelos = 10 tablas; mapeo columna↔atributo |
| **Motor** | PostgreSQL | Restricciones, triggers, vistas, procedimientos, transacciones |

**Regla de diseño:** la lógica de negocio vive en el servicio; las escenas solo presentan;
el repositorio es el único que habla con Sequelize. (`IProfileRepository` impone el contrato
mediante `assertContract` — principio de sustitución de Liskov/ISP.)

### Ejemplo de recorrido completo: registrar una batalla

```
1. El frontend termina una partida y llama:
     POST /api/profile/battles  { result: 'victoria', opponent: 'bot', difficulty: '3' }
2. authMiddleware valida el JWT → userId.
3. ProfileService.recordBattle():
     a. valida que result ∈ {victoria, derrota}            ← validación de dominio (como el CHECK)
     b. profileRepository.createBattle(...)  → INSERT en battles
        ⚡ EL TRIGGER trg_stats_batalla se dispara y actualiza player_stats
           (partidas, victorias, derrotas, rachas, updated_at) — única fuente de verdad
     c. relee las stats ya derivadas y actualiza misiones
        (primera-victoria, estratega, racha-victorias)
     d. evalúa reglas de logros sobre el estado nuevo
     e. devuelve el perfil completo (GET)
4. Si algo falla, el error sube hasta errorHandler → respuesta 500 { message }.
```

La misma operación **desde SQL puro** (así se demuestra en la sustentación):

```sql
CALL sp_registrar_batalla(:user_id, 'victoria', 'bot', '3', false, 'fuego');
-- NOTICE: Batalla #26 ... partidas=7 (V:6 D:1) | racha=3 | gemas=350
```

---

## 3. El esquema: 10 tablas y sus restricciones

Detalle columna a columna en `Backend/sql/TABLAS.md`. Resumen por categoría:

| Categoría | Tablas | Contenido actual |
|-----------|--------|------------------|
| **Identidad** | `users` | 11 usuarios (6 migrados desde SQLite, `nestor16`, 4 `demo_*`) |
| **Catálogos (se leen, no cambian)** | `cards` (18), `missions` (6), `achievements` (6) | Sembrados por `schema.sql` con `ON CONFLICT DO NOTHING` |
| **Estado del jugador (1:1)** | `player_stats` | 4 filas; la crea/actualiza el trigger |
| **Historial** | `battles` | 18 batallas (demo) |
| **Progreso (N:1)** | `player_cards` (21), `player_missions` (11), `player_achievements` (4), `player_attack_types` (11) | Escritos por servicios/procedimientos |

```
users 1 ──── 1 player_stats          users 1 ──── N battles
users 1 ──── N player_cards ──── 1 cards
users 1 ──── N player_missions ──── 1 missions
users 1 ──── N player_achievements ─ 1 achievements
users 1 ──── N player_attack_types
```

**Las 77 restricciones son el andamiaje de integridad** (se pueden listar en cualquier momento):

```sql
SELECT contype, count(*) FROM pg_constraint
WHERE connamespace = 'public'::regnamespace GROUP BY contype;
-- p (PK)=10 · f (FK)=12 · c (CHECK)≈8 · u (UNIQUE) · n (NOT NULL)=resto
```

- **FK con `ON DELETE CASCADE`:** borrar un usuario borra todo su progreso
  (es lo que hace que `datos_demo_eliminar.sql` sea un solo `DELETE`).
- **CHECK de dominio:** `result ∈ {victoria, derrota}`, `element ∈` los 6 tipos,
  `level ∈ [1,3]`, `opponent ∈ {bot, lan}` — el motor rechaza datos ilegales aunque
  el código tenga un bug.
- **UNIQUE:** `users.username`, `users.email`, `cards (element, level)` (garantiza las 18 cartas).
- **Compuestas:** `PK (user_id, mission_id)`, `(user_id, achievement_id)`, `(user_id, card_id)`
  → un jugador no puede tener dos veces la misma carta/misión.

---

## 4. Cómo se gestiona el esquema y los objetos programados

### 4.1 Dos mecanismos complementarios

| Mecanismo | Qué hace | Cuándo |
|-----------|----------|--------|
| `sequelize.sync({alter: true})` | Alinea modelos ↔ tablas (crea/ajusta `users` y columnas) | En **cada arranque** del backend |
| `Backend/sql/*.sql` (5 scripts idempotentes) | Esquema completo + datos + objetos programados | Manual / primera instalación / demo |

Orden de ejecución (todo re-ejecutable sin dañar):

```powershell
schema.sql → vistas.sql → triggers.sql → procedimientos.sql → datos_demo.sql
```

> **Advertencia real documentada:** `sync({alter:true})` puede **eliminar los `DEFAULT now()`**
> de las columnas de fecha. Por eso `schema.sql` incluye `ALTER TABLE ... SET DEFAULT now()`
> al final (reparación idempotente) y los procedimientos escriben las fechas de forma explícita.

### 4.2 Las 4 vistas (consultas guardadas, sin duplicar datos)

| Vista | Qué resuelve | Técnicas SQL |
|-------|--------------|--------------|
| `v_ranking_jugadores` | Ranking: partidas, victorias, % de victoria, rachas, gemas | `LEFT JOIN` (incluye jugadores sin stats) + `CASE` + `COALESCE` |
| `v_coleccion_cartas` | Cuántos jugadores poseen cada carta | `LEFT JOIN` + `COUNT` + `NULLIF` (evita división por 0) |
| `v_progreso_misiones` | Misiones iniciadas/completadas y progreso promedio | `COUNT(...) FILTER (WHERE ...)` + `AVG` |
| `v_historial_batallas` | Historial legible con `username` en vez de `user_id` | `JOIN` + orden cronológico |

```sql
SELECT * FROM v_ranking_jugadores;   -- se alimenta SOLO si el trigger mantiene player_stats
```

**Por qué vistas y no tablas:** no almacenan nada (cero duplicidad), siempre muestran el
dato más reciente, y ocultan el complejo JOIN al consumidor (el frontend podría pedirlas
sin conocer el esquema).

### 4.3 Los 2 procedimientos almacenados

Se ejecutan con `CALL`. **Cada CALL corre dentro de una transacción implícita**: o se
aplican todos los pasos o no se aplica ninguno (ACID — sección 5).

**`sp_registrar_batalla(user, resultado, oponente, dificultad, nivel3, elemento)`**
```
1. Valida dominio (resultado, oponente, existencia del usuario) → RAISE EXCEPTION si falla
2. INSERT en battles            ─┐ misma transacción
3. INSERT en player_attack_types ┘ (si se informó el elemento; el CHECK de la BD valida)
4. RAISE NOTICE con las stats que el trigger ya actualizó
```

**`sp_completar_mision(user, misión)`**
```
1. Valida que existan usuario y misión
2. UPSERT en player_missions → progress = target, completed = true
3. UPSERT en player_stats    → gems += reward_gems     ← misma transacción que el paso 2
4. RAISE NOTICE con el total de gemas
```

> **Límite a conocer:** `CALL` **no acepta subconsultas** en sus argumentos (restricción de
> PostgreSQL). En psql se usan variables: `SELECT id AS u FROM users WHERE ... \gset` y luego
> `CALL sp_...(:u, ...)`.

### 4.4 El trigger (1)

**`trg_stats_batalla`** — `AFTER INSERT ON battles FOR EACH ROW` → función `fn_actualizar_stats_batalla()`:

```
INSERT en battles
      │
      ▼ (por cada fila, automáticamente)
UPSERT en player_stats:
  • battles_played  + 1
  • battles_won     + 1 si result='victoria'
  • battles_lost    + 1 si result='derrota'
  • current_streak  = racha anterior + 1 (victoria) / 0 (derrota)
  • longest_streak  = GREATEST(máximo histórico, racha tras este resultado)
  • updated_at      = now()
  • si el jugador no tenía fila en player_stats, la crea con valores iniciales
```

**Diseño (importante para la defensa):**

- Las stats son un **dato derivado** del historial de `battles`; el trigger las mantiene de
  forma **automática, atómica y sin posibilidad de desincronización** — no existe código de
  aplicación que pueda olvidarse de actualizarlas.
- Las **gemas NO están en el trigger**: pagar recompensas es regla de negocio con
  validación y dos escrituras → pertenece a `sp_completar_mision` (fallas controladas,
  no efectos ocultos).
- `ProfileService.recordBattle()` **no escribe stats** (verificado con test de integración:
  3 batallas → `pj=3, V=2, D=1, racha=1`); solo inserta la batalla y relee lo que el
  trigger derivó. Si el servicio escribiera stats además del trigger, se **duplicarían**
  los contadores — fuente única de verdad = el trigger.

---

## 5. ACID aplicado en esta base de datos

**ACID** son las 4 garantías que da una transacción en una base de datos transaccional.
Cada letra con su teoría breve, **dónde está exactamente en este proyecto** y su demo:

### A — Atomicidad: "todo o nada"

**Teoría:** una transacción que tiene varias escrituras se aplica **completa o se revierte
completa**; nunca queda a medias.

**Dónde se aplica aquí:**

| Evidencia | Ubicación |
|-----------|-----------|
| DDL + seeds envueltos en `BEGIN; ... COMMIT;` | `Backend/sql/schema.sql` |
| Cada `CALL` = 1 transacción implícita con 2+ escrituras | `procedimientos.sql` (`sp_completar_mision` escribe `player_missions` **y** `player_stats.gems`) |
| Cada `INSERT` de batalla + la actualización de stats del trigger son inseparables | `triggers.sql` (misma transacción de la sentencia) |
| El servicio registra batalla → misiones → logros en cascada | `ProfileService.recordBattle()` |

**Demo (la más contundente):**

```sql
SELECT count(*) AS antes FROM battles;    -- 18
-- El 1º INSERT (battles) sale bien, el 2º falla por CHECK ('tierra' no es elemento):
CALL sp_registrar_batalla(:kai, 'victoria', 'bot', '5', false, 'tierra');
SELECT count(*) AS despues FROM battles;  -- ¡sigue en 18! la batalla insertada se revirtió
```

### C — Consistencia: "los invariantes nunca se rompen"

**Teoría:** cada escritura deja la BD en un estado válido según todas las reglas
(restricciones, integridad referencial, dominios); los datos nunca quedan "ilógicos".

**Dónde se aplica aquí:**

| Evidencia | Ubicación |
|-----------|-----------|
| **77 restricciones**: PK, FK `CASCADE`, `CHECK` de dominio, `UNIQUE`, `NOT NULL` | inventario en `\d` / `pg_constraint` |
| Catálogos sembrados con `ON CONFLICT DO NOTHING` → re-ejecutar nunca duplica | `schema.sql` |
| Validación de dominio en la capa de servicio (mismo criterio que el CHECK) | `ProfileService.recordBattle` lanza `ValidationError` |
| El trigger mantiene el invariante `battles_played = battles_won + battles_lost` | `triggers.sql` |
| Hash bcrypt de contraseñas (formato válido garantizado) | registro vía `AuthService` |

**Demo:**

```sql
BEGIN;
INSERT INTO battles (user_id, result) VALUES (99999, 'victoria');  -- ✗ FK: usuario inexistente
ROLLBACK;
BEGIN;
INSERT INTO battles (user_id, result) VALUES (:kai, 'empate');     -- ✗ CHECK: fuera de dominio
ROLLBACK;
-- La BD rechaza los datos inválidos aunque nadie valide en JavaScript.
```

### I — Aislamiento: "transacciones concurrentes no se pisan"

**Teoría:** transacciones simultáneas no ven los datos a medias de las otras; el resultado
es el mismo que si se ejecutaran una tras otra.

**Dónde se aplica aquí:**

- Nivel real del servidor: **READ COMMITTED** (default de PostgreSQL):

```sql
SHOW transaction_isolation;   -- read committed
```

- Escenario real: dos jugadores terminan una partida **al mismo tiempo**; cada
  `POST /api/profile/battles` es una transacción: los contadores de cada uno se aplican
  secuencialmente sobre su propia fila de `player_stats` (PK `user_id` = una fila por
  jugador → sin carrera sobre la misma fila) y ninguno lee la escritura de la otra hasta
  su `COMMIT`.
- Complemento: las **restricciones se evalúan al confirmar**, por eso dos registros
  simultáneos con el mismo `username` no producen duplicados: el segundo `UNIQUE` lo rechaza.

### D — Durabilidad: "un COMMIT confirmado sobrevive a caídas"

**Teoría:** una vez que la BD responde "commit OK", el dato **no se pierde** ni siquiera
si el servidor se apaga o cae la energía.

**Dónde se aplica aquí:**

```sql
SHOW synchronous_commit;        -- on
SELECT pg_current_wal_lsn();    -- posición actual del Write-Ahead Log
```

- PostgreSQL escribe cada transacción en el **WAL** y confirma con `fsync` **antes**
  de responder al cliente: `synchronous_commit = on` significa "consistente en disco al confirmar".
- `schema.sql` también usa `BEGIN/COMMIT` explícitos para el esquema y los seeds.
- Traducción al juego: si confirmaste una victoria y se va la luz, la victoria y sus gemas
  siguen ahí al reconectar.

> **Resumen ACID en una frase:** *atomicidad en cada `CALL` y en cada INSERT+trigger;
> consistencia en 77 restricciones + el trigger; aislamiento READ COMMITTED entre jugadores;
> durabilidad con WAL + synchronous_commit.*

---

## 6. CAP aplicado en esta base de datos

**Teoría (Brewer/Gilbert):** en un sistema **distribuido** (varios nodos conectados por red)
solo se pueden garantizar a la vez 2 de 3 propiedades:

- **C — Consistencia:** todos los nodos leen el mismo dato actualizado (consistencia fuerte).
- **A — Disponibilidad:** cada petición recibe respuesta (no "servidor caído").
- **P — Tolerancia a partición:** el sistema sigue funcionando aunque la red se corte entre nodos.

La red es falible ⇒ **P es obligatoria**; la decisión real es **C o A cuando hay partición**.

### 6.1 Nuestra arquitectura vista desde CAP

```
[Clientes Phaser en la red]  ←── partición posible aquí ──→  [Express :3001]  ←─┐
                                                                              │ partición posible
                                                              [PostgreSQL :5432] ←┘
```

El sistema **sí es distribuido** (clientes + servidor + BD en máquinas/red distintas) aunque
despliegue de **un solo nodo** por capa. CAP se materializa cuando algo se corta o cae.

### 6.2 Nuestra decisión: **CP** (consistencia > disponibilidad)

| Situación | Qué hace el sistema | Propiedad sacrificada |
|-----------|---------------------|-----------------------|
| La BD no responde al arrancar | `bootstrap.js:48-51` → `databaseAvailable=false`; **no** se montan rutas que dependen de datos (`bootstrap.js:82-85`, "modo LAN") | **A** (no responde login/perfil) |
| Error de BD en una petición | `errorHandler.js` → HTTP 500 con mensaje; **jamás** una respuesta inventada, cacheada o desactualizada | **A** (falla explícita) |
| Escrituras en Postgres | Siempre contra el **primario** (modelo single-writer de PG): sin primario, **no hay escritura** | **A** en partición |
| Login/registro y rankings | Requieren ver SIEMPRE el dato más reciente (credenciales, nombres únicos, ranking) — un dato viejo = fallo funcional | elijo **C** |

**Evidencia en el código (no es teoría):**

```js
// Backend/src/bootstrap.js:48-51
} catch (error) {
  logger.error('No se pudo conectar a la BD:', error.message || error);
  databaseAvailable = false;          // la BD manda: sin BD, sin datos
}
// Backend/src/bootstrap.js:82-85
if (!(config.dbEnabled && databaseAvailable)) {
  logger.info('Rutas de autenticación y perfil deshabilitadas (modo LAN)');
  return disabled;                    // se desmontan en vez de servir datos stale
}
```

### 6.3 PostgreSQL y CAP en producción

- Con **streaming replication + failover**, Postgres es **CP**: el primario es única fuente
  de verdad; un nodo secundario aislado **no acepta escrituras** (evita split-brain) → en
  partición prefiere no responder antes que divergir.
- Réplicas **solo lectura** podrían dar *AP para lecturas* (cada cliente lee una réplica),
  pero el proyecto no usa réplicas: hoy toda lectura va al primario ⇒ **consistencia fuerte**.
- **PACELC** (versión extendida): *si hay Partición elijo C sobre A; Else (normal) elijo
  Latencia sobre Consistencia... nosotros no: con `synchronous_commit=on` elegimos **C sobre L**
  también en operación normal.*

### 6.4 ¿Y la disponibilidad (A) dónde queda?

- **Juego LAN / salas:** el relay de socket.io (`RoomManager`, en memoria) **no depende de la
  BD** → las partidas siguen funcionando aunque la BD esté caída (disponibilidad en el plano
  del juego, consistencia en el plano de cuentas).
- **Frontend sin sesión:** `profileApi.js` sin token funciona en **modo offline** (no-op) en
  vez de romper la UI.
- Es una partición deliberada del sistema: **cuentas y progreso = CP; relato de juego = disponible.**

### 6.5 Contraste con el modo SQLite (soportado por `DatabaseFactory`)

| | PostgreSQL (activo) | SQLite (alternativa en `.env`) |
|---|---|---|
| Despliegue | Servidor de red (2 nodos: app + BD) → **CAP aplica**, elegimos **CP** | Un archivo local, mismo proceso → **sin red = CAP trivial** (CP por construcción) |
| Transacciones | ACID completo, READ COMMITTED, WAL en servidor | ACID sobre el archivo (bloqueo a nivel de archivo) |
| Vistas/procs/trigger | ✅ completo | ⚠️ sin procedimientos almacenados (el trigger y las vistas sí existen) |

### 6.6 ACID vs CAP — diferencias clave (pregunta clásica de defensa)

| | ACID | CAP |
|---|---|---|
| **Alcance** | Dentro de **una** base de datos transaccional | Entre **nodos distribuidos** de un sistema |
| **Pregunta** | ¿Qué pasa si fallo a mitad de una escritura? | ¿Qué pasa si se corta la red entre nodos? |
| **Aquí** | PostgreSQL lo garantiza en cada transacción | Nuestro sistema elige **CP** ante caídas |
| **Relación** | Se complementan: ACID local + postura CP global | |

---

## 7. Datos que contiene hoy la base

| Tabla | Filas | Origen |
|-------|-------|--------|
| `users` | 11 | 6 migrados desde `database.sqlite` + `nestor16` (registro real) + 4 `demo_*` |
| `cards` / `missions` / `achievements` | 18 / 6 / 6 | Semillas de `schema.sql` |
| `battles` | 18 | `datos_demo.sql` (insertadas en orden cronológico para que el trigger derive bien las rachas) |
| `player_stats` | 4 | **Creadas por el trigger** al insertar las batallas demo |
| `player_cards` / `player_missions` / `player_achievements` / `player_attack_types` | 21 / 11 / 4 / 11 | Datos demo + progreso de las pruebas reales |

- Usuarios demo: `demo_kai`, `demo_luna`, `demo_ryo`, `demo_zara` — contraseña `demo1234`.
- Restaurar/Borrar demo: `datos_demo.sql` (idempotente) / `datos_demo_eliminar.sql` (1 `DELETE` por CASCADE).

---

## 8. Operación útil

```powershell
# Conexión directa
$env:PGPASSWORD='123456'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -d elemental

# Regenerar todo (orden correcto; todos idempotentes)
sql\schema.sql → sql\vistas.sql → sql\triggers.sql → sql\procedimientos.sql → sql\datos_demo.sql
```

```sql
-- Inventario rápido
\dt                                   -- 10 tablas
SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace;  -- 77
SELECT table_name FROM information_schema.views WHERE table_schema='public';   -- 4 vistas
SHOW transaction_isolation;  SHOW synchronous_commit;                          -- read committed / on
```

**Problemas conocidos y soluciones:**

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `column ... has no default value` en SQL crudo | `sync({alter:true})` borró los `DEFAULT now()` | Re-ejecutar `schema.sql` (los restaura) |
| `no se puede usar una subconsulta en un argumento a CALL` | Limitación de PostgreSQL | Variables psql con `\gset` |
| `EADDRINUSE :3001` | Ya hay un backend corriendo | Cerrar la instancia previa o usar otro puerto |
| Stats de doble conteo | El servicio escribía stats **y** el trigger | **Resuelto:** `recordBattle` ya no escribe stats (fuente única = trigger) |

---

*Documento generado para la sustentación de la base de datos. Demos en vivo paso a paso en `SUSTENTACION_BD.md`; detalle de columnas en `Backend/sql/TABLAS.md`.*

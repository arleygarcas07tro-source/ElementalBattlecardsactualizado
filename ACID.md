# ACID en Elemental Battlecards

## Diapositiva única — ACID

| Letra | Propiedad | Qué garantiza | Se cumple en el proyecto mediante |
|---|---|---|---|
| **A** | Atomicidad | Una operación se aplica **completa o no se aplica** (todo o nada) | Bloques `BEGIN…COMMIT` y `CALL` de procedimientos (una transacción implícita por llamada) |
| **C** | Consistencia | La BD solo pasa de un **estado válido a otro** (reglas de dominio siempre ciertas) | `CHECK`, `NOT NULL`, `UNIQUE`, `PRIMARY KEY`, `FOREIGN KEY` y trigger de sincronización |
| **I** | Aislamiento | Transacciones concurrentes **no ven estados intermedios** ni se pisan entre sí | `PRIMARY KEY` compuestas + `UPSERT (ON CONFLICT)` + aislamiento por defecto del motor (Postgres *Read Committed* / SQLite) |
| **D** | Durabilidad | Lo confirmado con `COMMIT` **sobrevive** a fallos o reinicios | Persistencia a disco/`WAL` (SQLite `database.sqlite`, Postgres) + commits confirmados |

---

## Ejemplos en el código del proyecto

### A — Atomicidad

**1) Transacción explícita en el script de creación** (`Backend/sql/schema.sql:8,158`): si algo falla, no se crea nada a medias.

```sql
BEGIN;
  CREATE TABLE ... ;
  INSERT INTO cards ...;
COMMIT;
```

**2) Un `CALL` = una transacción implícita** (`procedimientos.sql:7-9`). Si un paso falla, se revierte todo:

```sql
-- sp_registrar_batalla (procedimientos.sql:54-62)
INSERT INTO battles (...) VALUES (...) RETURNING id INTO v_batalla_id;
-- ...
INSERT INTO player_attack_types (user_id, element) VALUES (p_user_id, p_elemento_ataque);
```

El comentario lo dice explícitamente (`procedimientos.sql:19-22`): si el elemento es inválido, el segundo `INSERT` viola el `CHECK` **después** de insertar la batalla… y la transacción completa se revierte.

**3) `sp_completar_mision`** (`procedimientos.sql:102-115`): dos escrituras (progreso + gemas) en la misma transacción — "o se hace todo o no se hace nada".

### C — Consistencia

Restricciones que impiden estados inválidos (`schema.sql`):

```sql
-- schema.sql:15-18
element VARCHAR(20) NOT NULL CHECK (element IN ('fuego','agua','planta','luz','sombra','espiritu'))
level   SMALLINT    NOT NULL CHECK (level BETWEEN 1 AND 3)
UNIQUE (element, level)
```

```sql
-- battles (schema.sql:41-42)
result   VARCHAR(10) NOT NULL CHECK (result IN ('victoria','derrota'))
opponent VARCHAR(10) NOT NULL DEFAULT 'bot' CHECK (opponent IN ('bot','lan'))
```

```sql
-- integridad referencial (schema.sql:40)
user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
```

Consistencia derivada vía **trigger** (`triggers.sql:54-57`): `player_stats` nunca se desincroniza de `battles`, porque se recalcula automáticamente en cada `INSERT`.

Y en los modelos Sequelize, la parte portable: `allowNull:false`, `unique:true` y PK compuestas (`UserModel.js:6-19`, `PlayerCardModel.js:6-15`).

### I — Aislamiento

No hay `sequelize.transaction()` en el backend (el juego no persiste en tiempo real), pero el aislamiento se apoya en:

**PK compuestas** → evitan duplicados aunque dos sesiones escriban a la vez:

```sql
-- player_cards (schema.sql:101)
PRIMARY KEY (user_id, card_id)
```

**UPSERT `ON CONFLICT`** → la actualización lee+escribe en un solo paso atómico, sin *lost update*:

```sql
-- sp_completar_mision (procedimientos.sql:113-115)
ON CONFLICT (user_id) DO UPDATE SET
    gems = player_stats.gems + v_mision.reward_gems,
    updated_at = now();
```

Aislamiento intermedio: el motor lo aporta por defecto (Postgres *Read Committed*; SQLite serializa las escrituras). Es el punto **más débil** del proyecto: no hay niveles de aislamiento configurados explícitamente.

### D — Durabilidad

Las escrituras confirmadas se persisten en disco, no en memoria:

```js
// DatabaseFactory.js:12-17
if (this.config.useSqlite) {
  return new Sequelize({ dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../database.sqlite'), logging: false });
}
```

Contraste útil para la exposición: lo único que **no** es durable son las salas de Socket.io (in-memory, se pierden al reiniciar el servidor, `RoomManager`), mientras que `users`, `battles`, `player_stats`, etc. **sí** sobreviven al reinicio porque están en la BD.

Fechas con `DEFAULT now()` y `TIMESTAMPTZ` (`schema.sql:32,45`) garantizan que cada registro confirmado quede sellado y recuperable.

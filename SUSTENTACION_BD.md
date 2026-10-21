# Sustentación de Base de Datos — Elemental Battlecards

Guion de presentación: ACID, CAP, 4 vistas, 2 procedimientos almacenados y 1 trigger.

- **Motor:** PostgreSQL 18 local (`127.0.0.1:5432`), base de datos `elemental`.
- **Scripts:** `Backend/sql/` — `schema.sql` → `vistas.sql` → `triggers.sql` → `procedimientos.sql` → `datos_demo.sql` (todos idempotentes).
- **Detalle de tablas:** ver `Backend/sql/TABLAS.md`.
- **Datos demo:** 4 usuarios `demo_*` (contraseña `demo1234`), 18 batallas, ranking y progreso listos para mostrar.

```powershell
# Conexión para la demo en vivo
$env:PGPASSWORD = '123456'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -d elemental
```

---

## 1. Cómo se aplica ACID

### A — Atomicidad (todo o nada)

**Dónde está en el proyecto:**

- `Backend/sql/schema.sql` envuelve todo el DDL + seeds en `BEGIN; ... COMMIT;`.
- Cada `CALL` a un procedimiento corre en **una transacción implícita**: si falla un paso, se revierte todo.
- `sp_registrar_batalla` escribe en `battles` **y** `player_attack_types` en una sola unidad.

**Demo en vivo (la más contundente):**

```sql
SELECT id AS kai FROM users WHERE username = 'demo_kai' \gset

SELECT count(*) AS antes FROM battles;   -- 18

-- El 1º INSERT (battles) funciona, pero el 2º falla por CHECK ('tierra' no es elemento válido)
CALL sp_registrar_batalla(:kai, 'victoria', 'bot', '5', false, 'tierra');

SELECT count(*) AS despues FROM battles; -- sigue en 18: la batalla YA INSERTADA se revirtió
```

> Frase clave: *"la batalla ya estaba escrita en memoria cuando falló la segunda sentencia;
> PostgreSQL revirtió la transacción completa completa: 0 filas persistidas."*

### C — Consistencia (invariantes siempre válidas)

**Dónde está en el proyecto:**

- **77 restricciones** activas: PK, FK con `ON DELETE CASCADE`, `CHECK` de dominio
  (`result ∈ {victoria, derrota}`, `element ∈ 6 tipos`, `level ∈ 1..3`), `UNIQUE` y `NOT NULL`.
- Los catálogos se siembran con `ON CONFLICT DO NOTHING` → re-ejecución sin duplicados.
- El trigger mantiene el invariante `battles_played = battles_won + battles_lost`.

**Demo en vivo:**

```sql
-- Inventario de restricciones
SELECT conrelid::regclass AS tabla, contype, conname
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
ORDER BY tabla, contype;

-- Fuerza bruta contra los invariantes (fallan y no dejan rastro)
BEGIN;
INSERT INTO battles (user_id, result) VALUES (99999, 'victoria');  -- ERROR: FK inexistente
ROLLBACK;
BEGIN;
INSERT INTO battles (user_id, result) VALUES (:kai, 'empate');     -- ERROR: CHECK de dominio
ROLLBACK;
```

### I — Aislamiento (transacciones concurrentes no se pisan)

**Dónde está en el proyecto:**

- Nivel real del servidor: **READ COMMITTED** (el default de PostgreSQL).

**Demo en vivo:**

```sql
SHOW transaction_isolation;   -- read committed
```

**Explicación de 20 segundos:** cada transacción solo ve filas ya confirmadas por otras;
dos jugadores jugando a la vez en la app nunca leen escrituras a medias (p. ej. una batalla
insertada sin actualizar stats). Si quieren demostrarlo en serio: dos ventanas de psql,
una escribe sin confirmar y la otra no la ve hasta el `COMMIT`.

### D — Durabilidad (un COMMIT confirmado sobrevive a caídas)

**Dónde está en el proyecto:**

- PostgreSQL escribe en **WAL** (Write-Ahead Log) y confirma con `fsync`.

**Demo en vivo:**

```sql
SHOW synchronous_commit;        -- on
SELECT pg_current_wal_lsn();    -- posición actual del log de alteraciones
```

**Explicación:** antes de responder `COMMIT`, el servidor registra la transacción en el WAL
y sincroniza el disco; un corte de energía posterior no borra lo confirmado. `schema.sql`
también usa `BEGIN/COMMIT` explícitos para el DDL.

---

## 2. Cómo aplica CAP

**Recordatorio (Brewer):** en un sistema *distribuido* solo se garantizan 2 de 3:
**C**onsistencia (todos ven lo mismo), **A**disponibilidad (siempre responde) y
**P**artición tolerante a fallos de red.

```
[Cliente Phaser / navegador]
        │ HTTP + Socket.io
[Express API :3001]          ← 1 nodo de aplicación
        │
[PostgreSQL 18 :5432]        ← 1 nodo de base de datos
```

1. **¿Dónde entra CAP si no hay clúster?** El despliegue actual es de nodo único, pero el
   sistema **sí es distribuido** (clientes en la red + servidor + BD) y CAP se materializa
   cuando hay una **partición o caída**. La pregunta de diseño es: si el eslabón cliente↔servidor
   o servidor↔BD se parte, ¿qué cedemos? **Nosotros elegimos CP: sacrificamos disponibilidad
   para conservar consistencia.**

2. **Evidencia en el código (no es teoría):**
   - `Backend/src/bootstrap.js:48-51` — si la BD no conecta, se marca `databaseAvailable = false`.
   - `Backend/src/bootstrap.js:82-85` — las rutas de login/perfil **se desmontan** ("modo LAN")
     en lugar de responder con datos potencialmente obsoletos → **A↓ C↑**.
   - `Backend/src/http/middleware/errorHandler.js` — cualquier error de BD responde `500`
     con mensaje, jamás una respuesta inventada o cacheada.

3. **Por qué PostgreSQL es CP en distribución:** las escrituras van siempre al primario
   (single-writer); con *streaming replication*, el nodo que se queda sin el primario **no
   acepta escrituras** (no hay split-brain) → prefiere no responder antes que divergir.

4. **Matiz PACELC:** incluso *sin* partición, elegimos **C sobre latencia**: `synchronous_commit = on`
   y todas las reglas (FK/CHECK) viven en el mismo nodo que escribe.

5. **Contraste SQLite (soportado por `DatabaseFactory`):** un archivo local es CP trivial
   (un solo proceso, sin red). El `.env` con `DB_USE_SQLITE` decide el dialecto; el esquema
   y los scripts funcionan igual en ambos.

**Frase de cierre:** *"ACID gobierna lo que pasa dentro de la base; CAP gobierna qué pasa
cuando la infraestructura falla. Nuestro sistema aplica ACID completo en el nodo y adopta
la postura CP de Brewer ante caídas: nunca servir datos viejos o incompletos."*

---

## 3. Las 4 vistas

| # | Vista | Resuelve | Técnicas (preguntarán esto) |
|---|-------|----------|------------------------------|
| 1 | `v_ranking_jugadores` | Ranking: partidas, victorias, %, rachas, gemas | `LEFT JOIN` + `CASE` + `COALESCE` |
| 2 | `v_coleccion_cartas` | Cuántos jugadores tienen cada carta | `LEFT JOIN` + `COUNT` + `NULLIF` (÷0) |
| 3 | `v_progreso_misiones` | Iniciadas/completadas + progreso promedio | `COUNT(...) FILTER (WHERE ...)` + `AVG` |
| 4 | `v_historial_batallas` | Historial con username legible | `JOIN` + orden cronológico |

```sql
SELECT * FROM v_ranking_jugadores;      -- incluye a nestor16 con 0 stats (demuestra el LEFT JOIN)
SELECT * FROM v_coleccion_cartas WHERE poseedores > 0;
SELECT * FROM v_progreso_misiones;
SELECT * FROM v_historial_batallas LIMIT 10;
```

- **¿Por qué vistas y no tablas?** No duplican datos: se calculan al consultar, siempre frescas.
- `v_ranking_jugadores` depende del trigger (sin trigger, las stats no existirían).

---

## 4. Los 2 procedimientos almacenados

### `sp_registrar_batalla(user, resultado, oponente, dificultad, nivel3, elemento)`

Valida dominio → INSERT en `battles` → registra el elemento atacado → `RAISE NOTICE` con las
stats que el trigger ya actualizó. **Dos escrituras en una transacción implícita.**

### `sp_completar_mision(user, misión)`

Valida existencia → UPSERT del progreso completo en `player_missions` → acredita
`reward_gems` en `player_stats.gems` → `RAISE NOTICE` con el total. **Si la 2ª escritura
fallara, la 1ª se revierte** (no existe la misión completada sin pagar).

```sql
-- OJO: CALL no acepta subconsultas (limitación de PostgreSQL) → variables psql con \gset
SELECT id AS kai FROM users WHERE username = 'demo_kai' \gset
SELECT id AS ryo FROM users WHERE username = 'demo_ryo' \gset

CALL sp_registrar_batalla(:kai, 'victoria', 'bot', '5', false, 'agua');
-- NOTICE: Batalla #25 registrada ... partidas=7 (V:6 D:1) | racha=3 | gemas=350

CALL sp_completar_mision(:ryo, 'coleccionista');
-- NOTICE: Misión "Coleccionista" ... +%100 gemas | total de gemas = 150

-- Caso de error (atomicidad): CALL sp_registrar_batalla(:kai, 'victoria', 'bot', '5', false, 'tierra');
-- Caso de error (validación): CALL sp_completar_mision(:kai, 'mision-fantasma');
```

---

## 5. El trigger

**`trg_stats_batalla`** — `AFTER INSERT ON battles FOR EACH ROW` → `fn_actualizar_stats_batalla()`:

```
INSERT en battles ──▶ trigger ──▶ UPSERT player_stats
  • battles_played + 1
  • battles_won / battles_lost + 1 según result
  • current_streak +1 (victoria) / 0 (derrota)
  • longest_streak = máximo histórico (GREATEST)
  • updated_at = now()
  • si el jugador no tenía fila, la crea
```

**Demo en vivo (dentro de transacción para no ensuciar la base):**

```sql
BEGIN;
INSERT INTO battles (user_id, result, opponent, difficulty)
VALUES (:kai, 'victoria', 'bot', '5');
SELECT battles_played, battles_won, current_streak, longest_streak
FROM player_stats WHERE user_id = :kai;   -- subió 1 partida y la racha
ROLLBACK;                                 -- (o COMMIT para persistir)
```

**Por qué existe:** las stats son un **dato derivado**; regenerarlas desde `battles` en cada
lectura sería caro y con el trigger nunca se desincronizan del historial.
**Por qué las gemas NO están en el trigger:** el pago de recompensas es regla de negocio →
pertenece al procedimiento `sp_completar_mision` (fallas controladas + 2 escrituras),
no a un reflejo automático oculto.

---

## 6. Demo en vivo — orden exacto (≈5 minutos)

```sql
-- 1) Panorama
\dt
SELECT 'usuarios' t, COUNT(*) FROM users
UNION ALL SELECT 'batallas', COUNT(*) FROM battles
UNION ALL SELECT 'stats', COUNT(*) FROM player_stats;

-- 2) ACID
SELECT count(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace;  -- 77
BEGIN; INSERT INTO battles (user_id, result) VALUES (99999, 'victoria'); ROLLBACK;  -- FK falla
SELECT id AS kai FROM users WHERE username = 'demo_kai' \gset
BEGIN; INSERT INTO battles (user_id, result) VALUES (:kai, 'empate'); ROLLBACK;      -- CHECK falla
SHOW transaction_isolation;    -- read committed
SHOW synchronous_commit;       -- on
SELECT pg_current_wal_lsn();   -- WAL

-- 3) Las 4 vistas
SELECT * FROM v_ranking_jugadores;
SELECT * FROM v_coleccion_cartas WHERE poseedores > 0;
SELECT * FROM v_progreso_misiones;
SELECT * FROM v_historial_batallas LIMIT 5;

-- 4) Trigger
BEGIN;
INSERT INTO battles (user_id, result, opponent, difficulty) VALUES (:kai, 'victoria', 'bot', '5');
SELECT battles_played, current_streak FROM player_stats WHERE user_id = :kai;
ROLLBACK;

-- 5) Procedimientos (éxito)
SELECT id AS ryo FROM users WHERE username = 'demo_ryo' \gset
CALL sp_registrar_batalla(:kai, 'victoria', 'bot', '5', false, 'agua');
CALL sp_completar_mision(:ryo, 'coleccionista');

-- 6) Atomicidad del procedimiento (el clímax)
SELECT count(*) AS antes FROM battles;
CALL sp_registrar_batalla(:kai, 'victoria', 'bot', '5', false, 'tierra');
SELECT count(*) AS despues FROM battles;   -- ¡igual! todo se revirtió
```

Para la parte de CAP se proyecta `Backend/src/bootstrap.js` (líneas 38-51 y 82-85).

---

## 7. Preguntas probables de la defensa

| Pregunta | Respuesta corta |
|----------|-----------------|
| ¿ACID y CAP no chocan? | No: ACID es la semántica *dentro* del nodo; CAP es el trade-off *entre* nodos cuando hay partición. PG da ACID local y es CP en distribución. |
| ¿Por qué `CALL` y no una función? | Es un procedimiento almacenado como pide el enunciado; además en futuro podría hacer `COMMIT` propio. Ojo: `CALL` no acepta subconsultas → se usan variables `\gset`. |
| ¿Por qué el trigger solo calcula stats y no gemas? | Separación de responsabilidades: el trigger refleja datos derivados de forma automática; el pago de gemas es negocio con validación y transacción explícita → procedimiento. |
| ¿Y si el backend cae, pierdo lo escrito? | No: `synchronous_commit = on` + WAL; el `COMMIT` confirmado es durable. |
| ¿`sync({alter:true})` no rompe el esquema? | Puede quitar los `DEFAULT now()`; por eso `schema.sql` los restaura con `ALTER TABLE ... SET DEFAULT` (sección 8 de `TABLAS.md`) y los procedimientos escriben fechas explícitas. |
| ¿Cuántos datos hay? | 4 vistas, 2 procedimientos, 1 trigger, 10 tablas, 77 restricciones; demo: 4 usuarios, 18 batallas, 18 cartas coleccionadas, 10 misiones. |

---

## 8. Restaurar el estado demo

```powershell
$env:PGPASSWORD = '123456'
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
# re-crea los 4 usuarios demo_* con sus stats al día (idempotente)
& $psql -U postgres -h 127.0.0.1 -d elemental -f Backend\sql\datos_demo.sql
# o borra solo el demo:
& $psql -U postgres -h 127.0.0.1 -d elemental -f Backend\sql\datos_demo_eliminar.sql
```

> Si durante la demo se registraron usuarios reales (p. ej. `nestor16`), quedarse en el
> ranking es positivo: muestra el sistema en uso. No borrarlos sin permiso.

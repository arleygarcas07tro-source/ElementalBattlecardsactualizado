-- ============================================================
-- Elemental Battlecards — 4 Vistas
-- Motor: PostgreSQL 18 | Base de datos: elemental
-- Uso: psql -U postgres -h 127.0.0.1 -d elemental -f vistas.sql
-- Idempotente: se puede re-ejecutar sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Vista 1: v_ranking_jugadores
-- Ranking general: LEFT JOIN users + player_stats para incluir
-- también a los usuarios que aún no tienen estadísticas.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS v_ranking_jugadores;

CREATE VIEW v_ranking_jugadores AS
SELECT
    u.id,
    u.username,
    COALESCE(s.battles_played, 0) AS partidas,
    COALESCE(s.battles_won, 0)    AS victorias,
    COALESCE(s.battles_lost, 0)   AS derrotas,
    CASE
        WHEN COALESCE(s.battles_played, 0) = 0 THEN 0.0
        ELSE ROUND(100.0 * s.battles_won / s.battles_played, 1)
    END AS pct_victorias,
    COALESCE(s.current_streak, 0) AS racha_actual,
    COALESCE(s.longest_streak, 0) AS mejor_racha,
    COALESCE(s.gems, 0)           AS gemas
FROM users u
LEFT JOIN player_stats s ON s.user_id = u.id
ORDER BY victorias DESC, pct_victorias DESC, u.username;

-- ------------------------------------------------------------
-- Vista 2: v_coleccion_cartas
-- Catálogo de cartas con cuántos jugadores la poseen
-- (LEFT JOIN para mostrar también cartas nadie tiene).
-- ------------------------------------------------------------
DROP VIEW IF EXISTS v_coleccion_cartas;

CREATE VIEW v_coleccion_cartas AS
SELECT
    c.id,
    c.element,
    c.level,
    c.name,
    COUNT(pc.user_id) AS poseedores,
    ROUND(
        100.0 * COUNT(pc.user_id) / NULLIF((SELECT COUNT(*) FROM users), 0),
        1
    ) AS pct_jugadores
FROM cards c
LEFT JOIN player_cards pc ON pc.card_id = c.id
GROUP BY c.id, c.element, c.level, c.name
ORDER BY c.element, c.level;

-- ------------------------------------------------------------
-- Vista 3: v_progreso_misiones
-- Misiones agregadas con contadores de jugadores que las
-- iniciaron/completaron y progreso promedio (FILTER + AVG).
-- ------------------------------------------------------------
DROP VIEW IF EXISTS v_progreso_misiones;

CREATE VIEW v_progreso_misiones AS
SELECT
    m.id,
    m.element,
    m.title,
    m.target,
    m.reward_gems,
    COUNT(pm.user_id)                             AS iniciadas,
    COUNT(pm.user_id) FILTER (WHERE pm.completed) AS completadas,
    COALESCE(ROUND(AVG(pm.progress), 2), 0)       AS progreso_promedio
FROM missions m
LEFT JOIN player_missions pm ON pm.mission_id = m.id
GROUP BY m.id, m.element, m.title, m.target, m.reward_gems
ORDER BY m.id;

-- ------------------------------------------------------------
-- Vista 4: v_historial_batallas
-- Historial legible: une battles con users para mostrar el
-- username en lugar del id (JOIN + orden cronológico).
-- ------------------------------------------------------------
DROP VIEW IF EXISTS v_historial_batallas;

CREATE VIEW v_historial_batallas AS
SELECT
    b.id,
    u.username,
    b.result,
    b.opponent,
    b.difficulty,
    b.level3_on_field,
    b.created_at    
FROM battles b
JOIN users u ON u.id = b.user_id
ORDER BY b.created_at DESC, b.id DESC;

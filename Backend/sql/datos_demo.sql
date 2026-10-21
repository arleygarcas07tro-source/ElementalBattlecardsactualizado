-- ============================================================
-- Elemental Battlecards — Datos de demostración
-- Motor: PostgreSQL 18 | Base de datos: elemental
-- Uso: psql -U postgres -h 127.0.0.1 -d elemental -f datos_demo.sql
--
-- Crea 4 usuarios (demo_*) con estadísticas, batallas, colección,
-- misiones y logros para que las vistas/procedimientos/trigger
-- tengan datos reales que mostrar en la sustentación.
-- contraseña de todos los usuarios demo: demo1234
-- Idempotente: borra primero los usuarios demo y los re-crea.
--
-- IMPORTANTE: los ORDER BY de los INSERT de batallas importan:
-- el trigger trg_stats_batalla calcula rachas en orden de llegada.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Limpieza de una ejecución anterior
--    (ON DELETE CASCADE de las FK borra todo el progreso demo)
-- ------------------------------------------------------------
DELETE FROM users WHERE LEFT(username, 5) = 'demo_';

-- ------------------------------------------------------------
-- 2) Usuarios demo
-- ------------------------------------------------------------
INSERT INTO users (username, email, password, "createdAt", "updatedAt") VALUES
    ('demo_kai',  'kai@demo.local',  '$2a$10$NcNFQz9XPtODPH/UDbJ4QuPOiBskI/Q/Sv7GJ.ML58UZ6eVE3wPc2', now(), now()),
    ('demo_luna', 'luna@demo.local', '$2a$10$NcNFQz9XPtODPH/UDbJ4QuPOiBskI/Q/Sv7GJ.ML58UZ6eVE3wPc2', now(), now()),
    ('demo_ryo',  'ryo@demo.local',  '$2a$10$NcNFQz9XPtODPH/UDbJ4QuPOiBskI/Q/Sv7GJ.ML58UZ6eVE3wPc2', now(), now()),
    ('demo_zara', 'zara@demo.local', '$2a$10$NcNFQz9XPtODPH/UDbJ4QuPOiBskI/Q/Sv7GJ.ML58UZ6eVE3wPc2', now(), now());

-- ------------------------------------------------------------
-- 3) Batallas (18) en orden cronológico → el TRIGGER deriva
--    player_stats: partidas, victorias, derrotas y rachas.
--    Resultados esperados:
--      demo_kai  6 pj: 5V 1D | racha actual 2 | mejor racha 3
--      demo_luna 5 pj: 3V 2D | racha actual 2 | mejor racha 2
--      demo_ryo  4 pj: 1V 3D | racha actual 0 | mejor racha 1
--      demo_zara 3 pj: 2V 1D | racha actual 1 | mejor racha 1
-- ------------------------------------------------------------
INSERT INTO battles (user_id, result, opponent, difficulty, level3_on_field, created_at)
SELECT u.id, v.result, 'bot', v.difficulty, v.level3, v.ts::timestamp
FROM (VALUES
    ('demo_kai',  'victoria', '3', false, '2026-09-18 10:00:00'),
    ('demo_luna', 'derrota',  '2', false, '2026-09-18 12:00:00'),
    ('demo_kai',  'victoria', '5', false, '2026-09-18 10:30:00'),
    ('demo_kai',  'victoria', '3', true,  '2026-09-19 09:00:00'),
    ('demo_kai',  'derrota',  '8', false, '2026-09-19 09:30:00'),
    ('demo_luna', 'victoria', '3', false, '2026-09-19 18:00:00'),
    ('demo_ryo',  'derrota',  '7', false, '2026-09-19 14:00:00'),
    ('demo_kai',  'victoria', '4', false, '2026-09-20 11:00:00'),
    ('demo_luna', 'derrota',  '4', false, '2026-09-20 18:00:00'),
    ('demo_ryo',  'derrota',  '3', false, '2026-09-20 14:00:00'),
    ('demo_zara', 'victoria', '3', false, '2026-09-20 09:00:00'),
    ('demo_kai',  'victoria', '2', false, '2026-09-21 20:00:00'),
    ('demo_luna', 'victoria', '4', true,  '2026-09-21 18:00:00'),
    ('demo_ryo',  'victoria', '1', false, '2026-09-21 14:00:00'),
    ('demo_zara', 'derrota',  '5', false, '2026-09-21 09:00:00'),
    ('demo_luna', 'victoria', '6', false, '2026-09-22 19:00:00'),
    ('demo_ryo',  'derrota',  '9', false, '2026-09-22 14:00:00'),
    ('demo_zara', 'victoria', '4', true,  '2026-09-22 10:00:00')
) AS v(username, result, difficulty, level3, ts)
JOIN users u ON u.username = v.username
ORDER BY v.ts::timestamp;

-- ------------------------------------------------------------
-- 4) Gemas de cada jugador demo (los battles solo aportan stats)
-- ------------------------------------------------------------
UPDATE player_stats s
SET gems = v.gems, updated_at = now()
FROM users u
JOIN (VALUES
    ('demo_kai', 350),
    ('demo_luna', 220),
    ('demo_ryo',   50),
    ('demo_zara', 180)
) AS v(username, gems) ON u.username = v.username
WHERE u.id = s.user_id;

-- ------------------------------------------------------------
-- 5) Colección de cartas (18 cartas repartidas entre 4 jugadores)
-- ------------------------------------------------------------
INSERT INTO player_cards (user_id, card_id, collected_at)
SELECT u.id, c.id, v.collected_at::timestamp
FROM (VALUES
    ('demo_kai',  'fuego',   1, '2026-09-17 10:00:00'),
    ('demo_kai',  'fuego',   2, '2026-09-17 10:05:00'),
    ('demo_kai',  'fuego',   3, '2026-09-17 10:10:00'),
    ('demo_kai',  'agua',    1, '2026-09-17 10:15:00'),
    ('demo_kai',  'planta',  1, '2026-09-17 10:20:00'),
    ('demo_luna', 'agua',    1, '2026-09-17 11:00:00'),
    ('demo_luna', 'agua',    2, '2026-09-17 11:05:00'),
    ('demo_luna', 'agua',    3, '2026-09-17 11:10:00'),
    ('demo_luna', 'luz',     1, '2026-09-17 11:15:00'),
    ('demo_luna', 'luz',     2, '2026-09-17 11:20:00'),
    ('demo_luna', 'planta',  2, '2026-09-17 11:25:00'),
    ('demo_ryo',  'sombra',  1, '2026-09-17 12:00:00'),
    ('demo_ryo',  'sombra',  2, '2026-09-17 12:05:00'),
    ('demo_ryo',  'planta',  1, '2026-09-17 12:10:00'),
    ('demo_zara', 'espiritu',1, '2026-09-17 13:00:00'),
    ('demo_zara', 'espiritu',2, '2026-09-17 13:05:00'),
    ('demo_zara', 'espiritu',3, '2026-09-17 13:10:00'),
    ('demo_zara', 'luz',     1, '2026-09-17 13:15:00')
) AS v(username, element, level, collected_at)
JOIN users u ON u.username = v.username
JOIN cards c ON c.element = v.element AND c.level = v.level
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6) Tipos elementales con los que cada uno atacó
--    (alimenta la misión "aprendiz-elemental")
-- ------------------------------------------------------------
INSERT INTO player_attack_types (user_id, element)
SELECT u.id, v.element
FROM (VALUES
    ('demo_kai',  'fuego'),   ('demo_kai',  'agua'),   ('demo_kai',  'planta'),
    ('demo_luna', 'agua'),    ('demo_luna', 'luz'),    ('demo_luna', 'planta'),
    ('demo_ryo',  'sombra'),  ('demo_ryo',  'fuego'),
    ('demo_zara', 'espiritu'),('demo_zara', 'luz')
) AS v(username, element)
JOIN users u ON u.username = v.username
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 7) Progreso de misiones (completadas y en curso)
-- ------------------------------------------------------------
INSERT INTO player_missions (user_id, mission_id, progress, completed, completed_at)
SELECT u.id, v.mission_id, v.progress, v.completed, v.completed_at::timestamp
FROM (VALUES
    ('demo_kai',  'primera-victoria',   1, TRUE,  '2026-09-18 10:05:00'),
    ('demo_kai',  'coleccionista',      5, FALSE, NULL),
    ('demo_kai',  'aprendiz-elemental', 3, FALSE, NULL),
    ('demo_luna', 'primera-victoria',   1, TRUE,  '2026-09-19 18:05:00'),
    ('demo_luna', 'fusionador',         2, FALSE, NULL),
    ('demo_luna', 'racha-victorias',    2, FALSE, NULL),
    ('demo_ryo',  'primera-victoria',   1, TRUE,  '2026-09-21 14:05:00'),
    ('demo_zara', 'primera-victoria',   1, TRUE,  '2026-09-20 09:05:00'),
    ('demo_zara', 'aprendiz-elemental', 2, FALSE, NULL),
    ('demo_zara', 'estratega',          1, TRUE,  '2026-09-22 10:05:00')
) AS v(username, mission_id, progress, completed, completed_at)
JOIN users u ON u.username = v.username
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 8) Logros desbloqueados
-- ------------------------------------------------------------
INSERT INTO player_achievements (user_id, achievement_id, unlocked_at)
SELECT u.id, v.achievement_id, v.unlocked_at::timestamp
FROM (VALUES
    ('demo_kai',  'primera-llama',     '2026-09-18 10:05:00'),
    ('demo_kai',  'marea-creciente',   '2026-09-19 09:05:00'),
    ('demo_luna', 'primera-llama',     '2026-09-19 18:05:00'),
    ('demo_zara', 'primera-llama',     '2026-09-20 09:05:00')
) AS v(username, achievement_id, unlocked_at)
JOIN users u ON u.username = v.username
ON CONFLICT DO NOTHING;

COMMIT;

-- Resumen de lo creado:
SELECT 'usuarios'   AS tabla, COUNT(*) FROM users      WHERE LEFT(username,5) = 'demo_'
UNION ALL SELECT 'player_stats',     COUNT(*) FROM player_stats      WHERE user_id IN (SELECT id FROM users WHERE LEFT(username,5) = 'demo_')
UNION ALL SELECT 'battles',          COUNT(*) FROM battles           WHERE user_id IN (SELECT id FROM users WHERE LEFT(username,5) = 'demo_')
UNION ALL SELECT 'player_cards',     COUNT(*) FROM player_cards      WHERE user_id IN (SELECT id FROM users WHERE LEFT(username,5) = 'demo_')
UNION ALL SELECT 'player_missions',  COUNT(*) FROM player_missions   WHERE user_id IN (SELECT id FROM users WHERE LEFT(username,5) = 'demo_')
UNION ALL SELECT 'player_achievements', COUNT(*) FROM player_achievements WHERE user_id IN (SELECT id FROM users WHERE LEFT(username,5) = 'demo_');

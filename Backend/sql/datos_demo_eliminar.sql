-- ============================================================
-- Elemental Battlecards — Eliminar datos de demostración
-- Motor: PostgreSQL 18 | Base de datos: elemental
-- Uso: psql -U postgres -h 127.0.0.1 -d elemental -f datos_demo_eliminar.sql
--
-- Borra los 4 usuarios demo_* y TODO su progreso gracias a las
-- FK con ON DELETE CASCADE (player_stats, battles, player_cards,
-- player_missions, player_achievements, player_attack_types).
-- Los catálogos (cards, missions, achievements) no se tocan.
-- Los IDs consumidos de las secuencias no se reinician.
-- ============================================================

DELETE FROM users WHERE LEFT(username, 5) = 'demo_';

SELECT COUNT(*) AS usuarios_demo_restantes
FROM users WHERE LEFT(username, 5) = 'demo_';

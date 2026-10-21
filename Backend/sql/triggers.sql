-- ============================================================
-- Elemental Battlecards — 1 Trigger
-- Motor: PostgreSQL 18 | Base de datos: elemental
-- Uso: psql -U postgres -h 127.0.0.1 -d elemental -f triggers.sql
-- Idempotente: se puede re-ejecutar sin error.
--
-- trg_stats_batalla: AFTER INSERT en battles → mantiene
-- player_stats automáticamente (partidas, victorias, derrotas,
-- rachas y fecha). Así las estadísticas nunca se desincronizan
-- del historial de batallas.
-- ============================================================

DROP TRIGGER IF EXISTS trg_stats_batalla ON battles;
DROP FUNCTION IF EXISTS fn_actualizar_stats_batalla();

CREATE FUNCTION fn_actualizar_stats_batalla() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO player_stats (
        user_id, battles_played, battles_won, battles_lost,
        current_streak, longest_streak, updated_at
    )
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.result = 'victoria' THEN 1 ELSE 0 END,
        CASE WHEN NEW.result = 'derrota'   THEN 1 ELSE 0 END,
        CASE WHEN NEW.result = 'victoria' THEN 1 ELSE 0 END,
        CASE WHEN NEW.result = 'victoria' THEN 1 ELSE 0 END,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        battles_played = player_stats.battles_played + 1,
        battles_won    = player_stats.battles_won
                            + CASE WHEN NEW.result = 'victoria' THEN 1 ELSE 0 END,
        battles_lost   = player_stats.battles_lost
                            + CASE WHEN NEW.result = 'derrota' THEN 1 ELSE 0 END,
        current_streak = CASE
                            WHEN NEW.result = 'victoria' THEN player_stats.current_streak + 1
                            ELSE 0
                         END,
        longest_streak = GREATEST(
                            player_stats.longest_streak,
                            CASE
                                WHEN NEW.result = 'victoria' THEN player_stats.current_streak + 1
                                ELSE player_stats.current_streak
                            END
                         ),
        updated_at     = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stats_batalla
AFTER INSERT ON battles
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_stats_batalla();

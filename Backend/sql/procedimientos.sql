-- ============================================================
-- Elemental Battlecards — 2 Procedimientos almacenados
-- Motor: PostgreSQL 18 | Base de datos: elemental
-- Uso: psql -U postgres -h 127.0.0.1 -d elemental -f procedimientos.sql
-- Idempotente: se puede re-ejecutar sin error.
--
-- Se usan con CALL. Cada CALL corre en UNA transacción implícita:
-- si falla cualquier paso, no se persiste NADA (atomicidad ACID).
-- ============================================================

-- ------------------------------------------------------------
-- Procedimiento 1: sp_registrar_batalla
-- Registra una batalla (INSERT en battles), la mantiene en
-- player_attack_types si se informa el elemento de ataque y
-- devuelve por NOTICE las estadísticas actualizadas
-- (que el trigger trg_stats_batalla ya habrá actualizado).
--
-- Validaciones de dominio ANTES de escribir; la validación del
-- elemento queda en la restricción CHECK de la BD a propósito:
-- si el elemento es inválido, el INSERT en player_attack_types
-- falla DESPUÉS de insertar la batalla y la transacción completa
-- se revierte (demostración viva de atomicidad).
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_registrar_batalla(INTEGER, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, VARCHAR);

CREATE PROCEDURE sp_registrar_batalla(
    p_user_id          INTEGER,
    p_resultado        VARCHAR,
    p_opponent         VARCHAR DEFAULT 'bot',
    p_dificultad       VARCHAR DEFAULT NULL,
    p_nivel3_en_campo  BOOLEAN DEFAULT FALSE,
    p_elemento_ataque  VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_batalla_id INTEGER;
    v_stats       player_stats%ROWTYPE;
BEGIN
    -- ===== Validaciones (antes de escribir) =====
    IF p_resultado NOT IN ('victoria', 'derrota') THEN
        RAISE EXCEPTION 'Resultado inválido: "%" (esperado: victoria | derrota)', p_resultado;
    END IF;

    IF p_opponent NOT IN ('bot', 'lan') THEN
        RAISE EXCEPTION 'Oponente inválido: "%" (esperado: bot | lan)', p_opponent;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'El usuario con id % no existe', p_user_id;
    END IF;

    -- ===== Escrituras (una sola transacción) =====
    INSERT INTO battles (user_id, result, opponent, difficulty, level3_on_field, created_at)
    VALUES (p_user_id, p_resultado, p_opponent, p_dificultad, p_nivel3_en_campo, now())
    RETURNING id INTO v_batalla_id;

    IF p_elemento_ataque IS NOT NULL THEN
        INSERT INTO player_attack_types (user_id, element)
        VALUES (p_user_id, p_elemento_ataque)
        ON CONFLICT DO NOTHING;
    END IF;

    -- El trigger trg_stats_batalla ya actualizó player_stats en este punto.
    SELECT * INTO v_stats FROM player_stats WHERE user_id = p_user_id;

    RAISE NOTICE 'Batalla #% registrada para el usuario %: % | partidas=% (V:% D:%) | racha=% | gemas=%',
        v_batalla_id, p_user_id, p_resultado,
        v_stats.battles_played, v_stats.battles_won, v_stats.battles_lost,
        v_stats.current_streak, v_stats.gems;
END;
$$;

-- ------------------------------------------------------------
-- Procedimiento 2: sp_completar_mision
-- Marca una misión como completada (UPSERT en player_missions)
-- y acredita la recompensa de gemas (UPSERT en player_stats)
-- en la MISMA transacción: o se hace todo o no se hace nada.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_completar_mision(INTEGER, VARCHAR);

CREATE PROCEDURE sp_completar_mision(
    p_user_id    INTEGER,
    p_mission_id VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_mision missions%ROWTYPE;
    v_gemas  INTEGER;
BEGIN
    -- ===== Validaciones (antes de escribir) =====
    SELECT * INTO v_mision FROM missions WHERE id = p_mission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La misión "%" no existe', p_mission_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'El usuario con id % no existe', p_user_id;
    END IF;

    -- ===== Escritura 1: progreso de la misión =====
    INSERT INTO player_missions (user_id, mission_id, progress, completed, completed_at)
    VALUES (p_user_id, p_mission_id, v_mision.target, TRUE, now())
    ON CONFLICT (user_id, mission_id) DO UPDATE SET
        progress     = v_mision.target,
        completed    = TRUE,
        completed_at = COALESCE(player_missions.completed_at, now());

    -- ===== Escritura 2: recompensa en gemas =====
    INSERT INTO player_stats (user_id, gems, updated_at)
    VALUES (p_user_id, v_mision.reward_gems, now())
    ON CONFLICT (user_id) DO UPDATE SET
        gems       = player_stats.gems + v_mision.reward_gems,
        updated_at = now();

    SELECT gems INTO v_gemas FROM player_stats WHERE user_id = p_user_id;

    RAISE NOTICE 'Misión "%" (%) completada por el usuario %: +% gemas | total de gemas = %',
        v_mision.title, p_mission_id, p_user_id, v_mision.reward_gems, v_gemas;
END;
$$;

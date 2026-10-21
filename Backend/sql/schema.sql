-- ============================================================
-- Elemental Battlecards — Esquema PostgreSQL (creación manual)
-- Base de datos: elemental
-- Uso: psql -U postgres -d elemental -f schema.sql   (o pgAdmin Query Tool)
-- Nota: la tabla "users" es gestionada por Sequelize (sync). Aquí solo se referencia.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Catálogo de cartas (6 elementos x 3 niveles = 18)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cards (
  id        SERIAL PRIMARY KEY,
  element   VARCHAR(20) NOT NULL CHECK (element IN ('fuego','agua','planta','luz','sombra','espiritu')),
  level     SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
  name      VARCHAR(60) NOT NULL,
  UNIQUE (element, level)
);

-- ------------------------------------------------------------
-- Estadísticas del jugador (1:1 con users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_stats (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  battles_played INTEGER NOT NULL DEFAULT 0,
  battles_won    INTEGER NOT NULL DEFAULT 0,
  battles_lost   INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  gems           INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Partidas jugadas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS battles (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result         VARCHAR(10) NOT NULL CHECK (result IN ('victoria','derrota')),
  opponent       VARCHAR(10) NOT NULL DEFAULT 'bot' CHECK (opponent IN ('bot','lan')),
  difficulty     VARCHAR(30),
  level3_on_field BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_battles_user ON battles(user_id);
CREATE INDEX IF NOT EXISTS idx_battles_created ON battles(created_at DESC);

-- ------------------------------------------------------------
-- Catálogo de misiones (los "element" usan los 6 tipos canónicos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS missions (
  id          VARCHAR(40) PRIMARY KEY,
  element     VARCHAR(20) NOT NULL CHECK (element IN ('fuego','agua','planta','luz','sombra','espiritu')),
  title       VARCHAR(80) NOT NULL,
  description TEXT,
  target      INTEGER NOT NULL DEFAULT 1,
  reward_gems INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- Progreso de misiones por jugador
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_missions (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id   VARCHAR(40) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progress     INTEGER NOT NULL DEFAULT 0,
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, mission_id)
);

-- ------------------------------------------------------------
-- Catálogo de logros
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  id          VARCHAR(40) PRIMARY KEY,
  element     VARCHAR(20) NOT NULL CHECK (element IN ('fuego','agua','planta','luz','sombra','espiritu')),
  title       VARCHAR(80) NOT NULL,
  description TEXT
);

-- ------------------------------------------------------------
-- Logros desbloqueados por jugador
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_achievements (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(40) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ------------------------------------------------------------
-- Colección de cartas por jugador
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_cards (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

-- ------------------------------------------------------------
-- Tipos elementales con los que cada jugador ha atacado
-- (para la misión "Aprendiz elemental")
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_attack_types (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element VARCHAR(20) NOT NULL CHECK (element IN ('fuego','agua','planta','luz','sombra','espiritu')),
  PRIMARY KEY (user_id, element)
);

-- ============================================================
-- Datos iniciales (catálogos)
-- ============================================================

INSERT INTO cards (element, level, name) VALUES
  ('sombra',  1, 'Sombra I'),   ('sombra',  2, 'Sombra II'),   ('sombra',  3, 'Sombra III'),
  ('fuego',   1, 'Fuego I'),    ('fuego',   2, 'Fuego II'),    ('fuego',   3, 'Fuego III'),
  ('agua',    1, 'Agua I'),     ('agua',    2, 'Agua II'),     ('agua',    3, 'Agua III'),
  ('planta',  1, 'Planta I'),   ('planta',  2, 'Planta II'),   ('planta',  3, 'Planta III'),
  ('luz',     1, 'Luz I'),      ('luz',     2, 'Luz II'),      ('luz',     3, 'Luz III'),
  ('espiritu',1, 'Espíritu I'), ('espiritu',2, 'Espíritu II'), ('espiritu',3, 'Espíritu III')
ON CONFLICT (element, level) DO NOTHING;

-- Nota: el catálogo del front usa alias; aquí se guardan los tipos canónicos:
-- Naturaleza->planta, Oscuridad->sombra, Aire->luz, Tierra->espiritu.
INSERT INTO missions (id, element, title, description, target, reward_gems) VALUES
  ('primera-victoria',  'fuego',   'Primera victoria',  'Enciende el fuego de tu reinado ganando tu primera batalla.', 1, 50),
  ('coleccionista',     'agua',    'Coleccionista',     'Coloca los 6 tipos elementales en tu campo en una misma partida.', 1, 100),
  ('fusionador',        'planta',  'Fusionador',        'Realiza 5 fusiones de cartas iguales.', 5, 150),
  ('racha-victorias',   'sombra',  'Racha de victorias','Gana 3 partidas consecutivas contra la IA.', 3, 200),
  ('aprendiz-elemental','luz',     'Aprendiz elemental','Ataca al menos una vez con cada uno de los 6 tipos elementales.', 6, 120),
  ('estratega',         'espiritu','Estratega',         'Gana una partida manteniendo una carta de nivel 3 en tu campo.', 1, 250)
ON CONFLICT (id) DO NOTHING;

INSERT INTO achievements (id, element, title, description) VALUES
  ('primera-llama',      'fuego',   'Primera llama',     'Gana tu primera batalla contra cualquier oponente.'),
  ('marea-creciente',    'agua',    'Marea creciente',   'Consigue una racha de 3 victorias consecutivas.'),
  ('raices-profundas',   'planta',  'Raíces profundas',  'Realiza 5 fusiones de cartas iguales.'),
  ('cazador-del-viento', 'luz',     'Cazador del viento','Completa todas las misiones elementales.'),
  ('coloso-invicto',     'espiritu','Coloso invicto',    'Gana 10 batallas contra cualquier oponente.'),
  ('senor-de-la-noche',  'sombra',  'Señor de la noche', 'Colecciona las 18 cartas del mundo elemental.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Defaults de fecha/hora (reparación idempotente)
-- `sequelize.sync({alter:true})` puede eliminar los DEFAULT de
-- las columnas de fecha al arrancar el backend; estas sentencias
-- los restauran sin importar el estado actual de la BD.
-- ============================================================
ALTER TABLE battles             ALTER COLUMN created_at   SET DEFAULT now();
ALTER TABLE player_stats        ALTER COLUMN updated_at   SET DEFAULT now();
ALTER TABLE player_cards        ALTER COLUMN collected_at SET DEFAULT now();
ALTER TABLE player_achievements ALTER COLUMN unlocked_at  SET DEFAULT now();

COMMIT;

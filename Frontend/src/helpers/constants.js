export const CARD_TYPES = {
    FUEGO: 'fuego',
    AGUA: 'agua',
    PLANTA: 'planta',
    LUZ: 'luz',
    SOMBRA: 'sombra',
    ESPIRITU: 'espiritu'
};

export const ADVANTAGES = {
    [CARD_TYPES.FUEGO]: CARD_TYPES.PLANTA,
    [CARD_TYPES.PLANTA]: CARD_TYPES.AGUA,
    [CARD_TYPES.AGUA]: CARD_TYPES.FUEGO,
    [CARD_TYPES.LUZ]: CARD_TYPES.SOMBRA,
    [CARD_TYPES.SOMBRA]: CARD_TYPES.ESPIRITU,
    [CARD_TYPES.ESPIRITU]: CARD_TYPES.LUZ
};

export const GAME_CONFIG = {
    MAX_HAND_SIZE: 4,
    MAX_FIELD_SIZE: 6,
    INITIAL_DECK_SIZE: 48,
    TURN_TIME_LIMIT_MS: 12000, // 12 segundos
    // Acciones por turno (atacar, colocar o fusionar). Las acciones sin usar
    // se pierden al terminar el turno: nunca se acumulan.
    ACTIONS_PER_TURN: 2,
    MANDATORY_ATTACK_TURN: 3,
    INACTIVE_TURNS_TO_LOSE: 3,
    UNIQUE_TYPES_TO_WIN: 6,
    ESSENCES_TO_WIN: 6,
    // La victoria por 6 tipos exige conservarlos durante un turno rival completo.
    CONVERGENCE_TURNS_TO_WIN: 1,
    // Pausa del bot entre una acción y la siguiente dentro del mismo turno.
    BOT_NEXT_ACTION_DELAY_MS: 700,
};

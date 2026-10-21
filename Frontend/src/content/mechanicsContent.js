/**
 * Contenido estático de las reglas del juego (capa de datos de presentación).
 * Las escenas solo lo renderizan.
 */

export const GAME_RULES_HTML = `
    <ol class="rules">
        <li><strong>Objetivo del Juego:</strong>
            <ul>
                <li><strong>Principal:</strong> El primer jugador que logre tener los 6 tipos de cartas distintos en su campo gana la partida.</li>
                <li><strong>Secundario:</strong> El jugador que logre llenar las esencias elementales, gana.</li>
            </ul>
        </li>

        <li><strong>Tipos y Ventajas:</strong>
            <p>El sistema está dividido en dos triángulos independientes:</p>
            <h3>Triángulo 1:</h3>
            <ul>
                <li>Fuego vence a Planta</li>
                <li>Planta vence a Agua</li>
                <li>Agua vence a Fuego</li>
            </ul>
            <h3>Triángulo 2:</h3>
            <ul>
                <li>Luz vence a Sombra</li>
                <li>Sombra vence a Espíritu</li>
                <li>Espíritu vence a Luz</li>
            </ul>
            <p><strong>Relación entre triángulos:</strong> Todos los tipos de un triángulo son neutrales contra los del otro triángulo.</p>
        </li>

        <li><strong>Niveles de Carta:</strong>
            <p>Las cartas pueden tener 3 niveles:</p>
            <ul>
                <li><strong>⭐ Nivel 1 (base)</strong></li>
                <li><strong>⭐⭐ Nivel 2 (fusión de dos cartas nivel 1 iguales)</strong></li>
                <li><strong>⭐⭐⭐ Nivel 3 (fusión de dos cartas nivel 2 iguales)</strong></li>
            </ul>
            <p><strong>Efecto de los niveles en el combate:</strong></p>
            <ul>
                <li>Mismo nivel: se aplica ventaja de tipo normal.</li>
                <li>1 nivel arriba: se vuelve neutral al tipo que tiene desventaja, le gana al tipo que es neutral.</li>
                <li>2 niveles arriba: ganará siempre.</li>
            </ul>
        </li>

        <li><strong>Turnos:</strong>
            <p>El juego es por turnos, 1v1. En cada turno el jugador puede realizar 1 sola acción:</p>
            <ul>
                <li>Poner una carta en el campo.</li>
                <li>Atacar con una carta.</li>
                <li>Fusionar (si cumple requisitos).</li>
            </ul>
            <p>Después de realizar la acción, el turno termina.</p>
        </li>

        <li><strong>Regla de Ataque Obligatorio:</strong>
            <p>Cada jugador debe atacar al menos una vez cada 3 turnos propios. Puedes atacar antes si quieres. Si atacas antes (por ejemplo, en tu turno 2), el contador se reinicia. Si llegas al turno 3 sin atacar, ese turno obligatoriamente debes atacar.</p>
            <p><strong>Otros casos:</strong></p>
            <ul>
                <li>Si tienes que atacar obligatoriamente y tu oponente no tiene cartas en el campo, podrás llenar una Esencia elemental (atacando).</li>
                <li>Si tienes que atacar obligatoriamente y no tienes cartas, saltará el turno y el contador se reiniciará.</li>
            </ul>
        </li>

        <li><strong>Campo y Mano:</strong>
            <p>Cada jugador tiene 6 espacios en el campo. Se puede tener máximo 1 carta por espacio. Se inicia con 4 cartas en la mano. Cuando colocas una carta en el campo, robas una nueva del mazo.</p>
        </li>

        <li><strong>Robos y Mazo:</strong>
            <p>Cada jugador inicia con 48 cartas (8 copias de cada tipo). Cuando pones una carta, robas una del mazo (para mantener 4 en la mano). Si el mazo se queda sin cartas, se baraja automáticamente el cementerio (ver Regla 10).</p>
        </li>

        <li><strong>Colocar Cartas:</strong>
            <p>Las cartas siempre se colocan boca abajo (ocultas para el rival). Se revelan en tres casos:</p>
            <ul>
                <li>Cuando atacan.</li>
                <li>Cuando son atacadas.</li>
                <li>Cuando se fusionan.</li>
            </ul>
            <p>Una vez reveladas, permanecen boca arriba para el resto de la partida.</p>
        </li>

        <li><strong>Combate:</strong>
            <p><strong>Cómo se realiza:</strong></p>
            <ul>
                <li>El jugador atacante elige una de sus cartas.</li>
                <li>Elige una carta del oponente.</li>
            </ul>
            <p><strong>Resultados:</strong></p>
            <ul>
                <li>Si tu carta gana → la carta enemiga muere.</li>
                <li>Si tu carta pierde → tu carta muere.</li>
                <li>Si son neutrales → ninguna muere.</li>
            </ul>
        </li>

        <li><strong>Muertes y Cementerio:</strong>
            <p>Cuando una carta muere, va al cementerio. Cuando las 48 cartas del mazo se acaban, las del cementerio se revuelven y se crea un nuevo mazo.</p>
        </li>

        <li><strong>Fusiones:</strong>
            <p><strong>Requisitos:</strong> Tener 2 cartas iguales (tipo y nivel) en el campo. Fusionar consume tu acción del turno.</p>
            <p><strong>Efecto:</strong> Se forma una sola carta del mismo tipo y sube un nivel. La carta fusionada se revela.</p>
        </li>

        <li><strong>Restricciones de Ataques según Nivel:</strong>
            <ul>
                <li>⭐ Nivel 1 → puede atacar cada turno (sin límites).</li>
                <li>⭐⭐ Nivel 2 → puede atacar 2 turnos seguidos luego debe descansar 1 turno.</li>
                <li>⭐⭐⭐ Nivel 3 → puede atacar 1 turno, luego debe descansar 1 turno.</li>
            </ul>
        </li>

        <li><strong>Esencias Elementales:</strong>
            <p>Cada jugador tiene 6 esencias, una por cada tipo elemental. Todas las esencias comienzan vacías. Se llenan cuando se cumplen las condiciones de atacar y no haber cartas del oponente para defender.</p>
        </li>

        <li><strong>Revelación:</strong>
            <p>Las cartas boca abajo se revelan solo cuando:</p>
            <ul>
                <li>Atacan.</li>
                <li>Son atacadas.</li>
                <li>Se fusionan (la resultante entra boca arriba).</li>
            </ul>
        </li>

        <li><strong>Límites de Tiempo:</strong>
            <p>Cada turno tiene un máximo de 12 segundos. Si el jugador no realiza acción → pierde el turno.</p>
        </li>

        <li><strong>Fin del Juego:</strong>
            <p>Un jugador gana si:</p>
            <ul>
                <li>Logra colocar los 6 tipos distintos en su campo (no importa el orden ni si están ocultas).</li>
                <li>Logra llenar las esencias elementales (no importa el orden).</li>
                <li>Por abandono: Si un jugador no actúa durante 3 turnos seguidos → se considera rendido. A los 3 turnos sin acción, derrota automática.</li>
            </ul>
        </li>
    </ol>
`;
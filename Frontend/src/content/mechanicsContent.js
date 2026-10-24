/**
 * Contenido estático de las reglas del juego (capa de datos de presentación).
 * Las escenas solo lo renderizan.
 */

export const GAME_RULES_HTML = `
    <ol class="rules">
        <li><strong>Objetivo de la partida:</strong>
            <ul>
                <li><strong>Modo clásico:</strong> reúne los seis elementos en tu campo y conserva el control hasta que vuelva a comenzar tu turno. También puedes ganar al completar las seis esencias elementales.</li>
                <li><strong>Modos con gemas:</strong> consigue las gemas requeridas y reúne los seis elementos en tu campo para ganar.</li>
            </ul>
        </li>

        <li><strong>Elementos y ventajas:</strong>
            <p>Los seis elementos forman dos ciclos independientes:</p>
            <h3>Ciclo de fuego, planta y agua:</h3>
            <ul>
                <li>Fuego vence a Planta.</li>
                <li>Planta vence a Agua.</li>
                <li>Agua vence a Fuego.</li>
            </ul>
            <h3>Ciclo de luz, sombra y espíritu:</h3>
            <ul>
                <li>Luz vence a Sombra.</li>
                <li>Sombra vence a Espíritu.</li>
                <li>Espíritu vence a Luz.</li>
            </ul>
            <p><strong>Entre ciclos:</strong> los elementos de un ciclo son neutrales frente a los del otro.</p>
        </li>

        <li><strong>Niveles de las cartas:</strong>
            <p>Hay tres niveles. Cada fusión combina dos cartas del mismo elemento y nivel para crear una carta del nivel siguiente.</p>
            <ul>
                <li><strong>⭐ Nivel 1:</strong> carta básica.</li>
                <li><strong>⭐⭐ Nivel 2:</strong> resultado de fusionar dos cartas de nivel 1 iguales.</li>
                <li><strong>⭐⭐⭐ Nivel 3:</strong> resultado de fusionar dos cartas de nivel 2 iguales.</li>
            </ul>
            <p><strong>Efecto del nivel en combate:</strong></p>
            <ul>
                <li>El daño base de un ataque neutral es del 25%.</li>
                <li>Cada nivel del atacante añade 5%: nivel 1 causa 25%, nivel 2 causa 30% y nivel 3 causa 35% de daño neutral.</li>
                <li>La ventaja elemental suma 15% de daño; la desventaja resta 15%.</li>
                <li>El nivel del defensor no modifica este bono. El daño mínimo es 5% y el máximo, 100%.</li>
                <li>La carta defensora pierde vida con cada ataque y se destruye al llegar a 0%.</li>
            </ul>
        </li>

        <li><strong>Turnos y acciones:</strong>
            <p>La partida se juega por turnos entre dos jugadores. En los modos Clásico y Gemas, cada jugador dispone de hasta <strong>dos acciones</strong> por turno:</p>
            <ul>
                <li>Colocar una carta en el campo.</li>
                <li>Atacar con una carta.</li>
                <li>Fusionar cartas si se cumplen los requisitos.</li>
            </ul>
            <p>Una fusión cuenta como una acción. Atacar también cumple la obligación de ataque del turno; si queda otra acción disponible, puedes colocar o fusionar una carta. Las acciones no utilizadas no se acumulan. El turno termina al agotar las acciones o el tiempo disponible.</p>
            <p>En Contrarreloj se dispone de una acción por turno. En el Desafío de 30 turnos se permiten hasta dos acciones por turno, con un límite de diez segundos.</p>
        </li>

        <li><strong>Regla de ataque obligatorio:</strong>
            <p>Cada jugador debe realizar al menos un ataque cada tres turnos propios. Puedes atacar antes; cada ataque reinicia el contador. Si el ataque es obligatorio, debes atacar durante ese turno.</p>
            <p><strong>Casos especiales:</strong></p>
            <ul>
                <li>Si el rival no tiene cartas en el campo para defenderse, el ataque directo puede llenar una de tus esencias elementales.</li>
                <li>Si debes atacar y no tienes cartas en el campo, tu turno se salta y el contador de ataques se reinicia.</li>
            </ul>
        </li>

        <li><strong>Campo y mano:</strong>
            <p>Cada jugador tiene seis espacios en el campo y puede ocupar cada uno con una sola carta. La partida comienza con cuatro cartas en la mano. Al colocar una carta, robas otra del mazo si todavía quedan cartas.</p>
        </li>

        <li><strong>Mazo y robos:</strong>
            <p>Cada jugador comienza con un mazo de 48 cartas: ocho de cada elemento. Cuando colocas una carta, robas otra si es posible. Si el mazo se agota, el cementerio se baraja para formar un nuevo mazo cuando haya cartas disponibles.</p>
        </li>

        <li><strong>Colocación y revelación:</strong>
            <p>Las cartas se colocan boca abajo, ocultas para el rival. Se revelan cuando atacan, son atacadas o se fusionan. Una vez reveladas, permanecen boca arriba durante el resto de la partida.</p>
        </li>

        <li><strong>Combate:</strong>
            <p>El atacante elige una de sus cartas y una carta rival como objetivo. El daño depende del nivel de la carta atacante y de la relación elemental:</p>
            <ul>
                <li>Daño neutral: nivel 1 = 25%, nivel 2 = 30% y nivel 3 = 35%.</li>
                <li>Ventaja elemental: +15%; desventaja elemental: −15%.</li>
                <li>El nivel del defensor no cambia el bono del atacante.</li>
                <li>El daño nunca baja de 5% ni supera el 100%. Una carta se destruye cuando su vida llega a 0%.</li>
            </ul>
        </li>

        <li><strong>Cartas destruidas y cementerio:</strong>
            <p>Las cartas destruidas se convierten en cartas básicas del mismo elemento y se envían al cementerio. Cuando el mazo se agota, esas cartas pueden barajarse para formar uno nuevo.</p>
        </li>

        <li><strong>Fusiones:</strong>
            <p>Puedes fusionar dos cartas del mismo elemento y nivel que estén en el campo, o fusionar una carta de tu mano con otra del mismo elemento y nivel en el campo. La fusión consume una acción, crea una carta de un nivel superior y la deja boca arriba. La vida de la carta resultante es la suma de la vida de ambas cartas, hasta un máximo de 100%.</p>
        </li>

        <li><strong>Gemas y poderes de esencia:</strong>
            <p>En los modos con gemas, cada carta de nivel 3 que entra en el campo concede <strong>una gema</strong> de su elemento, una sola vez por carta. Las gemas permanecen en el contador aunque la carta sea destruida. Las cartas de nivel 1 y 2 no generan gemas.</p>
            <p>Al activar una esencia, desbloqueas su poder. Usarlo no consume una acción, pero sí cuesta gemas del elemento correspondiente. Cada poder se puede usar una vez por turno y puede tener requisitos adicionales.</p>
            <ul>
                <li><strong>Fuego · Ráfaga</strong> (1 gema): tu próximo ataque en este turno causa 15% de daño adicional.</li>
                <li><strong>Agua · Rescate</strong> (1 gema): devuelve a tu mano la carta básica más reciente de tu cementerio. Necesitas tener una carta allí.</li>
                <li><strong>Planta · Brotar</strong> (2 gemas): roba dos cartas de tu mazo.</li>
                <li><strong>Luz · Clarividencia</strong> (1 gema): revela la mano del rival hasta que robe o juegue una carta.</li>
                <li><strong>Sombra · Robar</strong> (2 gemas): el rival descarta la carta de mayor nivel de su mano. Necesita tener cartas en la mano.</li>
                <li><strong>Espíritu · Conducto</strong> (2 gemas): bloquea la Convergencia del rival durante su próximo turno.</li>
            </ul>
        </li>

        <li><strong>Restricciones de ataque por nivel:</strong>
            <ul>
                <li>⭐ <strong>Nivel 1:</strong> puede atacar en cada turno propio.</li>
                <li>⭐⭐ <strong>Nivel 2:</strong> puede atacar dos turnos seguidos; después debe descansar un turno.</li>
                <li>⭐⭐⭐ <strong>Nivel 3:</strong> puede atacar un turno y debe descansar el siguiente.</li>
            </ul>
        </li>

        <li><strong>Esencias elementales:</strong>
            <p>Cada jugador tiene seis esencias, una por elemento, y comienzan vacías. Un ataque directo exitoso —cuando el rival no tiene cartas para defenderse— activa la esencia del elemento de la carta atacante.</p>
        </li>

        <li><strong>Límites de tiempo y turnos:</strong>
            <ul>
                <li><strong>Clásico y Gemas:</strong> cada turno dura hasta 12 segundos.</li>
                <li><strong>Contrarreloj:</strong> la partida dura un máximo de tres minutos y el reloj sigue avanzando durante los cambios de turno. Si se acaba el tiempo antes de cumplir el objetivo, ambos jugadores pierden.</li>
                <li><strong>Desafío de 30 turnos:</strong> cada jugador tiene hasta 30 turnos propios y diez segundos por turno. Quien cumpla primero el objetivo gana; si ambos agotan sus turnos sin lograrlo, ambos pierden.</li>
            </ul>
        </li>

        <li><strong>Fin de la partida:</strong>
            <p>La partida termina cuando se cumple una condición de victoria, un límite del modo o una condición de derrota:</p>
            <ul>
                <li>En el modo Clásico, reúne los seis elementos en el campo y conserva esa combinación durante el turno del rival, o activa las seis esencias.</li>
                <li>En los modos con gemas, completa las cantidades requeridas de cada elemento y reúne los seis elementos en el campo.</li>
                <li>Si un jugador permanece inactivo durante tres turnos propios consecutivos, pierde por inactividad.</li>
            </ul>
        </li>

        <li><strong>Modos de juego:</strong>
            <ul>
                <li><strong>Clásico:</strong> juega sin objetivos de gemas ni límite de duración.</li>
                <li><strong>Gemas:</strong> reúne las gemas requeridas y los seis elementos en el campo; no hay límite de tiempo.</li>
                <li><strong>Contrarreloj:</strong> cumple el objetivo de gemas y de campo antes de que terminen los tres minutos. Dispones de una acción por turno.</li>
                <li><strong>Desafío de 30 turnos:</strong> cumple el objetivo de gemas y de campo antes de agotar tus 30 turnos, con diez segundos para actuar en cada uno.</li>
            </ul>
        </li>
    </ol>
`;

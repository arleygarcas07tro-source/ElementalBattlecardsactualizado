# NUEVOS NIVELES DE DIFICULTAD (6-10)

## Resumen de Cambios

Se han implementado **5 niveles adicionales de dificultad** (del 6 al 10) para proporcionar una experiencia de juego más desafiante y progresiva.

### Niveles Agregados

| Nivel | Nombre | Estrellas | Características |
|-------|--------|-----------|----------------|
| **6** | **Experto** | ⭐⭐⭐⭐⭐⭐ | Predice movimientos, juega agresivamente |
| **7** | **Maestro** | ⭐⭐⭐⭐⭐⭐⭐ | Estrategias avanzadas, contrajuega |
| **8** | **Gran Maestro** | ⭐⭐⭐⭐⭐⭐⭐⭐ | Precisión quirúrgica |
| **9** | **Leyenda** | ⭐⭐⭐⭐⭐⭐⭐⭐⭐ | Prácticamente imbatible |
| **10** | **Mito** | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ | Juega como una deidad |

---

## Parámetros de Dificultad

### Probabilidad de Fusión
- **Niveles 1-5**: Mantiene la lógica anterior
- **Niveles 6-10**: Siempre intenta fusionar (100% de probabilidad)

### Threshold de Ataque
- **Nivel 6**: -1 (muy agresivo)
- **Nivel 7**: -2 (extremadamente agresivo)
- **Nivel 8**: -3 (riesgoso pero preciso)
- **Nivel 9**: -5 (juega con pérdidas calculadas)
- **Nivel 10**: -10 (ataca siempre)

### Delay de Acción (velocidad)
- **Nivel 6**: 200-400ms (parece pensativo)
- **Nivel 7**: 150-300ms (decisiones rápidas)
- **Nivel 8**: 100-200ms (casi instantáneo)
- **Nivel 9**: 50ms (decisiones perfectas)
- **Nivel 10**: 0ms (omnisciente)

### Modificador de Score de Ataque
- **Nivel 6**: +1 a +3 (bonus estratégico pequeño)
- **Nivel 7**: +2 a +5 (bonus estratégico medio)
- **Nivel 8**: +3 a +7 (bonus estratégico alto)
- **Nivel 9**: +5 a +10 (bonus estratégico muy alto)
- **Nivel 10**: +10 (bonus máximo - perfecto)

---

## Diseño Visual

### Colores de los Nuevos Niveles
- **Nivel 6 (Experto)**: Púrpura claro (#cc00ff)
- **Nivel 7 (Maestro)**: Púrpura medio (#9900ff)
- **Nivel 8 (Gran Maestro)**: Púrpura oscuro (#6600ff)
- **Nivel 9 (Leyenda)**: Azul púrpura (#3300ff)
- **Nivel 10 (Mito)**: Azul intenso (#0000ff)

### Layout
- Los niveles se muestran en una **grid responsiva** que se adapta al tamaño de pantalla
- Cada nivel tiene su propio color distintivo y efectos hover
- Las estrellas indican visualmente la dificultad progresiva

---

## Implementación Técnica

### Archivos Modificados

1. **`DifficultySelectScene.js`**
   - Agregados estilos CSS para niveles 6-10
   - Agregados 5 nuevos cards de dificultad
   - Actualizado comentario de documentación

2. **`GameScene.js`**
   - Actualizado range de dificultad (1-10)
   - Extendidas todas las funciones de dificultad del bot
   - Mejorado logging de dificultad

### Funciones Actualizadas
- `shouldBotAttemptFusion()`: Maneja niveles 6-10
- `getBotAttackThreshold()`: Thresholds negativos para agresividad extrema
- `getBotActionDelay()`: Delays ultra-rápidos para niveles altos
- `getBotAttackScoreModifier()`: Bonuses estratégicos crecientes

---

## Recomendaciones de Juego

### Para Principiantes
- Empieza con **Nivel 1-3** para aprender mecánicas básicas
- El **Nivel 3 (Normal)** es un buen punto de equilibrio

### Para Jugadores Experimentados
- **Nivel 4-5**: Desafío significativo con estrategia
- **Nivel 6-7**: Requiere pensamiento táctico avanzado
- **Nivel 8-10**: Para masters del juego (muy desafiante)

### Modo "Mito" (Nivel 10)
- El bot juega con **perfección absoluta**
- **Sin delays**, **siempre ataca**, **bonus máximo**
- Diseñado para ser prácticamente imbatible
- Ideal para estudiar estrategias perfectas

---

## Testing y Debugging

### Verificar Implementación
1. Abre la escena de selección de dificultad
2. Deberías ver **10 niveles** en total
3. Cada nivel tiene colores únicos y descripciones
4. El hover funciona correctamente

### Logs de Consola
- Al iniciar una partida, verás: `"Dificultad del bot: X (1=Muy Fácil, 10=Mito)"`
- Los niveles altos tienen delays muy cortos (casi instantáneos)

### Troubleshooting
- Si no ves los nuevos niveles: Verifica que los archivos se hayan actualizado correctamente
- Si el bot juega igual: Asegúrate de que `botDifficulty` se pase correctamente desde `DifficultySelectScene`

---

## Próximos Desarrollos

Posibles mejoras futuras:
- **Niveles dinámicos**: Dificultad que se ajusta según el rendimiento del jugador
- **Modos especiales**: Niveles con reglas modificadas (ej: "Sin fusiones", "Solo ataques")
- **Estadísticas**: Tracking de victorias/derrotas por nivel
- **Logros**: Desbloqueables por completar ciertos niveles

---

</content>
<parameter name="filePath">c:\Users\USUARIO\Desktop\elemental-battlecards\NUEVOS_NIVELES_DIFICULTAD.md
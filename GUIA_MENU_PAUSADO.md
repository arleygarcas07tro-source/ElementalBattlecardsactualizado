# 🎮 Guía del Menú de Pausa Estilizado

## 📍 Ubicación
Archivo: `Frontend/src/scenes/uiScene.js` (líneas 43-115)

## 🎨 Características Implementadas

### 1. **Botón Hamburguesa (☰)**
- Ubicado en la esquina superior izquierda
- Al hacer clic abre/cierra el menú
- Estilo minimalista con texto blanco

### 2. **Fondo del Menú**
- Fondo negro semi-transparente (0.95 opacidad)
- Bordes redondeados con estilo neón verde
- Ancho: 280px
- Alto: 240px
- Aparece debajo del botón hamburguesa

### 3. **Botones Estilizados**

#### ▶ **Continuar** (Verde)
- **Color de borde:** `0x00ff00` (Verde brillante)
- **Color de fondo:** `0x006600` (Verde oscuro)
- **Acción:** Continúa el juego
- **Evento:** `resume-game`

#### ↻ **Reiniciar nivel** (Azul)
- **Color de borde:** `0x0099ff` (Azul)
- **Color de fondo:** `0x003366` (Azul oscuro)
- **Acción:** Reinicia la escena
- **Evento:** Reinicia GameScene

#### ⚙ **Configuración** (Naranja)
- **Color de borde:** `0xffaa00` (Naranja)
- **Color de fondo:** `0x663300` (Naranja oscuro)
- **Acción:** Placeholder (implementar según necesidad)

#### ← **Salir al menú** (Rojo)
- **Color de borde:** `0xff4444` (Rojo)
- **Color de fondo:** `0x660000` (Rojo oscuro)
- **Acción:** Regresa a HomeScenes

---

## 🎯 Interactividad

### Efectos Hover
- Al pasar el ratón sobre un botón: se agranda 2% (scale: 1.02)
- Al salir: vuelve al tamaño normal (scale: 0.95)
- Cursor cambia a puntero

### Animaciones
- Todos los botones tienen transiciones suaves
- Los bordes son de 2px con 80% opacidad

---

## 🔧 Personalización

### Cambiar Colores de un Botón

Busca esta línea en uiScene.js:
```javascript
const continueBtn = createStyledButton(..., 0x00ff00, 0x006600);
```

**Primer parámetro (borde):** Color del borde
**Segundo parámetro (fondo):** Color de fondo

### Agregar Nuevos Botones

```javascript
const newBtn = createStyledButton(
    hamX + menuWidth/2 - 5,    // Posición X
    hamY + 310,                 // Posición Y
    'Mi nuevo botón',           // Texto
    '📌',                        // Ícono
    0xff00ff,                   // Color borde
    0x660066                    // Color fondo
);

// Agregar a la lista de botones
[continueBtn, restartBtn, configBtn, exitBtn, newBtn].forEach(btn => {
    btn.setVisible(false);
    btn.setScale(0.95);
    btn.on('pointerover', () => btn.setScale(1.02));
    btn.on('pointerout', () => btn.setScale(0.95));
});

// Agregar evento
newBtn.on('pointerdown', () => {
    // Tu acción aquí
});
```

### Cambiar Tamaño del Menú

Busca estas líneas:
```javascript
const menuWidth = 280;   // Ancho
const menuHeight = 240;  // Alto
const buttonHeight = 50; // Altura de cada botón
```

### Cambiar Posición del Menú

Busca:
```javascript
const hamX = 20, hamY = 20;
```

---

## 📊 Estructura de Colores Actuales

| Botón | Borde | Fondo | Rango Y |
|-------|-------|-------|---------|
| Continuar | `0x00ff00` | `0x006600` | +70px |
| Reiniciar | `0x0099ff` | `0x003366` | +130px |
| Configuración | `0xffaa00` | `0x663300` | +190px |
| Salir | `0xff4444` | `0x660000` | +250px |

---

## 🎮 Códigos de Color en Hexadecimal

```
Verde   → 0x00ff00 (borde) / 0x006600 (fondo)
Azul    → 0x0099ff (borde) / 0x003366 (fondo)
Naranja → 0xffaa00 (borde) / 0x663300 (fondo)
Rojo    → 0xff4444 (borde) / 0x660000 (fondo)
Amarillo → 0xffff00
Morado  → 0xff00ff
Cian    → 0x00ffff
```

---

## ✨ Próximas Mejoras (Opcional)

- [ ] Agregar animaciones de entrada/salida
- [ ] Agregar sonidos al pasar/clickear botones
- [ ] Agregar control por teclado (ESC para pausar)
- [ ] Agregar efectos de sombra en los botones
- [ ] Agregar confirmación antes de salir

---

## 🐛 Notas Importantes

1. **Resume Game**: Asegúrate de que GameScene tenga un listener para `resume-game`
2. **HomeScenes**: El menú intenta ir a `HomeScenes`, verifica que exista
3. **Depth**: Los botones tienen depth 1001, asegúrate de que no haya conflictos

---

Diseño completamente funcional y listo para personalizar. ✨

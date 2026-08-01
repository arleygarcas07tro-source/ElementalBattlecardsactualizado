# 📋 Verificación de Assets - Elemental Battlecards

## ✅ Cartas (GameScene.js)

### Archivos reales en: `Frontend/public/assets/images/cartas/`
- ✓ carta-fuego-1.jpeg
- ✓ carta-fuego-2.jpeg
- ✓ carta-fuego-3.jpeg
- ✓ carta-agua-1.jpeg
- ✓ carta-agua-2.jpeg
- ✓ carta-agua-3.jpeg
- ✓ carta-planta-1.jpeg
- ✓ carta-planta-2.jpeg
- ✓ carta-planta-3.jpeg
- ✓ carta-luz-1.jpeg
- ✓ carta-luz-2.jpeg
- ✓ carta-luz-3.jpeg
- ✓ carta-sombra-1.jpeg
- ✓ carta-sombra-2.jpeg
- ✓ carta-sombra-3.jpeg
- ✓ carta-espiritu-1.jpeg
- ✓ carta-espiritu-2.jpeg
- ✓ carta-espiritu-3.jpeg

**Estado:** ✅ CORRECTO - Todas las rutas actualizadas a .jpeg

### Reversos de cartas
- ✓ baraja-jugador.png
- ✓ baraja-oponente.png

**Estado:** ✅ CORRECTO - Rutas en .png (formato original)

### Slots/Espacios
- ✓ Espacio vacio.png

**Estado:** ✅ CORRECTO - Ruta en .png (formato original)

### Otros elementos
- ✓ abajo.png (reverso genérico, usado en Preloader)

---

## ✅ Iconos/Orbes (UIScene.js)

### Archivos reales en: `Frontend/public/assets/images/iconos/`
- ✓ fuego.jpeg
- ✓ agua.jpeg
- ✓ planta.jpeg
- ✓ luz.jpeg
- ✓ espiritu.jpeg
- ✓ sombra.jpeg

**Estado:** ✅ CORRECTO - Todas las rutas actualizadas a .jpeg

---

## 📊 Resumen

| Elemento | Cantidad | Estado |
|----------|----------|--------|
| Cartas (JPEG) | 18 | ✅ |
| Reversos (PNG) | 2 | ✅ |
| Slots (PNG) | 1 | ✅ |
| Iconos (JPEG) | 6 | ✅ |
| **Total** | **27** | **✅ LISTO** |

---

## 🔧 Cambios realizados

### GameScene.js (líneas 83-105)
- ✏️ `carta-*.png` → `carta-*.jpeg` (18 cartas)

### UIScene.js (líneas 19-24)
- ✏️ `iconos/*.png` → `iconos/*.jpeg` (6 orbes)

### Preloader.js (línea 39)
- ✏️ `carta *.png` → `carta *.jpeg`
- ✏️ `carta-*-*.png` → `carta-*-*.jpeg`

---

## ⚠️ Notas importantes

1. **Extensiones mixtas:** El proyecto usa tanto `.png` como `.jpeg` según el tipo de asset:
   - **JPEG:** Cartas e iconos (mejor compresión para imágenes grandes)
   - **PNG:** Slots, reversos, fondos (mejor para imágenes simples)

2. **Nombres con espacios:** Algunos archivos tienen espacios (`carta fuego.png`, `campo juego/`). Los navegadores manejan esto bien con URLs, pero considera renombrar a formato snake-case para mejor mantenibilidad.

3. **Rutas públicas:** Todas las rutas usan `/assets/` (raíz pública), asegúrate de que el servidor sirve correctamente desde `Frontend/public/`.

---

## ✨ Estado final: TODO CORRECTO ✨

Todos los assets están correctamente enlazados y deberían cargarse sin errores 404.

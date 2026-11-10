# Modos TE / TM en guía de onda rectangular

Visualizador interactivo 2D (HTML + JavaScript, sin dependencias) de los modos
de propagación en una guía de onda rectangular de dimensiones `a × b`.

- **Sección transversal (x–y):** campo longitudinal (Hz en TE, Ez en TM) y vectores del campo eléctrico transversal oscilando en el tiempo.
- **Corte longitudinal (z–x):** la onda viajando en +z con longitud de onda guiada λg.
- Se dibujan las paredes conductoras y las cotas `a` y `b`.
- Modos de la tarea precargados: TE10, TE21, TM11, TM32, TM21 (y cualquier otro con n, m).

## Ecuaciones

Modo TE (Ez = 0), n, m = 0, 1, 2, … (no ambos 0):

    Hz = H0 · cos(nπx/a) · cos(mπy/b) · e^(-γz) · e^(jωt)

Modo TM (Hz = 0), n, m = 1, 2, …:

    Ez = E0 · sen(nπx/a) · sen(mπy/b) · e^(-γz) · e^(jωt)

Con `kc² = (nπ/a)² + (mπ/b)²`, `fc = c·kc / 2π`, y para `f > fc`:
`γ = jβ`, `β = √(k² − kc²)`, `λg = 2π/β`.

Campo eléctrico transversal (proporcional, sin constantes):

| Modo | Ex | Ey |
|------|----|----|
| TE | (mπ/b) cos(nπx/a) sen(mπy/b) | −(nπ/a) sen(nπx/a) cos(mπy/b) |
| TM | (nπ/a) cos(nπx/a) sen(mπy/b) | (mπ/b) sen(nπx/a) cos(mπy/b) |

## Uso

Abre `index.html` en el navegador (doble clic). No requiere instalación.

Controles: modo, n, m, a, b (por defecto WR-90: 22.86 × 10.16 mm), f/fc,
velocidad, corte y₀, posición z₀ y vectores de E.

## Estructura

    index.html   estructura de la página
    style.css    estilos (tema claro/oscuro automático)
    script.js    física y dibujo en canvas
    README.md

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub.
2. En el repositorio: **Settings → Pages → Build and deployment**.
3. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Espera un minuto: la página quedará en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

## Licencia

MIT, ver `LICENSE`.

# Base de conocimiento — Identidad Visual de la Universidad Católica Luis Amigó (UCLA) aplicada a UI/UX

> **Para qué sirve este documento.** Es el contexto de marca que debe usar el agente de codificación para diseñar la interfaz del software institucional. No es el manual impreso tal cual: es su **traducción a decisiones de UI/UX y a tokens de diseño**. El objetivo del producto es reforzar el **sentido de pertenencia** y que cada pantalla se sienta inequívocamente "Luis Amigó".
>
> Cuando exista conflicto entre este documento y el gusto del desarrollador, gana este documento. Los valores marcados como **(oficial)** provienen del Manual de Identidad Visual; los marcados como **(derivado)** son extensiones necesarias para producto digital, coherentes con la marca pero no literales del manual.

---

## 1. Esencia de marca (lo que la UI debe transmitir)

La nueva identidad simboliza una **revitalización** de los valores educativos de la Universidad: una marca moderna, fresca y en crecimiento. El software debe respirar esa idea.

Atributos que deben leerse en la interfaz:

- **Cercanía y calidez** — la marca lleva "Amigó" en el nombre; nada de frialdad corporativa distante. Tono humano.
- **Confianza y trayectoria** — es una institución de educación superior; sobriedad, orden y solidez.
- **Dinamismo y vida** — el naranja y las formas curvas aportan energía; la UI no debe sentirse rígida.
- **Identidad católica y amigoniana** — respeto, seriedad y un fondo de valores; evitar frivolidad.

Frase institucional (usar como voz de fondo, no como decoración repetida):

> **"Formación humana y profesional al servicio del desarrollo y la transformación social"**

Traducción a UX: pantallas claras y navegables, lenguaje humano y directo, jerarquía visual disciplinada, y un acento gráfico reconocible (el arco/anillo curvo y la tilde) que aparezca con intención, no en todas partes.

---

## 2. Sistema de color

La marca se construye sobre **cuatro colores**: blanco (fondo principal), azul, naranja y gris. El negro se reserva para aplicaciones específicas.

### 2.1 Colores institucionales (oficial)

| Color | Significado de marca | HEX | RGB | CMYK | Pantone |
|-------|----------------------|-----|-----|------|---------|
| **Azul** | Sabiduría, serenidad, fortaleza | `#007B99` | 0, 123, 153 | C:100 M:0 Y:20 K:30 | 3145 C |
| **Naranja** | Vida, dinamismo | `#F39200` | 243, 146, 0 | C:0 M:50 Y:100 K:0 | 144 C |
| **Gris** | Madurez, firmeza, elegancia, credibilidad | `#848585` | 132, 133, 133 | C:0 M:0 Y:0 K:60 | 423 C |
| **Blanco** | Tranquilidad, solidez, paz | `#FFFFFF` | 255, 255, 255 | — | — |

**Rol en la UI:**
- **Azul = color primario / de acción y estructura.** Barras de navegación, encabezados, botones primarios, enlaces, estados activos, bloques de contenido protagonista.
- **Naranja = color de acento y energía.** Úsalo con **restricción** (aprox. 10–15 % de la superficie): destacados, llamados a la acción secundarios/alto énfasis, indicadores, elementos gráficos y detalles de la marca. El naranja nunca debe ahogar al azul.
- **Gris = texto y neutrales.** Texto secundario, bordes, deshabilitados, líneas divisorias.
- **Blanco = fondo por defecto** de la mayoría de las pantallas de trabajo.
- **Negro** solo para aplicaciones tipo "fondo negro" (splash, credenciales, piezas especiales), no como fondo general de la app.

### 2.2 Paleta digital extendida (derivada)

El manual solo define 3 colores + blanco/negro. Un producto digital necesita superficies, estados hover/pressed y neutrales de texto. Estos valores mantienen el espíritu de marca; ajústalos solo si es necesario por contraste.

**Azul (escala derivada)**
| Token | HEX | Uso sugerido |
|-------|-----|--------------|
| Azul 900 | `#004E61` | Fondos azules oscuros, cabeceras densas, pressed |
| Azul 700 | `#00647D` | Hover de superficies/botones azules |
| **Azul 500 (marca)** | `#007B99` | Primario oficial |
| Azul 200 | `#99CBD6` | Bordes/acentos suaves sobre claro |
| Azul 50 | `#E6F2F5` | Fondos de sección, tarjetas informativas, hover sutil |

**Naranja (escala derivada)**
| Token | HEX | Uso sugerido |
|-------|-----|--------------|
| Naranja 700 | `#C77700` | Hover/pressed de acento |
| **Naranja 500 (marca)** | `#F39200` | Acento oficial |
| Naranja 100 | `#FDE6C7` | Fondos de énfasis muy suaves, resaltados |

**Neutrales (derivados, base gris de marca)**
| Token | HEX | Uso sugerido |
|-------|-----|--------------|
| Texto principal | `#2E2E2E` | Cuerpo de texto sobre blanco |
| Texto secundario | `#848585` | Gris de marca: subtítulos, metadatos |
| Borde / divisor | `#E1E1E1` | Líneas, bordes de input |
| Superficie sutil | `#F5F5F5` | Fondos de tarjeta, zonas alternas |
| Fondo app | `#FFFFFF` | Base |
| Negro | `#111111` | Solo aplicaciones especiales |

### 2.3 Colores de estado (derivados — no confundir con la marca)

El manual **no** define colores de feedback. Rojo y verde están *prohibidos dentro del logo* (ver §10), pero para mensajes del sistema sí se usan colores estándar. Manténlos discretos y **fuera** de los elementos de marca.

| Estado | HEX | Nota |
|--------|-----|------|
| Éxito | `#2E7D5B` | Verde sobrio; nunca aplicado al logo |
| Error | `#C0392B` | Rojo sobrio; nunca aplicado al logo |
| Advertencia | `#F39200` | Usar el naranja de marca solo si no compite con un acento cercano |
| Información | `#007B99` | Azul de marca |

### 2.4 Reglas de contraste
- Texto sobre azul `#007B99` → usar **blanco**. (Cumple contraste para texto normal.)
- Texto sobre naranja `#F39200` → usar **texto oscuro `#2E2E2E`**, no blanco (el naranja no da contraste suficiente con blanco para texto pequeño).
- Cuerpo de texto: `#2E2E2E` sobre blanco. Evita gris `#848585` para párrafos largos; resérvalo para texto secundario.
- Meta objetivo: **WCAG AA** en todos los textos y controles.

---

## 3. Tipografía

### 3.1 Tipografías oficiales del logotipo (oficial)
- **Ingra CD Book** → usada en la palabra "UNIVERSIDAD CATÓLICA" (la "función").
- **Azo Sans Medium** → usada en "LUIS AMIGÓ" (el "nombre").
- **Papelería / comunicación electrónica:** familia **Helvetica Neue LT Std** — *75 Bold* para títulos (14 pt) y *55 Roman* para cuerpo (12 pt).

> Estas fuentes son **comerciales / de licencia** y no siempre están disponibles como fuentes web. No las incrustes sin licencia. Úsalas solo si la Universidad provee las licencias web (WOFF2). En caso contrario, usa los reemplazos de abajo, que conservan el carácter geométrico y sans-serif de la marca.

### 3.2 Roles tipográficos en la UI (con fallbacks web)

| Rol | Ideal (marca) | Fallback web recomendado | Uso |
|-----|---------------|--------------------------|-----|
| **Display / títulos de marca** | Azo Sans | **Montserrat** o **Poppins** (geométricas, disponibles en Google Fonts) | H1–H2, cabeceras, pantallas de bienvenida |
| **Cuerpo / UI** | Helvetica Neue LT Std | **Inter** o **system-ui** | Párrafos, formularios, tablas, navegación |
| **Datos / utilitario** | — | **Inter** (tabular) / mono si hay cifras técnicas | Métricas, tablas, etiquetas |

Stack CSS sugerido:
```css
--font-display: "Azo Sans", "Montserrat", "Poppins", system-ui, sans-serif;
--font-body: "Helvetica Neue LT Std", "Inter", system-ui, -apple-system, sans-serif;
```

### 3.3 Escala tipográfica (derivada)
Escala 1.25 (mayor tercera). Ajusta a la densidad del producto.

| Token | px / rem | Peso | Uso |
|-------|----------|------|-----|
| Display | 40 / 2.5rem | 600–700 | Portadas, hero |
| H1 | 32 / 2rem | 600 | Título de página |
| H2 | 25 / 1.563rem | 600 | Sección |
| H3 | 20 / 1.25rem | 500 | Subsección |
| Body L | 18 / 1.125rem | 400 | Texto destacado |
| Body | 16 / 1rem | 400 | Base |
| Caption | 13 / 0.813rem | 400 | Metadatos, ayudas |

- Interlineado cuerpo: **1.5**. Títulos: **1.15–1.25**.
- Los títulos de marca pueden combinar peso: parte fina + parte fuerte, igual que el logo combina "UNIVERSIDAD CATÓLICA" (ligero) con "LUISAMIGÓ" (fuerte).

---

## 4. El logotipo dentro del producto

### 4.1 Anatomía (oficial)
El logotipo se compone de: **Escudo** (isotipo) · **Función** (UNIVERSIDAD CATÓLICA) · **Nombre** (LUIS AMIGÓ) · **Elemento gráfico** (la barra/tilde diagonal).

**Significado del isotipo:** la **cruz** representa el origen amigoniano (orden Franciscana y Capuchina) y la identidad católica; los dos elementos curvos forman un **camino** (el recorrido y el futuro). La cruz se inscribe en un **escudo** que siluetea una **"U"** (Universidad). Respeta esta simbología: no la alteres ni la recolores.

### 4.2 Reglas de uso en pantalla
- **Área de reserva:** deja un margen mínimo alrededor del logo igual a la altura de la letra "U" del logotipo. En UI, tradúcelo a un padding protegido: **no coloques texto, iconos ni bordes pegados al logo**.
- **Tamaño mínimo:** el manual fija 5 cm en impreso; en digital, garantiza legibilidad: **no menos de ~140 px de ancho** para la versión horizontal completa. Por debajo de eso, usa **solo el escudo/isotipo** (favicon, avatar, cabeceras compactas, estados móviles).
- **Proporciones:** nunca deformar, estirar ni comprimir. Escalar siempre proporcionalmente. Referencia de retícula del manual: ancho ≈ **64x**, alto ≈ **15x**.
- **Versión positivo/negativo:** existe versión en positivo y negativo para fondos oscuros.
- **Sobre fondos de color no corporativos:** usar el logo **en blanco**, y la cruz del isotipo **toma el color del fondo**.
- **Sobre fotografía:** ubicar el logo dentro de una **pestaña/tarjeta blanca**; no colocarlo directamente sobre la imagen.

### 4.3 Ubicación del logo en las piezas (oficial → layout)
El logo va **siempre**:
- en la **parte superior** (izquierda, centro o derecha), **o**
- en la **esquina inferior** derecha o izquierda.

En la UI eso significa: el logo vive en la **cabecera** (top bar) o en el **footer**, no flotando en el centro del contenido de trabajo. Excepción: el logo puede ir **centrado** solo cuando es el protagonista absoluto de la pantalla (splash, login, pantalla de bienvenida, portada).

**Convivencia con otros logos** (p. ej. aliados, ministerios, sedes): los logos externos van **a la derecha** del de la UCLA y en **igualdad de tamaño y tratamiento**.

### 4.4 Aplicaciones especiales (referencia)
Existen versiones firmadas para **sedes** (Medellín, Apartadó, Bogotá, Manizales, Montería) y para **facultades/unidades** (el nombre de la dependencia va debajo del logo, separado por una línea). Si el software es multi-sede o multi-facultad, contempla un **slot de "bajada" bajo el logo** con ese texto, respetando la línea divisoria y la tipografía secundaria.

---

## 5. Elemento gráfico, formas y textura

### 5.1 La tilde y el anillo (oficial)
El **elemento gráfico** es la **tilde sobre la "ó"** de "AMIGÓ", tratada como una acentuación de gran tamaño y carácter diferenciador. Se abstrae en una **"O" / anillo** que **puede fragmentarse hasta en 4 partes**, con libertad de composición para el diseñador.

**Uso en UI:**
- El **anillo / arco curvo** (visible en casi todas las páginas del manual como un semicírculo naranja o azul en las esquinas) es el **motivo visual firma** del producto. Úsalo como:
  - elemento decorativo de esquina en cabeceras, portadas y estados vacíos;
  - marco de avatares o de imágenes destacadas (arco parcial);
  - loader/spinner (un anillo que gira encaja perfecto con la marca);
  - separador o acento de sección.
- La **barra diagonal / paralelogramo** (el "elemento gráfico" del logo y las esquinas azules del manual) sirve como:
  - recorte de cabecera (banda diagonal superior izquierda, como en el manual);
  - contenedor de etiquetas ("Medellín", "Bogotá"…).
- **Regla de oro:** un solo gesto gráfico protagonista por pantalla. No saturar de arcos, tildes y diagonales a la vez.

### 5.2 Textura de patrón (oficial)
Existe una **textura** basada en la abstracción de la "O" fragmentada, usada como fondo de páginas de color pleno (naranja o azul). En UI úsala **con baja opacidad** en fondos de:
- pantallas de bienvenida / splash;
- cabeceras de módulo;
- áreas vacías o de carga.

Nunca la pongas detrás de texto de lectura densa (perjudica la legibilidad).

---

## 6. Layout, espaciado y composición

**Grid y espaciado (derivado):**
- Escala de espaciado base **8 px**: 4, 8, 12, 16, 24, 32, 48, 64.
- Radio de esquina: la marca combina formas rectas (escudo, diagonales) con curvas (anillo). Recomendado **radio suave `8px`** en tarjetas/botones para no traicionar la geometría, con la opción de `999px` (pill) solo en chips/etiquetas que evoquen el anillo.
- Contenedores anchos, aire generoso: la marca es limpia y ordenada (mucho blanco).

**Patrón de página recomendado:**
```
┌───────────────────────────────────────────────┐
│ ▟ (banda diagonal azul)   [LOGO UCLA]     ⚙ 👤 │  ← top bar azul o blanca con logo
├───────────────────────────────────────────────┤
│                                                 │
│   H1 (display)                                  │
│   contenido / tarjetas sobre blanco             │
│                                        ◜        │  ← arco naranja de esquina (firma, sutil)
│                                      ◜          │
│                                                 │
├───────────────────────────────────────────────┤
│ [logo pequeño]        © / enlaces institucionales│  ← footer
└───────────────────────────────────────────────┘
```

**Jerarquía:** azul estructura, blanco respira, naranja señala una sola cosa importante por vista, gris acompaña.

---

## 7. Mapeo a componentes de UI

| Componente | Regla de marca |
|------------|----------------|
| **Top bar / navegación** | Fondo blanco con logo a la izquierda, o banda azul `#007B99` con logo en blanco. Ítem activo en azul; indicador puede ser naranja. |
| **Botón primario** | Fondo azul `#007B99`, texto blanco. Hover `#00647D`, pressed `#004E61`. |
| **Botón secundario** | Contorno azul, texto azul, fondo transparente. |
| **Botón de acento / CTA alto énfasis** | Fondo naranja `#F39200`, **texto oscuro `#2E2E2E`**. Usar poco. |
| **Enlaces** | Azul `#007B99`, subrayado en hover. |
| **Tarjetas** | Fondo blanco o `#F5F5F5`, borde `#E1E1E1`, radio 8px, sombra sutil. Detalle de arco/diagonal opcional. |
| **Inputs** | Borde `#E1E1E1`; foco con borde/anillo azul `#007B99`. Error `#C0392B`. |
| **Chips / etiquetas de sede** | Estilo pill; puede usar la banda diagonal como en las aplicaciones de sedes del manual. |
| **Loader / spinner** | Anillo (la "O" de marca) girando, en azul o naranja. |
| **Estados vacíos** | Arco de esquina + mensaje en voz de marca (ver §9). |
| **Avatares / fotos** | Encuadre con arco parcial; si va logo sobre foto, pestaña blanca (§4.2). |
| **Splash / login / bienvenida** | Fondo azul o naranja pleno con textura sutil, logo centrado en blanco, tagline. |
| **Credencial / carné digital** | Referencia directa del manual (arco naranja, banda azul con el nombre). Buen patrón para el "carné estudiantil" del software. |

---

## 8. Sentido de pertenencia (recomendaciones de producto)

Para que el software refuerce la pertenencia, no basta con pintar de azul. Sugerencias concretas:

- **Bienvenida personalizada** con el nombre del usuario y la sede a la que pertenece (el manual tiene versiones por sede: úsalo).
- **Carné/identidad digital** dentro de la app, siguiendo el diseño del carné institucional del manual.
- **Micro-momentos de marca:** loader de anillo, transiciones con el arco, la tilde como marca de sección.
- **Frase institucional** en lugares de descanso (login, footer, pantallas de logro), no repetida hasta el cansancio.
- **Consistencia total** de color y tipografía en todos los módulos: la coherencia es lo que crea reconocimiento y pertenencia.

---

## 9. Voz y redacción (copy)

- **Cercana y humana**, coherente con "Amigó": trata al usuario con respeto pero sin distancia.
- **Voz activa y clara:** el botón dice exactamente qué hace ("Guardar cambios", no "Enviar"). Un mismo verbo se mantiene en todo el flujo ("Publicar" → toast "Publicado").
- **Nombrar por lo que el usuario controla**, no por cómo está construido el sistema.
- **Errores sin dramatismo:** explican qué pasó y cómo resolverlo, en la voz de la interfaz.
- **Estados vacíos = invitación a actuar**, no adorno.
- Sentence case, sin relleno, tono institucional pero amable.

---

## 10. Usos incorrectos (traducidos a "no hacer" en la UI)

Del manual, aplicados a producto digital. **Prohibido:**

1. **Cambiar los colores** del logo (usar la versión oficial con sus colores).
2. **Combinar los colores** de forma distinta a la oficial.
3. **Usar un solo color** en el logo (fuera de las versiones positivo/negativo/blanco definidas).
4. **Cambiar el color del marco del escudo.**
5. **Invertir los colores de la cruz** del escudo.
6. **Deformar** (estirar o comprimir) el logo — cuidado con `object-fit`/anchos fijos en CSS.
7. **Pixelar** — exportar siempre **SVG** o PNG en alta resolución; nunca reescalar hacia arriba un PNG pequeño.
8. **Girar** el logo.
9. **Mover el ícono/escudo** de su posición relativa al texto.

Extra para UI (derivado):
- No poner el logo sobre fondos de bajo contraste ni sobre fotos sin pestaña blanca.
- No usar rojo/verde de estado dentro de zonas de marca.
- No convertir el naranja en color dominante de pantalla.
- No incrustar las fuentes comerciales sin licencia.

---

## 11. Datos institucionales

- **Nombre:** Universidad Católica Luis Amigó.
- **Sede principal:** Transversal 51 A No. 67 B 90 — Medellín, Colombia.
- **Sedes:** Apartadó, Bogotá, Manizales y Montería (Cali aparece también en piezas de referencia — verificar con la Universidad).
- **Contacto:** ucatolicaluisamigo@amigo.edu.co · www.ucatolicaluisamigo.edu.co · Tel. 57 (4) 4487666.
- **Frase institucional:** "Formación humana y profesional al servicio del desarrollo y la transformación social".
- Fuente: Manual de Identidad Visual, Oficina de Comunicaciones y Relaciones Públicas. © 2022.

> Para logos oficiales (SVG), fuentes con licencia y firmas de sede/facultad, solicítalos a la Oficina de Comunicaciones. Este documento no incluye los archivos de arte.

---

## 12. Design tokens listos para consumir

### 12.1 CSS custom properties
```css
:root {
  /* Marca (oficial) */
  --color-azul: #007B99;
  --color-naranja: #F39200;
  --color-gris: #848585;
  --color-blanco: #FFFFFF;

  /* Azul (derivado) */
  --azul-900: #004E61;
  --azul-700: #00647D;
  --azul-500: #007B99;
  --azul-200: #99CBD6;
  --azul-50:  #E6F2F5;

  /* Naranja (derivado) */
  --naranja-700: #C77700;
  --naranja-500: #F39200;
  --naranja-100: #FDE6C7;

  /* Neutrales (derivado) */
  --texto:            #2E2E2E;
  --texto-secundario: #848585;
  --borde:            #E1E1E1;
  --superficie:       #F5F5F5;
  --fondo:            #FFFFFF;
  --negro:            #111111;

  /* Estados (derivado, fuera de marca) */
  --exito:       #2E7D5B;
  --error:       #C0392B;
  --advertencia: #F39200;
  --info:        #007B99;

  /* Semánticos de UI */
  --primary:        var(--azul-500);
  --primary-hover:  var(--azul-700);
  --primary-active: var(--azul-900);
  --accent:         var(--naranja-500);
  --accent-hover:   var(--naranja-700);

  /* Tipografía */
  --font-display: "Azo Sans", "Montserrat", "Poppins", system-ui, sans-serif;
  --font-body: "Helvetica Neue LT Std", "Inter", system-ui, -apple-system, sans-serif;

  /* Escala tipográfica */
  --fs-display: 2.5rem;
  --fs-h1: 2rem;
  --fs-h2: 1.563rem;
  --fs-h3: 1.25rem;
  --fs-body-l: 1.125rem;
  --fs-body: 1rem;
  --fs-caption: 0.813rem;
  --lh-body: 1.5;
  --lh-heading: 1.2;

  /* Espaciado (8px) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* Radios y sombra */
  --radius: 8px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 3px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.06);
}
```

### 12.2 JSON (para theming / tokens de sistema)
```json
{
  "brand": {
    "azul":    { "hex": "#007B99", "rgb": "0,123,153",  "cmyk": "100,0,20,30", "pantone": "3145 C", "meaning": "sabiduría, serenidad, fortaleza" },
    "naranja": { "hex": "#F39200", "rgb": "243,146,0",  "cmyk": "0,50,100,0",  "pantone": "144 C",  "meaning": "vida, dinamismo" },
    "gris":    { "hex": "#848585", "rgb": "132,133,133","cmyk": "0,0,0,60",    "pantone": "423 C",  "meaning": "madurez, firmeza, elegancia" },
    "blanco":  { "hex": "#FFFFFF", "meaning": "tranquilidad, solidez, paz" }
  },
  "semantic": {
    "primary": "#007B99", "primaryHover": "#00647D", "primaryActive": "#004E61",
    "accent": "#F39200", "accentHover": "#C77700",
    "text": "#2E2E2E", "textSecondary": "#848585",
    "border": "#E1E1E1", "surface": "#F5F5F5", "background": "#FFFFFF",
    "success": "#2E7D5B", "error": "#C0392B", "warning": "#F39200", "info": "#007B99"
  },
  "typography": {
    "display": { "official": "Azo Sans", "webFallback": "Montserrat, Poppins, system-ui, sans-serif" },
    "body":    { "official": "Helvetica Neue LT Std", "webFallback": "Inter, system-ui, sans-serif" }
  },
  "logo": {
    "minWidthPx": 140,
    "clearSpace": "altura de la letra U del logotipo",
    "gridRatio": "64x ancho / 15x alto",
    "placement": ["top-left","top-center","top-right","bottom-left","bottom-right","center-solo-si-protagonista"],
    "forbidden": ["recolorear","deformar","pixelar","rotar","un-solo-color","invertir-cruz","recolorear-marco","mover-icono"]
  },
  "graphic": {
    "signature": ["anillo/O fragmentable en 4 partes", "tilde acento", "banda diagonal / paralelogramo"],
    "texture": "patrón de O abstracta, baja opacidad, no bajo texto denso"
  }
}
```

---

### Notas finales para el agente de codificación
1. Deriva **todo** color y tipografía de estos tokens; no introduzcas colores fuera de la paleta.
2. Un solo gesto de marca protagonista por pantalla (arco, tilde o diagonal — no los tres a la vez).
3. Azul estructura · blanco respira · naranja señala · gris acompaña.
4. Exporta el logo como **SVG**; respeta el área de reserva y el tamaño mínimo.
5. Cumple **WCAG AA**, foco de teclado visible y `prefers-reduced-motion`.
6. Solicita a Comunicaciones los archivos de arte y las licencias de fuente antes de producción.

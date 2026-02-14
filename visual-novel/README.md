# Visual Novel — San Valentín (interfaz pública)

Interfaz para el usuario final con temática de San Valentín. El editor integrado fue removido: el backend debe proporcionar el guion.

✅ Características
- Interfaz tipo novela gráfica (sprite, caja de diálogo, opciones)
- Navegación con botones y teclado (← → / Enter / Space)
- Soporta diálogos lineales y nodos con `choices`
- Tema visual: 14 de febrero (corazones y paleta rosa)

Cómo alimentar el guion (backend)
- Opción A (recomendada): servir el JSON en `/dialogs/script.json` — la interfaz intentará cargarlo automáticamente.
- Opción B: inyectar el JSON como variable global antes de `app.js`, por ejemplo:
  <script>window.SCRIPT = { /* tu guion */ }</script>
- Si no se encuentra ningún guion, la página usa `dialogs/sample.json` como fallback.

Formato de guion (resumen)
- Objeto principal: `{ "start": "id_inicial", "nodes": [ ... ] }`
- Campos por nodo:
  - `id` (string, obligatorio)
  - `speaker` (string)
  - `text` (string)
  - `sprite` (nombre de SVG en `assets/` sin extensión)
  - `next` (id o `null`)
  - `choices` (array de `{ "text": "...", "next": "id" }`)

Ejemplo mínimo
{
  "start":"inicio",
  "nodes":[
    { "id":"inicio","speaker":"Narrador","text":"Bienvenido","next":"pregunta" },
    { "id":"pregunta","speaker":"Amiga","text":"¿Ir o quedarse?","choices":[{"text":"Ir","next":"ir"},{"text":"Quedarse","next":"quedarse"}] }
  ]
}

Ejecutar localmente
- Sirve la carpeta (p. ej. `npx http-server .` o tu backend) y abre `index.html` — la interfaz ocupa toda la ventana y se adapta a la resolución del dispositivo (estilo videojuego en pantalla completa).
- Coloca tu JSON en `/dialogs/script.json` o inyecta `window.SCRIPT`.

Notas
- Añade sprites (`SVG` o `PNG`) en `assets/` y referencia su nombre en `sprite` (puedes incluir la extensión o no).
- `dialogs/sample.json` contiene el ejemplo temático de San Valentín.

¡Listo! El frontend muestra la novela; edita los guiones desde tu backend.
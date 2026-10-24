# Carpeta de dinámicas

Para agregar una dinámica nueva:
1. Creá un archivo `tipo-nombre-de-la-dinamica.js`
2. Exportá un objeto `datos`
3. Completá el `id`, `nombre`, `rondas`, `preguntas`, `formatoPregunta` y `mensajeInicio`
4. Guardá el archivo y el bot la detectará automáticamente

Para desactivar una dinámica:
- Renombrá el archivo a algo que no empiece con `tipo-` o agregá `.off` al final

Reglas:
- No modificar `index.js` ni `base.js`
- Cada dinámica es independiente
- El bot elige una al azar evitando repetir la última seguida

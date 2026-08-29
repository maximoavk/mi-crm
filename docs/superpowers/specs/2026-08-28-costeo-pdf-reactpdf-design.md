# Migrar los PDF de Costeo a @react-pdf/renderer

## Problema

Los exportables "PDF Interno" y "PDF Cliente" del módulo de Costeo (`CosteoView`, `src/App.jsx`) se generan armando un string de HTML gigante y llamando a `window.print()` a través del navegador. La paginación de ese documento (dónde cae cada salto de página, si una fila se corta o no, si un subtotal se repite) queda completamente en manos del motor de impresión del navegador del usuario.

En la práctica esto produjo bugs de paginación irreproducibles y dependientes del navegador:
- Filas que se cortaban a la mitad entre dos páginas.
- El subtotal de una fase (`<tfoot>`) duplicándose en cada página en la que su tabla se fragmentaba — confirmado en Brave (Chromium) y Firefox (Gecko), con distinto comportamiento en cada uno.
- Ajustar escala, márgenes u orientación desde el diálogo de impresión no tiene ningún efecto sobre esto, porque el problema no es de layout de página sino de cómo cada navegador decide fragmentar `<thead>`/`<tfoot>` de una tabla HTML larga.

Se intentaron tres rondas de fixes CSS (`break-inside:avoid`, `display:table-header-group`/`table-footer-group`, eliminar el tag `<tfoot>` reemplazándolo por `<tbody>`) sin resolver el problema de forma confiable entre navegadores.

## Objetivo

Que el detalle de presupuesto (Costeo) se pueda exportar como PDF sin cortes ni duplicaciones, de forma consistente sin importar el navegador del usuario, resolviendo la causa raíz en vez de seguir parchando CSS.

## Alcance

- Solo los dos exportables de Costeo: `printInterno` y `printCliente` en `CosteoView` (`src/App.jsx`).
- El resto de los ~20 lugares del sistema que usan el mismo patrón `window.open`+`document.write`/`print()` (Cotizaciones, Guías de despacho, Órdenes de compra, etc.) quedan fuera de este cambio — no se tocan.

## Enfoque elegido

Reemplazar la generación HTML+`window.print()` por **`@react-pdf/renderer`**, una librería que define el documento como componentes React (`<Document>`, `<Page>`, `<View>`, `<Text>`, `<Image>`) y calcula la paginación ella misma en JS — no depende del motor de impresión del navegador. El mismo código produce el mismo PDF sin importar si el usuario está en Chrome, Firefox, Brave o Safari.

Se evaluó también `pdfmake` (DSL de configuración propio, buen soporte de tablas paginadas) pero se descartó a favor de react-pdf por encajar mejor con el resto del proyecto, que ya es 100% React — el documento se siente como "otro componente" en vez de un lenguaje de configuración nuevo que aprender.

## Arquitectura

Dos componentes nuevos, sin lógica de cálculo propia — reciben los datos ya calculados por el código existente (`calcFase`, `fasesCalc`, los totales agregados) como props:

- `CosteoInternoDoc({ proyecto, fasesCalc, totales })` — reemplaza `printInterno`.
- `CosteoClienteDoc({ proyecto, fasesCalc, totales })` — reemplaza `printCliente`.

Cada uno es un árbol de componentes `<Document><Page>...</Page></Document>` que replica la estructura visual actual: header institucional + datos del cliente, un bloque por fase, las tarjetas de resumen, la tabla de Partidas de Pago (solo en el Cliente) y el pie de firma.

Los botones "PDF Interno"/"PDF Cliente" dejan de construir HTML y llamar `window.print()`. En su lugar:
```js
const blob = await pdf(<CosteoInternoDoc proyecto={proyecto} fasesCalc={fasesCalc} totales={...} />).toBlob();
const url = URL.createObjectURL(blob);
window.open(url, "_blank");
```
Mismo patrón de Blob URL que ya se usa en el resto de la app (fix de Firefox de esta misma sesión), pero ahora el blob es un PDF real — el navegador lo abre en su visor nativo de PDF, sin pasar por el diálogo de impresión.

## Manejo de paginación (el punto crítico)

No se intenta replicar el modelo de `<thead>`/`<tfoot>` de HTML. En su lugar:

- **Cada fase es un bloque atómico**: `<View wrap={false}>` envolviendo el título de la fase + su tabla completa de ítems + las filas de subtotal/descuento/total. Si el bloque entero cabe en el espacio restante de la página actual, se dibuja ahí; si no, react-pdf lo empuja completo a la página siguiente. Nunca se corta a la mitad, y el subtotal no puede duplicarse porque es la última fila de ese mismo bloque, no un elemento especial que el motor decida repetir.
- Esto cubre el 100% de los casos reales observados (cada fase tiene entre 2 y 10 ítems).
- Caso límite aceptado: una fase tan larga que no quepa entera en una página en blanco fragmentaría fila por fila (cada fila protegida individualmente con `wrap={false}` para no partirse a la mitad), sin repetir el encabezado de columnas arriba del fragmento siguiente. Dado que ninguna fase real se acerca a ese tamaño, es un trade-off aceptado a cambio de un diseño mucho más simple y sin el riesgo de bugs sutiles de la versión anterior.
- La tabla de "Partidas de Pago" sigue la misma lógica de bloque atómico.

## Fuentes y logo

- Los PDF actuales ya usan `font-family:Arial,sans-serif` (no la tipografía de marca de la app, DM Mono/Space Grotesk) — se mantienen las fuentes estándar de react-pdf (Helvetica), sin pérdida real respecto a lo que ya existe y sin necesitar registrar archivos de fuente adicionales.
- El logo se toma de la constante base64 ya existente en el código (`LOGO_B64`/`LOGO_PRINT`) vía `<Image src={LOGO_B64} />`, evitando problemas de CORS con imágenes remotas.

## Migración visual

Se preserva la misma información y estructura general del documento actual (header institucional, datos de cliente, bloques por fase, tarjetas de resumen del total, Partidas de Pago, pie de firma). Colores y tamaños se replican fielmente vía `StyleSheet.create` de react-pdf; el resultado pixel-perfect no es un requisito — sí lo es que contenga la misma información, en el mismo orden, sin cortes ni duplicaciones.

## Testing y verificación

A diferencia del enfoque anterior (que solo se podía verificar pidiéndole al usuario que probara en su navegador real), la generación ahora es programática y determinística. Antes de pedir validación al usuario:
1. Script de Node que genera ambos documentos con datos de prueba, incluyendo un caso con muchos ítems por fase para forzar múltiples páginas.
2. Verificación automática de que cada subtotal de fase aparece exactamente una vez en el PDF resultante (no cero, no duplicado).
3. Conversión a imágenes (`pdftoppm`) para inspección visual de que ninguna fila queda cortada.

Solo después de esa verificación se le pide al usuario que lo pruebe en su propio navegador.

## Fuera de alcance

- Los demás ~20 generadores de PDF/impresión del sistema (Cotizaciones, Guías de despacho, Órdenes de compra, etiquetas, etc.) — quedan con el mecanismo actual.
- Igualar pixel-perfect el diseño visual anterior.
- Soportar sin fragmentar fases extremadamente largas que no quepan en una página en blanco (caso no observado en datos reales).

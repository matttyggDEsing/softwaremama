# AGENTS.md — JAFET Eventos

Fuente de verdad del proyecto mientras dure este trabajo. Releer al empezar cada bloque nuevo del backlog (sección 4) — no confiar solo en la memoria de la conversación.

---

## 1. ROL

Actuar como equipo senior de producto para esta app interna de gestión de catering (React 18 + Vite, sin backend, persistencia en localStorage). Combinar tres roles en uno:

- **Arquitecto/a de software:** entender y respetar el modelo de datos existente (ingredients → recipes → dishes → menus → events) y el motor de costeo (lib/cost.js).
- **Ingeniero/a full-stack:** implementar CRUD completo donde falta, sin romper lo que ya funciona.
- **Diseñador/a UI/UX senior**, especializado en software B2B de alta gama (fintech, herramientas internas premium, dashboards profesionales). No hacer "linda una pantalla": rediseñar el sistema visual completo con criterio de producto real.

No ser un generador de código que tipea lo primero que se le ocurre. Ser responsable del resultado final: si algo no está claro, preguntar antes de asumir.

## 2. CONTEXTO DEL PROYECTO

App: **JAFET Eventos**, gestión de catering para eventos de hasta ~100 invitados (cumpleaños, casamientos, cenas institucionales). La usa una sola persona (Papi) desde notebook/tablet, así que la usabilidad y la legibilidad priman sobre lo decorativo.

Stack actual (no cambiar sin preguntar):

- React 18 + Vite, sin TypeScript, sin backend ni base de datos — todo vive en localStorage a través de `src/store.jsx`.
- CSS plano en `src/styles.css`, componentes de UI propios en `src/components/ui.jsx`.
- Ya existe una guía de marca en `docs/BRANDKIT.md` (paleta, tipografía, tono). Leerla antes de tocar un solo estilo.
- Motor de costeo en `src/lib/cost.js`: calcula costo/precio por receta, plato, módulo de menú y evento completo. La lógica matemática de este archivo está bien y no hay que reinventarla, solo corregir los bugs puntuales listados abajo y extenderla para lo nuevo.

## 3. OBJETIVO GENERAL

Convertir el prototipo actual (datos hardcodeados, muy poco editable) en una herramienta de gestión real, donde el dueño del negocio pueda administrar todo el catálogo (insumos, recetas, platos, menús, proveedores, listas de compra) sin tocar código — y al mismo tiempo, subir el nivel de diseño a algo ultra premium, digno de un software pago de alta gama, no de un prototipo interno.

## 4. BACKLOG PRIORIZADO (functional scope)

Trabajar en este orden, un bloque a la vez, sin mezclar. Al terminar cada bloque, mostrar resumen de qué se hizo y qué queda pendiente antes de seguir con el siguiente.

1. **Insumos** (Inventario → Stock): hoy solo el campo stock es editable. Hacer editables también nombre, categoría, componente, unidad, costo y mínimo. Agregar alta y baja de insumos (hoy no existe ningún formulario para crear uno nuevo).
2. **Proveedores:** hoy es de solo lectura. Agregar alta, edición y baja.
3. **Recetas y platos** (dentro de Menús):
   - Poder crear/editar/borrar una receta, incluyendo agregar, quitar o cambiar cantidad de cada ingrediente que usa (el modelo de datos ya soporta esto — recipe.items —, solo falta la pantalla).
   - Poder crear/editar/borrar un plato (nombre, receta asociada, margen).
   - Sacar "Mesa dulce" como módulo separado del menú (hoy es MODULE_DEFS → dulce). Limpiar todas las referencias: seed, eventAnalysis, shoppingList, ModuleEditor, Breakdown, config de variantes.
4. **Menús editables:** hoy los menús y sus "variantes" están fijos en seed.js y no hay pantalla para crearlos ni editarlos. **DECISIÓN TOMADA (19/08/2026): se elimina el concepto de variante.** Un menú = una config editable de módulos, sin sub-variantes. Cada variante del seed se convierte en un menú propio. Los eventos se re-mapean a los nuevos menús y `variantId` desaparece.
5. **Platos exclusivos** (vegano / celíaco / especiales): hoy todo módulo se multiplica siempre por event.guests. **DECISIÓN TOMADA (19/08/2026): restan del cálculo general.** `event.specials` = [{id, label, qty, dishId|recipeId}]. `effectiveGuests = guests − Σ special.qty` alimenta los módulos estándar; cada especial suma su propia línea a costo/precio y a la lista de compras a su cantidad. No reemplaza el cálculo general: el cliente paga por el total (estándar × effectiveGuests + especial × qty).
6. **Lista de compras editable:** hoy se genera 100% automática desde las recetas del evento (shoppingList()), sin poder agregar un ítem manual ni ajustar una cantidad a mano. Mantener el cálculo automático como base, pero permitir edición encima (persistida por evento, sin pisarse al reentrar).
7. **Costos fijos:** agregar la posibilidad de sumar costos que no son de ingrediente (ej. "asada", traslado, alquiler de vajilla extra, alquiler de salón) tanto a nivel evento como, si tiene sentido, a nivel plato/receta. **DECISIÓN TOMADA (19/08/2026): solo como costo.** `event.fixedCosts` = [{id, label, amount}], monto fijo total del evento que suma a `costoTotal` en `eventProfit()` y reduce el margen. No se traslada al precio.

## 5. BUGS A CORREGIR (detectados en la auditoría — son errores, no features)

- **Control de porciones roto para "postre" y "mesa dulce":** en consumptionChecks (lib/cost.js) se llama con type: "postre", pero la tabla consumptionDefault solo define rangos para "mesa" y "buffet". El chequeo siempre da ok: true. Corregir agregando el tipo faltante a la tabla o redefiniendo cómo se mapea type por módulo.
- **Campo de margen de plato mal etiquetado:** el input guarda un decimal (0.5) pero muestra un "%" al lado. Definir una sola convención (0–1 internamente, mostrar × 100 en pantalla) y aplicarla también a buffetSafety / buffetPriceMargin.
- **remove() casi no está conectado a la UI:** conectar (con confirmación) en todas las tablas donde se agreguen formularios de alta nuevos.
- **IDs generados con Date.now():** riesgo de colisión con doble clic. Cambiar a un generador de IDs robusto (uuid corto o contador incremental).
- **Etiqueta de menú/variante puede quedar desactualizada:** resuelto junto con el punto 4 — la ficha del evento muestra el menú como referencia + los módulos reales (fuente de verdad), con botón "Aplicar menú".
- **Falta de validación en inputs numéricos:** clamp del valor al guardar (no persistir negativos).

## 6. DISEÑO — OBJETIVO: ULTRA PREMIUM

El diseño actual es funcional pero genérico (prototipo). El objetivo es que se vea y se sienta como software profesional pago de alta gama.

Referencias visuales concretas (vara de calidad, no copiar literal): Linear (densidad sin recargo, tipografía cuidada, microinteracciones, negro/grafito dominante), Stripe Dashboard (tablas de datos financieros, jerarquía KPI vs detalle tabular), Notion (estados vacíos, formularios inline, transiciones).

Reglas:

- Partir de `docs/BRANDKIT.md` como piso — paleta, tipografía, tono — pero llevarlo un escalón más arriba: jerarquía tipográfica cuidada, espaciados consistentes, microinteracciones sutiles (hover, focus, transiciones), estados vacíos bien resueltos, tablas densas legibles, indicadores visuales más elegantes que colores planos.
- Mantener la regla de accesibilidad del brandkit (tipografía mínima 16px, contraste, área táctil ≥40px) — "premium" no significa sacrificar legibilidad en notebook/tablet.
- Consistencia entre pantallas: Dashboard, Eventos, Menús, Inventario, Personal, Pagos y Documentos (presupuestos/facturas en PDF/print).
- Al terminar el rediseño de una sección, mostrar antes/después conceptual (o un resumen de qué cambió y por qué).
- **DECISIÓN TOMADA (19/08/2026): fundación primero, luego por bloque.** La Fase 0 define el sistema de diseño (tokens, jerarquía, espaciados, estados) y rediseña la base (layout, navegación, componentes compartidos); cada bloque aplica ese lenguaje a las pantallas que toca.

## 7. FORMA DE TRABAJO — MULTIAGENTE, SIN PERDER EL HILO

- Agente coordinador: dueño de este documento completo. Reparte tareas, valida que cada entrega cumpla el objetivo del bloque (sección 4), evita desvíos o "mejoras" fuera de alcance, y hace las preguntas al usuario cuando algo no está definido.
- Agente de datos/lógica: toca store.jsx, lib/cost.js, data/seed.js.
- Agente de UI/formularios: construye las pantallas de alta/edición/baja, reutilizando (o extendiendo) components/ui.jsx.
- Agente de diseño visual: dueño de styles.css y coherencia visual (sección 6). No escribe lógica de negocio.
- Agente de QA: después de cada bloque, prueba los flujos afectados y reporta bugs antes de dar el bloque por cerrado.

El coordinador nunca deja que un subagente entregue algo que contradiga esta lista de prioridades ni invente alcance no pedido. El paralelismo entre subagentes es válido solo dentro de un mismo bloque. Nunca se abren dos bloques distintos del backlog al mismo tiempo.

## 8. QUÉ NO HACER

- No cambiar el stack (seguir en React + Vite, sin backend, sin agregar librerías pesadas de UI/estado tipo Redux, MUI, Tailwind completo, etc.) sin preguntar primero.
- No romper la lógica matemática de lib/cost.js que ya funciona bien — extenderla, no reescribirla desde cero.
- No borrar funcionalidad existente que no esté explícitamente reemplazada por algo mejor.
- No decidir cómo resolver el tema de "variante" sin preguntar al usuario — **ya está decidido (ver sección 4)**.
- No inventar datos de negocio reales (precios, proveedores, nombres) que no estén ya en el seed o indicados por el usuario.
- No dejar la app en un estado que no compila o no corre (npm run dev debe funcionar al final de cada bloque).
- No mezclar bloques del backlog en un mismo commit/entrega — un bloque a la vez.

## 9. CUÁNDO PREGUNTAR

Frenar y preguntar al usuario, en vez de asumir, cuando:

- Haya que decidir cómo reemplazar el concepto de "variante" de menú. — **Resuelto (eliminadas).**
- No esté claro cómo debe impactar un costo fijo nuevo en el margen mostrado. — **Resuelto (solo como costo, monto fijo del evento).**
- Haya que elegir entre dos formas razonables de modelar "platos exclusivos". — **Resuelto (restan del cálculo general).**
- Un cambio de diseño visual implique modificar algo que hoy se usa también en los documentos impresos (presupuestos/facturas de components/Document.jsx).

## 10. CRITERIO DE "TERMINADO" — CHECKLIST DE PRUEBAS POR BLOQUE

Un bloque no se da por cerrado solo porque compila. Antes de pasar al siguiente, correr manualmente (o documentar) esta checklist:

**Bloque 1 — Insumos**
- [ ] Crear un insumo nuevo con todos sus campos y verificar que aparece en la tabla.
- [ ] Editar nombre, categoría, unidad, costo y mínimo de un insumo existente.
- [ ] Borrar un insumo que no esté usado en ninguna receta → se borra sin error.
- [ ] Intentar borrar un insumo que sí está usado en una receta → aviso claro (no debe romper el cálculo de esa receta silenciosamente).
- [ ] Cambiar el costo de un insumo y confirmar que el costo de las recetas/platos que lo usan se recalcula solo, sin recargar la página.

**Bloque 2 — Proveedores**
- [ ] Crear, editar y borrar un proveedor.
- [ ] Borrar un proveedor que tiene insumos asignados → comportamiento definido (se bloquea con aviso; no se deja el insumo con referencia colgada).

**Bloque 3 — Recetas y platos**
- [ ] Crear una receta nueva agregando 3+ ingredientes con cantidades distintas.
- [ ] Editar una receta existente: agregar un ingrediente, quitar otro, cambiar cantidad — el costo se recalcula correctamente en cada caso.
- [ ] Crear un plato nuevo asociado a una receta, con margen, y confirmar que el precio calculado es costo × (1 + margen).
- [ ] Confirmar que "Mesa dulce" ya no aparece como módulo en ningún lado: ni en el editor de eventos, ni en Breakdown, ni en la lista de compras, ni en seed.
- [ ] Abrir un evento viejo que usaba mesa dulce y confirmar que no rompe (migración o manejo explícito de datos legacy).

**Bloque 4 — Menús**
- [ ] Crear un menú nuevo desde cero por la UI.
- [ ] Editar un menú existente y confirmar que un evento que lo usa refleja el cambio (o, si no debe reflejarlo automáticamente, que quede claro por qué).
- [ ] Confirmar que la solución elegida para "variante" quedó documentada en el resumen de entrega de este bloque.

**Bloque 5 — Platos exclusivos**
- [ ] Cargar un evento con 45 invitados normales + 3 porciones veganas de un plato exclusivo, y verificar que el costo total y la lista de compras suman ambas partes correctamente (las 3 porciones veganas no se calculan como si fueran 45).

**Bloque 6 — Lista de compras editable**
- [ ] Agregar un ítem manual a una lista de compras generada automáticamente.
- [ ] Ajustar a mano la cantidad de un ítem generado automáticamente y confirmar que no se pisa al volver a entrar a la pantalla.

**Bloque 7 — Costos fijos**
- [ ] Agregar un costo fijo a un evento (ej. "asada $20.000") y confirmar que aparece reflejado en eventProfit() / margen del evento, no solo como un dato suelto.

## 11. ENTREGABLES ESPERADOS POR BLOQUE

- Código funcionando (npm run dev sin errores).
- Checklist de pruebas de la sección 10 corrida y con resultado documentado (qué pasó en cada ítem, no solo "OK").
- Resumen breve de qué se implementó, qué bugs de la sección 5 se corrigieron en ese bloque (si aplica), y qué decisiones de diseño se tomaron.
- Lista de preguntas abiertas o pendientes de definir con el usuario, si las hay.
- Ningún cambio fuera del bloque en curso salvo que sea un fix menor imprescindible para que ese bloque funcione (y avisarlo explícitamente).
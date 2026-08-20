export const MODULE_DEFS = [
  { key: "entrada", label: "Entrada / primer plato", kind: "dish", short: "Entrada" },
  { key: "principal", label: "Segundo plato", kind: "dish", short: "Principal" },
  { key: "buffet", label: "Mesa buffet", kind: "recipes", short: "Buffet" },
  { key: "postre", label: "Postre", kind: "dishes", short: "Postre" },
  { key: "trasnoche", label: "Trasnoche", kind: "dish", short: "Trasnoche" },
];

export const STATUS = [
  { key: "consulta", label: "Consulta", tone: "humo" },
  { key: "tentativo", label: "Tentativo", tone: "amber" },
  { key: "confirmado", label: "Confirmado", tone: "green" },
  { key: "cerrado", label: "Cerrado", tone: "negro" },
];

export const consumptionDefault = {
  proteina: { label: "Proteína", mesa: [200, 250], buffet: [250, 350] },
  guarnicion: { label: "Guarnición", mesa: [150, 200], buffet: [200, 250] },
  ensalada: { label: "Ensalada", mesa: [100, 150], buffet: [150, 200] },
  postre: { label: "Postre", mesa: [100, 120], buffet: [120, 150] },
};

export function makeSeed() {
  const sup = {
    sup1: { id: "sup1", name: "Carnicería Los Gauchos", phone: "911 555 0101", categories: "Carnes" },
    sup2: { id: "sup2", name: "Verdulería Don Fermín", phone: "911 555 0102", categories: "Frutas y verduras" },
    sup3: { id: "sup3", name: "Distribuidora San Cayetano", phone: "911 555 0103", categories: "Almacén y lácteos" },
    sup4: { id: "sup4", name: "Panadería La Espiga", phone: "911 555 0104", categories: "Panificados" },
    sup5: { id: "sup5", name: "Repostería Delicias", phone: "911 555 0105", categories: "Repostería" },
  };

  const ing = (id, name, component, cat, unit, cost, supplierId, stock, min) => ({
    id, name, component, cat, unit, cost, supplierId, stock, min,
  });

  const ingredients = [
    ing("poll", "Filet de pollo", "proteina", "Carnes", "kg", 6500, "sup1", 12, 5),
    ing("lomo", "Lomo", "proteina", "Carnes", "kg", 16000, "sup1", 4, 3),
    ing("peceto", "Peceto", "proteina", "Carnes", "kg", 9500, "sup1", 2, 2),
    ing("salmon", "Salmón", "proteina", "Carnes", "kg", 24000, "sup1", 0, 2),
    ing("bondiola", "Bondiola", "proteina", "Carnes", "kg", 7800, "sup1", 6, 3),
    ing("carnepic", "Carne picada", "proteina", "Carnes", "kg", 8500, "sup1", 3, 2),
    ing("papas", "Papas", "guarnicion", "Verduras", "kg", 1200, "sup2", 25, 8),
    ing("batata", "Batata", "guarnicion", "Verduras", "kg", 1100, "sup2", 10, 5),
    ing("arroz", "Arroz", "guarnicion", "Almacén", "kg", 1800, "sup3", 15, 6),
    ing("verdgrill", "Verduras grilladas", "guarnicion", "Verduras", "kg", 1600, "sup2", 8, 4),
    ing("hongos", "Hongos", "otro", "Verduras", "kg", 4500, "sup2", 1, 1),
    ing("tomate", "Tomate", "ensalada", "Verduras", "kg", 1800, "sup2", 9, 4),
    ing("rucula", "Rúcula", "ensalada", "Verduras", "kg", 4000, "sup2", 2, 1),
    ing("ensmixta", "Ensalada mixta", "ensalada", "Verduras", "kg", 1500, "sup2", 0, 3),
    ing("palta", "Palta", "otro", "Verduras", "kg", 7000, "sup2", 3, 1),
    ing("pan", "Pan francés", "otro", "Panadería", "kg", 3200, "sup4", 5, 2),
    ing("crema", "Crema de leche", "otro", "Almacén", "l", 4500, "sup3", 4, 2),
    ing("quesocrema", "Queso crema", "otro", "Almacén", "kg", 6000, "sup3", 2, 1),
    ing("parmesano", "Queso parmesano", "otro", "Almacén", "kg", 12000, "sup3", 1, 1),
    ing("harina", "Harina", "otro", "Almacén", "kg", 1500, "sup3", 20, 5),
    ing("huevos", "Huevos", "otro", "Almacén", "uni", 350, "sup3", 48, 24),
    ing("dulceleche", "Dulce de leche", "otro", "Repostería", "kg", 4800, "sup5", 3, 1),
    ing("chocolate", "Chocolate", "otro", "Repostería", "kg", 13000, "sup5", 2, 1),
    ing("frutillas", "Frutillas", "postre", "Verduras", "kg", 6000, "sup2", 2, 1),
    ing("minitortas", "Mini tortas surtidas", "postre", "Repostería", "kg", 9000, "sup5", 0, 2),
    ing("cupcakes", "Cupcakes", "postre", "Repostería", "uni", 1200, "sup5", 0, 0),
    ing("alfajores", "Alfajores de maicena", "postre", "Repostería", "uni", 700, "sup5", 12, 6),
    ing("chocotorta", "Chocotorta", "postre", "Repostería", "kg", 8500, "sup5", 1, 1),
    ing("cheesecake", "Cheesecake", "postre", "Repostería", "kg", 11000, "sup5", 1, 1),
    ing("helado", "Helado (bocha)", "postre", "Repostería", "uni", 1500, "sup3", 8, 4),
    ing("sandwich", "Sandwich de miga", "otro", "Panadería", "kg", 8500, "sup4", 2, 1),
    ing("pizzetas", "Pizzetas", "otro", "Panadería", "uni", 1800, "sup4", 10, 6),
    ing("cafe", "Café molido", "otro", "Almacén", "kg", 14000, "sup3", 1, 1),
    ing("aceite", "Aceite de oliva", "otro", "Almacén", "l", 5800, "sup3", 4, 2),
    ing("ajo", "Ajo", "otro", "Verduras", "kg", 5000, "sup2", 1, 1),
    ing("cebolla", "Cebolla", "otro", "Verduras", "kg", 1300, "sup2", 8, 3),
    ing("sal", "Sal", "otro", "Almacén", "kg", 900, "sup3", 5, 2),
  ];

  const item = (ingredientId, q) => (q.u ? { ingredientId, u: q.u } : { ingredientId, g: q.g });

  const rec = (id, name, module, items) => ({ id, name, module, items });
  const dish = (id, name, module, recipeId, margin) => ({ id, name, module, recipeId, margin });

  const menuConfig = (refs) => {
    const cfg = {};
    MODULE_DEFS.forEach((def) => {
      const v = refs[def.key];
      if (def.kind === "dish") cfg[def.key] = { on: !!v, dishId: v || null };
      else if (def.kind === "recipes") cfg[def.key] = { on: (v || []).length > 0, recipeIds: v || [] };
      else cfg[def.key] = { on: (v || []).length > 0, dishIds: v || [] };
    });
    return cfg;
  };

  const recipes = [
    rec("r_bruschetta", "Bruschettas de tomate", "entrada", [item("pan", { g: 60 }), item("tomate", { g: 40 }), item("ajo", { g: 3 }), item("aceite", { g: 8 }), item("sal", { g: 1 })]),
    rec("r_empanadas", "Empanadas de carne (x2)", "entrada", [item("carnepic", { g: 140 }), item("cebolla", { g: 40 }), item("huevos", { u: 0.15 }), item("aceite", { g: 5 })]),
    rec("r_risotto", "Risotto de hongos", "entrada", [item("arroz", { g: 90 }), item("hongos", { g: 35 }), item("crema", { g: 15 }), item("parmesano", { g: 12 })]),
    rec("r_pollo", "Pollo a la crema con papas", "principal", [item("poll", { g: 220 }), item("papas", { g: 180 }), item("crema", { g: 30 }), item("sal", { g: 1 })]),
    rec("r_lomo", "Lomo con verduras grilladas", "principal", [item("lomo", { g: 230 }), item("verdgrill", { g: 180 }), item("aceite", { g: 8 })]),
    rec("r_peceto", "Peceto con puré", "principal", [item("peceto", { g: 220 }), item("papas", { g: 200 }), item("crema", { g: 20 }), item("sal", { g: 1 })]),
    rec("r_salmon", "Salmón grillado con arroz", "principal", [item("salmon", { g: 200 }), item("arroz", { g: 80 }), item("rucula", { g: 20 }), item("aceite", { g: 6 })]),
    rec("r_pollhorn", "Pollo al horno", "buffet", [item("poll", { g: 280 }), item("papas", { g: 220 }), item("aceite", { g: 10 }), item("sal", { g: 1 })]),
    rec("r_bondiola", "Bondiola braseada", "buffet", [item("bondiola", { g: 300 }), item("batata", { g: 150 }), item("sal", { g: 1 })]),
    rec("r_ensmixta", "Ensalada mixta", "buffet", [item("ensmixta", { g: 170 }), item("aceite", { g: 8 })]),
    rec("r_griega", "Arroz a la griega", "buffet", [item("arroz", { g: 130 }), item("verdgrill", { g: 60 }), item("aceite", { g: 6 })]),
    rec("r_rusticas", "Papas rústicas", "buffet", [item("papas", { g: 200 }), item("aceite", { g: 10 }), item("sal", { g: 1 })]),
    rec("r_rucula", "Ensalada de rúcula", "buffet", [item("rucula", { g: 120 }), item("parmesano", { g: 20 }), item("aceite", { g: 8 })]),
    rec("r_minitortas", "Mini tortas surtidas", "postre", [item("minitortas", { g: 80 })]),
    rec("r_cupcakes", "Cupcakes", "postre", [item("cupcakes", { u: 1 })]),
    rec("r_frutillas", "Frutillas con crema", "postre", [item("frutillas", { g: 90 }), item("crema", { g: 25 })]),
    rec("r_alfajores", "Alfajores de maicena", "postre", [item("alfajores", { u: 1 })]),
    rec("r_chocotorta", "Chocotorta", "postre", [item("chocotorta", { g: 90 })]),
    rec("r_cheesecake", "Cheesecake de frutos rojos", "postre", [item("cheesecake", { g: 100 }), item("frutillas", { g: 20 })]),
    rec("r_brownie", "Brownie con helado", "postre", [item("chocolate", { g: 70 }), item("helado", { u: 1 })]),
    rec("r_copafrutas", "Copa de frutas", "postre", [item("frutillas", { g: 60 }), item("dulceleche", { g: 30 }), item("crema", { g: 20 })]),
    rec("r_sandwich", "Sandwich de miga", "trasnoche", [item("sandwich", { g: 150 })]),
    rec("r_pizzetas", "Pizzetas (x2)", "trasnoche", [item("pizzetas", { u: 2 })]),
    rec("r_cafe", "Café y torta", "trasnoche", [item("cafe", { g: 8 }), item("chocotorta", { g: 60 })]),
  ];

  const dishes = [
    dish("d_emp1", "Bruschettas de tomate", "entrada", "r_bruschetta", 0.5),
    dish("d_emp2", "Empanadas de carne", "entrada", "r_empanadas", 0.5),
    dish("d_emp3", "Risotto de hongos", "entrada", "r_risotto", 0.55),
    dish("d_pri1", "Pollo a la crema", "principal", "r_pollo", 0.6),
    dish("d_pri2", "Lomo con verduras", "principal", "r_lomo", 0.65),
    dish("d_pri3", "Peceto con puré", "principal", "r_peceto", 0.6),
    dish("d_pri4", "Salmón grillado", "principal", "r_salmon", 0.7),
    dish("d_dul1", "Mini tortas surtidas", "postre", "r_minitortas", 0.6),
    dish("d_dul2", "Cupcakes", "postre", "r_cupcakes", 0.6),
    dish("d_dul3", "Frutillas con crema", "postre", "r_frutillas", 0.55),
    dish("d_dul4", "Alfajores de maicena", "postre", "r_alfajores", 0.6),
    dish("d_dul5", "Chocotorta", "postre", "r_chocotorta", 0.55),
    dish("d_pos1", "Cheesecake de frutos rojos", "postre", "r_cheesecake", 0.6),
    dish("d_pos2", "Brownie con helado", "postre", "r_brownie", 0.6),
    dish("d_pos3", "Copa de frutas", "postre", "r_copafrutas", 0.55),
    dish("d_tra1", "Sandwich de miga", "trasnoche", "r_sandwich", 0.5),
    dish("d_tra2", "Pizzetas", "trasnoche", "r_pizzetas", 0.5),
    dish("d_tra3", "Café y torta", "trasnoche", "r_cafe", 0.55),
  ];

  const menus = [
    {
      id: "m1v1", name: "Menú Clásico · Casual",
      modules: menuConfig({ entrada: "d_emp1", principal: "d_pri1", postre: ["d_pos1"] }),
    },
    {
      id: "m1v2", name: "Menú Clásico · Cumpleaños",
      modules: menuConfig({ entrada: "d_emp2", principal: "d_pri2", postre: ["d_pos2"] }),
    },
    {
      id: "m2v1", name: "Menú Buffet · Completo",
      modules: menuConfig({ buffet: ["r_pollhorn", "r_bondiola", "r_ensmixta", "r_griega"], postre: ["d_dul1", "d_dul4"], trasnoche: "d_tra1" }),
    },
    {
      id: "m2v2", name: "Menú Buffet · Liviano",
      modules: menuConfig({ buffet: ["r_pollhorn", "r_ensmixta", "r_griega"], postre: ["d_dul3"] }),
    },
    {
      id: "m3v1", name: "Menú Premium · Elegante",
      modules: menuConfig({ entrada: "d_emp3", principal: "d_pri4", postre: ["d_pos1"], trasnoche: "d_tra3" }),
    },
    {
      id: "m3v2", name: "Menú Premium · Casamiento",
      modules: menuConfig({ entrada: "d_emp1", principal: "d_pri3", postre: ["d_dul1", "d_dul2", "d_dul3", "d_pos3"] }),
    },
  ];

  const clients = [
    { id: "c1", name: "Familia González", phone: "911 555 2001", email: "gonzalez.fam@gmail.com", address: "Av. Siempre Viva 742", notes: "Prefieren carne. Niños incluidos en la cuenta." },
    { id: "c2", name: "Romina Pérez", phone: "911 555 2002", email: "romi.perez@gmail.com", address: "Urquiza 550, Pilar", notes: "Casamiento para 80. Requieren opción vegana en dulce." },
    { id: "c3", name: "Club Atlético Unidos", phone: "911 555 2003", email: "admin@clubunidos.ar", address: "Sede social, Moreno 300", notes: "Cena anual. Pagan por transferencia." },
    { id: "c4", name: "Florencia López", phone: "911 555 2004", email: "flor.lopez@hotmail.com", address: "Belgrano 890, San Miguel", notes: "Bautismo de su hijo. Repite todos los años." },
  ];

  const equipment = [
    { id: "eq1", name: "Mesas rectangulares", cat: "Mobiliario", qty: 12, min: 4 },
    { id: "eq2", name: "Sillas", cat: "Mobiliario", qty: 60, min: 10 },
    { id: "eq3", name: "Vajilla (platos playos)", cat: "Vajilla", qty: 40, min: 20 },
    { id: "eq4", name: "Copas", cat: "Vajilla", qty: 30, min: 12 },
    { id: "eq5", name: "Cubiertos (set)", cat: "Vajilla", qty: 40, min: 20 },
    { id: "eq6", name: "Manteles", cat: "Textil", qty: 15, min: 6 },
    { id: "eq7", name: "Bandejas", cat: "Servicio", qty: 8, min: 3 },
    { id: "eq8", name: "Rechauds (fuentes de calor)", cat: "Servicio", qty: 4, min: 1 },
    { id: "eq9", name: "Jarras de agua", cat: "Servicio", qty: 6, min: 2 },
  ];

  const staff = [
    { id: "s1", name: "Fidel", role: "Cocinero jefe", phone: "911 555 3001", payBase: 30000 },
    { id: "s2", name: "Mariana", role: "Ayudante de cocina", phone: "911 555 3002", payBase: 20000 },
    { id: "s3", name: "Lucas", role: "Mozo / servicio", phone: "911 555 3003", payBase: 18000 },
    { id: "s4", name: "Sofía", role: "Pastelera", phone: "911 555 3004", payBase: 26000 },
    { id: "s5", name: "Diego", role: "Montaje / armado", phone: "911 555 3005", payBase: 18000 },
  ];

  const assignments = [
    { id: "as1", eventId: "e1", staffId: "s1", role: "Cocina", task: "Plato principal", pay: 30000 },
    { id: "as2", eventId: "e1", staffId: "s2", role: "Cocina", task: "Entrada y postre", pay: 18000 },
    { id: "as3", eventId: "e1", staffId: "s3", role: "Servicio", task: "Mesas", pay: 16000 },
    { id: "as5", eventId: "e2", staffId: "s1", role: "Cocina", task: "Cocina completa", pay: 45000 },
    { id: "as6", eventId: "e2", staffId: "s2", role: "Cocina", task: "Cocina", pay: 28000 },
    { id: "as7", eventId: "e2", staffId: "s4", role: "Repostería", task: "Mesa dulce", pay: 32000 },
    { id: "as8", eventId: "e2", staffId: "s3", role: "Servicio", task: "Mesas y cóctel", pay: 25000 },
    { id: "as9", eventId: "e2", staffId: "s5", role: "Montaje", task: "Armado y desarme", pay: 22000 },
    { id: "as10", eventId: "e3", staffId: "s1", role: "Cocina", task: "Buffet", pay: 35000 },
    { id: "as11", eventId: "e3", staffId: "s3", role: "Servicio", task: "Buffet", pay: 20000 },
    { id: "as12", eventId: "e3", staffId: "s5", role: "Montaje", task: "Mesas y buffet", pay: 18000 },
    { id: "as13", eventId: "e4", staffId: "s1", role: "Cocina", task: "Cocina completa", pay: 30000 },
    { id: "as14", eventId: "e4", staffId: "s2", role: "Cocina", task: "Cocina", pay: 20000 },
    { id: "as15", eventId: "e4", staffId: "s3", role: "Servicio", task: "Mesas", pay: 18000 },
  ];

  const events = [
    {
      id: "e1", clientId: "c1", name: "Cumpleaños de 70", date: "2026-08-30", guests: 45, status: "confirmado",
      menuId: "m1v1", señaDate: "2026-08-20", seña: 100000, confirmDate: "2026-08-20",
      notes: "Cumpleaños en el quincho de la familia. Confirmar cantidad final el 27/08.",
      modules: {
        entrada: { on: true, dishId: "d_emp1" },
        principal: { on: true, dishId: "d_pri1" },
        buffet: { on: false, recipeIds: [] },
        postre: { on: true, dishIds: ["d_pos1"] },
        trasnoche: { on: false, dishId: null },
      },
    },
    {
      id: "e2", clientId: "c2", name: "Casamiento", date: "2026-09-19", guests: 80, status: "tentativo",
      menuId: "m3v2", señaDate: "2026-08-24", seña: 150000, confirmDate: null,
      notes: "Salón en Pilar. Pendiente reservar mesa dulce vegana.",
      modules: {
        entrada: { on: true, dishId: "d_emp1" },
        principal: { on: true, dishId: "d_pri3" },
        buffet: { on: false, recipeIds: [] },
        postre: { on: true, dishIds: ["d_dul1", "d_dul2", "d_dul3", "d_pos3"] },
        trasnoche: { on: false, dishId: null },
      },
    },
    {
      id: "e3", clientId: "c3", name: "Cena de fin de año", date: "2026-09-05", guests: 60, status: "consulta",
      menuId: "m2v1", señaDate: "2026-08-26", seña: 100000, confirmDate: "2026-08-28",
      notes: "Esperando aprobación de comisión. Presupuesto enviado.",
      modules: {
        entrada: { on: false, dishId: null },
        principal: { on: false, dishId: null },
        buffet: { on: true, recipeIds: ["r_pollhorn", "r_bondiola", "r_ensmixta", "r_griega"] },
        postre: { on: true, dishIds: ["d_dul1", "d_dul4"] },
        trasnoche: { on: true, dishId: "d_tra1" },
      },
    },
    {
      id: "e4", clientId: "c4", name: "Bautismo", date: "2026-07-18", guests: 30, status: "cerrado",
      menuId: "m1v2", señaDate: "2026-06-20", seña: 80000, confirmDate: "2026-07-01",
      notes: "Evento finalizado. Cliente conforme, repite anualmente.",
      modules: {
        entrada: { on: true, dishId: "d_emp2" },
        principal: { on: true, dishId: "d_pri2" },
        buffet: { on: false, recipeIds: [] },
        postre: { on: true, dishIds: ["d_pos2"] },
        trasnoche: { on: false, dishId: null },
      },
    },
  ];

  const payments = [
    { id: "p1", eventId: "e1", concept: "Seña", amount: 100000, date: "2026-08-01" },
    { id: "p2", eventId: "e4", concept: "Seña", amount: 80000, date: "2026-06-22" },
    { id: "p3", eventId: "e4", concept: "Saldo", amount: 250000, date: "2026-07-10" },
  ];

  const settings = {
    señaReference: 100000,
    señaLabel: "1 tarjeta",
    buffetSafety: 0.25,
    buffetPriceMargin: 0.5,
    consumption: consumptionDefault,
    business: { name: "JAFET Eventos", phone: "911 555 0000", address: "Servicio de catering para eventos", instagram: "@jafeteventos" },
  };

  return {
    version: 3,
    ingredients,
    recipes,
    dishes,
    menus,
    clients,
    equipment,
    staff,
    assignments,
    events,
    payments,
    suppliers: Object.values(sup),
    settings,
  };
}
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
  return {
    version: 6,
    ingredients: [],
    recipes: [],
    dishes: [],
    menus: [],
    clients: [],
    equipment: [],
    staff: [],
    assignments: [],
    events: [],
    payments: [],
    suppliers: [],
    settings: {
      señaReference: 100000,
      señaLabel: "1 tarjeta",
      buffetSafety: 0.25,
      buffetPriceMargin: 0.5,
      consumption: consumptionDefault,
      business: { name: "JAFET Eventos", phone: "911 555 0000", address: "Servicio de catering para eventos", instagram: "@jafeteventos" },
    },
  };
}
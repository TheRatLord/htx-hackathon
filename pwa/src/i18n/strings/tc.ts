import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    tc: {
      title: "Transit center",
      bays: { one: "{count} bay", other: "{count} bays" },
      walkMin: "{min} min walk",
      findRoute: "Find your route",
      leavesFrom: "Route {route} leaves from Bay {bay}",
      leavesFromBays: "Route {route} leaves from {count} bays",
      bayLine: "{direction}: Bay {bay}",
      notPublished: "Route {route}: bay not published",
      next: "Next:",
      noDepartures: "No departures before {time}",
      noDeparturesYet: "No departures listed yet",
      byBay: "Departures by bay",
      bayHeader: "Bay {bay} · {platform}",
      bayNotPublished: "Bay not published",
      platformLabel: "{platform} · Stop #{id}",
      source: "Source: METRO Transit Data API",
      sourceDemo: "Source: METRO's printed transit center map",
    },
  },
  es: {
    tc: {
      title: "Centro de tránsito",
      bays: { one: "{count} andén", other: "{count} andenes" },
      walkMin: "{min} min a pie",
      findRoute: "Busque su ruta",
      leavesFrom: "La ruta {route} sale del andén {bay}",
      leavesFromBays: "La ruta {route} sale de {count} andenes",
      bayLine: "{direction}: andén {bay}",
      notPublished: "Ruta {route}: andén no publicado",
      next: "Próximos:",
      noDepartures: "No hay salidas antes de las {time}",
      noDeparturesYet: "Todavía no hay salidas en la lista",
      byBay: "Salidas por andén",
      bayHeader: "Andén {bay} · {platform}",
      bayNotPublished: "Andén no publicado",
      platformLabel: "{platform} · Parada #{id}",
      source: "Fuente: METRO Transit Data API",
      sourceDemo: "Fuente: mapa impreso del centro de tránsito de METRO",
    },
  },
};

export default strings;

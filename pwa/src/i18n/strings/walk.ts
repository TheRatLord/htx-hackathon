// Walk to a stop (D8).
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    walk: {
      title: "Walk to {stop}",
      titleFrom: "Walk from {from} to {stop}",
      titleTc: "Walk to {tc}, {platform} ({id})",
      summary: "{min} · {distance}",
      easyPace: "(about {min} min at an easy pace)",
      nextBus: "next bus: {time}.",
      nextOne: "The next one is {time}.",
      nextOneMin: "The next one is in {time}.",
      noBus: "No Route {route} bus in the next 2 hours.",
      atStop: "I'm at the stop",
      googleMaps: "Open in Google Maps ↗",
      googleMapsA11y: "Open in Google Maps (opens a new tab)",
      estimate: "Street-by-street directions are unavailable. Distance is an estimate.",
      needLocation: "Turn on location to get walking directions",
      needLocationBody: "We need to know where you are to show the way to this stop.",
      finding: "Finding your location…",
      offline: "Walking directions need a connection.",
      stepZoom: "Show this step on the map",
    },
  },
  es: {
    walk: {
      title: "Caminar a {stop}",
      titleFrom: "Caminar desde {from} a {stop}",
      titleTc: "Caminar a {tc}, {platform} ({id})",
      summary: "{min} · {distance}",
      easyPace: "(unos {min} min a paso tranquilo)",
      nextBus: "próximo autobús: {time}.",
      nextOne: "El siguiente es a las {time}.",
      nextOneMin: "El siguiente llega en {time}.",
      noBus: "No hay autobús de la ruta {route} en las próximas 2 horas.",
      atStop: "Ya estoy en la parada",
      googleMaps: "Abrir en Google Maps ↗",
      googleMapsA11y: "Abrir en Google Maps (abre una pestaña nueva)",
      estimate: "No hay indicaciones calle por calle. La distancia es aproximada.",
      needLocation: "Active la ubicación para ver cómo llegar a pie",
      needLocationBody: "Necesitamos saber dónde está para mostrarle el camino a esta parada.",
      finding: "Buscando su ubicación…",
      offline: "Las indicaciones a pie necesitan conexión.",
      stepZoom: "Ver este paso en el mapa",
    },
  },
};

export default strings;

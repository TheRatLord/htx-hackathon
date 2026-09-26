// Walk to a stop (D8).
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    walk: {
      title: "Walk to {stop}",
      titleFrom: "Walk from {from} to {stop}",
      titleTc: "Walk to {tc}, {platform} ({id})",
      easyPace: "(about {min} min at an easy pace)",
      nextBusIn: "Next bus in {time}",
      nextBusAt: "Next bus at {time}",
      nextBusNow: "Next bus is here now",
      nextOne: "The next one: {time}.",
      noBus: "No Route {route} bus in the next 3 hours.",
      nextBusError: "Next bus times can't be loaded right now.",
      atStop: "I'm at the stop",
      googleMaps: "Open in Google Maps ↗",
      googleMapsLink: "Open in Google Maps",
      newTab: "(opens a new tab)",
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
      easyPace: "(unos {min} min a paso tranquilo)",
      nextBusIn: "Próximo autobús en {time}",
      nextBusAt: "Próximo autobús a las {time}",
      nextBusNow: "El próximo autobús ya está aquí",
      nextOne: "El siguiente: {time}.",
      noBus: "No hay autobús de la ruta {route} en las próximas 3 horas.",
      nextBusError: "No se pueden cargar los próximos autobuses ahora.",
      atStop: "Ya estoy en la parada",
      googleMaps: "Abrir en Google Maps ↗",
      googleMapsLink: "Abrir en Google Maps",
      newTab: "(abre una pestaña nueva)",
      needLocation: "Active la ubicación para ver cómo llegar a pie",
      needLocationBody: "Necesitamos saber dónde está para mostrarle el camino a esta parada.",
      finding: "Buscando su ubicación…",
      offline: "Las indicaciones a pie necesitan conexión.",
      stepZoom: "Ver este paso en el mapa",
    },
  },
};

export default strings;

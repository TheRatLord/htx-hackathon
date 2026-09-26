// Explore home: Nearby (D2), Route near you (D3), Stops near a place (D4).
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    home: {
      title: "Nearby stops",
      finding: "Finding stops near you…",
      nearPlace: "Stops near {place}",
      backToMe: "Back to my location",
      chipLabel: "Your route? Tap it:",
      chipGroup: "Routes near you",
      footerPace: "Walk times are estimates at a normal pace. Change the pace in More › Settings.",
      lateNight: "Late night: few or no buses in the next 2 hours. Tap a stop for its next bus.",
      noneWithin: "No stops within a 10-minute walk",
      nearestFar: "The closest stops are a longer walk:",
      planTrip: "Plan Trip",
      loadError: "We couldn't load stops near you.",
      // D4 cards: "walk from there" (a landmark's curated short name will replace it).
      walkFromThere: "from there",
      route: {
        title: "Route {name} near you",
        seeAll: "See all Route {name} stops ›",
        notClose: "Route {name} doesn't stop within a 10-minute walk. The closest stop is {stop}, {min} min walk.",
      },
    },
  },
  es: {
    home: {
      title: "Paradas cercanas",
      finding: "Buscando paradas cerca de usted…",
      nearPlace: "Paradas cerca de {place}",
      backToMe: "Volver a mi ubicación",
      chipLabel: "¿Su ruta? Tóquela:",
      chipGroup: "Rutas cerca de usted",
      footerPace: "Los tiempos a pie son aproximados, a paso normal. Cambie el paso en Más › Configuración.",
      lateNight: "Es tarde: hay pocos o ningún autobús en las próximas 2 horas. Toque una parada para ver su próximo autobús.",
      noneWithin: "No hay paradas a menos de 10 minutos a pie",
      nearestFar: "Las paradas más cercanas quedan más lejos:",
      planTrip: "Planear viaje",
      loadError: "No pudimos cargar las paradas cercanas.",
      walkFromThere: "desde allí",
      route: {
        title: "Ruta {name} cerca de usted",
        seeAll: "Ver todas las paradas de la ruta {name} ›",
        notClose: "La ruta {name} no para a menos de 10 minutos a pie. La parada más cercana es {stop}, a {min} min a pie.",
      },
    },
  },
};

export default strings;

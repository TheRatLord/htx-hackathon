// Explore home: Nearby (D2), Route near you (D3), Stops near a place (D4).
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    home: {
      title: "Nearby stops",
      titleOff: "Find your stop",
      finding: "Finding stops near you…",
      nearPlace: "Stops near {place}",
      // D4: an overline above the place name, so the title is the name alone.
      stopsNear: "Stops near",
      backToMe: "Back to my location",
      // D4: the short link on the overline row; its spoken name is backToMe.
      myLocation: "My location",
      chipLabel: "Routes here:",
      chipGroup: "Routes near you",
      footerPace: "Walk times are estimates at a normal pace. Change the pace in More › Settings.",
      lateNight: "Late night: few or no buses in the next 2 hours. Tap a stop for its next bus.",
      noneWithin: "No stops within a 10-minute walk",
      fartherAway: "Farther away",
      nearestFar: "The closest stops are a longer walk:",
      planTrip: "Plan Trip",
      loadError: "We couldn't load stops near you.",
      // D4 cards: "4 min walk from the museum". A landmark's category names it; others say "from there".
      walkFromThere: "from there",
      // D4, under the place name: "Walk times from the museum".
      walkTimesFrom: "Walk times {from}",
      walkFromKind: {
        airport: "from the airport",
        university: "from campus",
        museum: "from the museum",
        park: "from the park",
        medical: "from the medical center",
        shopping: "from the shops",
        venue: "from the venue",
      },
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
      titleOff: "Encuentre su parada",
      finding: "Buscando paradas cerca de usted…",
      nearPlace: "Paradas cerca de {place}",
      stopsNear: "Paradas cerca de",
      backToMe: "Volver a mi ubicación",
      myLocation: "Mi ubicación",
      chipLabel: "Rutas aquí:",
      chipGroup: "Rutas cerca de usted",
      footerPace: "Los tiempos a pie son aproximados, a paso normal. Cambie el paso en Más › Configuración.",
      lateNight: "Es tarde: hay pocos o ningún autobús en las próximas 2 horas. Toque una parada para ver su próximo autobús.",
      noneWithin: "No hay paradas a menos de 10 minutos a pie",
      fartherAway: "Más lejos",
      nearestFar: "Las paradas más cercanas quedan más lejos:",
      planTrip: "Planear viaje",
      loadError: "No pudimos cargar las paradas cercanas.",
      walkFromThere: "desde allí",
      walkTimesFrom: "Tiempos a pie {from}",
      walkFromKind: {
        airport: "desde el aeropuerto",
        university: "desde el campus",
        museum: "desde el museo",
        park: "desde el parque",
        medical: "desde el centro médico",
        shopping: "desde las tiendas",
        venue: "desde el lugar",
      },
      route: {
        title: "Ruta {name} cerca de usted",
        seeAll: "Ver todas las paradas de la ruta {name} ›",
        notClose: "La ruta {name} no para a menos de 10 minutos a pie. La parada más cercana es {stop}, a {min} min a pie.",
      },
    },
  },
};

export default strings;

// Stop sheet (D6) and Full Schedule (D7).
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    stop: {
      fallbackTitle: "Stop #{id}",
      partOf: "Part of {tc}",
      savedToast: "Saved. It will show at the top of Explore.",
      removedToast: "Removed from saved.",
      saveA11y: "Save stop {id}",
      fullSchedule: "Full Schedule",
      track: "Track Bus Stop",
      tracking: "Tracking Route {name}",
      trackNote: "Works while this screen is open.",
      trackToast: "Route {name} is 5 min away",
      trackBody: "{headsign} · {stop}",
      openRoute: "Open Route {name}",
      liveUnavailable: "Live times unavailable. Showing scheduled times.",
      searchInstead: "Search",
      routes: "Routes at this stop",
      schedule: {
        title: "Full Schedule",
        at: "at {stop}",
        today: "Today, {date}",
        now: "Now",
        empty: "No Route {name} trips from this stop today.",
        next: "Next trip: {when}.",
      },
    },
  },
  es: {
    stop: {
      fallbackTitle: "Parada #{id}",
      partOf: "Parte de {tc}",
      savedToast: "Guardada. Aparecerá arriba en Explorar.",
      removedToast: "Se quitó de guardadas.",
      saveA11y: "Guardar la parada {id}",
      fullSchedule: "Horario completo",
      track: "Seguir parada",
      tracking: "Siguiendo la ruta {name}",
      trackNote: "Funciona mientras esta pantalla esté abierta.",
      trackToast: "La ruta {name} llega en 5 min",
      trackBody: "{headsign} · {stop}",
      openRoute: "Abrir la ruta {name}",
      liveUnavailable: "Las horas en vivo no están disponibles. Se muestran las horas programadas.",
      searchInstead: "Buscar",
      routes: "Rutas en esta parada",
      schedule: {
        title: "Horario completo",
        at: "en {stop}",
        today: "Hoy, {date}",
        now: "Ahora",
        empty: "No hay viajes de la ruta {name} desde esta parada hoy.",
        next: "Próximo viaje: {when}.",
      },
    },
  },
};

export default strings;

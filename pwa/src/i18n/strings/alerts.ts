// D14 Service Alerts, D15 Alert detail.
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    alerts: {
      title: "Service Alerts",
      titleRoute: "Alerts for Route {route}",
      filterLabel: "Show alerts for",
      mine: "My routes",
      all: "All routes",
      noneMine: "No alerts for your routes: {routes}",
      noMyRoutes: "You have no routes yet. Save a stop, or look at stops near you, and its routes appear here.",
      noneOther: "No alerts for your other routes: {routes}",
      noneAll: "No active METRO alerts right now",
      demoCaption: "Demo alerts only",
      sourceMetro: "Source: METRO",
      sourceDemo: "Demo alerts only (offline demo). These are not real METRO alerts.",
      routeName: "Route {route}",
      detailTitle: "Service alert",
      affectedRoutes: "Affected routes",
      affectedStops: "Affected stops",
      goneTitle: "Alert not found",
      gone: "This alert has ended or no longer exists.",
      allAlerts: "Service Alerts",
    },
  },
  es: {
    alerts: {
      title: "Alertas de servicio",
      titleRoute: "Alertas de la ruta {route}",
      filterLabel: "Ver alertas de",
      mine: "Mis rutas",
      all: "Todas las rutas",
      noneMine: "No hay alertas para sus rutas: {routes}",
      noMyRoutes: "Todavía no tiene rutas. Guarde una parada o vea las paradas cercanas, y sus rutas aparecerán aquí.",
      noneOther: "No hay alertas para sus otras rutas: {routes}",
      noneAll: "No hay alertas activas de METRO en este momento",
      demoCaption: "Solo alertas de demostración",
      sourceMetro: "Fuente: METRO",
      sourceDemo: "Solo alertas de demostración (demo sin conexión). No son alertas reales de METRO.",
      routeName: "Ruta {route}",
      detailTitle: "Alerta de servicio",
      affectedRoutes: "Rutas afectadas",
      affectedStops: "Paradas afectadas",
      goneTitle: "Alerta no encontrada",
      gone: "Esta alerta terminó o ya no existe.",
      allAlerts: "Alertas de servicio",
    },
  },
};

export default strings;

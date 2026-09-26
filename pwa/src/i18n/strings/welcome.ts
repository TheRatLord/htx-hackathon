// D1 Welcome.
import type { Strings } from "../index.ts";

const strings: Strings = {
  en: {
    welcome: {
      pageTitle: "Welcome",
      title: "Welcome to RideMETRO",
      body: "See the next bus at the stops closest to you. We use your location only while the app is open.",
      language: "Language",
      textSize: "Text size",
      sizeStandard: "Standard",
      sizeLarge: "Large",
      sizeXlarge: "Extra large",
      showStops: "Show stops near me",
      asking: "Waiting for your answer to the location question…",
      notNow: "Not now, I'll search",
    },
  },
  es: {
    welcome: {
      pageTitle: "Bienvenida",
      title: "Bienvenido a RideMETRO",
      body: "Vea el próximo autobús en las paradas más cercanas. Usamos su ubicación solo mientras la app está abierta.",
      language: "Idioma",
      textSize: "Tamaño del texto",
      sizeStandard: "Normal",
      sizeLarge: "Grande",
      sizeXlarge: "Muy grande",
      showStops: "Ver paradas cercanas",
      asking: "Esperando su respuesta sobre la ubicación…",
      notNow: "Ahora no, voy a buscar",
    },
  },
};

export default strings;

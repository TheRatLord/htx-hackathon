// The URL contract (spec G.3). Module agents fill their screen files; they never edit this file.

import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import Home from "../screens/explore/home/Home.tsx";
import Search from "../screens/explore/search/Search.tsx";
import StopSheet from "../screens/explore/stop/StopSheet.tsx";
import Fares from "../screens/fares/Fares.tsx";
import More from "../screens/more/More.tsx";
import NotFound from "../screens/more/NotFound.tsx";
import Recent from "../screens/recent/Recent.tsx";
import Welcome from "../screens/welcome/Welcome.tsx";
import { AppShell } from "./AppShell.tsx";
import { WelcomeGuard } from "./guards.tsx";
import { ExploreLayout } from "./layouts/ExploreLayout.tsx";
import { PageLayout } from "./layouts/PageLayout.tsx";
import { TabLayout } from "./layouts/TabLayout.tsx";

/**
 * A route whose screen loads on first visit (its own chunk; the service worker precaches every
 * chunk, so it still opens offline). The router waits for it before it commits the navigation,
 * so no blank frame and the title focus still lands. Home, Search, Stop, Fares, Recent, More and
 * Welcome stay in the first chunk: they are the first screens riders open.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

// The component gallery exists in dev builds only.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: "/dev/ui", lazy: async () => ({ Component: (await import("../screens/dev/UiGallery.tsx")).default }) }]
  : [];

export const router = createBrowserRouter([
  {
    element: (
      <WelcomeGuard>
        <AppShell />
      </WelcomeGuard>
    ),
    children: [
      { path: "/", element: <Navigate to="/explore" replace /> },
      { path: "/welcome", element: <Welcome /> },
      {
        path: "/explore",
        element: <ExploreLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: "search", element: <Search /> },
          { path: "stop/:stopId", element: <StopSheet /> },
          { path: "stop/:stopId/walk", lazy: page(() => import("../screens/explore/walk/Walk.tsx")) },
          { path: "plan", lazy: page(() => import("../screens/explore/plan/Plan.tsx")) },
          { path: "plan/:index", lazy: page(() => import("../screens/explore/plan/Itinerary.tsx")) },
          { path: "trip", lazy: page(() => import("../screens/explore/trip/LiveTrip.tsx")) },
        ],
      },
      {
        element: <PageLayout />,
        children: [
          { path: "/explore/stop/:stopId/schedule", lazy: page(() => import("../screens/explore/stop/FullSchedule.tsx")) },
          { path: "/explore/route/:routeId", lazy: page(() => import("../screens/explore/route/RoutePage.tsx")) },
          { path: "/explore/tc/:tcId", lazy: page(() => import("../screens/explore/tc/TransitCenter.tsx")) },
          { path: "/more/alerts", lazy: page(() => import("../screens/alerts/Alerts.tsx")) },
          { path: "/more/alerts/:alertId", lazy: page(() => import("../screens/alerts/AlertDetail.tsx")) },
          { path: "/more/settings", lazy: page(() => import("../screens/more/Settings.tsx")) },
          { path: "/more/routes", lazy: page(() => import("../screens/more/routes/RouteList.tsx")) },
          { path: "/more/about", lazy: page(() => import("../screens/more/About.tsx")) },
          { path: "/fares/ticket", lazy: page(() => import("../screens/fares/Ticket.tsx")) },
        ],
      },
      {
        element: <TabLayout />,
        children: [
          { path: "/fares", element: <Fares /> },
          { path: "/recent", element: <Recent /> },
          { path: "/more", element: <More /> },
          ...devRoutes,
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);

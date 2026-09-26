// The URL contract (spec G.3). Module agents fill their screen files; they never edit this file.

import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import AlertDetail from "../screens/alerts/AlertDetail.tsx";
import Alerts from "../screens/alerts/Alerts.tsx";
import Home from "../screens/explore/home/Home.tsx";
import Itinerary from "../screens/explore/plan/Itinerary.tsx";
import Plan from "../screens/explore/plan/Plan.tsx";
import RoutePage from "../screens/explore/route/RoutePage.tsx";
import Search from "../screens/explore/search/Search.tsx";
import FullSchedule from "../screens/explore/stop/FullSchedule.tsx";
import StopSheet from "../screens/explore/stop/StopSheet.tsx";
import TransitCenter from "../screens/explore/tc/TransitCenter.tsx";
import LiveTrip from "../screens/explore/trip/LiveTrip.tsx";
import Walk from "../screens/explore/walk/Walk.tsx";
import Fares from "../screens/fares/Fares.tsx";
import About from "../screens/more/About.tsx";
import More from "../screens/more/More.tsx";
import NotFound from "../screens/more/NotFound.tsx";
import RouteList from "../screens/more/routes/RouteList.tsx";
import Settings from "../screens/more/Settings.tsx";
import Recent from "../screens/recent/Recent.tsx";
import Welcome from "../screens/welcome/Welcome.tsx";
import { AppShell } from "./AppShell.tsx";
import { WelcomeGuard } from "./guards.tsx";
import { ExploreLayout } from "./layouts/ExploreLayout.tsx";
import { PageLayout } from "./layouts/PageLayout.tsx";
import { TabLayout } from "./layouts/TabLayout.tsx";

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
          { path: "stop/:stopId/walk", element: <Walk /> },
          { path: "plan", element: <Plan /> },
          { path: "plan/:index", element: <Itinerary /> },
          { path: "trip", element: <LiveTrip /> },
        ],
      },
      {
        element: <PageLayout />,
        children: [
          { path: "/explore/stop/:stopId/schedule", element: <FullSchedule /> },
          { path: "/explore/route/:routeId", element: <RoutePage /> },
          { path: "/explore/tc/:tcId", element: <TransitCenter /> },
          { path: "/more/alerts", element: <Alerts /> },
          { path: "/more/alerts/:alertId", element: <AlertDetail /> },
          { path: "/more/settings", element: <Settings /> },
          { path: "/more/routes", element: <RouteList /> },
          { path: "/more/about", element: <About /> },
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

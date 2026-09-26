import { MapView } from '../map/MapView';
import { MapSceneProvider } from '../map/scene';
import { TabBar } from '../components/TabBar';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SearchScreen } from '../screens/Search/SearchScreen';
import { RouteOptionsScreen } from '../screens/Routes/RouteOptionsScreen';
import { TripScreen } from '../screens/Trip/TripScreen';
import { StopScreen } from '../screens/Stop/StopScreen';
import { FaresScreen } from '../screens/Fares/FaresScreen';
import { RecentScreen } from '../screens/Recent/RecentScreen';
import { MoreScreen } from '../screens/More/MoreScreen';
import { RouterProvider, useRouter, type Route } from './router';
import { StoreProvider } from './store';
import './App.css';

/** Screens that show the floating tab bar. */
function showsTabBar(route: Route): boolean {
  return route.name === 'home' || route.name === 'fares' || route.name === 'recent' || route.name === 'more';
}

function Screen() {
  const { route } = useRouter();
  switch (route.name) {
    case 'home':
      return <HomeScreen sheet={route.sheet} />;
    case 'search':
      return <SearchScreen />;
    case 'routes':
      return <RouteOptionsScreen key={route.placeId} placeId={route.placeId} />;
    case 'trip':
      return <TripScreen key={`${route.placeId}/${route.optionId}`} placeId={route.placeId} optionId={route.optionId} />;
    case 'stop':
      return <StopScreen key={route.stopId} stopId={route.stopId} />;
    case 'fares':
      return <FaresScreen />;
    case 'recent':
      return <RecentScreen />;
    case 'more':
      return <MoreScreen />;
  }
}

function Shell() {
  const { route } = useRouter();
  return (
    <div className="app" data-screen={route.name}>
      <MapView />
      <div className="app__screen">
        <Screen />
      </div>
      {showsTabBar(route) && <TabBar />}
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <RouterProvider>
        <MapSceneProvider>
          <Shell />
        </MapSceneProvider>
      </RouterProvider>
    </StoreProvider>
  );
}

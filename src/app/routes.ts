import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { HomeScreen } from './components/HomeScreen';
import { ComparisonScreen } from './components/ComparisonScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { EditProfileScreen } from './components/EditProfileScreen';
import { RouteDetailScreen } from './components/RouteDetailScreen';
import { CheckpointScreen } from './components/CheckpointScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'compare', Component: ComparisonScreen },
      { path: 'profile', Component: ProfileScreen },
      { path: 'edit-profile', Component: EditProfileScreen },
      { path: 'route-detail', Component: RouteDetailScreen },
      { path: 'checkpoint', Component: CheckpointScreen },
    ],
  },
]);

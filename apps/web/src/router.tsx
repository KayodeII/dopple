import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
} from 'react-router';
import { Shell } from './components/Shell';
import { Loading } from './components/ui';
import { isStaff, useSession, useUser } from './lib/session';
import { ClassPage } from './pages/ClassPage';
import { Classes } from './pages/Classes';
import { Home } from './pages/Home';
import { MyTimetable } from './pages/MyTimetable';
import { NotFound, StaffOnly } from './pages/NotFound';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { Student } from './pages/Student';
import { Students } from './pages/Students';

/** Everything except sign-in needs a session; signed-out visitors are sent to sign in and back. */
function RequireSession() {
  const { state } = useSession();
  const location = useLocation();
  if (state.status === 'loading') {
    return (
      <main className="p-8">
        <Loading />
      </main>
    );
  }
  if (state.status === 'signed-out') {
    const next = location.pathname + location.search;
    return (
      <Navigate
        to={
          next === '/'
            ? '/sign-in'
            : `/sign-in?next=${encodeURIComponent(next)}`
        }
        replace
      />
    );
  }
  return <Shell />;
}

function RequireStaff() {
  return isStaff(useUser()) ? <Outlet /> : <StaffOnly />;
}

function RequireAdmin() {
  return useUser().role === 'admin' ? <Outlet /> : <StaffOnly />;
}

export const router = createBrowserRouter([
  { path: '/sign-in', Component: SignIn },
  {
    Component: RequireSession,
    children: [
      { index: true, Component: Home },
      { path: 'timetable', Component: MyTimetable },
      {
        Component: RequireStaff,
        children: [
          { path: 'students', Component: Students },
          { path: 'students/:id', Component: Student },
          { path: 'classes', Component: Classes },
          { path: 'classes/:id', Component: ClassPage },
        ],
      },
      {
        Component: RequireAdmin,
        children: [{ path: 'settings', Component: Settings }],
      },
      { path: '*', Component: NotFound },
    ],
  },
]);

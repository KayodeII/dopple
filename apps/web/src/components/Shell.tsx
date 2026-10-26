import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useSchool } from '../lib/queries';
import { isStaff, useSession, useUser } from '../lib/session';
import { SchoolBadge } from './SchoolTheme';
import { initials } from './ui';

const ROLE_LABEL = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

/** The signed-in layout from the design canvas: school and navigation on the left, the page on the right. */
export function Shell() {
  const user = useUser();
  const { signOut } = useSession();
  const school = useSchool().data;

  const links = [
    { to: '/', label: 'Home', icon: homeIcon, show: true },
    { to: '/timetable', label: 'Timetable', icon: clockIcon, show: true },
    {
      to: '/students',
      label: 'Students',
      icon: peopleIcon,
      show: isStaff(user),
    },
    { to: '/classes', label: 'Classes', icon: classIcon, show: isStaff(user) },
    {
      to: '/fees',
      label: 'Fees',
      icon: feesIcon,
      show: user.role !== 'teacher',
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: settingsIcon,
      show: true,
    },
  ].filter((link) => link.show);

  return (
    <div className="flex min-h-screen flex-wrap content-start bg-ground">
      <SchoolStripe />
      <aside className="flex max-w-full flex-[1_1_240px] flex-col gap-7 border-edge px-4 py-6 md:sticky md:top-0 md:h-screen md:max-w-[280px] md:border-r">
        <div className="flex items-center gap-3 px-2">
          <SchoolBadge size="sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold">
              {school?.name ?? ' '}
            </span>
            <span className="truncate font-mono text-[11.5px] text-fg-3">
              {window.location.hostname}
            </span>
          </div>
        </div>

        <nav
          aria-label="Main"
          className="flex flex-row flex-wrap gap-1 text-[15px] md:flex-col"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 ${
                  isActive
                    ? 'bg-raised font-semibold text-fg before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-accent'
                    : 'text-fg-2 hover:bg-card'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 rounded-xl bg-card p-3 md:mt-auto">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-seafoam font-semibold text-ink"
          >
            {initials(user.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="text-[12.5px] text-fg-3">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 rounded-lg px-2 text-[13px] text-fg-2 hover:bg-raised"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-10 px-[clamp(16px,3vw,40px)] pt-8 pb-12">
        <Outlet />
      </main>
    </div>
  );
}

/** The school's colours as a thin band across the top: main, then accent. */
function SchoolStripe() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-1"
    >
      <span className="flex-[2] bg-school" />
      <span className="flex-1 bg-accent" />
    </div>
  );
}

const icon = (path: ReactNode) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);
const homeIcon = icon(<path d="M3 8l6-5 6 5v7H3V8z" />);
const clockIcon = icon(
  <>
    <circle cx="9" cy="9" r="6.5" />
    <path d="M9 5.5V9l2.5 1.5" />
  </>,
);
const peopleIcon = icon(
  <>
    <circle cx="6.5" cy="6" r="2.5" />
    <path d="M2 15c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M12 3.5a2.5 2.5 0 010 5M13 11c1.8.4 3 1.8 3 4" />
  </>,
);
const settingsIcon = icon(
  <>
    <circle cx="9" cy="9" r="2.5" />
    <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.5 1.5M12.5 12.5L14 14M4 14l1.5-1.5M12.5 5.5L14 4" />
  </>,
);
const feesIcon = icon(
  <>
    <rect x="2" y="4.5" width="14" height="9" rx="1.5" />
    <circle cx="9" cy="9" r="1.75" />
    <path d="M4.5 7v4M13.5 7v4" />
  </>,
);
const classIcon = icon(
  <>
    <rect x="2.5" y="2.5" width="5" height="13" rx="1.5" />
    <rect x="10.5" y="2.5" width="5" height="13" rx="1.5" />
  </>,
);

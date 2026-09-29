import { NavLink, Outlet } from 'react-router-dom';

const navigationItems = [
  { to: '/', label: '홈', end: true },
  { to: '/expenses', label: '지출내역', end: false },
  { to: '/statistics', label: '통계', end: false },
  { to: '/settings', label: '설정', end: false },
] as const;

export function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-navigation" aria-label="주요 메뉴">
        {navigationItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            className={({ isActive }) =>
              `bottom-navigation__item${isActive ? ' bottom-navigation__item--active' : ''}`
            }
            end={end}
            to={to}
          >
            <span className="bottom-navigation__indicator" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

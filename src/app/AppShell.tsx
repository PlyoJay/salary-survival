import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const navigationItems = [
  { to: '/', label: '홈', end: true },
  { to: '/expenses', label: '지출내역', end: false },
  { to: '/statistics', label: '통계', end: false },
  { to: '/settings', label: '설정', end: false },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let fullHeight = window.innerHeight;
    const update = () => {
      const focused = document.activeElement?.matches('input, select, textarea') === true;
      if (!focused) fullHeight = window.innerHeight;
      setKeyboardOpen(Math.max(fullHeight, window.innerHeight) - viewport.height > 150 && focused);
    };
    viewport.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return (
    <div className={`app-shell${keyboardOpen ? ' app-shell--keyboard' : ''}`}>
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

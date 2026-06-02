import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import PropertiesList from './pages/PropertiesList';
import PropertyDetail from './pages/PropertyDetail';
import PropertyForm from './pages/PropertyForm';
import PropertyDocuments from './pages/PropertyDocuments';
import ChecklistManager from './pages/ChecklistManager';
import Comparativa from './pages/Comparativa';
import './styles/global.css';

const NAV_LINKS = [
  { to: '/', label: 'Casas', end: true },
  { to: '/checklist', label: 'Checklist', end: false },
  { to: '/comparativa', label: 'Comparativa', end: false },
];

function AppHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const close = () => setOpen(false);
  const activeClass = (isActive: boolean) =>
    isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link';

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <>
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="brand" onClick={close}>
            <img src="/favicon.svg" alt="" className="brand__mark" width="28" height="28" />
            Casa Chinitos
          </Link>

          {/* Desktop nav */}
          <nav className="app-nav">
            {NAV_LINKS.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => activeClass(isActive)}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Hamburger — mobile only */}
          <button className="hamburger" aria-label="Menú" aria-expanded={open}
            onClick={() => setOpen(o => !o)}>
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile nav backdrop */}
      {open && <div className="nav-mobile__backdrop" onClick={close} />}

      {/* Mobile nav panel */}
      <nav className={`nav-mobile${open ? ' is-open' : ''}`} aria-hidden={!open}>
        {NAV_LINKS.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end} onClick={close}
            className={({ isActive }) =>
              isActive ? 'nav-mobile__link nav-mobile__link--active' : 'nav-mobile__link'}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/" element={<PropertiesList />} />
          <Route path="/property/new" element={<PropertyForm />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/property/:id/edit" element={<PropertyForm />} />
          <Route path="/property/:id/documents" element={<PropertyDocuments />} />
          <Route path="/checklist" element={<ChecklistManager />} />
          <Route path="/comparativa" element={<Comparativa />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;

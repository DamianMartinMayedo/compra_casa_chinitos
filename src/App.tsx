import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import PropertiesList from './pages/PropertiesList';
import PropertyDetail from './pages/PropertyDetail';
import PropertyForm from './pages/PropertyForm';
import PropertyDocuments from './pages/PropertyDocuments';
import ChecklistManager from './pages/ChecklistManager';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" className="brand__mark" width="28" height="28" />
            Casa Chinitos
          </Link>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link')}>
              Casas
            </NavLink>
            <NavLink to="/checklist" className={({ isActive }) => (isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link')}>
              Checklist
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<PropertiesList />} />
          <Route path="/property/new" element={<PropertyForm />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/property/:id/edit" element={<PropertyForm />} />
          <Route path="/property/:id/documents" element={<PropertyDocuments />} />
          <Route path="/checklist" element={<ChecklistManager />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Property {
  id: string;
  name: string;
  google_address: string;
  price_eur: number;
  municipality: string;
  type: string;
  built_area_m2: number;
  bedrooms: number;
  bathrooms: number;
  budget_min_eur: number;
  budget_max_eur: number;
}

type SortKey = 'name' | 'type' | 'price_eur' | 'built_area_m2' | 'bedrooms' | 'bathrooms' | 'budget';
type SortDir = 'asc' | 'desc';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const formatK = (n: number) =>
  new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 0 }).format(n) + ' €';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ opacity: 0.35 }}>
        <path d="M4 5.5l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 8.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      {dir === 'asc' ? (
        <path d="M4 8.5l3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      ) : (
        <path d="M4 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      )}
    </svg>
  );
}

function PropertiesList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...properties].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name, 'es'); break;
      case 'type': cmp = (a.type || '').localeCompare(b.type || '', 'es'); break;
      case 'price_eur': cmp = a.price_eur - b.price_eur; break;
      case 'built_area_m2': cmp = (a.built_area_m2 ?? 0) - (b.built_area_m2 ?? 0); break;
      case 'bedrooms': cmp = (a.bedrooms ?? 0) - (b.bedrooms ?? 0); break;
      case 'bathrooms': cmp = (a.bathrooms ?? 0) - (b.bathrooms ?? 0); break;
      case 'budget': cmp = (a.budget_min_eur ?? 0) - (b.budget_min_eur ?? 0); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  useEffect(() => {
    fetch('/api/properties')
      .then(res => {
        if (!res.ok) throw new Error('No se pudieron cargar las viviendas');
        return res.json();
      })
      .then(data => { setProperties(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (error) {
    return <div className="container page"><div className="error">{error}</div></div>;
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Casas en estudio</h1>
          <p className="page-head__sub">
            {loading ? 'Cargando…' : `${properties.length} ${properties.length === 1 ? 'casa' : 'casas'} en seguimiento`}
          </p>
        </div>
        <Link to="/property/new" className="btn btn-primary">+ Nueva casa</Link>
      </div>

      {loading ? (
        <div className="dtable">
          <div className="dtable__head">
            <span>Casa</span><span className="col-sec">Tipo</span><span>Precio</span>
            <span className="col-sec">Sup.</span><span className="col-sec">Hab.</span>
            <span className="col-sec">Baños</span><span className="col-sec">Reforma</span>
          </div>
          {[0, 1, 2].map(i => (
            <div className="dtable__row" key={i}>
              <span className="skeleton skeleton-line" style={{ width: '70%' }} />
              <span className="col-sec skeleton skeleton-line" style={{ width: '60%' }} />
              <span className="skeleton skeleton-line" style={{ width: '50%' }} />
              <span className="col-sec" /><span className="col-sec" /><span className="col-sec" /><span className="col-sec" />
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">Aún no hay casas</div>
          <p style={{ margin: '0 auto 1.25rem' }}>Da de alta la primera casa que estés mirando en Idealista o Fotocasa.</p>
          <Link to="/property/new" className="btn btn-primary">+ Nueva casa</Link>
        </div>
      ) : (
        <div className="dtable" role="table">
          <div className="dtable__head" role="row">
            <span role="columnheader" className="sort-header" onClick={() => handleSort('name')} title="Ordenar por nombre">
              Casa <SortIcon active={sortKey === 'name'} dir={sortDir} />
            </span>
            <span className="col-sec" role="columnheader" onClick={() => handleSort('type')} title="Ordenar por tipo">
              Tipo <SortIcon active={sortKey === 'type'} dir={sortDir} />
            </span>
            <span className="num sort-header" role="columnheader" onClick={() => handleSort('price_eur')} title="Ordenar por precio">
              Precio <SortIcon active={sortKey === 'price_eur'} dir={sortDir} />
            </span>
            <span className="col-sec num sort-header" role="columnheader" onClick={() => handleSort('built_area_m2')} title="Ordenar por superficie">
              Sup. <SortIcon active={sortKey === 'built_area_m2'} dir={sortDir} />
            </span>
            <span className="col-sec num sort-header" role="columnheader" onClick={() => handleSort('bedrooms')} title="Ordenar por habitaciones">
              Hab. <SortIcon active={sortKey === 'bedrooms'} dir={sortDir} />
            </span>
            <span className="col-sec num sort-header" role="columnheader" onClick={() => handleSort('bathrooms')} title="Ordenar por baños">
              Baños <SortIcon active={sortKey === 'bathrooms'} dir={sortDir} />
            </span>
            <span className="col-sec num sort-header" role="columnheader" onClick={() => handleSort('budget')} title="Ordenar por reforma">
              Reforma <SortIcon active={sortKey === 'budget'} dir={sortDir} />
            </span>
          </div>
          {sorted.map(property => (
            <Link key={property.id} to={`/property/${property.id}`} className="dtable__row" role="row">
              <span className="dtable__name" title={property.name}>{property.name}</span>
              <span className="col-sec">
                <span className="badge badge-neutral">{property.type || '—'}</span>
              </span>
              <span className="num price">{formatPrice(property.price_eur)}</span>
              <span className="col-sec num tabular">{property.built_area_m2 != null ? `${property.built_area_m2} m²` : '—'}</span>
              <span className="col-sec num tabular">{property.bedrooms ?? '—'}</span>
              <span className="col-sec num tabular">{property.bathrooms ?? '—'}</span>
              <span className="col-sec num tabular text-muted">
                {property.budget_min_eur != null && property.budget_max_eur != null
                  ? `${formatK(property.budget_min_eur)}–${formatK(property.budget_max_eur)}`
                  : '—'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default PropertiesList;

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { STATUS_META, STATUS_ORDER, formatVisitDate, formatVisitTime, type PropertyStatus } from '../status';
import ConfirmDialog from '../components/ConfirmDialog';

interface Property {
  id: string;
  name: string;
  google_address: string;
  price_eur: number | null;
  municipality: string;
  type: string;
  built_area_m2: number;
  bedrooms: number;
  bathrooms: number;
  budget_min_eur: number;
  budget_max_eur: number;
  status: PropertyStatus;
  visit_date: string | null;
  visit_time: string | null;
}

type SortKey = 'name' | 'type' | 'price_eur' | 'built_area_m2' | 'bedrooms' | 'bathrooms' | 'visit_date';
type SortDir = 'asc' | 'desc';

const formatPrice = (price: number | null) =>
  price == null
    ? '—'
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);


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
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus>('por_visitar');

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchDelete, setShowBatchDelete] = useState(false);

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelection = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelectedIds(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(p => p.id)));

  const batchPatch = async (patch: Partial<Pick<Property, 'status'>>) => {
    setBatchLoading(true);
    await Promise.all([...selectedIds].map(id =>
      fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    ));
    setProperties(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, ...patch } : p));
    clearSelection();
    setBatchLoading(false);
  };

  const batchDelete = async () => {
    setShowBatchDelete(false);
    setBatchLoading(true);
    await Promise.all([...selectedIds].map(id => fetch(`/api/properties/${id}`, { method: 'DELETE' })));
    setProperties(prev => prev.filter(p => !selectedIds.has(p.id)));
    clearSelection();
    setBatchLoading(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Auto-sort by visit date when on the Por visitar tab
  useEffect(() => {
    if (statusFilter === 'por_visitar') {
      setSortKey('visit_date');
      setSortDir('asc');
    } else {
      setSortKey('name');
      setSortDir('asc');
    }
    clearSelection();
  }, [statusFilter]);

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = properties.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<PropertyStatus, number>);

  const sorted = [...properties].filter(p => p.status === statusFilter).sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name, 'es'); break;
      case 'type': cmp = (a.type || '').localeCompare(b.type || '', 'es'); break;
      case 'price_eur': cmp = (a.price_eur ?? 0) - (b.price_eur ?? 0); break;
      case 'built_area_m2': cmp = (a.built_area_m2 ?? 0) - (b.built_area_m2 ?? 0); break;
      case 'bedrooms': cmp = (a.bedrooms ?? 0) - (b.bedrooms ?? 0); break;
      case 'bathrooms': cmp = (a.bathrooms ?? 0) - (b.bathrooms ?? 0); break;
      case 'visit_date': {
        // nulls last; combine date+time for full comparison
        const aKey = a.visit_date ? a.visit_date + (a.visit_time ?? '') : '9999';
        const bKey = b.visit_date ? b.visit_date + (b.visit_time ?? '') : '9999';
        cmp = aKey.localeCompare(bKey);
        break;
      }
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  useEffect(() => {
    fetch('/api/properties')
      .then(res => { if (!res.ok) throw new Error('No se pudieron cargar las viviendas'); return res.json(); })
      .then(data => { setProperties(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (error) return <div className="container page"><div className="error">{error}</div></div>;

  const rowCells = (property: Property) => (
    <>
      <span style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={selectedIds.has(property.id)}
          onChange={() => toggleSelection(property.id)}
          onClick={e => e.stopPropagation()}
          style={{ flexShrink: 0, marginTop: '0.2rem', width: '1rem', height: '1rem', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
        />
        <span style={{ minWidth: 0 }}>
          <span className="dtable__name" style={{ display: 'block' }} title={property.name}>{property.name}</span>
          {/* Sub-línea de visita solo en móvil (la columna col-sec está oculta allí) */}
          {property.visit_date && (
            <span className="text-muted show-mobile" style={{ fontSize: 'var(--text-xs)' }}>
              {formatVisitDate(property.visit_date, { day: 'numeric', month: 'short' })}
              {property.visit_time && ` · ${formatVisitTime(property.visit_time)}`}
            </span>
          )}
        </span>
      </span>
      <span className="col-sec"><span className="badge badge-neutral">{property.type || '—'}</span></span>
      <span className="num price">{formatPrice(property.price_eur)}</span>
      <span className="col-sec num tabular">{property.built_area_m2 != null ? `${property.built_area_m2} m²` : '—'}</span>
      <span className="col-sec num tabular">{property.bedrooms ?? '—'}</span>
      <span className="col-sec num tabular">{property.bathrooms ?? '—'}</span>
      <span className="col-sec num" style={{ fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
        {property.visit_date
          ? <span style={{ color: 'var(--color-ink-secondary)' }}>
              <span style={{ display: 'block', fontWeight: 500 }}>
                {formatVisitDate(property.visit_date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              {property.visit_time && (
                <span style={{ color: 'var(--color-ink-tertiary)' }}>{formatVisitTime(property.visit_time)}</span>
              )}
            </span>
          : <span className="text-muted">—</span>}
      </span>
    </>
  );

  return (
    <div className="container page" style={selectedIds.size > 0 ? { paddingBottom: '5rem' } : undefined}>
      <div className="page-head">
        <div>
          <h1>Casas</h1>
          <p className="page-head__sub">
            {loading ? 'Cargando…' : `${properties.length} ${properties.length === 1 ? 'casa' : 'casas'} en seguimiento`}
          </p>
        </div>
        <Link to="/property/new" className="btn btn-primary">+ Nueva casa</Link>
      </div>

      {!loading && properties.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          {STATUS_ORDER.map(s => (
            <button key={s} type="button"
              className={`badge ${statusFilter === s ? STATUS_META[s].badge : 'badge-neutral'}`}
              style={{ cursor: 'pointer', opacity: statusFilter === s ? 1 : 0.55 }}
              aria-pressed={statusFilter === s}
              onClick={() => { setStatusFilter(s); clearSelection(); }}>
              {STATUS_META[s].label} ({counts[s]})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="dtable">
          <div className="dtable__head">
            <span>Casa</span><span className="col-sec">Tipo</span><span>Precio</span>
            <span className="col-sec">Sup.</span><span className="col-sec">Hab.</span>
            <span className="col-sec">Baños</span><span className="col-sec">Visita</span>
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
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">No hay casas {STATUS_META[statusFilter].label.toLowerCase()}</div>
          <p style={{ margin: '0 auto' }}>Cambia de pestaña para ver las demás casas.</p>
        </div>
      ) : (
        <div className="dtable" role="table">
          <div className="dtable__head" role="row">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox"
                checked={selectedIds.size === sorted.length && sorted.length > 0}
                onChange={selectAll}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer', accentColor: 'var(--color-accent)', flexShrink: 0 }}
                title="Seleccionar todas"
              />
              <span role="columnheader" className="sort-header" onClick={() => handleSort('name')} title="Ordenar por nombre">
                Casa <SortIcon active={sortKey === 'name'} dir={sortDir} />
              </span>
            </span>
            <span className="col-sec sort-header" role="columnheader" onClick={() => handleSort('type')} title="Ordenar por tipo">
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
            <span className="col-sec num sort-header" role="columnheader" onClick={() => handleSort('visit_date')} title="Ordenar por fecha de visita">
              Visita <SortIcon active={sortKey === 'visit_date'} dir={sortDir} />
            </span>
          </div>
          {sorted.map(property => (
            <div key={property.id} role="row"
              className={`dtable__row${selectedIds.has(property.id) ? ' dtable__row--selected' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/property/${property.id}`)}>
              {rowCells(property)}
            </div>
          ))}
        </div>
      )}

      {/* Batch action bar — appears when anything is checked */}
      {selectedIds.size > 0 && (
        <div className="batch-bar">
          <span className="batch-bar__info">
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex flex-wrap" style={{ gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" disabled={batchLoading}
              onClick={() => batchPatch({ status: 'nueva' })}>Nueva</button>
            <button className="btn btn-secondary" disabled={batchLoading}
              onClick={() => batchPatch({ status: 'por_visitar' })}>Por visitar</button>
            <button className="btn btn-secondary" disabled={batchLoading}
              onClick={() => batchPatch({ status: 'me_interesa' })}>Me interesa</button>
            <button className="btn btn-secondary" disabled={batchLoading}
              onClick={() => batchPatch({ status: 'descartada' })}>Descartar</button>
            <button className="btn btn-danger" disabled={batchLoading}
              onClick={() => setShowBatchDelete(true)}>Eliminar</button>
            <button className="btn btn-ghost" disabled={batchLoading}
              onClick={clearSelection}>✕</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showBatchDelete}
        title="Eliminar casas"
        message={`¿Eliminar ${selectedIds.size} casa${selectedIds.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={batchDelete}
        onCancel={() => setShowBatchDelete(false)}
      />
    </div>
  );
}

export default PropertiesList;

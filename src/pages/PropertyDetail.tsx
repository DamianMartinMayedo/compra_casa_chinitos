import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Checklist from '../components/Checklist';
import ConfirmDialog from '../components/ConfirmDialog';

interface Property {
  id: string;
  name: string;
  google_address: string;
  price_eur: number;
  municipality: string;
  idealista_url: string;
  type: string;
  built_area_m2: number;
  plot_area_m2: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  year_built: number;
  initial_state_summary: string;
  additional_notes: string;
  budget_min_eur: number;
  budget_max_eur: number;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then(res => { if (!res.ok) throw new Error('Vivienda no encontrada'); return res.json(); })
      .then(data => { setProperty(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  const requestDelete = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo borrar');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al borrar');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <div className="card card--pad-lg">
          <span className="skeleton skeleton-line" style={{ width: '55%', height: '2rem', display: 'block', marginBottom: 'var(--space-md)' }} />
          <span className="skeleton skeleton-line" style={{ width: '40%', display: 'block' }} />
        </div>
      </div>
    );
  }
  if (error || !property) {
    return <div className="container page"><div className="error">{error || 'Vivienda no encontrada'}</div></div>;
  }

  const facts: { label: string; value: string }[] = [
    { label: 'Precio', value: formatPrice(property.price_eur) },
    ...(property.built_area_m2 != null ? [{ label: 'Superficie', value: `${property.built_area_m2} m²` }] : []),
    ...(property.bedrooms != null ? [{ label: 'Habitaciones', value: String(property.bedrooms) }] : []),
    ...(property.bathrooms != null ? [{ label: 'Baños', value: String(property.bathrooms) }] : []),
  ];

  const extra: { label: string; value: string }[] = [
    ...(property.plot_area_m2 != null ? [{ label: 'Parcela', value: `${property.plot_area_m2} m²` }] : []),
    ...(property.floors != null ? [{ label: 'Plantas', value: String(property.floors) }] : []),
    ...(property.year_built != null ? [{ label: 'Año construcción', value: String(property.year_built) }] : []),
  ];

  const hasExtra = extra.length > 0 || property.initial_state_summary || property.additional_notes ||
    (property.budget_min_eur != null && property.budget_max_eur != null);

  return (
    <div className="container page">
      <Link to="/" className="back-link">← Volver al listado</Link>

      <div className="card card--pad-lg" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="flex-between flex-wrap" style={{ alignItems: 'flex-start', gap: 'var(--space-lg)' }}>
          <div style={{ minWidth: 0 }}>
            <span className="badge badge-neutral">{property.type || 'Vivienda'}</span>
            <h1 style={{ marginTop: '0.5rem' }}>{property.name}</h1>
            <div className="flex flex-wrap" style={{ gap: 'var(--space-md)', marginTop: '0.5rem', alignItems: 'center' }}>
              <a href={mapsUrl(property.google_address)} target="_blank" rel="noopener noreferrer"
                className="text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                📍 {property.google_address}
              </a>
              {property.idealista_url && (
                <a href={property.idealista_url} target="_blank" rel="noopener noreferrer" className="text-sm">
                  Ver anuncio ↗
                </a>
              )}
            </div>
          </div>

          <div className="flex" style={{ gap: 'var(--space-sm)', flexShrink: 0 }}>
            <Link to={`/property/${property.id}/documents`} className="btn btn-secondary">Documentos</Link>
            <div className="menu">
              <button className="btn btn-secondary" aria-expanded={menuOpen} aria-haspopup="menu"
                onClick={() => setMenuOpen(o => !o)} disabled={deleting}>
                {deleting ? 'Borrando…' : 'Opciones'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="menu__backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="menu__list" role="menu">
                    <Link to={`/property/${property.id}/edit`} className="menu__item" role="menuitem">Editar</Link>
                    <button className="menu__item menu__item--danger" role="menuitem" onClick={requestDelete}>Eliminar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="stat-grid inset" style={{ marginTop: 'var(--space-lg)' }}>
          {facts.map(f => (
            <div className="stat" key={f.label}>
              <div className="stat__label">{f.label}</div>
              <div className={`stat__value stat__value--lg${f.label === 'Precio' ? ' price' : ''}`}>{f.value}</div>
            </div>
          ))}
        </div>

        {hasExtra && (
          <details className="collapse" style={{ marginTop: 'var(--space-md)' }}>
            <summary className="collapse__summary">
              <span className="def__title" style={{ margin: 0 }}>Más detalles</span>
              <span className="collapse__chevron" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </summary>
            <div className="stack-lg" style={{ marginTop: 'var(--space-md)' }}>
              {extra.length > 0 && (
                <div className="stat-grid">
                  {extra.map(f => (
                    <div className="stat" key={f.label}>
                      <div className="stat__label">{f.label}</div>
                      <div className="stat__value stat__value--lg">{f.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {property.initial_state_summary && (
                <div className="def">
                  <div className="def__title">Estado inicial</div>
                  <p className="def__body">{property.initial_state_summary}</p>
                </div>
              )}
              {property.additional_notes && (
                <div className="def">
                  <div className="def__title">Notas adicionales</div>
                  <p className="def__body">{property.additional_notes}</p>
                </div>
              )}
              {property.budget_min_eur != null && property.budget_max_eur != null && (
                <div className="inset inset--accent">
                  <div className="inset__label">Presupuesto de reforma estimado</div>
                  <div className="price price--lg" style={{ color: 'var(--color-success)' }}>
                    {formatPrice(property.budget_min_eur)} – {formatPrice(property.budget_max_eur)}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="page-head" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2>Checklist</h2>
      </div>
      <Checklist propertyId={property.id} mode="review" />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Eliminar casa"
        message="¿Borrar esta casa y todo su checklist? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default PropertyDetail;

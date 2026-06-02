import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Checklist from '../components/Checklist';
import ConfirmDialog from '../components/ConfirmDialog';
import { STATUS_META, formatVisitDate, formatVisitTime, todayLocalISO, type PropertyStatus } from '../status';

interface Property {
  id: string;
  name: string;
  google_address: string | null;
  price_eur: number | null;
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
  status: PropertyStatus;
  visit_date: string | null;
  visit_time: string | null;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

interface Contact {
  id: string;
  property_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactForm, setContactForm] = useState<Partial<Contact> | null>(null);
  const [contactSaving, setContactSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts?property_id=${id}`)
      .then(r => r.json())
      .then(setContacts)
      .catch(() => {});
  }, [id]);

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm) return;
    setContactSaving(true);
    const isNew = !contactForm.id;
    const url = isNew ? '/api/contacts' : `/api/contacts/${contactForm.id}`;
    const body = isNew
      ? { property_id: id, name: contactForm.name, role: contactForm.role || null, phone: contactForm.phone || null, email: contactForm.email || null, notes: contactForm.notes || null }
      : { name: contactForm.name, role: contactForm.role || null, phone: contactForm.phone || null, email: contactForm.email || null, notes: contactForm.notes || null };
    const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const saved = await res.json();
    setContacts(prev => isNew ? [...prev, saved] : prev.map(c => c.id === saved.id ? saved : c));
    setContactForm(null);
    setContactSaving(false);
  };

  const deleteContact = async (contactId: string) => {
    await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const setField = (f: keyof Contact, v: string) =>
    setContactForm(prev => prev ? { ...prev, [f]: v } : prev);

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

  const changeStatus = async (status: PropertyStatus) => {
    if (!property) return;
    setMenuOpen(false);
    setStatusUpdating(true);
    const patch: { status: PropertyStatus; visit_date?: string } = { status };
    // Al marcar como me interesa sin fecha previa, registra la visita hoy.
    if (status === 'me_interesa' && !property.visit_date) patch.visit_date = todayLocalISO();
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('No se pudo actualizar el estado');
      const updated = await res.json();
      setProperty(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setStatusUpdating(false);
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

  const visitLabel = property.visit_date
    ? `${formatVisitDate(property.visit_date)}${property.visit_time ? ` · ${formatVisitTime(property.visit_time)}` : ''}`
    : null;

  const facts: { label: string; value: string }[] = [
    { label: 'Precio', value: property.price_eur != null ? formatPrice(property.price_eur) : '—' },
    ...(property.built_area_m2 != null ? [{ label: 'Superficie', value: `${property.built_area_m2} m²` }] : []),
    ...(property.bedrooms != null ? [{ label: 'Habitaciones', value: String(property.bedrooms) }] : []),
    ...(property.bathrooms != null ? [{ label: 'Baños', value: String(property.bathrooms) }] : []),
    ...(visitLabel ? [{ label: 'Visita', value: visitLabel }] : []),
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
            <div className="flex flex-wrap" style={{ gap: 'var(--space-sm)', alignItems: 'center' }}>
              <span className="badge badge-neutral">{property.type || 'Vivienda'}</span>
              <span className={`badge ${STATUS_META[property.status].badge}`}>{STATUS_META[property.status].label}</span>
              {property.visit_date && (
                <span className="text-sm text-muted">
                  Visita {formatVisitDate(property.visit_date)}
                  {property.visit_time && ` · ${formatVisitTime(property.visit_time)}`}
                </span>
              )}
            </div>
            <h1 style={{ marginTop: '0.5rem' }}>{property.name}</h1>
            <div className="flex flex-wrap" style={{ gap: 'var(--space-md)', marginTop: '0.5rem', alignItems: 'center' }}>
              {property.google_address && (
                <a href={mapsUrl(property.google_address)} target="_blank" rel="noopener noreferrer"
                  className="text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  📍 {property.google_address}
                </a>
              )}
              {property.idealista_url && (
                <a href={property.idealista_url} target="_blank" rel="noopener noreferrer" className="text-sm">
                  Ver anuncio ↗
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap" style={{ gap: 'var(--space-sm)', flexShrink: 0, marginLeft: 'auto' }}>
            {/* Primary CTA — desktop: visible button; mobile: inside menu */}
            {property.status === 'nueva' && (
              <button className="btn btn-secondary hide-mobile" onClick={() => changeStatus('por_visitar')} disabled={statusUpdating || deleting}>
                {statusUpdating ? 'Guardando…' : 'Por visitar'}
              </button>
            )}
            {property.status === 'por_visitar' && (
              <button className="btn btn-secondary hide-mobile" onClick={() => changeStatus('me_interesa')} disabled={statusUpdating || deleting}>
                {statusUpdating ? 'Guardando…' : '✓ Me interesa ★'}
              </button>
            )}
            <Link to={`/property/${property.id}/documents`} className="btn btn-secondary hide-mobile">Documentos</Link>

            <div className="menu">
              <button className="btn btn-secondary" aria-expanded={menuOpen} aria-haspopup="menu"
                onClick={() => setMenuOpen(o => !o)} disabled={deleting || statusUpdating}>
                {deleting ? 'Borrando…' : 'Opciones'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="menu__backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="menu__list" role="menu">
                    {/* Mobile-only CTAs */}
                    {property.status === 'nueva' && (
                      <button className="menu__item show-mobile" role="menuitem"
                        onClick={() => { setMenuOpen(false); changeStatus('por_visitar'); }}>
                        Por visitar
                      </button>
                    )}
                    {property.status === 'por_visitar' && (
                      <button className="menu__item show-mobile" role="menuitem"
                        onClick={() => { setMenuOpen(false); changeStatus('me_interesa'); }}>
                        ✓ Me interesa ★
                      </button>
                    )}
                    <Link to={`/property/${property.id}/documents`} className="menu__item show-mobile" role="menuitem"
                      onClick={() => setMenuOpen(false)}>
                      Documentos
                    </Link>
                    {/* Always */}
                    <Link to={`/property/${property.id}/edit`} className="menu__item" role="menuitem">Editar</Link>
                    {property.status === 'me_interesa' && (
                      <button className="menu__item" role="menuitem" onClick={() => changeStatus('por_visitar')}>
                        Volver a por visitar
                      </button>
                    )}
                    {property.status === 'por_visitar' && (
                      <button className="menu__item" role="menuitem" onClick={() => changeStatus('nueva')}>
                        Volver a Nueva
                      </button>
                    )}
                    {property.status !== 'descartada' ? (
                      <button className="menu__item" role="menuitem" onClick={() => changeStatus('descartada')}>
                        Descartar
                      </button>
                    ) : (
                      <button className="menu__item" role="menuitem" onClick={() => changeStatus('nueva')}>
                        Restaurar
                      </button>
                    )}
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

      {/* ── Contactos ──────────────────────────────────────────────────── */}
      <div className="card card--pad-lg" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="flex-between" style={{ marginBottom: contacts.length || contactForm !== null ? 'var(--space-md)' : 0 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Contactos</h2>
          {contactForm === null && (
            <button className="btn btn-secondary" onClick={() => setContactForm({})}>+ Añadir</button>
          )}
        </div>

        {contacts.length === 0 && contactForm === null && (
          <p style={{ margin: 0, color: 'var(--color-ink-tertiary)', fontSize: 'var(--text-sm)' }}>
            Sin contactos — añade el agente o propietario.
          </p>
        )}

        <div className="stack">
          {contacts.map(c => (
            <div key={c.id} className="contact-card">
              <div className="contact-card__body">
                <div className="contact-card__top">
                  <span className="contact-card__name">{c.name}</span>
                  {c.role && <span className="badge badge-neutral">{c.role}</span>}
                </div>
                <div className="contact-card__links">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="contact-card__link">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <path d="M11.5 9.5c-.5-.5-1.5-1-2-.5l-.5.5C8.5 10 7 9.5 5.5 8S4 5.5 4.5 5L5 4.5c.5-.5 0-1.5-.5-2L3 1C2.5.5 1.5.5 1 1 .5 1.5 0 3 1 5.5S5 11 7.5 12s4--.5 4.5-1c.5-.5.5-1.5 0-2L11.5 9.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="contact-card__link">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M1 4l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      {c.email}
                    </a>
                  )}
                </div>
                {c.notes && <p className="contact-card__notes">{c.notes}</p>}
              </div>
              <div className="contact-card__actions">
                <button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '0.25rem 0.5rem' }}
                  onClick={() => setContactForm(c)}>Editar</button>
                <button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '0.25rem 0.5rem', color: 'var(--color-error)' }}
                  onClick={() => deleteContact(c.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {contactForm !== null && (
          <form onSubmit={saveContact} className="contact-form stack">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-md)' }}>
              <div className="field">
                <label className="field__label">Nombre *</label>
                <input required value={contactForm.name || ''} onChange={e => setField('name', e.target.value)} placeholder="Juan García" />
              </div>
              <div className="field">
                <label className="field__label">Rol</label>
                <select value={contactForm.role || ''} onChange={e => setField('role', e.target.value)}>
                  <option value="">—</option>
                  <option>Agente</option>
                  <option>Propietario</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label">Teléfono</label>
                <input type="tel" value={contactForm.phone || ''} onChange={e => setField('phone', e.target.value)} placeholder="+34 600 000 000" />
              </div>
              <div className="field">
                <label className="field__label">Email</label>
                <input type="email" value={contactForm.email || ''} onChange={e => setField('email', e.target.value)} placeholder="agente@inmobiliaria.es" />
              </div>
            </div>
            <div className="field">
              <label className="field__label">Notas</label>
              <input value={contactForm.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Disponible tardes, pedir nota simple…" />
            </div>
            <div className="flex" style={{ gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setContactForm(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={contactSaving}>
                {contactSaving ? 'Guardando…' : 'Guardar contacto'}
              </button>
            </div>
          </form>
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

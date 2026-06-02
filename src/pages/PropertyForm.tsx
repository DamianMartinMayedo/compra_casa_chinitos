import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { STATUS_META, STATUS_ORDER } from '../status';


type Form = Record<string, string>;

const TEXT_FIELDS: { key: string; label: string; placeholder?: string; required?: boolean }[] = [
  { key: 'name', label: 'Nombre', placeholder: 'Ej: Pilas - Calle Magallanes', required: true },
  { key: 'idealista_url', label: 'Enlace del anuncio (Idealista / Fotocasa)', placeholder: 'https://www.idealista.com/inmueble/…' },
  { key: 'google_address', label: 'Dirección (se abrirá en Google Maps)', placeholder: 'Calle, municipio, provincia' },
  { key: 'municipality', label: 'Municipio', placeholder: 'Ej: Pilas' },
  { key: 'type', label: 'Tipo', placeholder: 'Ej: Chalet adosado' },
];

const NUMBER_FIELDS: { key: string; label: string }[] = [
  { key: 'price_eur', label: 'Precio (€)' },
  { key: 'built_area_m2', label: 'Superficie construida (m²)' },
  { key: 'plot_area_m2', label: 'Parcela (m²)' },
  { key: 'bedrooms', label: 'Habitaciones' },
  { key: 'bathrooms', label: 'Baños' },
  { key: 'floors', label: 'Plantas' },
  { key: 'year_built', label: 'Año construcción' },
  { key: 'budget_min_eur', label: 'Reforma estimada mín. (€)' },
  { key: 'budget_max_eur', label: 'Reforma estimada máx. (€)' },
];

const TEXTAREA_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: 'initial_state_summary', label: 'Estado inicial', placeholder: 'Resumen del estado según el anuncio o la visita…' },
  { key: 'additional_notes', label: 'Notas adicionales', placeholder: 'Riesgos, extras, cosas a revisar…' },
];

const ALL_KEYS = [...[...TEXT_FIELDS, ...NUMBER_FIELDS, ...TEXTAREA_FIELDS].map(f => f.key), 'status', 'visit_date', 'visit_time'];
const NUMBER_KEYS = new Set(NUMBER_FIELDS.map(f => f.key));

function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Form>({ ...Object.fromEntries(ALL_KEYS.map(k => [k, ''])), status: 'en_estudio' });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/properties/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Vivienda no encontrada');
        return res.json();
      })
      .then(data => {
        setForm(Object.fromEntries(ALL_KEYS.map(k => [k, data[k] == null ? '' : String(data[k])])));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, isEdit]);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload: Record<string, string | number | null> = {};
    for (const key of ALL_KEYS) {
      const raw = form[key].trim();
      if (NUMBER_KEYS.has(key)) {
        payload[key] = raw === '' ? null : Number(raw);
      } else {
        payload[key] = raw === '' ? null : raw;
      }
    }

    try {
      const res = await fetch(isEdit ? `/api/properties/${id}` : '/api/properties', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo guardar la vivienda');
      const saved = await res.json();
      navigate(`/property/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <span className="skeleton skeleton-line" style={{ width: '12rem', height: '1.75rem', display: 'block' }} />
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: '720px' }}>
      <Link to={isEdit ? `/property/${id}` : '/'} className="back-link">← Cancelar</Link>

      <div className="page-head">
        <h1>{isEdit ? 'Editar casa' : 'Nueva casa'}</h1>
      </div>

      {error && <div className="error" style={{ marginBottom: 'var(--space-lg)' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="stack-lg">
        <div className="card card--pad-lg stack">
          {TEXT_FIELDS.map(f => (
            <div className="field" key={f.key}>
              <label className="field__label" htmlFor={f.key}>
                {f.label}{f.required && <span style={{ color: 'var(--color-error)' }}> *</span>}
              </label>
              <input
                id={f.key}
                type={f.key === 'idealista_url' ? 'url' : 'text'}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
              />
            </div>
          ))}
        </div>

        <div className="card card--pad-lg">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Estado y visita</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
            <div className="field">
              <label className="field__label" htmlFor="status">Estado</label>
              <select id="status" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="visit_date">Fecha de visita</label>
              <input id="visit_date" type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="visit_time">Hora de visita</label>
              <input id="visit_time" type="time" value={form.visit_time} onChange={e => set('visit_time', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card card--pad-lg">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Características</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
            {NUMBER_FIELDS.map(f => (
              <div className="field" key={f.key}>
                <label className="field__label" htmlFor={f.key}>{f.label}</label>
                <input
                  id={f.key}
                  type="number"
                  inputMode="numeric"
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card card--pad-lg stack">
          {TEXTAREA_FIELDS.map(f => (
            <div className="field" key={f.key}>
              <label className="field__label" htmlFor={f.key}>{f.label}</label>
              <textarea
                id={f.key}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
              />
            </div>
          ))}
        </div>

        <div className="flex">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear casa'}
          </button>
          <Link to={isEdit ? `/property/${id}` : '/'} className="btn btn-ghost">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

export default PropertyForm;

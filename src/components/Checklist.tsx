import { useEffect, useState } from 'react';

interface Section { id: string; name: string; sort_order: number; }
interface Item {
  id: string; section_id: string; label: string; item_type: string;
  placeholder: string; sort_order: number; is_active: boolean;
}
interface Response {
  id: string; checklist_item_id: string; checked: boolean; text_value: string;
  number_value: number; rating_value: number; status_value: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'requested', label: 'Solicitado' },
  { value: 'received', label: 'Recibido' },
  { value: 'missing', label: 'Falta' },
  { value: 'not_applicable', label: 'No aplica' },
];

const isDocsSection = (name: string) => /document/i.test(name);
const isQuestionsSection = (name: string) => /pregunta/i.test(name);

export default function Checklist({ propertyId, mode }: { propertyId: string; mode: 'review' | 'documents' }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [responses, setResponses] = useState<Record<string, Partial<Response>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/checklist/sections').then(r => r.json()),
      fetch('/api/checklist/items').then(r => r.json()),
      fetch(`/api/checklist/responses?property_id=${propertyId}`).then(r => r.json()),
    ])
      .then(([s, i, r]) => {
        setSections(s);
        setItems((i as Item[]).filter(it => it.is_active !== false));
        const byItem: Record<string, Response> = {};
        (r as Response[]).forEach(x => { byItem[x.checklist_item_id] = x; });
        setResponses(byItem);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [propertyId]);

  const save = (itemId: string, field: string, value: boolean | string | number | null) => {
    setResponses(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    fetch('/api/checklist/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, checklist_item_id: itemId, [field]: value }),
    }).catch(() => setError('No se pudo guardar el cambio'));
  };

  const itemsOf = (sectionId: string) =>
    items.filter(i => i.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order);

  const renderInput = (item: Item) => {
    const r = responses[item.id];
    switch (item.item_type) {
      case 'checkbox':
        return (
          <label className="check-row check-row--inline">
            <input type="checkbox" className="checkbox" checked={r?.checked || false}
              onChange={e => save(item.id, 'checked', e.target.checked)} />
            <span className="check-row__label">{item.label}</span>
          </label>
        );
      case 'text':
        return (
          <div className="field">
            <label className="field__label">{item.label}</label>
            <input type="text" value={r?.text_value || ''} placeholder={item.placeholder || ''}
              onChange={e => save(item.id, 'text_value', e.target.value)} />
          </div>
        );
      case 'textarea':
        return (
          <div className="field">
            <label className="field__label">{item.label}</label>
            <textarea value={r?.text_value || ''} placeholder={item.placeholder || ''} rows={3}
              onChange={e => save(item.id, 'text_value', e.target.value)} />
          </div>
        );
      case 'number':
        return (
          <div className="field">
            <label className="field__label">{item.label}</label>
            <input type="number" value={r?.number_value ?? ''} placeholder={item.placeholder || ''}
              onChange={e => save(item.id, 'number_value', e.target.value === '' ? null : parseFloat(e.target.value))} />
          </div>
        );
      case 'rating':
        return (
          <div className="field">
            <label className="field__label">{item.label}</label>
            <div className="rating" role="group" aria-label={item.label}>
              {[1, 2, 3, 4, 5].map(n => {
                const on = (r?.rating_value || 0) >= n;
                return (
                  <button key={n} type="button" aria-pressed={on}
                    className={on ? 'rating__btn rating__btn--on' : 'rating__btn'}
                    onClick={() => save(item.id, 'rating_value', n)}>{n}</button>
                );
              })}
            </div>
          </div>
        );
      case 'status':
        return (
          <div className="check-row--inline" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-md)', alignItems: 'center' }}>
            <span className="check-row__label">{item.label}</span>
            <select value={r?.status_value || ''} style={{ width: 'auto', minWidth: '9rem' }}
              onChange={e => save(item.id, 'status_value', e.target.value)}>
              <option value="">—</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="card card--pad-lg">
        <span className="skeleton skeleton-line" style={{ width: '35%', height: '1.25rem', display: 'block', marginBottom: 'var(--space-md)' }} />
        <span className="skeleton skeleton-line" style={{ width: '80%', display: 'block' }} />
      </div>
    );
  }
  if (error) return <div className="error">{error}</div>;

  const visible = sections
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter(s => (mode === 'documents' ? isDocsSection(s.name) : !isDocsSection(s.name)))
    .filter(s => itemsOf(s.id).length > 0);

  if (visible.length === 0) {
    return <div className="empty-state"><p style={{ margin: 0 }}>No hay elementos en esta sección del checklist.</p></div>;
  }

  return (
    <div className="stack-lg">
      {visible.map(section => {
        const secItems = itemsOf(section.id);
        const body = <div className="stack-lg">{secItems.map(item => <div key={item.id}>{renderInput(item)}</div>)}</div>;

        if (mode === 'review' && isQuestionsSection(section.name)) {
          return (
            <details key={section.id} className="card card--pad-lg collapse">
              <summary className="collapse__summary">
                <h3>{section.name}</h3>
                <span className="collapse__chevron" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </summary>
              <div style={{ marginTop: 'var(--space-md)' }}>{body}</div>
            </details>
          );
        }

        return (
          <section key={section.id} className="card card--pad-lg">
            <h3 style={{ marginBottom: 'var(--space-md)' }}>{section.name}</h3>
            {body}
          </section>
        );
      })}
    </div>
  );
}

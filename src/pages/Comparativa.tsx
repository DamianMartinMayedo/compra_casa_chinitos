import { useEffect, useRef, useState, type ReactNode, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { formatVisitDate, formatVisitTime, type PropertyStatus } from '../status';

interface Property {
  id: string; name: string; price_eur: number | null;
  built_area_m2: number | null; bedrooms: number | null; bathrooms: number | null;
  type: string | null; status: PropertyStatus;
  visit_date: string | null; visit_time: string | null;
  budget_min_eur: number | null; budget_max_eur: number | null;
  additional_notes: string | null;
}
interface Section { id: string; name: string; sort_order: number; }
interface Item { id: string; section_id: string; label: string; item_type: string; sort_order: number; is_active: boolean; }
interface Response { checklist_item_id: string; checked: boolean | null; text_value: string | null; number_value: number | null; rating_value: number | null; }

const DOCS_RE = /document/i;

const fmtPrice = (p: number | null) =>
  p == null ? '—' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);

const fmtK = (n: number) =>
  new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 0 }).format(n) + ' €';

function RatingBar({ value }: { value: number | null }) {
  if (!value) return <span className="text-muted">—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <div style={{ display: 'flex', gap: '0.15rem' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{
            width: '0.9rem', height: '0.9rem', borderRadius: '0.2rem',
            background: n <= value ? 'var(--color-accent)' : 'var(--color-border)',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-ink-secondary)' }}>{value}/5</span>
    </div>
  );
}

export default function Comparativa() {
  const [visitadas, setVisitadas] = useState<Property[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [respCache, setRespCache] = useState<Record<string, Record<string, Response>>>({});
  const fetchedIds = useRef(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/properties').then(r => r.json()),
      fetch('/api/checklist/sections').then(r => r.json()),
      fetch('/api/checklist/items').then(r => r.json()),
    ]).then(([props, secs, its]) => {
      setVisitadas((props as Property[]).filter(p => p.status === 'me_interesa'));
      setSections((secs as Section[]).sort((a, b) => a.sort_order - b.sort_order));
      setItems((its as Item[]).filter(i => i.is_active !== false));
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const ensureResponses = (propId: string) => {
    if (fetchedIds.current.has(propId)) return;
    fetchedIds.current.add(propId);
    fetch(`/api/checklist/responses?property_id=${propId}`)
      .then(r => r.json())
      .then((rows: Response[]) => {
        const byItem: Record<string, Response> = {};
        rows.forEach(r => { byItem[r.checklist_item_id] = r; });
        setRespCache(prev => ({ ...prev, [propId]: byItem }));
      });
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      ensureResponses(id);
      return [...prev, id];
    });
  };

  if (loading) return (
    <div className="container page">
      <span className="skeleton skeleton-line" style={{ width: '30%', height: '2rem', display: 'block' }} />
    </div>
  );
  if (error) return <div className="container page"><div className="error">{error}</div></div>;

  const selProps = selected.map(id => visitadas.find(p => p.id === id)).filter(Boolean) as Property[];
  const N = selProps.length;
  const sectionList = sections.filter(s => !DOCS_RE.test(s.name));
  const itemsOf = (sId: string) => items.filter(i => i.section_id === sId).sort((a, b) => a.sort_order - b.sort_order);

  // Build flat list of grid cells for the comparison table
  const cells: JSX.Element[] = [];

  if (N >= 2) {
    // ─── Header row ───────────────────────────────────────────────────────
    cells.push(<div key="hd-label" className="cmp-cell cmp-label cmp-head" />);
    selProps.forEach(p => {
      cells.push(
        <div key={`hd-${p.id}`} className="cmp-cell cmp-head">
          <Link to={`/property/${p.id}`} style={{ fontWeight: 700, display: 'block', marginBottom: '0.375rem', color: 'inherit' }}>
            {p.name}
          </Link>
          {p.type && <span className="badge badge-neutral" style={{ marginBottom: '0.5rem' }}>{p.type}</span>}
          <div className="price" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.375rem' }}>
            {fmtPrice(p.price_eur)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', fontSize: 'var(--text-xs)', color: 'var(--color-ink-secondary)' }}>
            {p.built_area_m2 != null && <span>{p.built_area_m2} m²</span>}
            {p.bedrooms != null && <span>{p.bedrooms} hab.</span>}
            {p.bathrooms != null && <span>{p.bathrooms} baños</span>}
          </div>
          {p.visit_date && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-tertiary)', marginTop: '0.375rem' }}>
              Visita {formatVisitDate(p.visit_date, { day: 'numeric', month: 'short' })}
              {p.visit_time && ` · ${formatVisitTime(p.visit_time)}`}
            </div>
          )}
          {p.budget_min_eur != null && p.budget_max_eur != null && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-secondary)', marginTop: '0.25rem' }}>
              Reforma: {fmtK(p.budget_min_eur)}–{fmtK(p.budget_max_eur)}
            </div>
          )}
        </div>
      );
    });

    // ─── Checklist sections ───────────────────────────────────────────────
    for (const section of sectionList) {
      const secItems = itemsOf(section.id);
      if (!secItems.length) continue;

      const checkboxItems = secItems.filter(i => i.item_type === 'checkbox');
      const otherItems = secItems.filter(i => i.item_type !== 'checkbox');

      // Section header (spans all columns)
      cells.push(
        <div key={`sh-${section.id}`} className="cmp-cell cmp-section-head"
          style={{ gridColumn: `1 / span ${N + 1}` }}>
          {section.name}
        </div>
      );

      // Checkbox items → one summary row (X/Y ✓ + list of checked labels)
      if (checkboxItems.length > 0) {
        cells.push(<div key={`cl-${section.id}`} className="cmp-cell cmp-label">Checks ✓</div>);
        selProps.forEach(p => {
          const resp = respCache[p.id] || {};
          const checked = checkboxItems.filter(i => resp[i.id]?.checked);
          cells.push(
            <div key={`cv-${section.id}-${p.id}`} className="cmp-cell">
              <span style={{ fontWeight: 700, color: checked.length === checkboxItems.length ? 'var(--color-success)' : checked.length === 0 ? 'var(--color-ink-tertiary)' : undefined }}>
                {checked.length}/{checkboxItems.length}
              </span>
              {checked.length > 0 && (
                <ul style={{ margin: '0.375rem 0 0', padding: '0 0 0 1rem', fontSize: 'var(--text-xs)', color: 'var(--color-ink-secondary)' }}>
                  {checked.map(i => <li key={i.id}>{i.label}</li>)}
                </ul>
              )}
            </div>
          );
        });
      }

      // Non-checkbox items (ratings, textareas, numbers) → one row each
      otherItems.forEach(item => {
        cells.push(<div key={`il-${item.id}`} className="cmp-cell cmp-label">{item.label}</div>);
        selProps.forEach(p => {
          const r = respCache[p.id]?.[item.id];
          let content: ReactNode = <span className="text-muted">—</span>;
          if (item.item_type === 'rating') {
            content = <RatingBar value={r?.rating_value ?? null} />;
          } else if (item.item_type === 'textarea') {
            content = r?.text_value
              ? <span style={{ fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap' }}>{r.text_value}</span>
              : <span className="text-muted">—</span>;
          } else if (item.item_type === 'number') {
            content = r?.number_value != null
              ? <span className="price">{fmtPrice(r.number_value)}</span>
              : <span className="text-muted">—</span>;
          }
          cells.push(<div key={`iv-${item.id}-${p.id}`} className="cmp-cell">{content}</div>);
        });
      });
    }

    // ─── Property notes ───────────────────────────────────────────────────
    if (selProps.some(p => p.additional_notes)) {
      cells.push(
        <div key="notes-sh" className="cmp-cell cmp-section-head"
          style={{ gridColumn: `1 / span ${N + 1}` }}>
          Notas del anuncio
        </div>
      );
      cells.push(<div key="notes-label" className="cmp-cell cmp-label" />);
      selProps.forEach(p => {
        cells.push(
          <div key={`notes-${p.id}`} className="cmp-cell">
            {p.additional_notes
              ? <span style={{ fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap', color: 'var(--color-ink-secondary)' }}>{p.additional_notes}</span>
              : <span className="text-muted">—</span>
            }
          </div>
        );
      });
    }
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Comparativa</h1>
          <p className="page-head__sub">Selecciona hasta 3 casas que te interesan para comparar</p>
        </div>
      </div>

      {visitadas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">Sin casas de interés aún</div>
          <p style={{ margin: '0 auto 1.25rem' }}>
            Marca casas como <strong>Me interesa</strong> para poder compararlas aquí.
          </p>
          <Link to="/" className="btn btn-primary">Ver casas</Link>
        </div>
      ) : (
        <>
          {/* ── Selector ─────────────────────────────────────────────────── */}
          <div className="cmp-selector">
            {visitadas.map(p => {
              const on = selected.includes(p.id);
              const disabled = !on && selected.length >= 3;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={`cmp-prop-btn${on ? ' cmp-prop-btn--on' : ''}`}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                >
                  <span className="cmp-prop-btn__name">{p.name}</span>
                  <span className="cmp-prop-btn__meta">
                    {p.price_eur ? fmtPrice(p.price_eur) : 'Sin precio'}
                    {p.visit_date && ` · ${formatVisitDate(p.visit_date, { day: 'numeric', month: 'short' })}`}
                    {p.visit_time && ` ${formatVisitTime(p.visit_time)}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Comparison ───────────────────────────────────────────────── */}
          {N < 2 ? (
            <div className="inset" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-ink-secondary)' }}>
              Selecciona al menos 2 casas para ver la comparativa
            </div>
          ) : (
            <>
              {/* Desktop: horizontal scrollable grid */}
              <div className="cmp-grid-wrap">
                <div className="cmp-scroll">
                  <div className="cmp-grid" style={{ gridTemplateColumns: `8rem repeat(${N}, 1fr)` }}>
                    {cells}
                  </div>
                </div>
              </div>

              {/* Mobile: stacked cards, one per property */}
              <div className="cmp-mobile-cards">
                {selProps.map(p => {
                  const resp = respCache[p.id] || {};
                  return (
                    <div key={p.id} className="card card--pad-lg">
                      {/* Header */}
                      <Link to={`/property/${p.id}`} style={{ fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                        {p.name}
                      </Link>
                      {p.type && <span className="badge badge-neutral" style={{ marginBottom: '0.5rem' }}>{p.type}</span>}
                      <div className="price" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{fmtPrice(p.price_eur)}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem', fontSize: 'var(--text-xs)', color: 'var(--color-ink-secondary)' }}>
                        {p.built_area_m2 != null && <span>{p.built_area_m2} m²</span>}
                        {p.bedrooms != null && <span>{p.bedrooms} hab.</span>}
                        {p.bathrooms != null && <span>{p.bathrooms} baños</span>}
                        {p.visit_date && (
                          <span>{formatVisitDate(p.visit_date, { day: 'numeric', month: 'short' })}{p.visit_time && ` · ${formatVisitTime(p.visit_time)}`}</span>
                        )}
                      </div>

                      {/* Sections */}
                      {sectionList.map(section => {
                        const secItems = itemsOf(section.id);
                        if (!secItems.length) return null;
                        const checkboxItems = secItems.filter(i => i.item_type === 'checkbox');
                        const otherItems = secItems.filter(i => i.item_type !== 'checkbox');
                        const checked = checkboxItems.filter(i => resp[i.id]?.checked);
                        return (
                          <div key={section.id} className="cmp-card-section">
                            <div className="cmp-card-section__title">{section.name}</div>
                            {checkboxItems.length > 0 && (
                              <div className="cmp-card-row">
                                <span className="cmp-card-row__label">Checks ✓</span>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: checked.length === checkboxItems.length ? 'var(--color-success)' : checked.length === 0 ? 'var(--color-ink-tertiary)' : undefined }}>
                                    {checked.length}/{checkboxItems.length}
                                  </span>
                                  {checked.length > 0 && (
                                    <ul style={{ margin: '0.25rem 0 0', padding: '0 0 0 1rem', fontSize: 'var(--text-xs)', color: 'var(--color-ink-secondary)' }}>
                                      {checked.map(i => <li key={i.id}>{i.label}</li>)}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            )}
                            {otherItems.map(item => {
                              const r = resp[item.id];
                              let val: ReactNode = <span className="text-muted">—</span>;
                              if (item.item_type === 'rating') val = <RatingBar value={r?.rating_value ?? null} />;
                              else if (item.item_type === 'textarea') val = r?.text_value ? <span style={{ fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap' }}>{r.text_value}</span> : <span className="text-muted">—</span>;
                              else if (item.item_type === 'number') val = r?.number_value != null ? <span className="price">{fmtPrice(r.number_value)}</span> : <span className="text-muted">—</span>;
                              return (
                                <div key={item.id} className="cmp-card-row">
                                  <span className="cmp-card-row__label">{item.label}</span>
                                  <div style={{ textAlign: 'right' }}>{val}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Property notes */}
                      {p.additional_notes && (
                        <div className="cmp-card-section">
                          <div className="cmp-card-section__title">Notas</div>
                          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-ink-secondary)', whiteSpace: 'pre-wrap' }}>
                            {p.additional_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

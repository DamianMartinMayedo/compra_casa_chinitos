import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface Section { id: string; name: string; sort_order: number; }
interface Item {
  id: string;
  section_id: string;
  label: string;
  item_type: string;
  sort_order: number;
  is_active: boolean;
  rating_high_is_good: boolean | null;
}

const ITEM_TYPES = [
  { value: 'checkbox', label: 'Casilla' },
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'rating', label: 'Valoración 1-5' },
  { value: 'status', label: 'Estado' },
];

function EditableLabel({ defaultValue, onSave }: { defaultValue: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);

  const save = () => {
    const v = value.trim();
    if (v && v !== defaultValue) onSave(v);
    setEditing(false);
  };

  return (
    <>
      <span
        className={`item-row__label-text${editing ? ' item-row__label-text--hidden' : ''}`}
        onClick={() => setEditing(true)}
      >
        {defaultValue}
      </span>
      <input
        className={`item-row__label-input${editing ? ' item-row__label-input--active' : ''}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(defaultValue); setEditing(false); } }}
      />
    </>
  );
}

function ChecklistManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSection, setNewSection] = useState('');
  const [draft, setDraft] = useState<Record<string, { label: string; type: string }>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'section' | 'item'; id: string; label: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragSectionRef = useRef<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRects = useRef<Map<string, DOMRect> | null>(null);

  // FLIP: after a live reorder, slide each row from its old position to its new one
  useLayoutEffect(() => {
    const prev = prevRects.current;
    if (!prev) return;
    prevRects.current = null;
    rowRefs.current.forEach((el, id) => {
      const oldRect = prev.get(id);
      if (!oldRect) return;
      const dy = oldRect.top - el.getBoundingClientRect().top;
      if (!dy) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.24s cubic-bezier(0.2, 0, 0, 1)';
        el.style.transform = '';
      });
    });
  });

  const captureRects = () => {
    const m = new Map<string, DOMRect>();
    rowRefs.current.forEach((el, id) => m.set(id, el.getBoundingClientRect()));
    prevRects.current = m;
  };

  const reload = () =>
    Promise.all([
      fetch('/api/checklist/sections').then(r => r.json()),
      fetch('/api/checklist/items').then(r => r.json()),
    ]).then(([s, i]) => { setSections(s); setItems(i); });

  useEffect(() => {
    reload().then(() => setLoading(false)).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const itemsOf = (sectionId: string) =>
    items.filter(i => i.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order);

  const addSection = async () => {
    const name = newSection.trim();
    if (!name) return;
    const res = await fetch('/api/checklist/sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sort_order: sections.length + 1 }),
    });
    const created = await res.json();
    setSections(prev => [...prev, created]);
    setNewSection('');
  };

  const deleteSection = async (id: string) => {
    await fetch(`/api/checklist/sections/${id}`, { method: 'DELETE' });
    setSections(prev => prev.filter(s => s.id !== id));
    setItems(prev => prev.filter(i => i.section_id !== id));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'section') {
      deleteSection(deleteTarget.id);
    } else {
      deleteItem(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const addItem = async (sectionId: string) => {
    const d = draft[sectionId];
    const label = d?.label?.trim();
    if (!label) return;
    const sort = Math.max(0, ...itemsOf(sectionId).map(i => i.sort_order)) + 1;
    const res = await fetch('/api/checklist/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: sectionId, label, item_type: d?.type || 'checkbox', sort_order: sort, is_active: true }),
    });
    const created = await res.json();
    setItems(prev => [...prev, created]);
    setDraft(prev => ({ ...prev, [sectionId]: { label: '', type: d?.type || 'checkbox' } }));
  };

  const patchItem = async (id: string, patch: Partial<Item>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    await fetch(`/api/checklist/items/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/checklist/items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Live reorder while hovering over another row — triggers FLIP slide.
  // Midpoint guard prevents flicker: only swap once the pointer crosses the
  // target's middle in the direction of travel.
  const handleDragOverItem = (targetId: string, sectionId: string, e: React.DragEvent) => {
    if (!draggingId || draggingId === targetId) return;
    const list = itemsOf(sectionId);
    const fromIdx = list.findIndex(i => i.id === draggingId);
    const toIdx   = list.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pointerY = e.clientY - rect.top;
    const midY = rect.height / 2;
    // Moving down and not yet past the middle → wait
    if (fromIdx < toIdx && pointerY < midY) return;
    // Moving up and not yet past the middle → wait
    if (fromIdx > toIdx && pointerY > midY) return;

    captureRects();
    const newList = [...list];
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);
    const orderMap = new Map(newList.map((it, idx) => [it.id, (idx + 1) * 10]));
    setItems(prev => prev.map(i => orderMap.has(i.id) ? { ...i, sort_order: orderMap.get(i.id)! } : i));
  };

  const persistOrder = async (sectionId: string) => {
    const list = itemsOf(sectionId);
    await Promise.all(list.map((it, idx) =>
      fetch(`/api/checklist/items/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: (idx + 1) * 10 }) })
    ));
  };

  const endDrag = () => {
    const sectionId = dragSectionRef.current;
    setDraggingId(null);
    dragSectionRef.current = null;
    if (sectionId) persistOrder(sectionId);
  };

  if (loading) return <div className="container page"><span className="skeleton skeleton-line" style={{ width: '12rem', height: '1.75rem', display: 'block' }} /></div>;
  if (error) return <div className="container page"><div className="error">{error}</div></div>;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Checklist global</h1>
          <p className="page-head__sub">El mismo para todas las casas. Lo que edites aquí se aplica a todas.</p>
        </div>
      </div>

      <div className="stack-lg">
        {sections.slice().sort((a, b) => a.sort_order - b.sort_order).map(section => (
          <section key={section.id} className="card card--pad-lg">
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <h3>{section.name}</h3>
              <button className="btn btn-ghost text-sm" onClick={() => setDeleteTarget({ type: 'section', id: section.id, label: section.name })} style={{ color: 'var(--color-error)' }}>
                Borrar sección
              </button>
            </div>

            <div className="stack">
              {itemsOf(section.id).map(item => (
                <div key={item.id}
                  ref={el => { if (el) rowRefs.current.set(item.id, el); else rowRefs.current.delete(item.id); }}
                  className={`item-row${draggingId === item.id ? ' item-row--dragging' : ''}`}
                  onDragOver={e => { e.preventDefault(); handleDragOverItem(item.id, item.section_id, e); }}
                  onDrop={e => { e.preventDefault(); endDrag(); }}>
                  {/* Drag handle */}
                  <span
                    className="drag-handle"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.effectAllowed = 'move';
                      // Hide the native drag ghost with an off-screen empty node
                      // (a data-URI image can render as a broken icon mid-load).
                      const ghost = document.createElement('div');
                      ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 0, 0);
                      setTimeout(() => document.body.removeChild(ghost), 0);
                      dragSectionRef.current = item.section_id;
                      setDraggingId(item.id);
                    }}
                    onDragEnd={endDrag}
                    title="Arrastrar para reordenar"
                  >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
                      <circle cx="2.5" cy="2"  r="1.3"/><circle cx="7.5" cy="2"  r="1.3"/>
                      <circle cx="2.5" cy="7"  r="1.3"/><circle cx="7.5" cy="7"  r="1.3"/>
                      <circle cx="2.5" cy="12" r="1.3"/><circle cx="7.5" cy="12" r="1.3"/>
                    </svg>
                  </span>
                  <EditableLabel defaultValue={item.label} onSave={v => patchItem(item.id, { label: v })} />
                  <div className="item-row__actions">
                    <select
                      className="item-row__type"
                      value={item.item_type}
                      onChange={e => patchItem(item.id, { item_type: e.target.value })}
                      title="Tipo de elemento"
                    >
                      {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {item.item_type === 'rating' && (
                      <span title="Polaridad" style={{ display: 'inline-flex', gap: '2px' }}>
                        {([true, false] as const).map(v => {
                          const active = item.rating_high_is_good === v;
                          return (
                            <button key={String(v)} type="button"
                              title={v ? 'Mayor es mejor' : 'Mayor es peor'}
                              onClick={() => patchItem(item.id, { rating_high_is_good: active ? null : v })}
                              style={{
                                width: '1.5rem', height: '1.5rem', fontSize: 'var(--text-xs)',
                                borderRadius: 'var(--radius-sm)', border: '1px solid',
                                borderColor: active ? (v ? 'var(--color-success)' : 'var(--color-error)') : 'var(--color-border)',
                                background: active ? (v ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)') : 'transparent',
                                color: active ? (v ? 'var(--color-success)' : 'var(--color-error)') : 'var(--color-ink-tertiary)',
                                cursor: 'pointer', fontWeight: 700,
                              }}>
                              {v ? '↑' : '↓'}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.is_active}
                      className={`toggle${item.is_active ? ' toggle--on' : ''}`}
                      onClick={() => patchItem(item.id, { is_active: !item.is_active })}
                      title={item.is_active ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}
                    />
                    <button type="button" className="icon-btn icon-btn--danger item-row__delete"
                      onClick={() => setDeleteTarget({ type: 'item', id: item.id, label: item.label })}
                      title="Quitar elemento">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2.5 4h11M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4m1.5 0-.75 9a1 1 0 0 1-1 .93H5.75a1 1 0 0 1-1-.93L4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.5 7v4M9.5 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {itemsOf(section.id).length === 0 && <p className="text-tertiary text-sm">Sin elementos.</p>}
            </div>

            <div className="add-item add-item--sep">
              <input
                placeholder="Nuevo elemento…"
                value={draft[section.id]?.label || ''}
                onChange={e => setDraft(prev => ({ ...prev, [section.id]: { label: e.target.value, type: prev[section.id]?.type || 'checkbox' } }))}
                onKeyDown={e => { if (e.key === 'Enter') addItem(section.id); }}
              />
              <select
                value={draft[section.id]?.type || 'checkbox'}
                onChange={e => setDraft(prev => ({ ...prev, [section.id]: { label: prev[section.id]?.label || '', type: e.target.value } }))}
              >
                {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="button" className="btn btn-secondary" onClick={() => addItem(section.id)}>Añadir</button>
            </div>
          </section>
        ))}

        <div className="card add-item">
          <input
            placeholder="Nueva sección…"
            value={newSection}
            onChange={e => setNewSection(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSection(); }}
          />
          <button type="button" className="btn btn-primary" onClick={addSection}>Añadir sección</button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'section' ? 'Eliminar sección' : 'Eliminar elemento'}
        message={
          deleteTarget
            ? deleteTarget.type === 'section'
              ? `¿Borrar la sección «${deleteTarget.label}» y todos sus elementos?`
              : `¿Quitar el elemento «${deleteTarget.label}» del checklist?`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ChecklistManager;

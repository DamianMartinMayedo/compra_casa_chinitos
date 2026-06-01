import { useEffect, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface Section { id: string; name: string; sort_order: number; }
interface Item {
  id: string;
  section_id: string;
  label: string;
  item_type: string;
  sort_order: number;
  is_active: boolean;
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
                <div key={item.id} className="item-row">
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
                    <button
                      type="button"
                      className={item.is_active ? 'badge badge-success' : 'badge badge-neutral'}
                      onClick={() => patchItem(item.id, { is_active: !item.is_active })}
                      title="Activar / desactivar"
                    >
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button type="button" className="btn btn-ghost text-sm item-row__delete" onClick={() => setDeleteTarget({ type: 'item', id: item.id, label: item.label })} style={{ color: 'var(--color-error)' }}>
                      Quitar
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

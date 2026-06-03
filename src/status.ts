export type PropertyStatus = 'nueva' | 'por_visitar' | 'me_interesa' | 'descartada';

export const STATUS_META: Record<PropertyStatus, { label: string; badge: string }> = {
  nueva:       { label: 'Nueva',       badge: 'badge-neutral' },
  por_visitar: { label: 'Por visitar', badge: 'badge-accent'  },
  me_interesa: { label: 'Me interesa', badge: 'badge-success' },
  descartada:  { label: 'Descartada',  badge: 'badge-error'   },
};

export const STATUS_ORDER: PropertyStatus[] = ['nueva', 'por_visitar', 'me_interesa', 'descartada'];

export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatVisitDate(value: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(value).toLocaleDateString('es-ES', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatVisitTime(value: string): string {
  return value.slice(0, 5);
}

// Colores de la escala 1-5 según polaridad
// rating_high_is_good = true  → 1=rojo … 5=verde
// rating_high_is_good = false → 1=verde … 5=rojo
// rating_high_is_good = null  → accent (sin polaridad)
const COLORS_GOOD = ['var(--color-error)', 'oklch(0.62 0.15 45)', 'var(--color-warning)', 'oklch(0.58 0.15 140)', 'var(--color-success)'];
const COLORS_BAD  = ['var(--color-success)', 'oklch(0.58 0.15 140)', 'var(--color-warning)', 'oklch(0.62 0.15 45)', 'var(--color-error)'];

export function ratingButtonColor(n: number, polarity: boolean | null | undefined): string {
  if (polarity === true)  return COLORS_GOOD[n - 1];
  if (polarity === false) return COLORS_BAD[n - 1];
  return 'var(--color-accent)';
}

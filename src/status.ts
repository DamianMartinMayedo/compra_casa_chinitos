export type PropertyStatus = 'en_estudio' | 'visitada' | 'descartada';

export const STATUS_META: Record<PropertyStatus, { label: string; badge: string }> = {
  en_estudio: { label: 'En estudio', badge: 'badge-accent' },
  visitada: { label: 'Visitada', badge: 'badge-success' },
  descartada: { label: 'Descartada', badge: 'badge-neutral' },
};

export const STATUS_ORDER: PropertyStatus[] = ['en_estudio', 'visitada', 'descartada'];

// visit_date llega como 'YYYY-MM-DD'; se parsea en horario local para evitar
// que la zona horaria desplace el día.
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatVisitDate(value: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(value).toLocaleDateString('es-ES', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

// Fecha de hoy como 'YYYY-MM-DD' en horario local (para marcar la visita).
export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 'HH:MM:SS' → 'HH:MM'
export function formatVisitTime(value: string): string {
  return value.slice(0, 5);
}

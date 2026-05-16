/** Canonical month key aligned with `months.month_label` / `bills.month_label` (YYYY-MM). */

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

export function assertMonthLabel(value: string): string {
  if (!MONTH_KEY_RE.test(value)) {
    throw new Error(`Invalid month_label: ${value}`);
  }
  return value;
}

export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function currentMonthKeyNow(): string {
  return monthKeyFromDate(new Date());
}

/**
 * Mês encerrado no calendário: `month_label` estritamente anterior ao mês corrente.
 * Alinha PRD §10.3 (somente leitura após o 1º dia do mês seguinte) e §6.8 (meses anteriores).
 * Meses futuros permanecem editáveis (PRD não restringe).
 */
export function isReadOnlyMonth(monthLabel: string, referenceDate: Date = new Date()): boolean {
  assertMonthLabel(monthLabel);
  const current = monthKeyFromDate(referenceDate);
  return monthLabel < current;
}

export function shiftMonthKey(monthLabel: string, deltaMonths: number): string {
  assertMonthLabel(monthLabel);
  const [y, m] = monthLabel.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + deltaMonths, 1, 12, 0, 0, 0);
  return monthKeyFromDate(d);
}

export function formatMonthHeadingPt(monthLabel: string): string {
  assertMonthLabel(monthLabel);
  const [year, month] = monthLabel.split('-').map(Number) as [number, number];
  const d = new Date(year, month - 1, 1, 12, 0, 0, 0);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

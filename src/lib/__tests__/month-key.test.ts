import {
  assertMonthLabel,
  formatMonthHeadingPt,
  isReadOnlyMonth,
  monthKeyFromDate,
  shiftMonthKey,
} from '@/lib/month-key';

describe('month-key', () => {
  it('assertMonthLabel accepts YYYY-MM and returns the same string', () => {
    expect(assertMonthLabel('2026-05')).toBe('2026-05');
  });

  it('assertMonthLabel throws on invalid label', () => {
    expect(() => assertMonthLabel('05-2026')).toThrow(/Invalid month_label/);
  });

  it('monthKeyFromDate formats in local calendar month', () => {
    expect(monthKeyFromDate(new Date(2026, 4, 15, 12, 0, 0, 0))).toBe('2026-05');
  });

  it('isReadOnlyMonth is true when month is strictly before current month', () => {
    const ref = new Date(2026, 4, 10, 12, 0, 0, 0);
    expect(isReadOnlyMonth('2026-03', ref)).toBe(true);
    expect(isReadOnlyMonth('2026-04', ref)).toBe(true);
    expect(isReadOnlyMonth('2026-05', ref)).toBe(false);
    expect(isReadOnlyMonth('2026-06', ref)).toBe(false);
  });

  it('shiftMonthKey moves by calendar months', () => {
    expect(shiftMonthKey('2026-01', 1)).toBe('2026-02');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  });

  it('formatMonthHeadingPt uses pt-BR month and year', () => {
    const s = formatMonthHeadingPt('2026-05');
    expect(s.toLowerCase()).toContain('maio');
    expect(s).toMatch(/2026/);
  });
});

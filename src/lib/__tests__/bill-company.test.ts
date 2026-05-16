import { normalizeBillCompanyKey } from '@/lib/bill-company';

describe('bill-company', () => {
  it('trims and lowercases company name', () => {
    expect(normalizeBillCompanyKey('  Acme Corp  ')).toBe('acme corp');
  });

  it('collapses nothing extra beyond trim + lowercase', () => {
    expect(normalizeBillCompanyKey('ALUGUEL')).toBe('aluguel');
  });
});

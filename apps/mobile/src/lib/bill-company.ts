/** Matches DB unique indexes: lower(trim(company)) per month/member scope. */
export function normalizeBillCompanyKey(company: string): string {
  return company.trim().toLowerCase();
}

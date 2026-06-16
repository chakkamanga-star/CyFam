/**
 * Normalize a raw phone string to a valid 10-digit Indian mobile number.
 *
 * Rules:
 *  - Strip all non-digit characters (+, spaces, dashes, dots…)
 *  - If the result is 12 digits and starts with "91"  → strip "91" prefix
 *  - If the result is 11 digits and starts with  "0"  → strip leading "0"
 *  - If the result is 10 digits starting with 6–9     → valid ✅
 *  - Anything else                                    → null (invalid)
 *
 * Examples:
 *   "+91 8921832998"  → "8921832998"
 *   "918921832998"    → "8921832998"
 *   "08590910187"     → "8590910187"
 *   "9526304058"      → "9526304058"
 *   "+971 586325658"  → null  (non-Indian country code)
 */
export function normalizeIndianPhone(raw: string): string | null {
  // 1. Remove all non-digit characters
  const digits = raw.replace(/\D/g, '');

  let number = digits;

  // 2. Strip country code prefixes
  if (number.length === 12 && number.startsWith('91')) {
    number = number.slice(2);
  } else if (number.length === 11 && number.startsWith('0')) {
    number = number.slice(1);
  }

  // 3. Validate: must be exactly 10 digits starting with 6, 7, 8, or 9
  if (number.length === 10 && /^[6-9]/.test(number)) {
    return number;
  }

  return null;
}

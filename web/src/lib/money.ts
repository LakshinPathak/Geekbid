/**
 * Money arithmetic — always compute in integer minor units (cents) so splits are
 * exact and `gross === platformFee + netAmount` holds to the cent. Amounts are
 * still passed and stored as major units (dollars) at call sites; these helpers
 * just make sure the math never drifts the way chained `x * 0.1` + `.toFixed(2)`
 * does (e.g. `458 * 0.1 === 45.800000000000004`).
 *
 * NOTE: storing money as integer minor units end-to-end (schema + data migration
 * + every UI display) is a larger, separate change. This centralizes and
 * corrects the *computation* in the meantime — the actual source of drift.
 */

export const DEFAULT_PLATFORM_FEE_PERCENT = 10;

/** Dollars → integer cents, rounded to the nearest cent. */
export function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/** Integer cents → dollars (major units). */
export function toDollars(cents: number): number {
  return cents / 100;
}

/** Round a money value to the nearest whole cent (major units). */
export function roundMoney(amount: number): number {
  return toDollars(toCents(amount));
}

/**
 * Split a gross amount into platform fee + net payout using exact cent math.
 * Guarantees `platformFee + netAmount === gross` (to the cent).
 */
export function splitEscrow(
  gross: number,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT
): { gross: number; platformFee: number; netAmount: number } {
  const grossCents = toCents(gross);
  const feeCents = Math.round((grossCents * feePercent) / 100);
  const netCents = grossCents - feeCents;
  return {
    gross: toDollars(grossCents),
    platformFee: toDollars(feeCents),
    netAmount: toDollars(netCents),
  };
}

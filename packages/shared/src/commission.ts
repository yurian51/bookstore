/**
 * Commission math in integer minor units. Basis points: 1000 = 10%.
 * Commission is rounded half-up on the platform side, remainder goes to the seller.
 */
export function splitSale(grossMinor: number, commissionBps: number) {
  const commission = Math.round((grossMinor * commissionBps) / 10_000);
  const sellerNet = grossMinor - commission;
  return { grossMinor, commissionMinor: commission, sellerNetMinor: sellerNet };
}

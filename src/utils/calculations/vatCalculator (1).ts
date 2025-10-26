const VAT_RATE = 0.20;

export function calculateHT(ttc: number): number {
  return ttc / (1 + VAT_RATE);
}

export function calculateTTC(ht: number): number {
  return ht * (1 + VAT_RATE);
}

export function calculateVAT(ht: number): number {
  return ht * VAT_RATE;
}

export function formatWithVAT(amount: number, showVAT: boolean): { ht: number; ttc: number } {
  if (showVAT) {
    return {
      ht: calculateHT(amount),
      ttc: amount
    };
  }
  return {
    ht: amount,
    ttc: amount
  };
}

export { VAT_RATE };

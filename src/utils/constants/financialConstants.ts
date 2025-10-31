export const DEFAULT_FINANCIAL_SETTINGS = {
  baseKwhPrice: 0.22,
  surplusSellPrices: {
    under9kw: 0.04,
    from9to36kw: 0.0617,
    from36to100kw: 0.0617
  },
  totalSellPrices: {
    under9kw: 0,
    from9to36kw: 0.1049,
    from36to100kw: 0.0912
  },
  sellPriceDate: '2025-10-01',
  defaultAutoconsumption: 60,
  defaultEnergyRevaluation: 5,
  defaultSellIndexation: 2,
  defaultPanelDegradation: -0.2
};
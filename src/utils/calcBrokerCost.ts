// src/utils/calcBrokerCost.ts
// ------------------------------------------------------
// Tipos básicos (ajusta se mudares o JSON no futuro)
export type FeePercentWithFree = {
  type: 'percent_with_free';
  free_volume_month: number; // volume grátis / mês (na mesma moeda do ticket)
  over_pct: number;          // percentagem (0.002 = 0,2%)
  over_min: number;          // mínimo por ordem
};

export type FeeFlat = {
  type: 'flat';
  amount: number;            // por ordem
  currency?: 'EUR' | 'USD';
};

export type FeeVariableSpread = {
  type: 'variable_spread';
};

export type FeeNone = {
  type: 'none';
};

export type FeePercentMin = {
  type: 'percent_min';
  pct: number;
  min: number;
};

export type Commission =
  | FeePercentWithFree
  | FeeFlat
  | FeeVariableSpread
  | FeeNone
  | FeePercentMin;

export type FXFee =
  | { type: 'pct'; pct: number; min?: number }
  | { type: 'included' }
  | { type: 'flat'; amount: number };

export type CustodyFee =
  | { type: 'threshold_pct'; free_until: number; pct: number; min_month: number }
  | { type: 'none' };

export interface BrokerFees {
  stocks_eu?: Commission;
  stocks_us?: Commission;
  etfs?: Commission;
  crypto?: Commission;
  forex_cfd?: Commission;
}

export interface BrokerJson {
  nome: string;
  deposito_min: number;
  fees: BrokerFees;
  fx_fee?: FXFee;
  custody?: CustodyFee;
}

export interface Params {
  ordEU: number;
  ticketEU: number;
  ordUS: number;
  ticketUS: number;
  carteira: number;
  fx: boolean;
}

export interface CostResult {
  custo_eu: number;
  custo_us: number;
  cambio: number;
  custodia: number;
  total: number;
}

// ------------------------------------------------------
// Helpers de cálculo
function calcCommissionPercentWithFree(
  fee: FeePercentWithFree,
  ordersPerMonth: number,
  ticket: number
): number {
  const months = 12;
  const volumeYear = ordersPerMonth * ticket * months;
  const freeVolYear = fee.free_volume_month * months;

  if (volumeYear <= freeVolYear) return 0;

  const volumeOver = volumeYear - freeVolYear;
  const pctCost = volumeOver * fee.over_pct;

  // nº ordens acima do “grátis” (aproximação simples)
  const freeOrders = Math.floor(freeVolYear / ticket);
  const ordersOver = Math.max(0, ordersPerMonth * months - freeOrders);
  const minCost = ordersOver * fee.over_min;

  return Math.max(pctCost, minCost);
}

function calcCommissionFlat(fee: FeeFlat, ordersPerMonth: number): number {
  return ordersPerMonth * 12 * fee.amount;
}

function calcCommissionPercentMin(fee: FeePercentMin, ordersPerMonth: number, ticket: number): number {
  const months = 12;
  const base = ordersPerMonth * ticket * months * fee.pct;
  const minTotal = ordersPerMonth * months * fee.min;
  return Math.max(base, minTotal);
}

function commissionCost(
  commission: Commission | undefined,
  ordersPerMonth: number,
  ticket: number
): number {
  if (!commission) return 0;
  switch (commission.type) {
    case 'percent_with_free':
      return calcCommissionPercentWithFree(commission, ordersPerMonth, ticket);
    case 'flat':
      return calcCommissionFlat(commission, ordersPerMonth);
    case 'percent_min':
      return calcCommissionPercentMin(commission, ordersPerMonth, ticket);
    case 'variable_spread':
    case 'none':
    default:
      return 0;
  }
}

function fxCost(fx: FXFee | undefined, totalVolumeEUR: number): number {
  if (!fx) return 0;
  switch (fx.type) {
    case 'pct': {
      const base = totalVolumeEUR * fx.pct;
      return fx.min ? Math.max(base, fx.min) : base;
    }
    case 'flat':
      return fx.amount;
    case 'included':
    default:
      return 0;
  }
}

function custodyCost(c: CustodyFee | undefined, carteira: number): number {
  if (!c) return 0;
  if (c.type === 'none') return 0;

  const months = 12;
  if (carteira <= c.free_until) return 0;

  const excedente = carteira - c.free_until;
  const anualPct = excedente * c.pct;
  const minAnual = c.min_month * months;
  return Math.max(anualPct, minAnual);
}

// ------------------------------------------------------
// Função principal
export function calcBrokerCost(broker: BrokerJson, p: Params): CostResult {
  // Comissões
  const custoEU = commissionCost(broker.fees.stocks_eu, p.ordEU, p.ticketEU);
  const custoUS = commissionCost(broker.fees.stocks_us, p.ordUS, p.ticketUS);

  // FX (estimativa simples: volume total em EUR que está sujeito a câmbio)
  const volumeEUR = p.ordEU * p.ticketEU * 12;
  const volumeUSD_EUR = p.ordUS * p.ticketUS * 12; // assumes USD ~ EUR for simple calc or podes aplicar taxa
  const volumeTotalParaFx = p.fx ? volumeEUR + volumeUSD_EUR : 0;
  const cambio = fxCost(broker.fx_fee, volumeTotalParaFx);

  // Custódia
  const custodia = custodyCost(broker.custody, p.carteira);

  // Total (tudo em EUR para simplificar)
  const total = custoEU + custoUS + cambio + custodia;

  return { custo_eu: custoEU, custo_us: custoUS, cambio, custodia, total };
}

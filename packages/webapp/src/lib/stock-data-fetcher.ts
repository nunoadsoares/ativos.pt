// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\lib\stock-data-fetcher.ts
import yahooFinance from 'yahoo-finance2';
import { db } from './db';

// ... (todo o código de tipos e interfaces permanece exatamente igual) ...
/* ===== cache windows ============================================ */
const FUNDAMENTALS_CACHE_HOURS = 24;
const QUOTE_CACHE_MINUTES   = 2;
const HISTORICAL_CACHE_HOURS    = 12;
const RESEARCH_CACHE_HOURS  = 12;
export interface QuoteData {
    latestValue:    number;
    change:         number;
    changePercent: number;
    latestDate:     Date;
    currency:       string;
}
export interface HistoricalPoint {
    date:   string;
    value: number;
}
export interface FinancialData {
    ticker:              string;
    name:                string;
    exchange:            string;
    website?:            string;
    marketCap?:          number | null;
    beta?:               number | null;
    trailingPE?:         number | null;
    trailingEps?:        number | null;
    dividendYield?:      number | null;
    fiftyTwoWeekLow?:    number | null;
    fiftyTwoWeekHigh?:   number | null;
    averageVolume?:      number | null;
    currentPrice?:       number | null;
    priceToSales?:       number | null;
    priceToBook?:        number | null;
    enterpriseValue?:    number | null;
    enterpriseToRevenue?: number | null;
    enterpriseToEbitda?:  number | null;
    totalRevenue?:       number | null;
    revenuePerShare?:    number | null;
    revenueGrowth?:      number | null;
    grossProfit?:        number | null;
    ebitda?:             number | null;
    netIncomeToCommon?:     number | null;
    profitMargins?:      number | null;
    operatingMargins?:   number | null;
    returnOnAssets?:     number | null;
    returnOnEquity?:     number | null;
    totalDebt?:          number | null;
    debtToEquity?:       number | null;
    currentRatio?:       number | null;
}
export interface EpsQuarter {
    quarter:     string;
    actual?:     number | null;
    estimate?:   number | null;
    surprise?:   number | null;
    surprisePct?: number | null;
    endDate?:    string | null;
}
export interface RevenueEarningsPoint {
    quarter: string;
    revenue: number;
    earnings: number;
}
export interface RecommendationTrend {
    period:       string;
    strongBuy:  number;
    buy:          number;
    hold:         number;
    underperform: number;
    sell:         number;
}
export interface PriceTarget {
    low?:         number | null;
    high?:        number | null;
    mean?:        number | null;
    median?:      number | null;
    currentPrice?: number | null;
    currency?:    string | null;
}
export interface CalendarEvent {
    earningsDate: Date | null;
}
export interface InstitutionalOwner {
    organization: string;
    pctHeld: number | null;
}
export interface ResearchData {
    epsHistory:             EpsQuarter[];
    recommendations:        RecommendationTrend[];
    priceTarget:            PriceTarget;
    revenueEarningsHistory: RevenueEarningsPoint[];
    calendarEvents:         CalendarEvent;
    topInstitutions:        InstitutionalOwner[];
}
export interface MoverData {
    ticker: string;
    name: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
}
export interface PortugueseStock {
    ticker: string;
    name: string;
    price: number | null;
    changePercent: number | null;
    logoUrl: string;
}
function isCacheValid(ts: string | null, minutes: number): boolean {
    if (!ts) return false;
    return (Date.now() - new Date(ts).getTime()) / 60000 < minutes;
}
function pickRawValue(value: any): number | null {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value.raw === 'number') return value.raw;
    return null;
}
export async function getQuoteData(ticker: string): Promise<QuoteData> {
    if (!ticker || typeof ticker !== 'string' || ticker.toLowerCase() === 'undefined') {
        throw new Error(`Ticker inválido fornecido: ${ticker}`);
    }
    const key = `quote_${ticker}`;
    const row = db.prepare('SELECT value, reference_date FROM key_indicators WHERE indicator_key = ?').get(key) as { value: string; reference_date: string } | undefined;
    if (row && isCacheValid(row.reference_date, QUOTE_CACHE_MINUTES)) {
        const parsed = JSON.parse(row.value);
        return { ...parsed, latestDate: new Date(row.reference_date) };
    }
    const q = await yahooFinance.quote(ticker);
    if (!q) {
        throw new Error(`Sem dados da API para o ticker ${ticker}`);
    }
    const out: QuoteData = {
        latestValue:   q.regularMarketPrice ?? 0,
        change:        q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        currency:      q.currency ?? 'USD',
        latestDate:    new Date(q.regularMarketTime ?? Date.now()),
    };
    db.prepare(`INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, reference_date, updated_at) VALUES (?, ?, ?, ?, ?)`).run(key, 'quote', JSON.stringify(out), out.latestDate.toISOString(), new Date().toISOString());
    return out;
}
export async function getChartData(ticker: string): Promise<HistoricalPoint[]> {
    const key = `hist_${ticker}`;
    const last = db.prepare('SELECT date FROM historical_series WHERE series_key = ? ORDER BY date DESC LIMIT 1').get(key) as { date: string } | undefined;
    if (last && isCacheValid(last.date, HISTORICAL_CACHE_HOURS * 60)) {
        return db.prepare('SELECT date, value FROM historical_series WHERE series_key = ? ORDER BY date ASC').all(key) as HistoricalPoint[];
    }
    const chart = await yahooFinance.chart(ticker, { period1: '2000-01-01' });
    const quotes = chart?.quotes ?? [];
    const tx = db.transaction((qs: any[]) => {
        const st = db.prepare(`INSERT OR REPLACE INTO historical_series (series_key, date, value) VALUES (?, ?, ?)`);
        qs.forEach(q => { if (q.adjclose != null) { st.run(key, q.date.toISOString().slice(0,10), q.adjclose); } });
    });
    tx(quotes);
    return quotes.filter(q => q.adjclose != null).map(q => ({ date:   q.date.toISOString().slice(0,10), value: q.adjclose! }));
}
export async function getFinancialData(ticker: string): Promise<FinancialData> {
    const key = `fin_${ticker}_v2_full`;
    const row = db.prepare('SELECT value, reference_date FROM key_indicators WHERE indicator_key = ?').get(key) as { value: string; reference_date: string } | undefined;
    if (row && isCacheValid(row.reference_date, FUNDAMENTALS_CACHE_HOURS * 60)) {
        return JSON.parse(row.value);
    }
    const [q, sum] = await Promise.all([
        yahooFinance.quote(ticker),
        yahooFinance.quoteSummary(ticker, {
            modules: [ 'assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'balanceSheetHistoryQuarterly', 'earningsTrend' ],
        }),
    ]);
    if (!q || !sum) {
        throw new Error(`Sem dados financeiros da API para o ticker ${ticker}`);
    }
    const balSheet = sum.balanceSheetHistoryQuarterly?.balanceSheetStatements[0];
    const trend = sum.earningsTrend?.trend.find(t => t.period === '+1y');
    const totalDebt = pickRawValue(balSheet?.totalLiab);
    const stockholderEquity = pickRawValue(balSheet?.totalStockholderEquity);
    const currentAssets = pickRawValue(balSheet?.totalCurrentAssets);
    const currentLiabilities = pickRawValue(balSheet?.totalCurrentLiabilities);
    const out: FinancialData = {
        ticker:              q.symbol, name: q.longName ?? q.shortName ?? ticker, exchange: q.exchange,
        website:             sum.assetProfile?.website,
        marketCap:           pickRawValue(q.marketCap), beta: pickRawValue(sum.summaryDetail?.beta),
        trailingPE:          pickRawValue(sum.summaryDetail?.trailingPE), trailingEps: pickRawValue(q.epsTrailingTwelveMonths),
        dividendYield:   pickRawValue(sum.summaryDetail?.dividendYield), fiftyTwoWeekLow: pickRawValue(sum.summaryDetail?.fiftyTwoWeekLow),
        fiftyTwoWeekHigh:  pickRawValue(sum.summaryDetail?.fiftyTwoWeekHigh), averageVolume: pickRawValue(sum.summaryDetail?.averageVolume),
        currentPrice:      pickRawValue(sum.financialData?.currentPrice), priceToSales: pickRawValue((sum.defaultKeyStatistics as any)?.priceToSalesTrailing12Months),
        priceToBook:         pickRawValue(sum.defaultKeyStatistics?.priceToBook), enterpriseValue: pickRawValue(sum.defaultKeyStatistics?.enterpriseValue),
        enterpriseToRevenue: pickRawValue(sum.defaultKeyStatistics?.enterpriseToRevenue), enterpriseToEbitda: pickRawValue(sum.defaultKeyStatistics?.enterpriseToEbitda),
        totalRevenue:      pickRawValue(sum.financialData?.totalRevenue), revenuePerShare: pickRawValue(sum.financialData?.revenuePerShare),
        revenueGrowth:   pickRawValue(trend?.revenueEstimate?.growth), grossProfit: pickRawValue(sum.financialData?.grossProfits),
        ebitda:              pickRawValue(sum.financialData?.ebitda), netIncomeToCommon: pickRawValue(sum.defaultKeyStatistics?.netIncomeToCommon),
        profitMargins:   pickRawValue(sum.defaultKeyStatistics?.profitMargins), operatingMargins: pickRawValue(sum.financialData?.operatingMargins),
        returnOnAssets:    pickRawValue(sum.financialData?.returnOnAssets), returnOnEquity: pickRawValue(sum.financialData?.returnOnEquity),
        totalDebt:           totalDebt,
        debtToEquity:      totalDebt != null && stockholderEquity != null && stockholderEquity !== 0 ? totalDebt / stockholderEquity : null,
        currentRatio:      currentAssets != null && currentLiabilities != null && currentLiabilities !== 0 ? currentAssets / currentLiabilities : null,
    };
    db.prepare(`INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, reference_date, updated_at) VALUES (?, ?, ?, ?, ?)`).run(key, 'financials', JSON.stringify(out), new Date().toISOString(), new Date().toISOString());
    return out;
}
export async function getResearchData(ticker: string): Promise<ResearchData> {
    const key = `research_${ticker}_v19_currency`;
    const row = db.prepare('SELECT value, reference_date FROM key_indicators WHERE indicator_key = ?').get(key) as { value: string; reference_date: string } | undefined;
    if (row && isCacheValid(row.reference_date, RESEARCH_CACHE_HOURS * 60)) {
        const res = JSON.parse(row.value);
        if (res.calendarEvents?.earningsDate) {
            res.calendarEvents.earningsDate = new Date(res.calendarEvents.earningsDate);
        }
        return res;
    }
    const ySum = await yahooFinance.quoteSummary(ticker, {
        modules: [ 'earningsHistory', 'recommendationTrend', 'financialData', 'incomeStatementHistoryQuarterly', 'calendarEvents', 'institutionOwnership' ],
    });
    if (!ySum) {
        throw new Error(`Sem dados de research da API para o ticker ${ticker}`);
    }
    const epsHistory: EpsQuarter[] = (ySum.earningsHistory?.history ?? []).slice(-4).map((h: any) => ({
        quarter: h.quarter?.fmt ?? h.quarter, actual: pickRawValue(h.epsActual), 
        estimate: pickRawValue(h.epsEstimate), surprise: pickRawValue(h.epsDifference), 
        surprisePct: pickRawValue(h.surprisePercent), endDate: h.endDate?.fmt ?? null,
    }));
    const recommendations: RecommendationTrend[] = (ySum.recommendationTrend?.trend ?? []).slice(0, 4).map((t: any) => ({
        period: t.period, strongBuy: t.strongBuy, buy: t.buy, hold: t.hold, underperform: t.underPerform ?? 0, sell: t.sell,
    }));
    const priceTarget: PriceTarget = {
        low: pickRawValue(ySum.financialData?.targetLowPrice), 
        high: pickRawValue(ySum.financialData?.targetHighPrice),
        mean: pickRawValue(ySum.financialData?.targetMeanPrice), 
        median: pickRawValue(ySum.financialData?.targetMedianPrice),
        currentPrice: pickRawValue(ySum.financialData?.currentPrice),
        currency: ySum.financialData?.financialCurrency ?? 'USD',
    };
    
    // --- INÍCIO DA CORREÇÃO DEFINITIVA (BASEADA NO SEU TESTE) ---
    const revenueEarningsHistory: RevenueEarningsPoint[] = (ySum.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? [])
        .map((item: any) => {
            // CORREÇÃO: Lê os valores diretamente, sem '.raw' ou 'pickRawValue'
            const revenue = item.totalRevenue;
            const earnings = item.netIncome;
            // CORREÇÃO: Converte a string da data para um objeto Date
            const dateObj = item.endDate ? new Date(item.endDate) : null;
            
            if (dateObj === null || revenue === null || earnings === null) {
                return null;
            }

            const yr = String(dateObj.getFullYear()).slice(-2);
            const qn = 'Q' + (Math.floor(dateObj.getMonth() / 3) + 1);
            return { quarter: `${qn} ${yr}`, revenue, earnings, _date: dateObj };
        })
        .filter((item): item is Exclude<typeof item, null> => item !== null)
        .sort((a, b) => a._date.getTime() - b._date.getTime())
        .slice(-6)
        .map(({ _date, ...rest }) => rest);
    // --- FIM DA CORREÇÃO DEFINITIVA ---
        
    const earningsDateTimestamp = pickRawValue(ySum.calendarEvents?.earnings?.earningsDate?.[0]);
    const calendarEvents: CalendarEvent = {
        earningsDate: earningsDateTimestamp ? new Date(earningsDateTimestamp * 1000) : null,
    };
    const topInstitutions: InstitutionalOwner[] = (ySum.institutionOwnership?.ownershipList ?? []).slice(0, 5).map((owner: any) => ({
        organization: owner.organization,
        pctHeld: pickRawValue(owner.pctHeld),
    }));
    const out: ResearchData = { epsHistory, recommendations, priceTarget, revenueEarningsHistory, calendarEvents, topInstitutions };
    
    db.prepare(`INSERT OR REPLACE INTO key_indicators (indicator_key, label, value, reference_date, updated_at) VALUES (?,?,?,?,?)`).run(key, 'research', JSON.stringify(out), new Date().toISOString(), new Date().toISOString());
    return out;
}
export async function getStockPageData(ticker: string) {
    const [financials, quote, chart, research] = await Promise.all([
        getFinancialData(ticker), getQuoteData(ticker), getChartData(ticker), getResearchData(ticker),
    ]);
    return { financials, quote, chart, research };
}
export async function getIndexPageData() {
    const portugueseTickers = ['EDP.LS', 'JMT.LS', 'GALP.LS', 'BCP.LS', 'CTT.LS', 'NOS.LS'];
    let topGainers: MoverData[] = [];
    let trendingPortugal: MoverData[] = [];
    const validationOptions = { validateResult: false };
    const [usGainersResult, ptTrendingResult, ptQuotes] = await Promise.all([
        yahooFinance.screener({ scrIds: 'day_gainers', count: 6 }, validationOptions).catch(() => null),
        yahooFinance.screener({ scrIds: 'most_actives', count: 6, region: 'PT' }, validationOptions).catch(() => null),
        yahooFinance.quote(portugueseTickers).catch(() => [])
    ]);
    if (usGainersResult) {
        topGainers = (usGainersResult.quotes as any[] || []).map(q => ({
            ticker: q.symbol, name: q.shortName || q.longName || q.symbol,
            price: pickRawValue(q.regularMarketPrice), change: pickRawValue(q.regularMarketChange),
            changePercent: pickRawValue(q.regularMarketChangePercent),
        }));
    }
    if (ptTrendingResult) {
        trendingPortugal = (ptTrendingResult.quotes as any[] || []).map(q => ({
            ticker: q.symbol, name: q.shortName || q.longName || q.symbol,
            price: pickRawValue(q.regularMarketPrice), change: pickRawValue(q.regularMarketChange),
            changePercent: pickRawValue(q.regularMarketChangePercent),
        }));
    }
    const portugueseStocks: PortugueseStock[] = ptQuotes.map(q => ({
        ticker: q.symbol, name: q.shortName || q.longName || q.symbol,
        price: pickRawValue(q.regularMarketPrice),
        changePercent: pickRawValue(q.regularMarketChangePercent),
        logoUrl: '' 
    }));
    if (trendingPortugal.length === 0 && portugueseStocks.length > 0) {
        trendingPortugal = ptQuotes.map(q => ({
            ticker: q.symbol, name: q.shortName || q.longName || q.symbol,
            price: q.regularMarketPrice ?? null, change: q.regularMarketChange ?? null,
            changePercent: q.regularMarketChangePercent ?? null,
        }));
    }
    const logoMap: Record<string, string> = {
        'EDP.LS': 'edp.com', 'JMT.LS': 'jeronimomartins.com', 'GALP.LS': 'galp.com',
        'BCP.LS': 'millenniumbcp.pt', 'CTT.LS': 'ctt.pt', 'NOS.LS': 'nos.pt',
    };
    portugueseStocks.forEach(stock => {
        if (logoMap[stock.ticker]) {
            stock.logoUrl = `https://logo.clearbit.com/${logoMap[stock.ticker]}`;
        }
    });
    return { topGainers, trendingPortugal, portugueseStocks };
}
async function getSparklineData(ticker: string): Promise<number[]> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const chart = await yahooFinance.chart(ticker, { 
            period1: thirtyDaysAgo.toISOString().slice(0, 10) 
        });
        return chart.quotes.map(q => q.close ?? 0).filter(v => v > 0);
    } catch (e: any) {
        return [];
    }
}
async function getLogoForTicker(ticker: string): Promise<string> {
    try {
        const financials = await getFinancialData(ticker);
        if (financials.website) {
            const domain = new URL(financials.website).hostname;
            return `https://logo.clearbit.com/${domain}`;
        }
    } catch (e: any) {
    }
    return '';
}
export interface HomepageStockData {
    ticker: string;
    name: string;
    price: number | null;
    changePercent: number | null;
    logoUrl: string;
    sparkline: number[];
}
export async function getHomepageData() {
    const { topGainers: baseTopGainers, portugueseStocks: basePortugueseStocks } = await getIndexPageData();
    const portugueseStocks: HomepageStockData[] = await Promise.all(
        basePortugueseStocks.map(async (stock) => {
            const [sparkline, logoUrl] = await Promise.all([
                getSparklineData(stock.ticker),
                getLogoForTicker(stock.ticker)
            ]);
            return {
                ...stock,
                sparkline,
                logoUrl: logoUrl || stock.logoUrl,
            };
        })
    );
    const topGainers: HomepageStockData[] = await Promise.all(
        baseTopGainers.map(async (stock) => {
            const [sparkline, logoUrl] = await Promise.all([
                getSparklineData(stock.ticker),
                getLogoForTicker(stock.ticker)
            ]);
            return {
                ...stock,
                price: stock.price,
                changePercent: stock.changePercent,
                sparkline,
                logoUrl,
            };
        })
    );
    return { portugueseStocks, topGainers };
}
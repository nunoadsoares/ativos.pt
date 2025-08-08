// Ficheiro: test-api.mjs (Missão: Construir o Hub)

import yahooFinance from 'yahoo-finance2';

async function explorarHub() {
    const validationOptions = { validateResult: false };

    console.log(`\n--- 1. A explorar o Screener (Ações Europeias de Grande Capitalização) ---`);
    try {
        const screenerResult = await yahooFinance.screener({
            count: 6,
            scrIds: 'large_cap_european_equities', // Um screener pré-definido
        }, validationOptions);
        console.log("[SUCESSO] 'screener' respondeu com:", JSON.stringify(screenerResult, null, 2));
    } catch (e) {
        console.error("[FALHA] Erro ao buscar 'screener':", e);
    }

    console.log(`\n--- 2. A explorar Top Gainers (EUA) ---`);
    try {
        const gainersResult = await yahooFinance.dailyGainers({ count: 6, region: 'US' }, validationOptions);
        console.log("[SUCESSO] 'dailyGainers' respondeu com:", JSON.stringify(gainersResult, null, 2));
    } catch (e) {
        console.error("[FALHA] Erro ao buscar 'dailyGainers':", e);
    }

    console.log(`\n--- 3. A explorar Top Losers (EUA) ---`);
    try {
        const losersResult = await yahooFinance.dailyLosers({ count: 6, region: 'US' }, validationOptions);
        console.log("[SUCESSO] 'dailyLosers' respondeu com:", JSON.stringify(losersResult, null, 2));
    } catch (e) {
        console.error("[FALHA] Erro ao buscar 'dailyLosers':", e);
    }

    console.log(`\n--- 4. A explorar Próximos Eventos (Empresas Populares) ---`);
    try {
        const tickersPopulares = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'EDP.LS', 'GALP.LS'];
        const eventsResult = await yahooFinance.quoteSummary(tickersPopulares, {
            modules: ['calendarEvents'],
        });
        console.log("[SUCESSO] 'calendarEvents' para vários tickers respondeu com:", JSON.stringify(eventsResult, null, 2));
    } catch (e) {
        console.error("[FALHA] Erro ao buscar 'calendarEvents':", e);
    }
}

explorarHub();
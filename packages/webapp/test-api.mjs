// Ficheiro: debug-revenue.mjs (Missão: Descobrir a estrutura da receita/lucro)
import yahooFinance from 'yahoo-finance2';

async function investigarReceita() {
    const ticker = 'AAPL'; // Usamos um ticker fiável como a Apple para o teste
    console.log(`--- A investigar o módulo 'incomeStatementHistoryQuarterly' para o ticker: ${ticker} ---`);

    try {
        const result = await yahooFinance.quoteSummary(ticker, {
            modules: ['incomeStatementHistoryQuarterly'],
        });

        // Vamos mostrar a estrutura completa e exata que a API nos devolve
        console.log("[SUCESSO] A API respondeu com a seguinte estrutura:");
        console.log(JSON.stringify(result.incomeStatementHistoryQuarterly, null, 2));

    } catch (e) {
        console.error("[FALHA] Erro ao investigar o módulo:", e);
    }
}

investigarReceita();
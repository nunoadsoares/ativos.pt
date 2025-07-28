import { useState } from 'react';

// Este é um componente React. Todo o código aqui é executado no browser do utilizador.

export default function CalculadoraMaisValias() {
  // Usamos 'useState' para guardar os valores dos inputs
  const [valorCompra, setValorCompra] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [despesas, setDespesas] = useState('');
  
  // State para guardar o resultado do cálculo
  const [resultado, setResultado] = useState(null);

  const calcular = (e) => {
    e.preventDefault(); // Impede o formulário de recarregar a página

    const compra = parseFloat(valorCompra) || 0;
    const venda = parseFloat(valorVenda) || 0;
    const encargos = parseFloat(despesas) || 0;

    const maisValiaBruta = venda - compra - encargos;
    const imposto = maisValiaBruta > 0 ? maisValiaBruta * 0.28 : 0;
    const maisValiaLiquida = maisValiaBruta - imposto;

    setResultado({
      bruta: maisValiaBruta.toFixed(2),
      imposto: imposto.toFixed(2),
      liquida: maisValiaLiquida.toFixed(2),
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
      <form onSubmit={calcular} className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Calculadora de Mais-Valias (28%)</h2>
        
        {/* Inputs do Formulário */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="valor-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de Compra (€)</label>
            <input 
              type="number" 
              id="valor-compra"
              value={valorCompra}
              onChange={(e) => setValorCompra(e.target.value)}
              placeholder="Ex: 5000"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              required 
            />
          </div>
          <div>
            <label htmlFor="valor-venda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de Venda (€)</label>
            <input 
              type="number" 
              id="valor-venda"
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
              placeholder="Ex: 7500"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              required 
            />
          </div>
        </div>
        <div>
          <label htmlFor="despesas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Despesas com Compra e Venda (€)</label>
          <input 
            type="number" 
            id="despesas"
            value={despesas}
            onChange={(e) => setDespesas(e.target.value)}
            placeholder="Comissões da corretora, etc."
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Botão de Submissão */}
        <div className="text-center">
            <button type="submit" className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-base font-bold rounded-full text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all">
              Calcular
            </button>
        </div>
      </form>
      
      {/* Secção de Resultados */}
      {resultado && (
        <div className="mt-8 pt-6 border-t border-dashed border-gray-300 dark:border-gray-600">
          <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white">Resultado</h3>
          <div className={`mt-4 p-4 rounded-lg text-center ${resultado.bruta > 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600 dark:text-gray-300">Mais/Menos Valia Bruta:</dt>
                <dd className="font-bold text-lg text-gray-900 dark:text-white">{resultado.bruta} €</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-600 dark:text-gray-300">Imposto a Pagar (28%):</dt>
                <dd className="font-bold text-lg text-red-600 dark:text-red-400">{resultado.imposto} €</dd>
              </div>
              <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                <dt className="font-bold text-gray-900 dark:text-white">Valor Líquido:</dt>
                <dd className="font-bold text-xl text-green-700 dark:text-green-400">{resultado.liquida} €</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

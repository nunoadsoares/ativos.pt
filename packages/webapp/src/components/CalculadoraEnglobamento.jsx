import { useState, useMemo } from 'react';
// Importa os dados diretamente dos ficheiros JSON que criámos
import tabelasAgoSet from '../data/tabelas_irs_ago-set.json';
import tabelasOutDez from '../data/tabelas_irs_out-dez.json';

// --- Lógica de Cálculo do IRS (função auxiliar) ---
function calcularIRS(rendimentoColetavel, estadoCivil, tabelas) {
  // Determina qual a tabela a usar com base no estado civil
  const tabelaKey = estadoCivil === 'casado' ? 'casado_1_titular' : 'nao_casado_sem_dependentes';
  const escaloes = tabelas.tabelas.trabalho_dependente[tabelaKey];

  if (!escaloes || escaloes.length === 0) return 0;

  // Encontra o escalão correto para o rendimento
  const escalao = escaloes.find(e => rendimentoColetavel <= e.remuneracao_ate) || escaloes[escaloes.length - 1];
  
  // Fórmula de cálculo do IRS
  const imposto = (rendimentoColetavel * escalao.taxa) - escalao.parcela_abater;
  
  return Math.max(0, imposto); // Garante que o imposto não é negativo
}


// --- Componente Principal da Calculadora ---
export default function CalculadoraEnglobamento() {
  // Estados para guardar os valores dos inputs
  const [valorCompra, setValorCompra] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [despesas, setDespesas] = useState('');
  const [outrosRendimentos, setOutrosRendimentos] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('solteiro');
  
  // Estado para guardar o resultado
  const [resultado, setResultado] = useState(null);

  // Seleciona as tabelas corretas com base na data atual (placeholder para 2025)
  // No futuro, esta lógica pode ser mais dinâmica
  const tabelasAtuais = tabelasOutDez; 

  const calcular = (e) => {
    e.preventDefault();

    const compra = parseFloat(valorCompra) || 0;
    const venda = parseFloat(valorVenda) || 0;
    const encargos = parseFloat(despesas) || 0;
    const rendimentoBase = parseFloat(outrosRendimentos) || 0;

    const maisValia = venda - compra - encargos;

    if (maisValia <= 0) {
      setResultado({
        maisValia: maisValia.toFixed(2),
        impostoAutonomo: 0,
        impostoEnglobamento: 0,
        poupanca: 0,
        vantagem: 'Nenhuma (não há mais-valia a tributar)'
      });
      return;
    }

    // --- Cálculo 1: Tributação Autónoma ---
    const impostoAutonomo = maisValia * 0.28;

    // --- Cálculo 2: Com Englobamento ---
    const quociente = estadoCivil === 'casado' ? 2 : 1;
    const rendimentoColetavelBase = rendimentoBase / quociente;
    const maisValiaRelevante = maisValia; // Em ações e ETFs é 50%, mas para simplificar e ser conservador usamos 100% no cálculo geral
    
    const rendimentoColetavelTotal = (rendimentoBase + maisValiaRelevante) / quociente;
    
    const irsTotalEnglobado = calcularIRS(rendimentoColetavelTotal, estadoCivil, tabelasAtuais) * quociente;
    const irsBase = calcularIRS(rendimentoColetavelBase, estadoCivil, tabelasAtuais) * quociente;
    
    const impostoEnglobamento = irsTotalEnglobado - irsBase;

    // --- Comparação e Resultado Final ---
    const poupanca = impostoAutonomo - impostoEnglobamento;
    const vantagem = poupanca > 0 ? 'Englobamento' : 'Taxa Autónoma (28%)';

    setResultado({
      maisValia: maisValia.toFixed(2),
      impostoAutonomo: impostoAutonomo.toFixed(2),
      impostoEnglobamento: impostoEnglobamento.toFixed(2),
      poupanca: Math.abs(poupanca).toFixed(2),
      vantagem: vantagem
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
      <form onSubmit={calcular} className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Calculadora: Englobar Mais-Valias?</h2>
        
        {/* Inputs do Formulário */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label htmlFor="valor-venda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de Venda (€)</label>
            <input type="number" id="valor-venda" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="10000" required className="mt-1 block w-full input-field" />
          </div>
          <div>
            <label htmlFor="valor-compra" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de Compra (€)</label>
            <input type="number" id="valor-compra" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} placeholder="7000" required className="mt-1 block w-full input-field" />
          </div>
           <div>
            <label htmlFor="despesas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Despesas (€)</label>
            <input type="number" id="despesas" value={despesas} onChange={(e) => setDespesas(e.target.value)} placeholder="50" className="mt-1 block w-full input-field" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
                <label htmlFor="outros-rendimentos" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Outros Rendimentos Anuais Brutos (€)</label>
                <input type="number" id="outros-rendimentos" value={outrosRendimentos} onChange={(e) => setOutrosRendimentos(e.target.value)} placeholder="20000" required className="mt-1 block w-full input-field" />
            </div>
            <div>
                <label htmlFor="estado-civil" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado Civil (declaração)</label>
                <select id="estado-civil" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className="mt-1 block w-full input-field">
                    <option value="solteiro">Solteiro / Não Casado</option>
                    <option value="casado">Casado (2 titulares)</option>
                </select>
            </div>
        </div>

        <div className="text-center pt-2">
            <button type="submit" className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-base font-bold rounded-full text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all">
              Simular
            </button>
        </div>
      </form>
      
      {resultado && (
        <div className="mt-8 pt-6 border-t border-dashed border-gray-300 dark:border-gray-600">
          <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-4">Resultado da Simulação</h3>
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-300">Mais-Valia a tributar:</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{resultado.maisValia} €</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Tributação Autónoma */}
            <div className={`p-4 rounded-lg text-center border-2 ${resultado.vantagem === 'Taxa Autónoma (28%)' ? 'border-primary bg-primary/10' : 'bg-gray-100 dark:bg-gray-700/50 border-transparent'}`}>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Taxa Autónoma (28%)</h4>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{resultado.impostoAutonomo} €</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Imposto a Pagar</p>
            </div>
            
            {/* Card Englobamento */}
            <div className={`p-4 rounded-lg text-center border-2 ${resultado.vantagem === 'Englobamento' ? 'border-primary bg-primary/10' : 'bg-gray-100 dark:bg-gray-700/50 border-transparent'}`}>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Com Englobamento</h4>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{resultado.impostoEnglobamento} €</p>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Imposto a Pagar</p>
            </div>
          </div>
          
          <div className={`mt-6 p-4 rounded-lg text-center ${resultado.poupanca > 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
            <h4 className="font-bold text-lg text-gray-900 dark:text-white">Recomendação</h4>
            <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-2">{resultado.vantagem}</p>
            {resultado.poupanca > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Poupança estimada: {resultado.poupanca} €</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
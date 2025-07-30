import { useState, useEffect } from 'react';
import tabelasAgoSet from '../data/tabelas_irs_ago-set.json';
import tabelasOutDez from '../data/tabelas_irs_out-dez.json';

// --- Constantes e Funções de Cálculo ---
const SS_TAXA_DEPENDENTE_DEFAULT = 0.11;
const SS_TAXA_INDEPENDENTE = 0.214;
const LIMITE_ISENCAO_SUB_ALIM_DINHEIRO = 6.00;
const LIMITE_ISENCAO_SUB_ALIM_CARTAO = 10.20;
const IRS_JOVEM_ISENCOES = { 1: 1, 2: 0.75, 3: 0.5, 4: 0.5, 5: 0.25 };

function calcularRetencao(baseTributavel, estadoCivil, numDependentes, tabelas) {
    const tabelaKey = estadoCivil.startsWith('casado_1') ? 'casado_1_titular' : 'nao_casado_sem_dependentes';
    const escaloes = tabelas.tabelas.trabalho_dependente[tabelaKey];
    if (!escaloes || !escaloes.length) return 0;
    const escalao = escaloes.find(e => baseTributavel <= e.remuneracao_ate) || escaloes[escaloes.length - 1];
    const retencaoBase = (baseTributavel * escalao.taxa) - escalao.parcela_abater;
    const deducaoDependentes = numDependentes * (escalao.parcela_dependente || 0);
    return Math.max(0, retencaoBase - deducaoDependentes);
}

const Tooltip = ({ text }) => (
  <span className="group relative">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 p-3 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
      {text}
    </span>
  </span>
);

const DonutChart = ({ data, totalValue }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;
    let accumulated = 0;
    const segments = data.map(item => {
        const percentage = (item.value / total) * 100;
        return { ...item, percentage, dashArray: `${percentage} ${100 - percentage}` };
    });

    return (
        <div className="flex justify-center items-center">
            <div className="relative w-48 h-48 aspect-square">
                <svg viewBox="0 0 36 36" className="transform -rotate-90 w-full h-full">
                    {segments.map((segment, index) => {
                        const dashOffset = 25 - accumulated;
                        accumulated += segment.percentage;
                        return (
                            <circle key={index} cx="18" cy="18" r="15.915" fill="transparent" stroke={segment.color} strokeWidth="5" strokeDasharray={segment.dashArray} strokeDashoffset={dashOffset} />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalValue.toFixed(2)}€</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Salário Líquido</span>
                </div>
            </div>
        </div>
    );
};

export default function CalculadoraSalarioLiquidoAvancada() {
    const [inputs, setInputs] = useState({
        salarioBase: '2000',
        tipoTrabalhador: 'dependente',
        taxaSS: (SS_TAXA_DEPENDENTE_DEFAULT * 100).toString(),
        outrosRendSujeitoIRS_SS: '',
        outrosRendSujeitoIRS: '',
        rendExtra: '',
        duodecimos: 'nao',
        subAlimentacao: '9.60',
        tipoSubAlimentacao: 'cartao',
        estadoCivil: 'nao_casado',
        numDependentes: 0,
        irsJovem: false,
        anoIrsJovem: 1,
        periodo: 'out-dez',
    });
    const [resultado, setResultado] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setInputs(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const calcular = (e) => {
        if (e) e.preventDefault();
        
        const base = parseFloat(inputs.salarioBase) || 0;
        const outrosIRS_SS = parseFloat(inputs.outrosRendSujeitoIRS_SS) || 0;
        const outrosIRS = parseFloat(inputs.outrosRendSujeitoIRS) || 0;
        const rendExtra = parseFloat(inputs.rendExtra) || 0;
        const subAlimValor = parseFloat(inputs.subAlimentacao) || 0;
        const taxaSSPercent = parseFloat(inputs.taxaSS) || (SS_TAXA_DEPENDENTE_DEFAULT * 100);

        const tabelas = inputs.periodo === 'out-dez' ? tabelasOutDez : tabelasAgoSet;
        const diasTrabalho = 22;

        let subsidiosEmDuodecimos = 0;
        if (inputs.duodecimos === '50_um') subsidiosEmDuodecimos = (base * 1) / 24;
        if (inputs.duodecimos === '50_dois') subsidiosEmDuodecimos = (base * 2) / 24;
        if (inputs.duodecimos === '100_um') subsidiosEmDuodecimos = base / 12;
        if (inputs.duodecimos === '100_dois') subsidiosEmDuodecimos = (base * 2) / 12;

        const salarioBrutoMensal = base + subsidiosEmDuodecimos + outrosIRS_SS + outrosIRS;
        
        let subAlimTributavel = 0;
        const subAlimTotal = subAlimValor * diasTrabalho;
        if (inputs.tipoSubAlimentacao === 'dinheiro' && subAlimValor > LIMITE_ISENCAO_SUB_ALIM_DINHEIRO) {
            subAlimTributavel = (subAlimValor - LIMITE_ISENCAO_SUB_ALIM_DINHEIRO) * diasTrabalho;
        } else if (inputs.tipoSubAlimentacao === 'cartao' && subAlimValor > LIMITE_ISENCAO_SUB_ALIM_CARTAO) {
            subAlimTributavel = (subAlimValor - LIMITE_ISENCAO_SUB_ALIM_CARTAO) * diasTrabalho;
        }
        
        let segurancaSocial = 0;
        if (inputs.tipoTrabalhador === 'dependente') {
            const baseSS = base + outrosIRS_SS + subAlimTributavel;
            segurancaSocial = baseSS * (taxaSSPercent / 100);
        } else {
            segurancaSocial = (base * 0.70) * SS_TAXA_INDEPENDENTE;
        }

        let baseTributavelIRS = base + outrosIRS_SS + outrosIRS + subAlimTributavel + subsidiosEmDuodecimos;
        if (inputs.irsJovem && inputs.tipoTrabalhador === 'dependente') {
            const isencao = IRS_JOVEM_ISENCOES[inputs.anoIrsJovem] || 0;
            baseTributavelIRS *= (1 - isencao);
        }
        
        const retencaoIRSNormal = calcularRetencao(baseTributavelIRS, inputs.estadoCivil, inputs.numDependentes, tabelas);
        const retencaoIRSExtra = calcularRetencao(rendExtra, inputs.estadoCivil, inputs.numDependentes, tabelas);
        const retencaoTotalIRS = retencaoIRSNormal + retencaoIRSExtra;

        const salarioLiquido = salarioBrutoMensal + subAlimTotal - retencaoTotalIRS - segurancaSocial;

        setResultado({
            bruto: salarioBrutoMensal,
            liquido: salarioLiquido,
            retencaoIRS: retencaoTotalIRS,
            segurancaSocial: segurancaSocial,
            subAlimTotal: subAlimTotal,
            custoEmpregador: (base * 14 * 1.2375) + (subAlimTotal * 12)
        });
    };
    
    useEffect(() => {
        calcular();
    }, [inputs]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            <form onSubmit={calcular} className="lg:col-span-2 space-y-6 bg-white dark:bg-gray-800/50 p-6 rounded-2xl border dark:border-gray-700 h-fit">
                <fieldset>
                    <legend className="text-lg font-semibold text-gray-900 dark:text-white">Rendimentos Mensais</legend>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label htmlFor="salarioBase" className="label-style">Vencimento Base</label>
                            <input type="number" name="salarioBase" value={inputs.salarioBase} onChange={handleChange} className="mt-1 input-field" />
                        </div>
                        <div>
                            <label htmlFor="rendExtra" className="label-style">Retribuição Extraordinária <Tooltip text="Subsídios de férias/natal pagos fora do vencimento, trabalho suplementar, etc. Têm retenção autónoma na fonte." /></label>
                            <input type="number" name="rendExtra" value={inputs.rendExtra} onChange={handleChange} className="mt-1 input-field" placeholder="0" />
                        </div>
                        <div>
                            <label htmlFor="outrosRendSujeitoIRS_SS" className="label-style">Outros rend. sujeitos a IRS e SS <Tooltip text="Qualquer rendimento não incluído nas outras categorias, como comissões ou prémios."/></label>
                            <input type="number" name="outrosRendSujeitoIRS_SS" value={inputs.outrosRendSujeitoIRS_SS} onChange={handleChange} className="mt-1 input-field" placeholder="0" />
                        </div>
                         <div>
                            <label htmlFor="outrosRendSujeitoIRS" className="label-style">Outros rend. sujeitos só a IRS <Tooltip text="Ex: Compensação por cessação do contrato de trabalho, ajudas de custo não faturadas, etc." /></label>
                            <input type="number" name="outrosRendSujeitoIRS" value={inputs.outrosRendSujeitoIRS} onChange={handleChange} className="mt-1 input-field" placeholder="0" />
                        </div>
                    </div>
                </fieldset>
                
                <fieldset>
                     <legend className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</legend>
                     <div className="space-y-4 mt-4">
                        <div>
                            <label htmlFor="tipoTrabalhador" className="label-style">Tipo de Trabalhador</label>
                            <select name="tipoTrabalhador" value={inputs.tipoTrabalhador} onChange={handleChange} className="mt-1 input-field">
                                <option value="dependente">Por Conta de Outrem</option>
                                <option value="independente">Recibos Verdes (simplificado)</option>
                            </select>
                        </div>
                         {inputs.tipoTrabalhador === 'dependente' && (
                            <div>
                                <label htmlFor="taxaSS" className="label-style">Taxa de Segurança Social (%) <Tooltip text="A taxa standard para trabalhadores por conta de outrem é 11%. Altere apenas se tiver um regime especial." /></label>
                                <input type="number" name="taxaSS" value={inputs.taxaSS} onChange={handleChange} className="mt-1 input-field" />
                            </div>
                         )}
                        <div>
                            <label htmlFor="duodecimos" className="label-style">Pagamento dos Subsídios</label>
                            <select name="duodecimos" value={inputs.duodecimos} onChange={handleChange} className="mt-1 input-field">
                                <option value="nao">Por inteiro (nos meses devidos)</option>
                                <option value="50_um">50% de 1 subsídio em duodécimos</option>
                                <option value="50_dois">50% dos 2 subsídios em duodécimos</option>
                                <option value="100_um">1 subsídio completo em duodécimos</option>
                                <option value="100_dois">2 subsídios completos em duodécimos</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-3">
                                <label htmlFor="subAlimentacao" className="label-style">Sub. Alimentação (€/dia)</label>
                                <input type="number" name="subAlimentacao" value={inputs.subAlimentacao} onChange={handleChange} className="mt-1 input-field" />
                            </div>
                            <div className="col-span-2">
                                <label htmlFor="tipoSubAlimentacao" className="label-style">Pagamento</label>
                                <select name="tipoSubAlimentacao" value={inputs.tipoSubAlimentacao} onChange={handleChange} className="mt-1 input-field">
                                    <option value="cartao">Cartão</option>
                                    <option value="dinheiro">Dinheiro</option>
                                </select>
                            </div>
                        </div>
                        <div>
                          <label htmlFor="numDependentes" className="label-style">Nº de Dependentes</label>
                          <input type="number" name="numDependentes" value={inputs.numDependentes} min="0" onChange={handleChange} className="mt-1 input-field" />
                        </div>
                        <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-700/40 border-gray-200 dark:border-gray-600">
                            <input type="checkbox" name="irsJovem" checked={inputs.irsJovem} onChange={handleChange} className="hidden" />
                            <span className="relative"><span className="w-5 h-5 inline-block border border-gray-400 rounded-md bg-white dark:bg-gray-800"></span><span className="checkmark"><svg viewBox="0 0 24 24" className="absolute top-0 left-0 w-5 h-5 text-white"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></span></span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">Beneficiar do IRS Jovem?</span>
                        </label>
                        {inputs.irsJovem && (
                            <div>
                                <label htmlFor="anoIrsJovem" className="label-style">Ano do benefício</label>
                                <select name="anoIrsJovem" value={inputs.anoIrsJovem} onChange={handleChange} className="input-field mt-1">
                                    <option value="1">1º Ano (100% isenção)</option>
                                    <option value="2">2º Ano (75%)</option>
                                    <option value="3">3º e 4º Ano (50%)</option>
                                    <option value="5">5º Ano (25%)</option>
                                </select>
                            </div>
                        )}
                     </div>
                </fieldset>
                <div className="pt-4">
                    <button type="submit" className="w-full inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-base font-bold rounded-full text-white bg-primary hover:opacity-90 transition-all">
                        Calcular
                    </button>
                </div>
            </form>
            
            <div className="lg:col-span-3 lg:sticky lg:top-28">
                {resultado ? (
                    <div className="space-y-8">
                        <div className="bg-primary/10 dark:bg-gray-800/50 p-6 rounded-2xl text-center">
                            <p className="text-lg text-gray-700 dark:text-gray-300">O seu salário líquido mensal será:</p>
                            <p className="text-6xl font-extrabold text-primary mt-2">{resultado.liquido.toFixed(2)}€</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl border dark:border-gray-700">
                            <h3 className="text-xl font-bold text-center mb-6">Análise Detalhada do Salário</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <DonutChart data={[
                                    { label: 'Salário Líquido', value: resultado.liquido, color: '#3b82f6' },
                                    { label: 'Retenção IRS', value: resultado.retencaoIRS, color: '#ef4444' },
                                    { label: 'Segurança Social', value: resultado.segurancaSocial, color: '#f97316' }
                                ]} totalValue={resultado.liquido} />
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500"></span><p>Salário Líquido</p></div><p className="font-bold">{resultado.liquido.toFixed(2)}€</p></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500"></span><p>Retenção IRS</p></div><p className="font-bold">{resultado.retencaoIRS.toFixed(2)}€</p></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500"></span><p>Segurança Social</p></div><p className="font-bold">{resultado.segurancaSocial.toFixed(2)}€</p></div>
                                    <div className="flex items-center justify-between border-t pt-2 mt-2 border-gray-200 dark:border-gray-600"><p className="font-semibold">Salário Bruto (com duodécimos)</p><p className="font-bold">{resultado.bruto.toFixed(2)}€</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border dark:border-gray-700 text-gray-500 dark:text-gray-400">
                        <p>Os resultados da simulação aparecerão aqui.</p>
                    </div>
                )}
            </div>
            <style>{`
                .label-style { @apply block text-sm font-medium text-gray-700 dark:text-gray-300; }
                input[type="checkbox"]:checked + span .checkmark { display: block; }
                input[type="checkbox"]:not(:checked) + span .checkmark { display: none; }
                input[type="checkbox"]:checked + span > span:first-child { background-color: #ec742c; border-color: #ec742c; }
            `}</style>
        </div>
    );
}
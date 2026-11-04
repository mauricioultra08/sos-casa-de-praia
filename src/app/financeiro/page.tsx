"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Orcamento { id: number; clienteNome: string; valorTotal: string; status: string; }
interface Transacao {
  id: number;
  orcamentoId?: number; 
  tipo: "Entrada" | "Saída";
  descricao: string;
  clienteNome?: string;
  empresaParceira?: string; 
  numeroCupom?: string; 
  valorFornecedor?: string; 
  valorSOS?: string; 
  valor: string; 
  formaPagamento: string;
  status: "Pago" | "Em Aberto";
  dataVencimento: string; 
  dataCriacao: string;
}

const parseMoeda = (valor?: string) => {
  if (!valor) return 0;
  return Number(String(valor).replace(/\./g, "").replace(",", ".")) || 0;
};
const formatMoeda = (valor: number) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES_NOME = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinanceiroPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [busca, setBusca] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // ABA ATIVA (Completa vs Avulsa)
  const [abaLancamento, setAbaLancamento] = useState<"Completa" | "Avulsa">("Completa");

  // ESTADOS - ABA COMPLETA
  const [tipoManual, setTipoManual] = useState<"Entrada" | "Saída">("Saída");
  const [descManual, setDescManual] = useState("");
  const [empresaParceiraManual, setEmpresaParceiraManual] = useState("");
  const [clienteManual, setClienteManual] = useState("");
  const [cupomManual, setCupomManual] = useState("");
  const [valorEmpresaManual, setValorEmpresaManual] = useState("");
  const [valorSOSManual, setValorSOSManual] = useState("");
  const [statusManual, setStatusManual] = useState<"Pago" | "Em Aberto">("Pago");
  const [formaPgtoManual, setFormaPgtoManual] = useState("");
  const [vencimentoManual, setVencimentoManual] = useState("");
  
  // ESTADOS - ABA DESPESA AVULSA
  const [descAvulsa, setDescAvulsa] = useState("");
  const [valorAvulsa, setValorAvulsa] = useState("");
  const [formaPgtoAvulsa, setFormaPgtoAvulsa] = useState("Dinheiro");

  const [mensagemManual, setMensagemManual] = useState("");

  const totalCalc = formatMoeda(parseMoeda(valorEmpresaManual) + parseMoeda(valorSOSManual));

  const [baixandoId, setBaixandoId] = useState<number | null>(null);
  const [formaPgtoBaixa, setFormaPgtoBaixa] = useState("");
  const [statusBaixa, setStatusBaixa] = useState<"Pago" | "Em Aberto">("Pago");
  const [vencimentoBaixa, setVencimentoBaixa] = useState("");

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  
  const [filtroGrafico, setFiltroGrafico] = useState<"Diário" | "Semanal" | "Mensal" | "Anual">("Mensal");
  const [anoFiltro, setAnoFiltro] = useState<number>(anoAtual);
  const [mesFiltro, setMesFiltro] = useState<number | null>(null);

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    const logoSalva = localStorage.getItem("app_logo");
    if (logoSalva) setLogoUrl(logoSalva);

    const financSalvo = JSON.parse(localStorage.getItem("financeiro_cadastrado") || "[]") as Transacao[];
    const orcSalvos = JSON.parse(localStorage.getItem("orcamentos_cadastrados") || "[]") as Orcamento[];

    const orcAprovados = orcSalvos.filter(o => o.status === "Aprovado");
    let mudou = false;
    const novoFinanceiro = [...financSalvo];

    orcAprovados.forEach(orc => {
      const jaExiste = novoFinanceiro.find(f => f.orcamentoId === orc.id);
      if (!jaExiste) {
        novoFinanceiro.push({
          id: Date.now() + Math.random(),
          orcamentoId: orc.id,
          tipo: "Entrada",
          descricao: `Serviço OS-${orc.id.toString().slice(-4)}`,
          clienteNome: orc.clienteNome,
          empresaParceira: "",
          valor: orc.valorTotal || "0,00",
          formaPagamento: "",
          status: "Em Aberto",
          dataVencimento: "", 
          dataCriacao: new Date().toLocaleDateString("pt-BR")
        });
        mudou = true;
      }
    });

    if (mudou) {
      novoFinanceiro.sort((a, b) => b.id - a.id);
      setTransacoes(novoFinanceiro);
      localStorage.setItem("financeiro_cadastrado", JSON.stringify(novoFinanceiro));
    } else {
      setTransacoes(financSalvo);
    }
  }, [router]);

  const imprimirRelatorio = () => window.print();

  // HANDLER: Lançamento Completo (Com divisões e Cupom)
  const handleLancamentoManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descManual.trim()) { setMensagemManual("Preencha a descrição."); return; }
    if (parseMoeda(valorEmpresaManual) === 0 && parseMoeda(valorSOSManual) === 0) { 
      setMensagemManual("Preencha o valor da Empresa ou o valor SOS."); return; 
    }
    if (statusManual === "Em Aberto" && !vencimentoManual) { setMensagemManual("Defina o vencimento para parcelas em aberto."); return; }

    const nova: Transacao = { 
      id: Date.now(), 
      tipo: tipoManual, 
      descricao: descManual, 
      clienteNome: clienteManual.trim() || (tipoManual === "Saída" ? "Fornecedor / Empresa" : "Cliente Avulso"),
      empresaParceira: empresaParceiraManual.trim(),
      numeroCupom: cupomManual.trim(),
      valorFornecedor: valorEmpresaManual,
      valorSOS: valorSOSManual,
      valor: totalCalc,
      formaPagamento: statusManual === "Pago" ? formaPgtoManual : "", 
      status: statusManual, 
      dataVencimento: statusManual === "Em Aberto" ? vencimentoManual : "", 
      dataCriacao: new Date().toLocaleDateString("pt-BR") 
    };

    const novaLista = [nova, ...transacoes];
    setTransacoes(novaLista); localStorage.setItem("financeiro_cadastrado", JSON.stringify(novaLista));
    
    setDescManual(""); setEmpresaParceiraManual(""); setClienteManual(""); setCupomManual("");
    setValorEmpresaManual(""); setValorSOSManual(""); 
    setStatusManual("Pago"); setVencimentoManual(""); setFormaPgtoManual("");
    setMensagemManual("Lançamento registado com sucesso!"); setTimeout(() => setMensagemManual(""), 3000);
  };

  // HANDLER: Lançamento Despesa Avulsa (Rápida)
  const handleDespesaAvulsa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descAvulsa.trim() || parseMoeda(valorAvulsa) === 0) {
      setMensagemManual("Preencha a descrição e o valor da despesa."); return;
    }

    const nova: Transacao = {
      id: Date.now(),
      tipo: "Saída",
      descricao: descAvulsa.trim(),
      clienteNome: "Despesa Avulsa / Interna",
      valor: formatMoeda(parseMoeda(valorAvulsa)),
      formaPagamento: formaPgtoAvulsa,
      status: "Pago", // Despesas avulsas são dadas como pagas na hora
      dataVencimento: "",
      dataCriacao: new Date().toLocaleDateString("pt-BR")
    };

    const novaLista = [nova, ...transacoes];
    setTransacoes(novaLista); localStorage.setItem("financeiro_cadastrado", JSON.stringify(novaLista));

    setDescAvulsa(""); setValorAvulsa(""); setFormaPgtoAvulsa("Dinheiro");
    setMensagemManual("Despesa avulsa adicionada ao sistema!"); setTimeout(() => setMensagemManual(""), 3000);
  };

  const iniciarBaixa = (t: Transacao) => { setBaixandoId(t.id); setFormaPgtoBaixa(t.formaPagamento || ""); setStatusBaixa(t.status || "Pago"); setVencimentoBaixa(t.dataVencimento || ""); };
  
  const handleFormaPgtoChange = (forma: string) => { 
    setFormaPgtoBaixa(forma); 
    if (forma.includes("Cartão") || forma.includes("Cupom Fiscal") || forma.includes("Abatimento")) { 
      setStatusBaixa("Pago"); setVencimentoBaixa(""); 
    } 
  };

  const confirmarBaixa = (id: number) => {
    if (statusBaixa === "Em Aberto" && !vencimentoBaixa) { alert("Defina o vencimento para parcelas em aberto."); return; }
    const novaLista = transacoes.map(t => 
      t.id === id ? { ...t, formaPagamento: formaPgtoBaixa, status: statusBaixa, dataVencimento: statusBaixa === "Pago" ? "" : vencimentoBaixa } : t
    );
    setTransacoes(novaLista); localStorage.setItem("financeiro_cadastrado", JSON.stringify(novaLista)); setBaixandoId(null);
  };

  const apagarTransacao = (id: number) => { if (window.confirm("Apagar registo? Isso alterará o saldo.")) { const novaLista = transacoes.filter(t => t.id !== id); setTransacoes(novaLista); localStorage.setItem("financeiro_cadastrado", JSON.stringify(novaLista)); } };

  // MATEMÁTICA AUTOMÁTICA GERAL
  const faturamentoTotal = transacoes.filter(t => t.tipo === "Entrada" && t.status === "Pago").reduce((a, t) => a + parseMoeda(t.valor), 0);
  const aReceber = transacoes.filter(t => t.tipo === "Entrada" && t.status === "Em Aberto").reduce((a, t) => a + parseMoeda(t.valor), 0);
  // Todas as saídas "Pagas" (incluindo as avulsas) somam aqui e deduzem o saldo líquido.
  const despesasPagas = transacoes.filter(t => t.tipo === "Saída" && t.status === "Pago").reduce((a, t) => a + parseMoeda(t.valor), 0);
  const aPagar = transacoes.filter(t => t.tipo === "Saída" && t.status === "Em Aberto").reduce((a, t) => a + parseMoeda(t.valor), 0);
  const saldoLiquido = faturamentoTotal - despesasPagas;

  let labelsGrafico: string[] = [];
  let dadosGrafico: {entradas: number, saidas: number}[] = [];

  if (filtroGrafico === "Anual") {
    labelsGrafico = [String(anoFiltro-4), String(anoFiltro-3), String(anoFiltro-2), String(anoFiltro-1), String(anoFiltro)];
    dadosGrafico = labelsGrafico.map(() => ({ entradas: 0, saidas: 0 }));
    transacoes.forEach(t => {
      if (t.status === "Pago") {
        const partes = t.dataCriacao.split('/'); 
        if(partes.length === 3) {
          const ano = parseInt(partes[2]);
          const idx = labelsGrafico.indexOf(String(ano));
          if(idx !== -1) {
            if (t.tipo === "Entrada") dadosGrafico[idx].entradas += parseMoeda(t.valor);
            if (t.tipo === "Saída") dadosGrafico[idx].saidas += parseMoeda(t.valor);
          }
        }
      }
    });
  } else if (filtroGrafico === "Mensal") {
    labelsGrafico = MESES_NOME;
    dadosGrafico = labelsGrafico.map(() => ({ entradas: 0, saidas: 0 }));
    transacoes.forEach(t => {
      if (t.status === "Pago") {
        const partes = t.dataCriacao.split('/'); 
        if (partes.length === 3 && parseInt(partes[2]) === anoFiltro) {
          const mesIndex = parseInt(partes[1]) - 1;
          if (mesIndex >= 0 && mesIndex <= 11) {
            if (t.tipo === "Entrada") dadosGrafico[mesIndex].entradas += parseMoeda(t.valor);
            if (t.tipo === "Saída") dadosGrafico[mesIndex].saidas += parseMoeda(t.valor);
          }
        }
      }
    });
  } else if (filtroGrafico === "Semanal") {
    labelsGrafico = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5"];
    dadosGrafico = labelsGrafico.map(() => ({ entradas: 0, saidas: 0 }));
    const targetMes = mesFiltro !== null ? mesFiltro : mesAtual;
    transacoes.forEach(t => {
      if (t.status === "Pago") {
        const partes = t.dataCriacao.split('/'); 
        if (partes.length === 3 && parseInt(partes[2]) === anoFiltro && (parseInt(partes[1]) - 1) === targetMes) {
          const dia = parseInt(partes[0]);
          let week = Math.floor((dia - 1) / 7);
          if(week > 4) week = 4;
          if (t.tipo === "Entrada") dadosGrafico[week].entradas += parseMoeda(t.valor);
          if (t.tipo === "Saída") dadosGrafico[week].saidas += parseMoeda(t.valor);
        }
      }
    });
  } else if (filtroGrafico === "Diário") {
    for(let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labelsGrafico.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}`);
    }
    dadosGrafico = labelsGrafico.map(() => ({ entradas: 0, saidas: 0 }));
    transacoes.forEach(t => {
      if (t.status === "Pago") {
        const partes = t.dataCriacao.split('/');
        if(partes.length === 3 && parseInt(partes[2]) === anoAtual) {
           const dtStr = `${String(parseInt(partes[0])).padStart(2, '0')}/${String(parseInt(partes[1])).padStart(2, '0')}`;
           const idx = labelsGrafico.indexOf(dtStr);
           if(idx !== -1) {
             if (t.tipo === "Entrada") dadosGrafico[idx].entradas += parseMoeda(t.valor);
             if (t.tipo === "Saída") dadosGrafico[idx].saidas += parseMoeda(t.valor);
           }
        }
      }
    });
  }

  let resumoLateral = { entradas: 0, saidas: 0 };
  if (filtroGrafico === "Mensal" && mesFiltro !== null) {
    resumoLateral.entradas = dadosGrafico[mesFiltro].entradas;
    resumoLateral.saidas = dadosGrafico[mesFiltro].saidas;
  } else {
    resumoLateral.entradas = dadosGrafico.reduce((a, b) => a + b.entradas, 0);
    resumoLateral.saidas = dadosGrafico.reduce((a, b) => a + b.saidas, 0);
  }
  const saldoLateral = resumoLateral.entradas - resumoLateral.saidas;
  const maxGrafico = Math.max(...dadosGrafico.flatMap(d => [d.entradas, d.saidas]), 1); 

  const hojeStr = new Date().toISOString().split("T")[0];
  
  const contasEmAberto = transacoes.filter(t => t.status === "Em Aberto" && t.dataVencimento);
  const contasAPagar = contasEmAberto.filter(t => t.tipo === "Saída").sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  const contasAReceber = contasEmAberto.filter(t => t.tipo === "Entrada").sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  
  const transacoesFiltradas = transacoes.filter(t => {
    let passaBusca = t.descricao.toLowerCase().includes(busca.toLowerCase()) || 
                     (t.clienteNome && t.clienteNome.toLowerCase().includes(busca.toLowerCase())) ||
                     (t.empresaParceira && t.empresaParceira.toLowerCase().includes(busca.toLowerCase()));
    let passaData = true;
    
    if (filtroGrafico !== "Diário") {
       const partes = t.dataCriacao.split('/');
       if (partes.length === 3) {
          const tAno = parseInt(partes[2]);
          const tMes = parseInt(partes[1]) - 1;
          if (tAno !== anoFiltro) passaData = false;
          if (filtroGrafico === "Mensal" && mesFiltro !== null && tMes !== mesFiltro) passaData = false;
          if (filtroGrafico === "Semanal") {
             const targetMes = mesFiltro !== null ? mesFiltro : mesAtual;
             if (tMes !== targetMes) passaData = false;
          }
       }
    }
    return passaBusca && passaData;
  });

  const toggleFiltroGraficoBarra = (index: number) => {
    if (filtroGrafico === "Mensal") {
      if (mesFiltro === index) setMesFiltro(null); 
      else setMesFiltro(index); 
    }
  };

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar Financeiro...</div>;

  return (
    <div className="w-full flex flex-col gap-6 print:gap-4 print:text-black print:bg-white print:m-0 print:p-0">
      
      {/* TELA NORMAL - CABEÇALHO */}
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-xl font-bold text-slate-100">Painel Financeiro & Negociações</h1>
        <button onClick={imprimirRelatorio} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 shadow-lg transition-colors">
          🖨️ Imprimir
        </button>
      </div>

      {/* CABEÇALHO DE IMPRESSÃO CENTRALIZADO */}
      <div className="hidden print:flex flex-col items-center border-b-2 border-black pb-4 mb-6 text-center w-full">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-24 object-contain mb-2" />
        ) : (
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2 text-black">SOS CASA DE PRAIA</h1>
        )}
        
        <div className="text-[11px] font-bold text-gray-700 mb-4 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-300 print:border-black">
          CNPJ: 38.250.620.0001-07 | Contato / WhatsApp: (13) 98131-1644
        </div>

        <h2 className="text-2xl font-black tracking-widest text-gray-800 uppercase">Relatório Financeiro</h2>
        <p className="text-sm font-mono text-gray-600 font-bold mt-1">
          Período: {filtroGrafico} {mesFiltro !== null && filtroGrafico === 'Mensal' ? `- ${MESES_NOME[mesFiltro]}/${anoFiltro}` : anoFiltro}
        </p>
      </div>

      {/* CARDS GERAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-2">
        <div className="bg-slate-900 print:bg-white border border-green-900/50 print:border-slate-300 rounded-lg p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-wider font-bold">Faturamento (Pago)</span>
          <span className="text-xl font-bold text-green-400 print:text-green-700">R$ {formatMoeda(faturamentoTotal)}</span>
        </div>
        <div className="bg-slate-900 print:bg-white border border-cyan-900/50 print:border-slate-300 rounded-lg p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-wider font-bold">A Receber (Dívidas)</span>
          <span className="text-xl font-bold text-cyan-400 print:text-cyan-600">R$ {formatMoeda(aReceber)}</span>
        </div>
        <div className="bg-slate-900 print:bg-white border border-red-900/50 print:border-slate-300 rounded-lg p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-wider font-bold">Despesas (Pagas)</span>
          <span className="text-xl font-bold text-red-400 print:text-red-600">R$ {formatMoeda(despesasPagas)}</span>
        </div>
        <div className="bg-slate-900 print:bg-white border border-amber-900/50 print:border-slate-300 rounded-lg p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-wider font-bold">A Pagar (Fiados)</span>
          <span className="text-xl font-bold text-amber-400 print:text-amber-600">R$ {formatMoeda(aPagar)}</span>
        </div>
        <div className={`bg-slate-900 print:bg-white border rounded-lg p-4 flex flex-col justify-center ${saldoLiquido >= 0 ? "border-blue-900/50 print:border-slate-300" : "border-red-900/50 print:border-slate-300"}`}>
          <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-wider font-bold">Saldo em Caixa Real</span>
          <span className={`text-xl font-bold ${saldoLiquido >= 0 ? "text-blue-400 print:text-blue-700" : "text-red-400 print:text-red-600"}`}>R$ {formatMoeda(saldoLiquido)}</span>
        </div>
      </div>

      <div className="bg-[#111827] print:bg-white border border-slate-800 print:border-slate-300 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:hidden gap-4">
          <div>
            <h3 className="text-blue-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              📊 Gráficos & Fluxo de Caixa (Pagos)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Filtre a visualização de faturamento e despesas.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select value={filtroGrafico} onChange={(e) => { setFiltroGrafico(e.target.value as any); setMesFiltro(null); }} className="bg-[#0b0f19] border border-slate-700 text-slate-300 font-bold text-xs rounded-md px-3 py-1.5 outline-none focus:border-blue-500">
              <option value="Diário">Diário (Últimos 7 dias)</option>
              <option value="Semanal">Semanal (Mês)</option>
              <option value="Mensal">Mensal (Ano)</option>
              <option value="Anual">Anual (5 anos)</option>
            </select>

            {filtroGrafico !== "Diário" && (
              <div className="flex items-center gap-2">
                <button onClick={() => {setAnoFiltro(anoFiltro - 1); setMesFiltro(null);}} className="text-slate-400 hover:text-white font-bold px-2 py-1 bg-slate-800 rounded transition-colors">◀</button>
                <span className="text-sm font-bold text-slate-200">{anoFiltro}</span>
                <button onClick={() => {setAnoFiltro(anoFiltro + 1); setMesFiltro(null);}} className="text-slate-400 hover:text-white font-bold px-2 py-1 bg-slate-800 rounded transition-colors">▶</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 flex justify-between items-end h-48 sm:h-56 pb-2 border-b border-slate-700 print:border-slate-300">
            {dadosGrafico.map((d, index) => {
              const percIn = Math.round((d.entradas / maxGrafico) * 100) || 0;
              const percOut = Math.round((d.saidas / maxGrafico) * 100) || 0;
              const isSelected = filtroGrafico === "Mensal" && mesFiltro === index;
              return (
                <div key={index} onClick={() => toggleFiltroGraficoBarra(index)} className={`flex flex-col items-center justify-end h-full gap-2 group transition-all ${filtroGrafico === "Mensal" ? 'cursor-pointer' : ''} ${filtroGrafico === "Mensal" && mesFiltro !== null && !isSelected ? 'opacity-30 print:opacity-100' : 'opacity-100 hover:scale-105'}`}>
                  <div className="flex items-end gap-0.5 sm:gap-1 w-full h-full justify-center">
                    <div className="bg-green-500 w-3 sm:w-4 rounded-t-sm transition-all print:!bg-green-600" style={{ height: `${percIn}%`, minHeight: percIn > 0 ? '4px' : '0' }}></div>
                    <div className="bg-red-500 w-3 sm:w-4 rounded-t-sm transition-all print:!bg-red-600" style={{ height: `${percOut}%`, minHeight: percOut > 0 ? '4px' : '0' }}></div>
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold ${isSelected ? 'text-blue-400 border-b-2 border-blue-400 pb-0.5 print:text-black print:border-black' : 'text-slate-400 group-hover:text-slate-200 print:text-slate-700'}`}>{labelsGrafico[index]}</span>
                </div>
              );
            })}
          </div>

          <div className="lg:w-64 bg-slate-900 print:bg-white print:border print:border-slate-300 rounded-lg p-4 flex flex-col justify-center shadow-inner">
            <h4 className="text-xs font-bold text-slate-400 print:text-black uppercase tracking-wider mb-4 border-b border-slate-700 print:border-slate-300 pb-2 flex justify-between items-center">
              <span>Resumo do Período</span>
              {filtroGrafico === "Mensal" && mesFiltro !== null && <button onClick={() => setMesFiltro(null)} className="print:hidden text-[10px] bg-slate-700 text-white px-2 py-1 rounded">Limpar Mês</button>}
            </h4>
            <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-300 print:text-slate-700 font-bold">Entradas</span><span className="text-sm text-green-400 print:text-green-700 font-bold">R$ {formatMoeda(resumoLateral.entradas)}</span></div>
            <div className="flex justify-between items-center mb-4"><span className="text-xs text-slate-300 print:text-slate-700 font-bold">Saídas</span><span className="text-sm text-red-400 print:text-red-700 font-bold">R$ {formatMoeda(resumoLateral.saidas)}</span></div>
            <div className="pt-3 border-t border-slate-700 print:border-slate-300"><p className="text-[10px] text-slate-400 print:text-slate-500 uppercase tracking-wider mb-1">Crescimento Líquido</p><p className={`text-xl font-black ${saldoLateral >= 0 ? "text-blue-400 print:text-blue-700" : "text-red-400 print:text-red-700"}`}>R$ {formatMoeda(saldoLateral)}</p></div>
          </div>
        </div>
      </div>

      {/* SISTEMA DE AVISOS SEPARADO: PAGAR E RECEBER */}
      {(contasAPagar.length > 0 || contasAReceber.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* PAINEL DE CONTAS A PAGAR */}
          {contasAPagar.length > 0 && (
            <div className="bg-red-950/20 print:bg-red-50 border border-red-900/50 print:border-red-300 rounded-lg p-4">
              <h3 className="text-red-500 print:text-red-700 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">🚨 Avisos: Contas a Pagar</h3>
              <div className="flex flex-col gap-2">
                {contasAPagar.map(t => {
                  const estaAtrasado = t.dataVencimento < hojeStr;
                  const ehHoje = t.dataVencimento === hojeStr;
                  return (
                    <div key={t.id} className="flex justify-between items-center bg-black/20 print:bg-white border border-red-900/30 print:border-red-200 p-2.5 rounded-md">
                      <div>
                        <p className="text-xs text-slate-200 print:text-black font-bold">
                          Para: {t.clienteNome} {t.empresaParceira ? `| ${t.empresaParceira}` : ""} <span className="text-slate-400 print:text-slate-500 font-normal">({t.descricao})</span>
                        </p>
                        <p className={`text-[11px] mt-0.5 font-bold ${estaAtrasado ? "text-red-500 print:text-red-600" : ehHoje ? "text-amber-400 print:text-amber-600" : "text-blue-400 print:text-blue-600"}`}>
                          {estaAtrasado ? `🚨 ATRASADO: ${t.dataVencimento.split('-').reverse().join('/')}` : ehHoje ? "⏰ VENCE HOJE!" : `Vence em: ${t.dataVencimento.split('-').reverse().join('/')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 print:text-red-700 font-mono font-bold text-sm">R$ {t.valor}</span>
                        <button onClick={() => iniciarBaixa(t)} className="print:hidden bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-colors">PAGAR</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAINEL DE CONTAS A RECEBER */}
          {contasAReceber.length > 0 && (
            <div className="bg-green-950/20 print:bg-green-50 border border-green-900/50 print:border-green-300 rounded-lg p-4">
              <h3 className="text-green-500 print:text-green-700 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">💰 Avisos: Contas a Receber</h3>
              <div className="flex flex-col gap-2">
                {contasAReceber.map(t => {
                  const estaAtrasado = t.dataVencimento < hojeStr;
                  const ehHoje = t.dataVencimento === hojeStr;
                  return (
                    <div key={t.id} className="flex justify-between items-center bg-black/20 print:bg-white border border-green-900/30 print:border-green-200 p-2.5 rounded-md">
                      <div>
                        <p className="text-xs text-slate-200 print:text-black font-bold">
                          De: {t.clienteNome} {t.empresaParceira ? `| ${t.empresaParceira}` : ""} <span className="text-slate-400 print:text-slate-500 font-normal">({t.descricao})</span>
                        </p>
                        <p className={`text-[11px] mt-0.5 font-bold ${estaAtrasado ? "text-red-400 print:text-red-600" : ehHoje ? "text-amber-400 print:text-amber-600" : "text-blue-400 print:text-blue-600"}`}>
                          {estaAtrasado ? `🚨 ATRASADO: ${t.dataVencimento.split('-').reverse().join('/')}` : ehHoje ? "⏰ VENCE HOJE!" : `Vence em: ${t.dataVencimento.split('-').reverse().join('/')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 print:text-green-700 font-mono font-bold text-sm">R$ {t.valor}</span>
                        <button onClick={() => iniciarBaixa(t)} className="print:hidden bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-colors">RECEBER</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* BLOCO MANUAL DE REGISTO COM ABAS */}
      <div className="print:hidden bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        
        {/* NAVEGAÇÃO DAS ABAS */}
        <div className="flex gap-4 mb-5 border-b border-slate-800 pb-2">
          <button 
            onClick={() => setAbaLancamento("Completa")} 
            className={`text-[11px] font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${abaLancamento === "Completa" ? "text-blue-400 border-blue-500" : "text-slate-500 border-transparent hover:text-slate-400"}`}
          >
            📝 Negociação / Cupom
          </button>
          <button 
            onClick={() => setAbaLancamento("Avulsa")} 
            className={`text-[11px] font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${abaLancamento === "Avulsa" ? "text-red-400 border-red-500" : "text-slate-500 border-transparent hover:text-slate-400"}`}
          >
            ☕ Despesa Rápida (Avulsa)
          </button>
        </div>

        {/* FORMULÁRIO COMPLETO */}
        {abaLancamento === "Completa" && (
          <form onSubmit={handleLancamentoManual} className="flex flex-col gap-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Tipo *</label>
                <select value={tipoManual} onChange={(e) => setTipoManual(e.target.value as "Entrada"|"Saída")} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none focus:border-blue-500">
                  <option value="Entrada">🟢 Entrada (Receita)</option>
                  <option value="Saída">🔴 Saída (Despesa)</option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Descrição do Acordo / Serviço *</label>
                <input type="text" value={descManual} onChange={(e) => setDescManual(e.target.value)} placeholder="Ex: Serviço executado" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full outline-none focus:border-blue-500" />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Empresa Parceira</label>
                <input type="text" value={empresaParceiraManual} onChange={(e) => setEmpresaParceiraManual(e.target.value)} placeholder="Ex: PPA" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full outline-none focus:border-blue-500" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Cliente</label>
                <input type="text" value={clienteManual} onChange={(e) => setClienteManual(e.target.value)} placeholder="Ex: Maurício" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full outline-none focus:border-blue-500" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Nº Cupom / NF</label>
                <input type="text" value={cupomManual} onChange={(e) => setCupomManual(e.target.value)} placeholder="Ex: 12345" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-blue-300 font-mono w-full outline-none focus:border-blue-500" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 bg-slate-900/50 p-3 rounded-md border border-slate-800">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor Empresa/Nota</label>
                <input type="text" value={valorEmpresaManual} onChange={(e) => setValorEmpresaManual(e.target.value)} placeholder="0,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none focus:border-blue-500" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor SOS Casa de Praia</label>
                <input type="text" value={valorSOSManual} onChange={(e) => setValorSOSManual(e.target.value)} placeholder="0,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none focus:border-blue-500" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Total Calculado</label>
                <input type="text" value={totalCalc} readOnly className="bg-black/40 border border-slate-700 rounded-md py-1.5 px-3 text-xs text-green-400 font-bold w-full outline-none cursor-not-allowed" />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Situação *</label>
                <select value={statusManual} onChange={(e) => setStatusManual(e.target.value as "Pago"|"Em Aberto")} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs font-bold text-slate-200 w-full outline-none focus:border-blue-500">
                  <option value="Pago">✅ Efetivado / Pago</option>
                  <option value="Em Aberto">⏳ Ficar Pendente</option>
                </select>
              </div>
              
              {statusManual === "Em Aberto" ? (
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Vencimento *</label>
                  <input type="date" value={vencimentoManual} onChange={(e) => setVencimentoManual(e.target.value)} className="bg-[#0b0f19] border border-amber-900/50 rounded-md py-1.5 px-3 text-xs text-amber-400 w-full outline-none focus:border-amber-500" />
                </div>
              ) : (
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Forma de Pagamento</label>
                  <select value={formaPgtoManual} onChange={(e) => setFormaPgtoManual(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none focus:border-blue-500">
                    <option value="">Selecione...</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cupom Fiscal (Empresa)">Cupom Fiscal (Baixa Empresa)</option>
                    <option value="Abatimento (Crédito)">Abatimento (Crédito / Permuta)</option>
                  </select>
                </div>
              )}
              
              <div className="lg:col-span-2 flex items-end">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 rounded-md transition-colors uppercase tracking-wider">
                  Registrar
                </button>
              </div>
            </div>
            {mensagemManual && abaLancamento === "Completa" && <div className="text-green-400 text-[11px] font-bold mt-1 text-center bg-green-950/40 py-1 rounded">{mensagemManual}</div>}
          </form>
        )}

        {/* FORMULÁRIO DESPESA AVULSA */}
        {abaLancamento === "Avulsa" && (
          <form onSubmit={handleDespesaAvulsa} className="flex flex-col gap-3 bg-red-950/20 p-4 rounded-md border border-red-900/30">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">O que foi gasto? *</label>
                <input type="text" value={descAvulsa} onChange={e => setDescAvulsa(e.target.value)} placeholder="Ex: Gasolina, Almoço, Pedágio" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full outline-none focus:border-red-500" />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor Gasto (R$) *</label>
                <input type="text" value={valorAvulsa} onChange={e => setValorAvulsa(e.target.value)} placeholder="Ex: 50,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-red-400 font-bold w-full outline-none focus:border-red-500" />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Como foi pago?</label>
                <select value={formaPgtoAvulsa} onChange={e => setFormaPgtoAvulsa(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full outline-none focus:border-red-500">
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="w-full sm:w-auto self-end px-6 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold py-2 rounded-md transition-colors uppercase tracking-wider mt-1 shadow-md">
              Lançar Despesa Imediata
            </button>
            {mensagemManual && abaLancamento === "Avulsa" && <div className="text-green-400 text-[11px] font-bold mt-1 text-center bg-green-950/40 py-1 rounded">{mensagemManual}</div>}
          </form>
        )}
      </div>

      {/* HISTÓRICO E GESTÃO DE DÍVIDAS */}
      <div className="bg-[#111827] print:bg-white print:border-none border border-slate-800 rounded-lg p-5 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 print:mb-2">
          <h3 className="text-slate-400 print:text-black text-xs font-bold uppercase tracking-wider">
            Extrato de Movimentações
          </h3>
          <div className="print:hidden relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar registro ou empresa..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none w-full focus:border-blue-500" />
          </div>
        </div>
        
        {transacoesFiltradas.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 print:border-slate-300 rounded-md bg-[#0b0f19] print:bg-transparent">
            Nenhum registo encontrado para os filtros e pesquisas atuais.
          </div>
        ) : (
          <div className="flex flex-col gap-2 print:gap-0 print:border-t print:border-slate-300">
            {transacoesFiltradas.map(t => (
              <div key={t.id} className={`bg-[#0b0f19] print:bg-white border p-3 rounded-md flex flex-col gap-3 print:gap-1 transition-colors ${t.clienteNome === "Despesa Avulsa / Interna" ? "border-red-900/30 hover:border-red-900/60" : "border-slate-800 print:border-b print:border-slate-300 print:border-x-0 print:border-t-0 hover:border-slate-700"}`}>
                
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2 h-2 rounded-full ${t.tipo === 'Entrada' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-bold text-slate-200 print:text-black text-sm">{t.descricao}</p>
                      
                      <p className="text-[11px] text-slate-400 print:text-slate-600 font-bold flex items-center gap-2 mt-0.5">
                        <span>{t.clienteNome} {t.empresaParceira ? `| Emp: ${t.empresaParceira}` : ""}</span>
                        <span className="font-normal text-slate-500">| Data: {t.dataCriacao}</span>
                      </p>

                      <div className="flex gap-2 mt-2 print:mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full print:bg-transparent print:border print:px-1 ${t.status === 'Pago' ? 'bg-green-900/40 text-green-400 print:text-green-700 print:border-green-700' : 'bg-amber-900/40 text-amber-400 print:text-amber-700 print:border-amber-700'}`}>{t.status === "Em Aberto" ? "Pendente" : "Efetivado"}</span>
                        {t.formaPagamento && <span className="text-[10px] bg-slate-800 text-slate-300 print:bg-transparent print:text-slate-600 print:border print:border-slate-400 px-2 py-0.5 rounded-full font-mono">{t.formaPagamento}</span>}
                        {t.numeroCupom && <span className="text-[10px] bg-indigo-900/40 text-indigo-300 print:bg-transparent print:text-indigo-600 print:border print:border-indigo-400 px-2 py-0.5 rounded-full font-mono">Cupom: {t.numeroCupom}</span>}
                      </div>

                      {/* Exibição dos valores divididos (se existirem) */}
                      {(t.valorFornecedor || t.valorSOS) && (
                        <div className="flex gap-4 mt-2 text-[10px] text-slate-400 print:text-slate-600 bg-black/20 print:bg-transparent p-1.5 rounded border border-slate-800 print:border-none w-fit">
                          {t.valorFornecedor && parseMoeda(t.valorFornecedor) > 0 && <span>🏢 Empresa/Nota: <b className="text-slate-300 print:text-black">R$ {t.valorFornecedor}</b></span>}
                          {t.valorSOS && parseMoeda(t.valorSOS) > 0 && <span>🏖️ SOS Casa de Praia: <b className="text-slate-300 print:text-black">R$ {t.valorSOS}</b></span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className={`text-base font-bold ${t.tipo === 'Entrada' ? 'text-green-400 print:text-green-700' : 'text-red-400 print:text-red-700'}`}>
                      {t.tipo === 'Entrada' ? '+' : '-'} R$ {t.valor}
                    </span>
                    <button onClick={() => apagarTransacao(t.id)} className="print:hidden text-[10px] text-slate-500 hover:text-red-400 mt-2 px-2 py-1 bg-red-950/20 rounded transition-colors">✖ Apagar</button>
                  </div>
                </div>

                {t.status === "Em Aberto" && baixandoId !== t.id && (
                  <button onClick={() => iniciarBaixa(t)} className="print:hidden w-full bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-900/50 text-xs font-bold py-2 rounded mt-1 transition-colors">
                    💸 Registrar Pagamento / Cupom / Abatimento
                  </button>
                )}

                {baixandoId === t.id && (
                  <div className="print:hidden mt-1 p-3 bg-slate-900 border border-blue-900/50 rounded-md flex flex-col gap-2.5">
                    <p className="text-[11px] text-blue-400 font-bold border-b border-blue-900/50 pb-1 mb-1">Finalizar Acerto com: {t.clienteNome} {t.empresaParceira ? `/ ${t.empresaParceira}` : ""}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Como foi pago/acertado?</label>
                        <select value={formaPgtoBaixa} onChange={(e) => handleFormaPgtoChange(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none focus:border-blue-500">
                          <option value="">Selecione...</option>
                          <option value="Cupom Fiscal (Empresa)">🧾 Cupom Fiscal (Nota de Empresa)</option>
                          <option value="Abatimento (Crédito)">🔄 Abatimento (Crédito / Permuta)</option>
                          <option value="Dinheiro">💵 Dinheiro</option>
                          <option value="Pix">💠 Pix</option>
                          <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                          <option value="Cartão de Débito">💳 Cartão de Débito</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Nova Situação</label>
                        {formaPgtoBaixa.includes("Cartão") || formaPgtoBaixa.includes("Cupom") || formaPgtoBaixa.includes("Abatimento") ? (
                          <div className="bg-green-950/40 border border-green-900/50 rounded-md py-1.5 px-2 text-xs text-green-400 font-bold text-center">Será Efetivado!</div>
                        ) : (
                          <select value={statusBaixa} onChange={(e) => setStatusBaixa(e.target.value as "Pago" | "Em Aberto")} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none"><option value="Pago">Acertado (Adicionar aos totais)</option><option value="Em Aberto">Adiar Vencimento</option></select>
                        )}
                      </div>
                      {statusBaixa === "Em Aberto" && (
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Novo Vencimento *</label>
                          <input type="date" value={vencimentoBaixa} onChange={(e) => setVencimentoBaixa(e.target.value)} className="bg-[#0b0f19] border border-red-900/50 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => confirmarBaixa(t.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded flex-1">Confirmar e Aplicar ao Saldo</button>
                      <button onClick={() => setBaixandoId(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-1.5 px-4 rounded">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
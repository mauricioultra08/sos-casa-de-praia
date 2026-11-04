"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Cliente { id: number; nome: string; telefone?: string; }
interface Tecnico { id: number; nome: string; status: string; }
interface Produto { id: number; nome: string; quantidade: string; precoVenda: string; }

interface ItemOrcamento {
  produtoId: number;
  nome: string;
  qtd: number;
  precoUnitario: number;
  subtotal: number;
}

interface Orcamento {
  id: number;
  clienteId: number;
  clienteNome: string;
  itens?: ItemOrcamento[];
  maoDeObra: string;
  descricaoObs: string;
  valorTotal: string;
  status: "Em Aberto" | "Aprovado" | "Rejeitado";
  dataCriacao: string;
}

// Interface alinhada com a página de OS
interface OrdemServico {
  id: number;
  orcamentoId?: number;
  clienteId: number;
  clienteNome: string;
  tecnicoId: number;
  tecnicoNome: string;
  descricao: string;
  status: "Aprovada" | "Em Andamento" | "Finalizado";
  dataCriacao: string;
  dataAgendamento?: string;
  horaAgendamento?: string;
}

const parseMoeda = (valor: string) => Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
const formatMoeda = (valor: number) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrcamentosPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [qtdProduto, setQtdProduto] = useState("1");
  const [itensCarrinho, setItensCarrinho] = useState<ItemOrcamento[]>([]);
  const [maoDeObra, setMaoDeObra] = useState("");
  const [descricaoObs, setDescricaoObs] = useState("");
  
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");

  const [orcamentoAprovandoId, setOrcamentoAprovandoId] = useState<number | null>(null);
  const [tecnicoSelecionadoId, setTecnicoSelecionadoId] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horaAgendamento, setHoraAgendamento] = useState("");

  const [orcParaImprimir, setOrcParaImprimir] = useState<Orcamento | null>(null);

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    const logoSalva = localStorage.getItem("app_logo");
    if (logoSalva) setLogoUrl(logoSalva);

    const clis = localStorage.getItem("clientes_cadastrados");
    if (clis) setClientes(JSON.parse(clis));

    const tecs = localStorage.getItem("tecnicos_cadastrados");
    if (tecs) setTecnicos(JSON.parse(tecs));

    const prods = localStorage.getItem("estoque_cadastrado");
    if (prods) setProdutos(JSON.parse(prods));

    const orcs = localStorage.getItem("orcamentos_cadastrados");
    if (orcs) setOrcamentos(JSON.parse(orcs));

    const oss = localStorage.getItem("ordens_servico");
    if (oss) setOrdens(JSON.parse(oss));
  }, [router]);

  const handleAddProduto = () => {
    const prod = produtos.find(p => p.id === Number(produtoSelecionadoId));
    if (!prod) return;
    
    const qtd = parseInt(qtdProduto) || 1;
    const preco = parseMoeda(prod.precoVenda);
    
    const novoItem: ItemOrcamento = { produtoId: prod.id, nome: prod.nome, qtd, precoUnitario: preco, subtotal: preco * qtd };
    setItensCarrinho([...itensCarrinho, novoItem]);
    setProdutoSelecionadoId(""); setQtdProduto("1");
  };

  const removerItem = (index: number) => {
    const novaLista = [...itensCarrinho];
    novaLista.splice(index, 1);
    setItensCarrinho(novaLista);
  };

  const totalEquipamentos = itensCarrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const valorMaoObra = parseMoeda(maoDeObra);
  const valorTotalGeral = totalEquipamentos + valorMaoObra;

  const handleCriarOrcamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || (itensCarrinho.length === 0 && valorMaoObra === 0)) {
      setMensagem("Selecione um cliente e adicione produtos ou mão de obra."); return;
    }

    const clienteSelecionado = clientes.find(c => c.id === Number(clienteId));
    
    const novoOrcamento: Orcamento = {
      id: Date.now(),
      clienteId: Number(clienteId),
      clienteNome: clienteSelecionado?.nome || "Desconhecido",
      itens: itensCarrinho,
      maoDeObra: formatMoeda(valorMaoObra),
      descricaoObs,
      valorTotal: formatMoeda(valorTotalGeral),
      status: "Em Aberto",
      dataCriacao: new Date().toLocaleDateString("pt-BR")
    };

    const novaLista = [novoOrcamento, ...orcamentos];
    setOrcamentos(novaLista); localStorage.setItem("orcamentos_cadastrados", JSON.stringify(novaLista));

    setMensagem("Orçamento gerado com sucesso!");
    setClienteId(""); setItensCarrinho([]); setMaoDeObra(""); setDescricaoObs("");
    setTimeout(() => setMensagem(""), 3500);
  };

  const rejeitarOrcamento = (id: number) => {
    if (window.confirm("Marcar este orçamento como rejeitado pelo cliente?")) {
      const novaLista = orcamentos.map(orc => orc.id === id ? { ...orc, status: "Rejeitado" as const } : orc);
      setOrcamentos(novaLista); localStorage.setItem("orcamentos_cadastrados", JSON.stringify(novaLista));
    }
  };

  const iniciarAprovacao = (id: number) => { setOrcamentoAprovandoId(id); setTecnicoSelecionadoId(""); setDataAgendamento(""); setHoraAgendamento(""); };

  const confirmarAprovacaoEGerarOS = (orcamento: Orcamento) => {
    if (!tecnicoSelecionadoId || !dataAgendamento || !horaAgendamento) { alert("Por favor, selecione o técnico, a data e o horário da instalação."); return; }
    const tecnicoSelecionado = tecnicos.find(t => t.id === Number(tecnicoSelecionadoId));

    let descricaoLimpa = "MATERIAIS A LEVAR:\n";
    let estoqueAtualizado = [...produtos]; // Cópia do estoque atual para abater

    if (orcamento.itens && orcamento.itens.length > 0) {
      descricaoLimpa += orcamento.itens.map(i => `- ${i.qtd}x ${i.nome}`).join("\n");
      
      // SISTEMA DE BAIXA DE ESTOQUE AUTOMÁTICA
      orcamento.itens.forEach(itemOrcado => {
        estoqueAtualizado = estoqueAtualizado.map(prod => {
          if (prod.id === itemOrcado.produtoId) {
            const qtdAtual = parseInt(prod.quantidade) || 0;
            const novaQtd = Math.max(0, qtdAtual - itemOrcado.qtd); // Garante que não fica negativo
            return { ...prod, quantidade: String(novaQtd) };
          }
          return prod;
        });
      });
      
      // Atualiza o state e o banco local de produtos/estoque
      setProdutos(estoqueAtualizado);
      localStorage.setItem("estoque_cadastrado", JSON.stringify(estoqueAtualizado));
      
    } else { 
      descricaoLimpa += "Nenhum material registrado no sistema."; 
    }
    
    descricaoLimpa += "\n\nSERVIÇO / OBSERVAÇÃO:\n";
    descricaoLimpa += orcamento.descricaoObs || "Instalação padrão.";

    const novaOS: OrdemServico = {
      id: Date.now() + 1,
      orcamentoId: orcamento.id, 
      clienteId: orcamento.clienteId, 
      clienteNome: orcamento.clienteNome,
      tecnicoId: Number(tecnicoSelecionadoId), 
      tecnicoNome: tecnicoSelecionado?.nome || "Desconhecido",
      descricao: descricaoLimpa, 
      status: "Aprovada", 
      dataCriacao: new Date().toLocaleDateString("pt-BR"),
      dataAgendamento, 
      horaAgendamento
    };

    const novasOrdens = [novaOS, ...ordens];
    setOrdens(novasOrdens); 
    localStorage.setItem("ordens_servico", JSON.stringify(novasOrdens));

    const novosOrcamentos = orcamentos.map(orc => orc.id === orcamento.id ? { ...orc, status: "Aprovado" as const } : orc);
    setOrcamentos(novosOrcamentos); localStorage.setItem("orcamentos_cadastrados", JSON.stringify(novosOrcamentos));
    
    setOrcamentoAprovandoId(null);
    alert(`OS Gerada e Estoque deduzido! O técnico ${tecnicoSelecionado?.nome} já recebeu a OS-${novaOS.id.toString().slice(-4)}.`);
  };

  const apagarOrcamento = (id: number) => {
    if (window.confirm("Apagar orçamento permanentemente?")) {
      const novaLista = orcamentos.filter(orc => orc.id !== id);
      setOrcamentos(novaLista); localStorage.setItem("orcamentos_cadastrados", JSON.stringify(novaLista));
    }
  };

  const imprimirOrcamento = (orc: Orcamento) => {
    setOrcParaImprimir(orc);
    setTimeout(() => { window.print(); }, 200);
  };

  const orcamentosFiltrados = orcamentos.filter(orc => 
    orc.clienteNome.toLowerCase().includes(busca.toLowerCase()) || 
    orc.status.toLowerCase().includes(busca.toLowerCase()) ||
    orc.id.toString().includes(busca)
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar Orçamentos...</div>;

  return (
    <>
      <style>{`
        @media print {
          header { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="w-full flex flex-col gap-6 print:hidden">
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-blue-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              + Novo Orçamento
            </h2>
            <div className="bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-md">
              <span className="text-[11px] text-slate-400">Total Previsto: </span>
              <span className="text-sm text-green-400 font-bold">R$ {formatMoeda(valorTotalGeral)}</span>
            </div>
          </div>

          {clientes.length === 0 ? (
            <div className="p-3 bg-amber-950/30 border border-amber-900/50 text-amber-500 text-xs rounded-md">⚠️ Cadastre clientes primeiro.</div>
          ) : (
            <form onSubmit={handleCriarOrcamento} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Selecionar Cliente *</label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full md:w-1/2 outline-none focus:border-blue-500">
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-md p-3">
                <label className="block text-[11px] font-medium text-slate-400 mb-2">Adicionar Materiais do Estoque</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={produtoSelecionadoId} onChange={(e) => setProdutoSelecionadoId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 flex-1 outline-none focus:border-blue-500">
                    <option value="">Selecione um equipamento...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Venda: R$ {p.precoVenda} | Estq: {p.quantidade})</option>)}
                  </select>
                  <input type="number" min="1" value={qtdProduto} onChange={(e) => setQtdProduto(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-20 outline-none text-center" placeholder="Qtd" />
                  <button type="button" onClick={handleAddProduto} disabled={!produtoSelecionadoId} className="bg-blue-900/50 hover:bg-blue-800 text-blue-300 border border-blue-800 text-xs font-medium py-1.5 px-4 rounded-md transition-colors disabled:opacity-50">
                    Adicionar
                  </button>
                </div>

                {itensCarrinho.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {itensCarrinho.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-[#0b0f19] border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300">
                        <span><b className="text-blue-400">{item.qtd}x</b> {item.nome}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">R$ {formatMoeda(item.subtotal)}</span>
                          <button type="button" onClick={() => removerItem(index)} className="text-red-500 hover:text-red-400 font-bold">✖</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-[11px] text-slate-400 mt-1">Subtotal Materiais: R$ {formatMoeda(totalEquipamentos)}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Mão de Obra / Instalação (R$)</label>
                  <input type="text" value={maoDeObra} onChange={(e) => setMaoDeObra(e.target.value)} placeholder="Ex: 250,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-green-400 font-bold w-full outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Observações do Orçamento</label>
                  <input type="text" value={descricaoObs} onChange={(e) => setDescricaoObs(e.target.value)} placeholder="Ex: Garantia de 1 ano nos equipamentos." className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 w-full outline-none focus:border-blue-500" />
                </div>
              </div>

              {mensagem && <div className={`p-2 rounded-md text-[11px] font-medium mt-1 ${mensagem.includes("Selecione") ? "bg-red-950/50 text-red-400" : "bg-green-950/50 text-green-400"}`}>{mensagem}</div>}
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-md mt-1 transition-colors shadow-md">
                Gerar Orçamento Definitivo
              </button>
            </form>
          )}
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Orçamentos Gerados ({orcamentosFiltrados.length})</h3>
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors" />
            </div>
          </div>
          
          {orcamentos.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Nenhum orçamento gerado.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {orcamentosFiltrados.map(orc => (
                <div key={orc.id} className="bg-[#0b0f19] border border-slate-800 p-4 rounded-md flex flex-col gap-3 hover:border-slate-700 transition-colors">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-orange-400 bg-orange-950/60 border border-orange-900/50 px-2 py-0.5 rounded">ORC-{orc.id.toString().slice(-4)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orc.status === 'Aprovado' ? 'bg-green-900/40 text-green-400' : orc.status === 'Rejeitado' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'}`}>{orc.status}</span>
                      </div>
                      <p className="font-bold text-slate-200 text-sm">Cliente: {orc.clienteNome}</p>
                      <p className="text-[11px] text-slate-400 mt-1">📅 {orc.dataCriacao}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className="text-xs text-slate-400">Total:</p>
                        <p className="text-base text-green-400 font-bold">R$ {orc.valorTotal}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button onClick={() => imprimirOrcamento(orc)} className="text-blue-400 hover:text-blue-300 text-[10px] font-bold bg-blue-950/30 px-3 py-1.5 rounded border border-blue-900/50 transition-colors flex items-center gap-1.5">
                          🖨️ Gerar PDF / Imprimir
                        </button>
                        <button onClick={() => apagarOrcamento(orc.id)} className="px-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 border border-slate-700 text-[10px] rounded transition-colors">✖</button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                    <p className="font-bold text-blue-400 mb-1">Mão de Obra: R$ {orc.maoDeObra || "0,00"}</p>
                    <p className="text-slate-500 mb-2">Obs: {orc.descricaoObs || "Nenhuma observação."}</p>
                    {orc.itens && orc.itens.length > 0 && (
                      <ul className="pl-3 border-l-2 border-slate-700">
                        {orc.itens.map((i, idx) => (
                          <li key={idx} className="text-slate-400">- {i.qtd}x {i.nome} <span className="font-mono text-slate-500">(R$ {formatMoeda(i.subtotal)})</span></li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {orc.status === "Em Aberto" && orcamentoAprovandoId !== orc.id && (
                    <div className="flex gap-2 mt-1 pt-3 border-t border-slate-800/80">
                      <button onClick={() => iniciarAprovacao(orc.id)} className="flex-1 bg-green-950/40 hover:bg-green-900/60 text-green-400 border border-green-900/50 text-xs font-medium py-2 rounded transition-colors">✅ Aprovar, Agendar e Baixar Estoque</button>
                      <button onClick={() => rejeitarOrcamento(orc.id)} className="flex-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 text-xs font-medium py-2 rounded transition-colors">❌ Rejeitado</button>
                    </div>
                  )}

                  {orcamentoAprovandoId === orc.id && (
                    <div className="mt-2 p-3 bg-slate-900 border border-blue-900/50 rounded-md flex flex-col gap-3">
                      <p className="text-[11px] text-blue-400 font-bold">Orçamento Aprovado! Defina data/hora e técnico para despachar a OS:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Data *</label>
                          <input type="date" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Horário *</label>
                          <input type="time" value={horaAgendamento} onChange={(e) => setHoraAgendamento(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 w-full outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <select value={tecnicoSelecionadoId} onChange={(e) => setTecnicoSelecionadoId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 flex-1 outline-none">
                          <option value="">Escolher Técnico...</option>
                          {tecnicos.filter(t => t.status === "Ativo").map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                        <button onClick={() => confirmarAprovacaoEGerarOS(orc)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded transition-colors shadow-md">Despachar OS</button>
                      </div>
                      <button onClick={() => setOrcamentoAprovandoId(null)} className="text-[10px] text-slate-500 hover:text-slate-300 text-left w-fit">Cancelar agendamento</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* IMPRESSÃO DO ORÇAMENTO CENTRALIZADA */}
      {orcParaImprimir && (
        <div className="hidden print:block print:bg-white print:text-black w-full min-h-screen font-sans">
          <div className="border-2 border-black p-8 rounded-lg max-w-4xl mx-auto">
            
            <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6 text-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-24 object-contain mb-2" />
              ) : (
                <h1 className="text-3xl font-black uppercase tracking-tight mb-2">SOS CASA DE PRAIA</h1>
              )}
              {/* NOVO BLOCO CNPJ E TELEFONE */}
              <div className="text-[11px] font-bold text-gray-700 mb-4 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-300 print:border-black">
                CNPJ: 38.250.620.0001-07 | Contato / WhatsApp: (13) 98131-1644
              </div>

              <h2 className="text-2xl font-black tracking-widest text-gray-800 uppercase">Orçamento</h2>
              <p className="text-sm font-mono text-gray-600 font-bold mt-1">Nº ORC-{orcParaImprimir.id.toString().slice(-4)} • Proposta Comercial</p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-lg font-bold uppercase">{orcParaImprimir.clienteNome}</p>
              </div>
              <div className="border-b border-gray-300 pb-2 flex flex-col justify-end">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data de Emissão</p>
                <p className="text-base">{orcParaImprimir.dataCriacao}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-bold text-black uppercase tracking-wider mb-3 bg-gray-200 py-1.5 px-3 rounded-t border-b-2 border-black">
                Equipamentos e Materiais
              </p>
              <table className="w-full text-sm border-collapse border border-gray-400 mb-2">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400">
                    <th className="text-left py-2 px-3 border-r border-gray-400">Qtd</th>
                    <th className="text-left py-2 px-3 border-r border-gray-400">Descrição do Item</th>
                    <th className="text-right py-2 px-3 border-r border-gray-400">V. Unitário</th>
                    <th className="text-right py-2 px-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orcParaImprimir.itens && orcParaImprimir.itens.length > 0 ? (
                    orcParaImprimir.itens.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-2 px-3 border-r border-gray-400 font-bold text-center">{item.qtd}</td>
                        <td className="py-2 px-3 border-r border-gray-400">{item.nome}</td>
                        <td className="py-2 px-3 border-r border-gray-400 text-right">R$ {formatMoeda(item.precoUnitario)}</td>
                        <td className="py-2 px-3 text-right font-bold">R$ {formatMoeda(item.subtotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhum material discriminado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-400 p-4 rounded bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Observações / Condições</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{orcParaImprimir.descricaoObs || "Instalação padrão. Equipamentos com garantia de fábrica."}</p>
                <p className="text-xs text-gray-500 mt-4 italic">* Orçamento válido por 15 dias.</p>
              </div>
              <div className="flex flex-col justify-end gap-3">
                <div className="flex justify-between border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-600">Subtotal Materiais:</span>
                  <span className="font-bold">R$ {formatMoeda(orcParaImprimir.itens?.reduce((acc, item) => acc + item.subtotal, 0) || 0)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-600">Mão de Obra / Serviço:</span>
                  <span className="font-bold">R$ {orcParaImprimir.maoDeObra || "0,00"}</span>
                </div>
                <div className="flex justify-between bg-gray-200 p-3 rounded border border-black items-center mt-2">
                  <span className="text-lg font-black uppercase">Valor Total:</span>
                  <span className="text-2xl font-black">R$ {orcParaImprimir.valorTotal}</span>
                </div>
              </div>
            </div>

            <div className="mt-16 flex justify-end px-10">
              <div className="text-center w-72">
                <div className="border-t-2 border-black mb-2"></div>
                <p className="text-sm font-bold uppercase">{orcParaImprimir.clienteNome}</p>
                <p className="text-xs text-gray-600">De acordo / Aprovação do Cliente</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

interface Cliente { id: number; nome: string; telefone?: string; email?: string; cnpjCpf?: string; }
interface Produto { id: number; nome: string; quantidade: string; precoVenda: string; }
interface ItemOrcamento { produtoId: number; nome: string; quantidade: number; precoUnitario: number; subtotal: number; tipo: "produto" | "servico"; }
interface Orcamento {
  id: number;
  clienteId: number;
  clienteNome: string;
  descricao: string;
  itens: ItemOrcamento[];
  valorTotal: string;
  status: "Pendente" | "Aprovado" | "Rejeitado";
  dataCriacao: string;
}

export default function OrcamentosPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estoque, setEstoque] = useState<Produto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);

  // Estados do formulário
  const [clienteId, setClienteId] = useState("");
  const [descricaoGeral, setDescricaoGeral] = useState("");
  const [itensSelecionados, setItensSelecionados] = useState<ItemOrcamento[]>([]);
  
  // Adicionar Item
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [quantidadeItem, setQuantidadeItem] = useState("1");
  
  // Adicionar Serviço Avulso
  const [nomeServico, setNomeServico] = useState("");
  const [valorServico, setValorServico] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [orcamentoParaImprimir, setOrcamentoParaImprimir] = useState<Orcamento | null>(null);

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    carregarDadosBase();
    carregarOrcamentosNuvem();
  }, [router]);

  const carregarDadosBase = async () => {
    const resClientes = await supabase.from("clientes").select("*");
    if (resClientes.data) setClientes(resClientes.data);

    const resEstoque = await supabase.from("estoque").select("*");
    if (resEstoque.data) {
      setEstoque(resEstoque.data.map((p:any) => ({
        id: p.id, nome: p.nome, quantidade: p.quantidade, precoVenda: p.precoVenda
      })));
    }
  };

  const carregarOrcamentosNuvem = async () => {
    try {
      const { data, error } = await supabase.from("orcamentos").select("*").order("id", { ascending: false });
      if (error) throw error;
      if (data) {
        const orcFormatados: Orcamento[] = data.map((o: any) => ({
          id: o.id,
          clienteId: o.cliente_id,
          clienteNome: o.cliente_nome,
          descricao: o.descricao,
          valorTotal: o.valor_total,
          status: o.status,
          dataCriacao: o.data_criacao,
          itens: JSON.parse(o.itens || "[]")
        }));
        setOrcamentos(orcFormatados);
        localStorage.setItem("orcamentos_cadastrados", JSON.stringify(orcFormatados));
      }
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
    }
  };

  const adicionarProduto = () => {
    if (!produtoSelecionadoId || !quantidadeItem || Number(quantidadeItem) <= 0) return;
    const produto = estoque.find(p => p.id === Number(produtoSelecionadoId));
    if (!produto) return;

    const precoNum = Number(produto.precoVenda.replace(",", "."));
    const qtdNum = Number(quantidadeItem);

    const novoItem: ItemOrcamento = {
      produtoId: produto.id,
      nome: produto.nome,
      quantidade: qtdNum,
      precoUnitario: precoNum,
      subtotal: precoNum * qtdNum,
      tipo: "produto"
    };

    setItensSelecionados([...itensSelecionados, novoItem]);
    setProdutoSelecionadoId(""); setQuantidadeItem("1");
  };

  const adicionarServico = () => {
    if (!nomeServico.trim() || !valorServico.trim()) return;
    
    const valorNum = Number(valorServico.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) return;

    const novoItem: ItemOrcamento = {
      produtoId: Date.now(),
      nome: `[SERVIÇO] ${nomeServico.trim()}`,
      quantidade: 1,
      precoUnitario: valorNum,
      subtotal: valorNum,
      tipo: "servico"
    };

    setItensSelecionados([...itensSelecionados, novoItem]);
    setNomeServico(""); setValorServico("");
  };

  const removerItem = (index: number) => {
    const novaLista = [...itensSelecionados];
    novaLista.splice(index, 1);
    setItensSelecionados(novaLista);
  };

  const valorTotalOrcamento = itensSelecionados.reduce((acc, item) => acc + item.subtotal, 0);

  const handleSalvarOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || itensSelecionados.length === 0) {
      setMensagem("Selecione um cliente e adicione pelo menos um item/serviço."); return;
    }

    const clienteSelecionado = clientes.find(c => c.id === Number(clienteId));

    const novoOrcamentoNuvem = {
      id: Date.now(),
      cliente_id: Number(clienteId),
      cliente_nome: clienteSelecionado?.nome || "Desconhecido",
      descricao: descricaoGeral.trim(),
      itens: JSON.stringify(itensSelecionados),
      valor_total: valorTotalOrcamento.toFixed(2),
      status: "Pendente",
      data_criacao: new Date().toLocaleDateString("pt-BR")
    };

    try {
      const { error } = await supabase.from("orcamentos").insert([novoOrcamentoNuvem]);
      if (error) throw error;

      setMensagem("Orçamento gerado na nuvem com sucesso!");
      setClienteId(""); setDescricaoGeral(""); setItensSelecionados([]);
      await carregarOrcamentosNuvem();
    } catch (err) {
      setMensagem("Erro ao gerar orçamento.");
    }
    setTimeout(() => setMensagem(""), 3000);
  };

  const apagarOrcamento = async (id: number) => {
    if (window.confirm("Deseja apagar este orçamento da nuvem?")) {
      await supabase.from("orcamentos").delete().eq("id", id);
      await carregarOrcamentosNuvem();
    }
  };

  const alterarStatus = async (id: number, novoStatus: "Pendente" | "Aprovado" | "Rejeitado") => {
    try {
      const { error } = await supabase.from("orcamentos").update({ status: novoStatus }).eq("id", id);
      if (error) throw error;
      
      if (novoStatus === "Aprovado") {
        const orc = orcamentos.find(o => o.id === id);
        if (orc) {
          const entradaFinanceira = {
            id: Date.now(),
            tipo: "Entrada",
            descricao: `Pagamento Orçamento #${orc.id.toString().slice(-4)} - ${orc.clienteNome}`,
            valor: orc.valorTotal,
            data_registro: new Date().toLocaleDateString("pt-BR"),
            os_id: null
          };
          await supabase.from("financeiro").insert([entradaFinanceira]);

          for (const item of orc.itens) {
            if (item.tipo === "produto") {
              const prod = estoque.find(p => p.id === item.produtoId);
              if (prod) {
                const novaQtd = (Number(prod.quantidade) - item.quantidade).toString();
                await supabase.from("estoque").update({ quantidade: novaQtd }).eq("id", prod.id);
              }
            }
          }
          await carregarDadosBase(); 
        }
      }
      await carregarOrcamentosNuvem();
    } catch (err) {
      alert("Erro ao processar aprovação.");
    }
  };

  const imprimirOrcamento = (orc: Orcamento) => {
    setOrcamentoParaImprimir(orc);
    setTimeout(() => window.print(), 200);
  };

  const orcamentosFiltrados = orcamentos.filter(o => 
    o.clienteNome.toLowerCase().includes(busca.toLowerCase()) || 
    o.id.toString().includes(busca)
  );

  const clienteImpressao = orcamentoParaImprimir ? clientes.find(c => c.id === orcamentoParaImprimir.clienteId) : null;

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar Orçamentos...</div>;

  return (
    <>
      <style>{`
        @media print {
          header, nav, footer { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="w-full flex flex-col gap-6 print:hidden">
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
            📝 Novo Orçamento (Nuvem)
          </h2>
          
          <form onSubmit={handleSalvarOrcamento} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-400">Cliente *</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-2 px-3 text-xs text-slate-200 outline-none focus:border-blue-500">
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-400">Descrição Geral / Observações</label>
              <textarea value={descricaoGeral} onChange={(e) => setDescricaoGeral(e.target.value)} rows={2} placeholder="Ex: Referente à instalação de 4 câmaras de segurança..." className="bg-[#0b0f19] border border-slate-700 rounded-md py-2 px-3 text-xs text-slate-200 resize-none outline-none focus:border-blue-500"></textarea>
            </div>

            <div className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 pb-3">
                
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">📦 Adicionar Material</p>
                  <div className="flex gap-2">
                    <select value={produtoSelecionadoId} onChange={(e) => setProdutoSelecionadoId(e.target.value)} className="flex-1 bg-[#111827] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-blue-500">
                      <option value="">Produto (Estoque)...</option>
                      {estoque.map(p => <option key={p.id} value={p.id}>{p.nome} (R$ {p.precoVenda})</option>)}
                    </select>
                    <input type="number" min="1" value={quantidadeItem} onChange={(e) => setQuantidadeItem(e.target.value)} className="w-16 bg-[#111827] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-center text-slate-200 outline-none focus:border-blue-500" />
                    <button type="button" onClick={adicionarProduto} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 rounded-md transition-colors">+</button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">🔧 Adicionar Serviço</p>
                  <div className="flex gap-2">
                    <input type="text" value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} placeholder="Nome do Serviço" className="flex-1 bg-[#111827] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-amber-500" />
                    <input type="text" value={valorServico} onChange={(e) => setValorServico(e.target.value)} placeholder="R$" className="w-20 bg-[#111827] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-center text-slate-200 outline-none focus:border-amber-500" />
                    <button type="button" onClick={adicionarServico} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 rounded-md transition-colors">+</button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {itensSelecionados.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">Nenhum item adicionado ao orçamento.</p>
                ) : (
                  itensSelecionados.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#111827] p-2 rounded border border-slate-700/50">
                      <div>
                        <p className="text-xs font-bold text-slate-200">{item.nome}</p>
                        <p className="text-[10px] text-slate-400">{item.quantidade}x R$ {item.precoUnitario.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-bold text-green-400">R$ {item.subtotal.toFixed(2).replace('.', ',')}</p>
                        <button type="button" onClick={() => removerItem(idx)} className="text-red-500 hover:text-red-400 text-xs font-bold">X</button>
                      </div>
                    </div>
                  ))
                )}
                
                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Valor Total</span>
                  <span className="text-lg font-black text-green-400">R$ {valorTotalOrcamento.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-md transition-colors uppercase">Guardar Orçamento na Nuvem</button>
            {mensagem && <div className={`text-xs text-center ${mensagem.includes("Erro") || mensagem.includes("Selecione") ? "text-red-400" : "text-green-400"}`}>{mensagem}</div>}
          </form>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Histórico de Orçamentos ({orcamentosFiltrados.length})</h3>
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
          </div>
          
          {orcamentos.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Nenhum orçamento registado.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {orcamentosFiltrados.map(orc => (
                <div key={orc.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col gap-3 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded">ORC-{orc.id.toString().slice(-4)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orc.status === 'Aprovado' ? 'bg-emerald-900/40 text-emerald-400' : orc.status === 'Rejeitado' ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                          {orc.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-bold text-slate-200 text-sm">{orc.clienteNome}</p>
                      <p className="text-[10px] text-slate-400">📅 {orc.dataCriacao}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Valor Total</p>
                      <p className="font-black text-green-400 text-base">R$ {Number(orc.valorTotal).toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <p className="text-xs text-slate-500 line-clamp-1 flex-1">{orc.descricao || `${orc.itens.length} itens inclusos`}</p>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {orc.status === "Pendente" && (
                        <>
                          <button onClick={() => alterarStatus(orc.id, "Aprovado")} className="flex-1 sm:flex-none text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded border border-emerald-900/50 hover:bg-emerald-900/40 transition-colors text-xs font-bold">👍 Aprovar</button>
                          <button onClick={() => alterarStatus(orc.id, "Rejeitado")} className="flex-1 sm:flex-none text-red-400 bg-red-950/30 px-3 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors text-xs font-bold">👎 Rejeitar</button>
                        </>
                      )}
                      <button onClick={() => imprimirOrcamento(orc)} className="flex-1 sm:flex-none text-blue-400 bg-blue-950/30 px-3 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors text-xs font-bold flex items-center justify-center">🖨️ Imprimir</button>
                      <button onClick={() => apagarOrcamento(orc.id)} className="flex-1 sm:flex-none text-red-500 hover:text-red-400 text-xs font-medium px-2 py-1.5">Apagar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {orcamentoParaImprimir && (
        <div className="hidden print:block print:bg-white print:text-black w-full font-sans">
          <div className="border-2 border-black p-8 rounded-lg max-w-4xl mx-auto mt-4">
            <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6 text-center">
              {/* IMAGEM FIXA DA LOGO NA IMPRESSÃO DO ORÇAMENTO */}
              <img src="/logo.jpg" alt="Logo SOS Casa de Praia" className="h-24 object-contain mb-2" />
              <div className="text-[11px] font-bold text-gray-700 mb-3 bg-gray-100 px-4 py-1 rounded-full border border-black">
                CNPJ: 38.250.620.0001-07 | WhatsApp: (13) 98131-1644
              </div>
              <h2 className="text-xl font-black tracking-widest text-gray-800 uppercase">Proposta de Orçamento</h2>
              <p className="text-sm font-mono text-gray-600 font-bold mt-1">Nº ORC-{orcamentoParaImprimir.id.toString().slice(-4)} • Data: {orcamentoParaImprimir.dataCriacao}</p>
            </div>
            
            <div className="bg-gray-100 p-4 rounded border border-black mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
              <p className="text-lg font-bold uppercase">{orcamentoParaImprimir.clienteNome}</p>
              {clienteImpressao && (
                <p className="text-sm text-gray-700 mt-1">
                  {clienteImpressao.telefone && `Tel: ${clienteImpressao.telefone}`} {clienteImpressao.cnpjCpf && `| Doc: ${clienteImpressao.cnpjCpf}`}
                </p>
              )}
            </div>

            {orcamentoParaImprimir.descricao && (
              <div className="mb-6">
                <p className="text-sm font-bold text-black uppercase tracking-wider mb-2">Descrição / Notas</p>
                <div className="border border-gray-400 p-3 whitespace-pre-wrap text-sm leading-relaxed rounded bg-gray-50">
                  {orcamentoParaImprimir.descricao}
                </div>
              </div>
            )}

            <div className="mb-8">
              <p className="text-sm font-bold text-black uppercase tracking-wider mb-2">Serviços e Materiais</p>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-y-2 border-black">
                    <th className="py-2 px-3 text-xs uppercase font-bold">Item</th>
                    <th className="py-2 px-3 text-xs uppercase font-bold text-center">Qtd</th>
                    <th className="py-2 px-3 text-xs uppercase font-bold text-right">Unitário</th>
                    <th className="py-2 px-3 text-xs uppercase font-bold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentoParaImprimir.itens.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="py-2 px-3 text-sm">{item.nome}</td>
                      <td className="py-2 px-3 text-sm text-center">{item.quantidade}</td>
                      <td className="py-2 px-3 text-sm text-right">R$ {item.precoUnitario.toFixed(2).replace('.', ',')}</td>
                      <td className="py-2 px-3 text-sm font-bold text-right">R$ {item.subtotal.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <div className="bg-gray-100 p-4 rounded border-2 border-black w-64 text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valor Total</p>
                  <p className="text-2xl font-black">R$ {Number(orcamentoParaImprimir.valorTotal).toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
              <p>Este orçamento é válido por 15 dias a partir da data de emissão.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
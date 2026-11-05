"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; 

interface Produto {
  id: number;
  nome: string;
  quantidade: string;
  precoVenda: string;
}

export default function EstoquePage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoEditandoId, setProdutoEditandoId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    carregarEstoqueNuvem();
  }, [router]);

  const carregarEstoqueNuvem = async () => {
    try {
      const { data, error } = await supabase
        .from("estoque")
        .select("*")
        .order("nome", { ascending: true }); // Ordena por ordem alfabética para facilitar

      if (!error && data) {
        const produtosFormatados: Produto[] = data.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          quantidade: p.quantidade,
          precoVenda: p.preco_venda || p.precoVenda // Garante a leitura da nuvem
        }));
        
        setProdutos(produtosFormatados);
        localStorage.setItem("estoque_cadastrado", JSON.stringify(produtosFormatados));
      }
    } catch (err) {
      console.error("Erro ao carregar estoque da nuvem:", err);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    // A validação agora permite o número 0 na quantidade
    if (!nome.trim() || quantidade.toString().trim() === "" || !precoVenda.toString().trim()) {
      setMensagem("Por favor, preencha todos os campos do produto.");
      return;
    }

    const dadosProdutoNuvem = {
      nome: nome.trim(),
      quantidade: quantidade.toString().trim(),
      preco_venda: precoVenda.toString().trim() 
    };

    try {
      if (produtoEditandoId !== null) {
        const { error } = await supabase
          .from("estoque")
          .update(dadosProdutoNuvem)
          .eq("id", produtoEditandoId);

        if (error) throw error;
        setMensagem(`Produto "${nome}" atualizado na nuvem!`);
        setProdutoEditandoId(null);
      } else {
        const novoId = Date.now();
        const { error } = await supabase
          .from("estoque")
          .insert([{ id: novoId, ...dadosProdutoNuvem }]);

        if (error) throw error;
        setMensagem(`Produto "${nome}" cadastrado com sucesso!`);
      }

      setNome(""); setQuantidade(""); setPrecoVenda("");
      await carregarEstoqueNuvem();
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      setMensagem("Erro ao salvar na nuvem: " + (err.message || "Erro desconhecido"));
    }

    setTimeout(() => setMensagem(""), 3500);
  };

  const editarProduto = (prod: Produto) => {
    setNome(prod.nome);
    setQuantidade(prod.quantidade);
    setPrecoVenda(prod.precoVenda);
    setProdutoEditandoId(prod.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setNome(""); setQuantidade(""); setPrecoVenda(""); setProdutoEditandoId(null); setMensagem("");
  };

  const apagarProduto = async (id: number) => {
    if (window.confirm("Deseja apagar este produto permanentemente do sistema?")) {
      try {
        const { error } = await supabase
          .from("estoque")
          .delete()
          .eq("id", id);

        if (error) throw error;
        await carregarEstoqueNuvem();
        if (produtoEditandoId === id) cancelarEdicao();
      } catch (err) {
        console.error("Erro ao apagar produto:", err);
        alert("Erro ao apagar produto da nuvem.");
      }
    }
  };

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar Estoque...</div>;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      <div className={`border rounded-lg p-4 shadow-sm transition-colors ${produtoEditandoId ? "bg-blue-950/20 border-blue-900/50" : "bg-[#111827] border-slate-800"}`}>
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {produtoEditandoId ? "✏️ Editando Produto" : "➕ Novo Produto"}
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome do Equipamento / Material *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Câmera Intelbras" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Quantidade em Stock *</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 10" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Preço de Venda (R$) *</label>
              <input type="text" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="Ex: 350,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-green-400 font-bold outline-none focus:border-blue-500 w-full" />
            </div>
          </div>

          {mensagem && (
            <div className={`p-2 rounded-md text-[11px] font-bold text-center mt-1 ${mensagem.includes("Por favor") || mensagem.includes("Erro") ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-emerald-950/50 border border-emerald-800 text-emerald-400"}`}>
              {mensagem}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button type="submit" className={`flex-1 text-xs font-bold py-2.5 rounded-md transition-colors shadow-lg uppercase tracking-wider ${produtoEditandoId ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {produtoEditandoId ? "✅ Salvar Alterações" : "+ Cadastrar Produto"}
            </button>
            {produtoEditandoId && (
              <button type="button" onClick={cancelarEdicao} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-6 rounded-md transition-colors border border-slate-700 uppercase">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LISTAGEM DO ESTOQUE */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Gestão de Estoque ({produtosFiltrados.length} itens)
          </h3>
          
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar produto..." 
              className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors"
            />
          </div>
        </div>
        
        {produtos.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">
            Ainda não há produtos registados na nuvem.
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">
            Nenhum produto encontrado para "{busca}".
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {produtosFiltrados.map(prod => {
              const semEstoque = Number(prod.quantidade) <= 0;
              
              return (
                <div key={prod.id} className={`bg-[#0b0f19] border p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 transition-colors ${semEstoque ? "border-red-900/30 hover:border-red-900/50" : "border-slate-800 hover:border-slate-700"}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-bold text-sm ${semEstoque ? "text-slate-400" : "text-slate-200"}`}>{prod.nome}</p>
                      {semEstoque && (
                        <span className="text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full">
                          🔴 Esgotado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      📦 Quantidade: <span className={`font-black text-sm ${semEstoque ? "text-red-400" : "text-slate-200"}`}>{prod.quantidade}</span> | 💰 Preço: <span className="text-green-400 font-bold">R$ {prod.precoVenda}</span>
                    </p>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                      onClick={() => editarProduto(prod)} 
                      className="flex-1 sm:flex-none text-amber-400 hover:text-amber-300 text-xs font-bold bg-amber-950/30 px-4 py-1.5 rounded border border-amber-900/50 hover:bg-amber-900/40 transition-colors text-center"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => apagarProduto(prod.id)} 
                      className="flex-1 sm:flex-none text-slate-500 hover:text-red-400 text-[11px] font-bold px-3 py-1.5 transition-colors text-center"
                    >
                      ✖ Apagar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
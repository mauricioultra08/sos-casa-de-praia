"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; // Caminho correto para o lib/supabase a partir de src/app/estoque

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
        .order("id", { ascending: false });

      if (!error && data) {
        setProdutos(data);
        // Guarda cache local para compatibilidade com orçamentos se necessário
        localStorage.setItem("estoque_cadastrado", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Erro ao carregar estoque da nuvem:", err);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !quantidade.trim() || !precoVenda.trim()) {
      setMensagem("Por favor, preencha todos os campos do produto.");
      return;
    }

    const dadosProduto = {
      nome: nome.trim(),
      quantidade: quantidade.trim(),
      precoVenda: precoVenda.trim()
    };

    try {
      if (produtoEditandoId !== null) {
        const { error } = await supabase
          .from("estoque")
          .update(dadosProduto)
          .eq("id", produtoEditandoId);

        if (error) throw error;
        setMensagem(`Produto "${nome}" atualizado na nuvem!`);
        setProdutoEditandoId(null);
      } else {
        const novoId = Date.now();
        const { error } = await supabase
          .from("estoque")
          .insert([{ id: novoId, ...dadosProduto }]);

        if (error) throw error;
        setMensagem(`Produto "${nome}" cadastrado na nuvem com sucesso!`);
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
    if (window.confirm("Deseja apagar este produto permanentemente da nuvem?")) {
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
      
      {/* FORMULÁRIO */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {produtoEditandoId ? "✏️ Editar Produto (Nuvem)" : "+ Novo Produto (Nuvem Ativa)"}
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome do Equipamento / Material *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Cabo UTP Cat6 305m" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Quantidade em Stock *</label>
              <input type="text" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 10" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Preço de Venda (R$) *</label>
              <input type="text" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="Ex: 350,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-green-400 font-bold outline-none focus:border-blue-500 w-full" />
            </div>
          </div>

          {mensagem && (
            <div className={`p-2 rounded-md text-[11px] font-medium mt-1 ${mensagem.includes("Por favor") || mensagem.includes("Erro") ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-green-950/50 border border-green-800 text-green-400"}`}>
              {mensagem}
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <button type="submit" className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${produtoEditandoId ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {produtoEditandoId ? "Salvar Alterações na Nuvem" : "+ Guardar Produto na Nuvem"}
            </button>
            {produtoEditandoId && (
              <button type="button" onClick={cancelarEdicao} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 px-6 rounded-md transition-colors border border-slate-700">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Stock Atual na Nuvem Supabase ({produtosFiltrados.length})
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
            {produtosFiltrados.map(prod => (
              <div key={prod.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <p className="font-bold text-slate-200 text-sm">{prod.nome}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    📦 Quantidade: <span className="text-slate-200 font-bold">{prod.quantidade}</span> | 💰 Preço Venda: <span className="text-green-400 font-bold">R$ {prod.precoVenda}</span>
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button onClick={() => editarProduto(prod)} className="flex-1 sm:flex-none text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-950/30 px-4 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors text-center">Editar</button>
                  <button onClick={() => apagarProduto(prod.id)} className="flex-1 sm:flex-none text-red-500 hover:text-red-400 text-xs font-medium bg-red-950/30 px-4 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors text-center">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
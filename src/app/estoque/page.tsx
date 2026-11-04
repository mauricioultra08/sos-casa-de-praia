"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

interface Produto {
  id: number;
  nome: string;
  categoria: string;
  quantidade: string;
  precoCusto: string;
  precoVenda: string;
}

export default function EstoquePage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  
  const [mensagem, setMensagem] = useState("");
  const [produtoEditandoId, setProdutoEditandoId] = useState<number | null>(null);
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    
    const usuario = JSON.parse(usuarioStr);
    if (usuario.tipo === "tecnico") { router.push("/app-tecnico"); return; }

    const estoqueSalvo = localStorage.getItem("estoque_cadastrado");
    
    if (estoqueSalvo) {
      setProdutos(JSON.parse(estoqueSalvo));
    } else {
      // PRÉ-CADASTRO DE EQUIPAMENTOS DE CFTV SE O ESTOQUE ESTIVER VAZIO
      const itensIniciais: Produto[] = [
        { id: 1, nome: "Câmera Bullet Intelbras VHD 1120 B", categoria: "Câmeras", quantidade: "15", precoCusto: "120,00", precoVenda: "180,00" },
        { id: 2, nome: "DVR Intelbras MHDX 1104", categoria: "DVR/NVR", quantidade: "5", precoCusto: "320,00", precoVenda: "450,00" },
        { id: 3, nome: "Cabo Coaxial Bipolar 100m", categoria: "Cabos", quantidade: "10", precoCusto: "75,00", precoVenda: "120,00" },
        { id: 4, nome: "Fonte Colmeia 12V 10A", categoria: "Fontes", quantidade: "20", precoCusto: "35,00", precoVenda: "65,00" },
        { id: 5, nome: "Conector BNC Mola", categoria: "Conectores", quantidade: "100", precoCusto: "1,50", precoVenda: "3,00" }
      ];
      setProdutos(itensIniciais);
      localStorage.setItem("estoque_cadastrado", JSON.stringify(itensIniciais));
    }
  }, [router]);

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !categoria || !quantidade || !precoVenda) {
      setMensagem("Preencha o Nome, Categoria, Quantidade e Preço de Venda.");
      return;
    }

    if (produtoEditandoId !== null) {
      const novaLista = produtos.map(prod => 
        prod.id === produtoEditandoId ? { ...prod, nome, categoria, quantidade, precoCusto, precoVenda } : prod
      );
      setProdutos(novaLista);
      localStorage.setItem("estoque_cadastrado", JSON.stringify(novaLista));
      setMensagem(`Produto "${nome}" atualizado com sucesso!`);
      setProdutoEditandoId(null);
    } else {
      const novoProduto: Produto = { id: Date.now(), nome, categoria, quantidade, precoCusto, precoVenda };
      const novaLista = [novoProduto, ...produtos];
      setProdutos(novaLista);
      localStorage.setItem("estoque_cadastrado", JSON.stringify(novaLista));
      setMensagem(`Produto "${nome}" adicionado ao estoque!`);
    }
    
    setNome(""); setCategoria(""); setQuantidade(""); setPrecoCusto(""); setPrecoVenda("");
    setTimeout(() => setMensagem(""), 3500);
  };

  const apagarProduto = (id: number) => {
    if (window.confirm("Tem certeza que deseja remover este produto do estoque?")) {
      const novaLista = produtos.filter(prod => prod.id !== id);
      setProdutos(novaLista);
      localStorage.setItem("estoque_cadastrado", JSON.stringify(novaLista));
      if (produtoEditandoId === id) cancelarEdicao();
    }
  };

  const editarProduto = (prod: Produto) => {
    setNome(prod.nome); setCategoria(prod.categoria); setQuantidade(prod.quantidade); 
    setPrecoCusto(prod.precoCusto); setPrecoVenda(prod.precoVenda);
    setProdutoEditandoId(prod.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setNome(""); setCategoria(""); setQuantidade(""); setPrecoCusto(""); setPrecoVenda("");
    setProdutoEditandoId(null); setMensagem("");
  };

  const produtosFiltrados = produtos.filter(prod => 
    prod.nome.toLowerCase().includes(busca.toLowerCase()) || 
    prod.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar Estoque...</div>;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {produtoEditandoId ? "✏️ Editar Equipamento" : "+ Adicionar ao Estoque"}
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome do Equipamento *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Câmera Bullet Intelbras..." className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Categoria *</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full appearance-none">
                <option value="">Selecione...</option>
                <option value="Câmeras">Câmeras</option>
                <option value="DVR/NVR">DVR / NVR</option>
                <option value="Cabos">Cabos</option>
                <option value="Fontes">Fontes de Alimentação</option>
                <option value="Conectores">Conectores (BNC/P4)</option>
                <option value="Alarmes/Sensores">Alarmes e Sensores</option>
                <option value="Ferramentas">Ferramentas</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Quantidade *</label>
              <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Preço de Custo (R$)</label>
              <input type="text" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} placeholder="Ex: 120,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Preço de Venda (R$) *</label>
              <input type="text" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="Ex: 180,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
          </div>

          {mensagem && (
            <div className={`p-2 rounded-md text-[11px] font-medium mt-1 ${mensagem.includes("Preencha") ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-green-950/50 border border-green-800 text-green-400"}`}>
              {mensagem}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button type="submit" className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${produtoEditandoId ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {produtoEditandoId ? "Salvar Alterações" : "+ Adicionar Produto"}
            </button>
            {produtoEditandoId && (
              <button type="button" onClick={cancelarEdicao} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 px-6 rounded-md transition-colors border border-slate-700">
                Cancelar Edição
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ÁREA DE LISTAGEM COM PESQUISA */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Controle de Estoque ({produtosFiltrados.length})
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por nome ou categoria..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors" />
          </div>
        </div>
        
        {produtos.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Estoque vazio.</div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Nenhum equipamento encontrado para "{busca}".</div>
        ) : (
          <div className="flex flex-col gap-2">
            {produtosFiltrados.map(prod => (
              <div key={prod.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-200 text-sm">{prod.nome}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {prod.categoria}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    📦 Qtd: <span className={Number(prod.quantidade) < 5 ? "text-red-400 font-bold" : "text-blue-400 font-bold"}>{prod.quantidade}</span> | 
                    💲 Custo: R$ {prod.precoCusto || "0,00"} | 
                    💰 Venda: <span className="text-green-400 font-bold">R$ {prod.precoVenda}</span>
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
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
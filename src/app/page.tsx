"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

interface Cliente { 
  id: number; 
  nome: string; 
  telefone: string; 
  rua: string; 
  numero: string; 
  bairro: string; 
  cidade: string; 
}

export default function ClientesPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Praia Grande");
  
  // Estados de controlo
  const [mensagem, setMensagem] = useState("");
  const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Estado para a pesquisa
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    const usuario = JSON.parse(usuarioStr);
    if (usuario.tipo === "tecnico") { router.push("/app-tecnico"); return; }

    carregarClientesNuvem();
  }, [router]);

  const carregarClientesNuvem = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("id", { ascending: false });

      if (!error && data) {
        setClientes(data);
      }
    } catch (err) {
      console.error("Erro ao carregar clientes da nuvem:", err);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !cidade.trim()) {
      setMensagem("Por favor, preencha pelo menos o Nome, Telefone e Cidade.");
      return;
    }

    const dadosCliente = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      rua: rua.trim(),
      numero: numero.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim()
    };

    try {
      if (clienteEditandoId !== null) {
        // Atualizar na nuvem
        const { error } = await supabase
          .from("clientes")
          .update(dadosCliente)
          .eq("id", clienteEditandoId);

        if (error) throw error;

        setMensagem(`Cliente "${nome}" atualizado na nuvem com sucesso!`);
        setClienteEditandoId(null);
      } else {
        // Inserir na nuvem
        const { error } = await supabase
          .from("clientes")
          .insert([dadosCliente]);

        if (error) throw error;

        setMensagem(`Cliente "${nome}" cadastrado na nuvem com sucesso!`);
      }
      
      setNome(""); setTelefone(""); setRua(""); setNumero(""); setBairro("");
      await carregarClientesNuvem();
    } catch (err: any) {
      console.error("Erro ao salvar cliente:", err);
      setMensagem("Erro ao salvar na nuvem: " + (err.message || "Erro desconhecido"));
    }

    setTimeout(() => setMensagem(""), 3500);
  };

  const apagarCliente = async (id: number) => {
    if (window.confirm("Tem certeza que deseja apagar este cliente permanentemente da nuvem?")) {
      try {
        const { error } = await supabase
          .from("clientes")
          .delete()
          .eq("id", id);

        if (error) throw error;
        await carregarClientesNuvem();
        if (clienteEditandoId === id) cancelarEdicao();
      } catch (err) {
        console.error("Erro ao apagar cliente:", err);
        alert("Erro ao apagar cliente da nuvem.");
      }
    }
  };

  const editarCliente = (cliente: Cliente) => {
    setNome(cliente.nome); 
    setTelefone(cliente.telefone); 
    setRua(cliente.rua || ""); 
    setNumero(cliente.numero || ""); 
    setBairro(cliente.bairro || ""); 
    setCidade(cliente.cidade || "");
    setClienteEditandoId(cliente.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setNome(""); setTelefone(""); setRua(""); setNumero(""); setBairro(""); setClienteEditandoId(null); setMensagem("");
  };

  // Filtragem em tempo real da lista de clientes
  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.telefone.includes(busca) ||
    (c.cidade && c.cidade.toLowerCase().includes(busca.toLowerCase())) ||
    (c.bairro && c.bairro.toLowerCase().includes(busca.toLowerCase()))
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar painel de clientes...</div>;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* FORMULÁRIO COMPACTO */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {clienteEditandoId ? "✏️ Editar Cliente (Nuvem)" : "+ Novo Cliente (Nuvem Ativa)"}
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome Completo *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Telefone / WhatsApp *</label>
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(13) 99999-9999" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Rua / Avenida</label>
              <input type="text" value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Ex: Av. Costa e Silva" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Número</label>
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 120" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Bairro / Balneário</label>
              <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex: Boqueirão" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Cidade *</label>
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Praia Grande" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
          </div>

          {mensagem && (
            <div className={`p-2 rounded-md text-[11px] font-medium mt-1 ${mensagem.includes("Por favor") || mensagem.includes("Erro") ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-green-950/50 border border-green-800 text-green-400"}`}>
              {mensagem}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button type="submit" className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${clienteEditandoId ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {clienteEditandoId ? "Salvar Alterações na Nuvem" : "+ Guardar Cliente na Nuvem"}
            </button>
            {clienteEditandoId && (
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
            Clientes na Nuvem Supabase ({clientesFiltrados.length})
          </h3>
          
          {/* BARRA DE PESQUISA */}
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome, tel ou cidade..." 
              className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors"
            />
          </div>
        </div>
        
        {clientes.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">
            Ainda não há clientes na nuvem.
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">
            Nenhum cliente encontrado para "{busca}".
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clientesFiltrados.map(cliente => (
              <div key={cliente.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <p className="font-bold text-slate-200 text-sm">{cliente.nome}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    📱 {cliente.telefone} | 📍 {cliente.cidade}
                    {cliente.bairro && ` - ${cliente.bairro}`}
                    {cliente.rua && ` - ${cliente.rua}, ${cliente.numero}`}
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => editarCliente(cliente)} className="flex-1 sm:flex-none text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-950/30 px-4 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors text-center">Editar</button>
                  <button onClick={() => apagarCliente(cliente.id)} className="flex-1 sm:flex-none text-red-500 hover:text-red-400 text-xs font-medium bg-red-950/30 px-4 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors text-center">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

interface Tecnico {
  id: number;
  nome: string;
  telefone: string;
  senhaAcesso: string;
  status: "Ativo" | "Inativo";
}

export default function TecnicosPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senhaAcesso, setSenhaAcesso] = useState("");
  const [statusTecnico, setStatusTecnico] = useState<"Ativo" | "Inativo">("Ativo");
  
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoEditandoId, setTecnicoEditandoId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    carregarTecnicosNuvem();
  }, [router]);

  const carregarTecnicosNuvem = async () => {
    try {
      const { data, error } = await supabase.from("tecnicos").select("*").order("id", { ascending: false });
      if (error) throw error;
      if (data) {
        const tecnicosFormatados: Tecnico[] = data.map((t: any) => ({
          id: t.id,
          nome: t.nome,
          telefone: t.telefone || "",
          senhaAcesso: t.senha_acesso,
          status: t.status
        }));
        setTecnicos(tecnicosFormatados);
        localStorage.setItem("tecnicos_cadastrados", JSON.stringify(tecnicosFormatados)); // Backup local
      }
    } catch (err) {
      console.error("Erro ao carregar técnicos da nuvem:", err);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !senhaAcesso.trim()) {
      setMensagem("Preencha pelo menos o nome e a senha de acesso."); return;
    }

    const dadosDb = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      senha_acesso: senhaAcesso.trim(),
      status: statusTecnico
    };

    try {
      if (tecnicoEditandoId !== null) {
        const { error } = await supabase.from("tecnicos").update(dadosDb).eq("id", tecnicoEditandoId);
        if (error) throw error;
        setMensagem("Técnico atualizado na nuvem!");
        setTecnicoEditandoId(null);
      } else {
        const novoId = Date.now();
        const { error } = await supabase.from("tecnicos").insert([{ id: novoId, ...dadosDb }]);
        if (error) throw error;
        setMensagem("Novo técnico cadastrado na nuvem!");
      }

      setNome(""); setTelefone(""); setSenhaAcesso(""); setStatusTecnico("Ativo");
      await carregarTecnicosNuvem();
    } catch (err: any) {
      setMensagem("Erro ao salvar: " + (err.message || "Tente novamente."));
    }
    setTimeout(() => setMensagem(""), 3000);
  };

  const editarTecnico = (tec: Tecnico) => {
    setNome(tec.nome);
    setTelefone(tec.telefone || "");
    setSenhaAcesso(tec.senhaAcesso || "");
    setStatusTecnico(tec.status);
    setTecnicoEditandoId(tec.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const apagarTecnico = async (id: number) => {
    if (window.confirm("Deseja apagar este técnico permanentemente da nuvem?")) {
      try {
        const { error } = await supabase.from("tecnicos").delete().eq("id", id);
        if (error) throw error;
        await carregarTecnicosNuvem();
        if (tecnicoEditandoId === id) {
          setNome(""); setTelefone(""); setSenhaAcesso(""); setTecnicoEditandoId(null);
        }
      } catch (err) {
        alert("Erro ao apagar técnico da nuvem.");
      }
    }
  };

  const tecnicosFiltrados = tecnicos.filter(t => 
    t.nome.toLowerCase().includes(busca.toLowerCase()) || 
    t.telefone?.includes(busca)
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar Técnicos...</div>;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* FORMULÁRIO DE CADASTRO */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {tecnicoEditandoId ? "✏️ Editar Técnico (Nuvem)" : "+ Cadastrar Técnico (Nuvem Ativa)"}
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome Completo *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do técnico" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Telefone</label>
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(13) 99999-9999" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Senha de Acesso (Login) *</label>
              <input type="text" value={senhaAcesso} onChange={(e) => setSenhaAcesso(e.target.value)} placeholder="Ex: 1234 ou os2026" className="bg-[#0b0f19] border border-amber-900/50 rounded-md py-1.5 px-3 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
              <select value={statusTecnico} onChange={(e) => setStatusTecnico(e.target.value as "Ativo"|"Inativo")} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full">
                <option value="Ativo">🟢 Ativo (Apto para OS)</option>
                <option value="Inativo">🔴 Inativo</option>
              </select>
            </div>
          </div>
          
          {mensagem && <div className={`text-xs mt-1 ${mensagem.includes("Erro") || mensagem.includes("Preencha") ? "text-red-400" : "text-green-400"}`}>{mensagem}</div>}

          <div className="flex gap-2 mt-1">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-md transition-colors">
              {tecnicoEditandoId ? "Salvar Alterações" : "Cadastrar Técnico"}
            </button>
            {tecnicoEditandoId && (
              <button type="button" onClick={() => {setNome(""); setTelefone(""); setSenhaAcesso(""); setTecnicoEditandoId(null);}} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-md transition-colors border border-slate-700">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LISTA DE TÉCNICOS */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Técnicos da Equipe na Nuvem ({tecnicosFiltrados.length})
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors" />
          </div>
        </div>
        
        {tecnicos.length === 0 ? (
           <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Nenhum técnico cadastrado na nuvem.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {tecnicosFiltrados.map(tec => (
              <div key={tec.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${tec.status === 'Ativo' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <p className="font-bold text-slate-200 text-sm">{tec.nome}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">📱 {tec.telefone || "Sem telefone"}</p>
                  <p className="text-[11px] text-amber-400 mt-1 font-mono">🔑 Senha (PIN): {tec.senhaAcesso}</p>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => editarTecnico(tec)} className="text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-950/30 px-4 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors">Editar</button>
                  <button onClick={() => apagarTecnico(tec.id)} className="text-red-500 hover:text-red-400 text-xs font-medium bg-red-950/30 px-4 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

interface OrdemServico {
  id: number;
  cliente_nome: string;
  tecnico_id: number;
  tecnico_nome: string;
  descricao: string;
  status: string;
  data_criacao: string;
  data_agendamento?: string;
  hora_agendamento?: string;
}

export default function AppTecnicoPage() {
  const router = useRouter();
  const [tecnicoLogado, setTecnicoLogado] = useState<any>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) {
      router.push("/login");
      return;
    }
    const usuario = JSON.parse(usuarioStr);
    if (usuario.tipo !== "tecnico") {
      router.push("/");
      return;
    }
    setTecnicoLogado(usuario);
    carregarOrdensTecnico(usuario.id, usuario.nome);
  }, [router]);

  const carregarOrdensTecnico = async (tecnicoId: number, tecnicoNome: string) => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*")
        .order("id", { ascending: false });

      if (!error && data) {
        // Filtra as OSs que pertencem a este técnico (por ID ou por Nome)
        const minhasOs = data.filter(
          (os: any) =>
            Number(os.tecnico_id) === Number(tecnicoId) ||
            String(os.tecnico_nome || "").trim().toLowerCase() === String(tecnicoNome || "").trim().toLowerCase()
        );
        setOrdens(minhasOs);
      }
    } catch (err) {
      console.error("Erro ao carregar OS do técnico:", err);
    }
    setCarregando(false);
  };

  const alterarStatusOS = async (id: number, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: novoStatus })
        .eq("id", id);

      if (error) throw error;

      // Atualiza na tela localmente
      setOrdens(ordens.map(os => os.id === id ? { ...os, status: novoStatus } : os));
      alert(`Serviço marcado como "${novoStatus}" com sucesso! O Master já foi atualizado.`);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Erro ao dar baixa na OS. Verifique a ligação.");
    }
  };

  const handleSair = () => {
    localStorage.removeItem("usuario_logado");
    router.push("/login");
  };

  if (!tecnicoLogado) return null;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-6">
      <header className="max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-white uppercase tracking-wider">Área do Técnico</h1>
          <p className="text-xs text-blue-400 mt-0.5">Bem-vindo, {tecnicoLogado.nome}</p>
        </div>
        <button
          onClick={handleSair}
          className="bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto mt-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Minhas Ordens de Serviço Atribuídas ({ordens.length})
        </h2>

        {carregando ? (
          <div className="text-center py-12 text-slate-500 text-xs">A sincronizar OS da nuvem...</div>
        ) : ordens.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            Nenhuma Ordem de Serviço atribuída a si no momento.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {ordens.map((os) => (
              <div key={os.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-900/50 px-2.5 py-0.5 rounded">
                    OS-{os.id.toString().slice(-4)}
                  </span>
                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                    os.status === 'Concluída' ? 'bg-green-950 text-green-400 border border-green-800' : 
                    os.status === 'Em Andamento' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {os.status}
                  </span>
                </div>

                <p className="text-sm font-bold text-white mb-1">Cliente: {os.cliente_nome}</p>
                <p className="text-xs text-slate-400 mb-3">📅 Gerada em: {os.data_criacao}</p>

                <div className="bg-[#0b0f19] border border-slate-800/80 p-3.5 rounded-lg text-xs text-slate-200 mb-4 whitespace-pre-wrap leading-relaxed">
                  {os.descricao}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  {os.status !== "Concluída" ? (
                    <>
                      <button
                        onClick={() => alterarStatusOS(os.id, "Em Andamento")}
                        className="bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-400 text-xs font-bold px-4 py-2 rounded-lg transition"
                      >
                        ⚡ Assumir / Em Andamento
                      </button>
                      <button
                        onClick={() => alterarStatusOS(os.id, "Concluída")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition shadow-lg shadow-emerald-900/40 ml-auto"
                      >
                        ✅ Concluir Serviço (Dar Baixa)
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => alterarStatusOS(os.id, "Em Andamento")}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg transition"
                    >
                      🔄 Reabrir Serviço
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

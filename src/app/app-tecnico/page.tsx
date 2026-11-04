"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OrdemServico {
  id: number;
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

export default function AppTecnicoPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [tecnicoLogado, setTecnicoLogado] = useState<any>(null);
  const [minhasOrdens, setMinhasOrdens] = useState<OrdemServico[]>([]);

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    
    if (!usuarioStr) { 
      router.push("/login"); 
      return; 
    }
    
    const usuario = JSON.parse(usuarioStr);
    
    // Se for admin, manda de volta para o painel principal
    if (usuario.tipo !== "tecnico") { 
      router.push("/"); 
      return; 
    }

    setTecnicoLogado(usuario);
    carregarMinhasOS(usuario.id); // Busca apenas as OSs deste técnico
  }, [router]);

  const carregarMinhasOS = (idTecnico: number) => {
    // Por enquanto, lê do localStorage para não quebrar o sistema atual
    const ordensSalvas = localStorage.getItem("ordens_servico");
    if (ordensSalvas) {
      const todasOS = JSON.parse(ordensSalvas) as OrdemServico[];
      
      // Filtra apenas as que pertencem ao técnico e que não estão finalizadas há muito tempo
      const osDoTecnico = todasOS.filter(os => os.tecnicoId === idTecnico);
      setMinhasOrdens(osDoTecnico);
    }
  };

  const alterarStatusOS = (id: number, novoStatus: "Aprovada" | "Em Andamento" | "Finalizado") => {
    const ordensSalvas = localStorage.getItem("ordens_servico");
    if (!ordensSalvas) return;
    
    const todasOS = JSON.parse(ordensSalvas) as OrdemServico[];
    const novasOrdensGerais = todasOS.map(os => 
      os.id === id ? { ...os, status: novoStatus } : os
    );
    
    // Atualiza a base de dados central
    localStorage.setItem("ordens_servico", JSON.stringify(novasOrdensGerais));
    
    // Atualiza a tela do técnico instantaneamente
    setMinhasOrdens(novasOrdensGerais.filter(os => os.tecnicoId === tecnicoLogado.id));
  };

  const handleSair = () => {
    localStorage.removeItem("usuario_logado");
    router.push("/login");
  };

  if (!montado || !tecnicoLogado) {
    return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar painel do técnico...</div>;
  }

  // Separa as OSs para facilitar a visualização
  const osAprovadas = minhasOrdens.filter(os => os.status === "Aprovada");
  const osEmAndamento = minhasOrdens.filter(os => os.status === "Em Andamento");
  const osFinalizadas = minhasOrdens.filter(os => os.status === "Finalizado");

  return (
    <div className="w-full min-h-screen bg-[#0b0f19] p-4 flex flex-col gap-6 font-sans">
      
      {/* CABEÇALHO DO TÉCNICO */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-blue-400 font-black text-lg tracking-wide">TÉCNICO APP</h1>
          <p className="text-slate-300 text-sm font-medium mt-1">Olá, <span className="text-white font-bold">{tecnicoLogado.nome}</span></p>
        </div>
        <button onClick={handleSair} className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 px-4 py-2 rounded-md text-xs font-bold transition-colors">
          Sair 👋
        </button>
      </div>

      {/* OS EM ANDAMENTO (DESTAQUE) */}
      {osEmAndamento.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            ⏳ Em Execução Agora
          </h2>
          {osEmAndamento.map(os => (
            <div key={os.id} className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-lg shadow-lg flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-amber-900/30 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-amber-500 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/50 mb-2 inline-block">OS-{os.id.toString().slice(-4)}</span>
                  <p className="font-black text-slate-100 text-lg uppercase">{os.clienteNome}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{os.descricao}</p>
              
              <button onClick={() => alterarStatusOS(os.id, "Finalizado")} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3.5 rounded-md transition-colors shadow-md">
                ✅ Finalizar Serviço
              </button>
            </div>
          ))}
        </div>
      )}

      {/* OS NA FILA PARA HOJE / AGENDADAS */}
      <div className="flex flex-col gap-3">
        <h2 className="text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mt-2">
          📋 Minhas Próximas OS ({osAprovadas.length})
        </h2>
        
        {osAprovadas.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg bg-[#111827]">
            Nenhuma OS pendente no momento.
          </div>
        ) : (
          osAprovadas.map(os => (
            <div key={os.id} className="bg-[#111827] border border-slate-800 p-4 rounded-lg shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50 mb-2 inline-block">OS-{os.id.toString().slice(-4)}</span>
                  <p className="font-bold text-slate-200 text-base">{os.clienteNome}</p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    📅 {os.dataAgendamento ? `${os.dataAgendamento.split('-').reverse().join('/')} às ${os.horaAgendamento}` : "Data a combinar"}
                  </p>
                </div>
              </div>
              
              <div className="bg-[#0b0f19] p-3 rounded border border-slate-800 mt-1">
                <p className="text-xs text-slate-400 whitespace-pre-wrap">{os.descricao}</p>
              </div>
              
              <button onClick={() => alterarStatusOS(os.id, "Em Andamento")} className="w-full mt-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-3 rounded-md transition-colors shadow-md">
                ▶️ Iniciar Deslocamento / Serviço
              </button>
            </div>
          ))
        )}
      </div>

      {/* HISTÓRICO RECENTE */}
      {osFinalizadas.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 opacity-70">
          <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
            ✅ Finalizadas Recentemente
          </h2>
          {osFinalizadas.slice(0, 5).map(os => ( // Mostra apenas as últimas 5 para não pesar o telemóvel
            <div key={os.id} className="bg-[#111827] border border-slate-800 p-3 rounded-md flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-emerald-500 mr-2">OS-{os.id.toString().slice(-4)}</span>
                <span className="text-xs text-slate-300 font-bold">{os.clienteNome}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
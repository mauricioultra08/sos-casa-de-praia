"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Cliente { id: number; nome: string; }
interface Tecnico { id: number; nome: string; status: string; }
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

export default function OSPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");

  const [osParaImprimir, setOsParaImprimir] = useState<OrdemServico | null>(null);

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    const logoSalva = localStorage.getItem("app_logo");
    if (logoSalva) setLogoUrl(logoSalva);

    const clientesSalvos = localStorage.getItem("clientes_cadastrados");
    if (clientesSalvos) setClientes(JSON.parse(clientesSalvos));

    const tecnicosSalvos = localStorage.getItem("tecnicos_cadastrados");
    if (tecnicosSalvos) setTecnicos(JSON.parse(tecnicosSalvos));

    carregarOrdensLocal();
  }, [router]);

  const carregarOrdensLocal = () => {
    const ordensSalvas = localStorage.getItem("ordens_servico");
    if (ordensSalvas) {
      setOrdens(JSON.parse(ordensSalvas));
    }
  };

  const handleGerarOSManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !tecnicoId || !descricao.trim()) {
      setMensagem("Selecione o Cliente, Técnico e preencha a descrição.");
      return;
    }

    const clienteSelecionado = clientes.find(c => c.id === Number(clienteId));
    const tecnicoSelecionado = tecnicos.find(t => t.id === Number(tecnicoId));

    const novaOS: OrdemServico = {
      id: Date.now(),
      clienteId: Number(clienteId),
      clienteNome: clienteSelecionado?.nome || "Desconhecido",
      tecnicoId: Number(tecnicoId),
      tecnicoNome: tecnicoSelecionado?.nome || "Desconhecido",
      descricao: descricao.trim(),
      status: "Aprovada",
      dataCriacao: new Date().toLocaleDateString("pt-BR")
    };

    const novasOrdens = [novaOS, ...ordens];
    setOrdens(novasOrdens);
    localStorage.setItem("ordens_servico", JSON.stringify(novasOrdens));

    setMensagem("Ordem de Serviço manual gerada com sucesso!");
    setClienteId(""); setTecnicoId(""); setDescricao("");
    setTimeout(() => setMensagem(""), 3000);
  };

  const alterarStatusOS = (id: number, novoStatus: "Aprovada" | "Em Andamento" | "Finalizado") => {
    const novasOrdens = ordens.map(os => 
      os.id === id ? { ...os, status: novoStatus } : os
    );
    setOrdens(novasOrdens);
    localStorage.setItem("ordens_servico", JSON.stringify(novasOrdens));
  };

  const apagarOS = (id: number) => {
    if (window.confirm("Tem certeza que deseja apagar esta OS permanentemente?")) {
      const novasOrdens = ordens.filter(os => os.id !== id);
      setOrdens(novasOrdens);
      localStorage.setItem("ordens_servico", JSON.stringify(novasOrdens));
    }
  };

  const imprimirOS = (os: OrdemServico) => {
    setOsParaImprimir(os);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const ordensFiltradas = ordens.filter(os => 
    os.clienteNome.toLowerCase().includes(busca.toLowerCase()) || 
    os.tecnicoNome.toLowerCase().includes(busca.toLowerCase()) ||
    os.id.toString().includes(busca)
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar OS...</div>;

  return (
    <>
      <style>{`
        @media print {
          header, nav, footer { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="w-full flex flex-col gap-6 print:hidden">
        {/* FORMULÁRIO MANUAL OCULTO OU COMPACTO */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
          <h2 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
            + Gerar OS Manualmente (Opcional)
          </h2>
          <form onSubmit={handleGerarOSManual} className="flex flex-col gap-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200">
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200">
                <option value="">Selecione o técnico...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Serviço e Materiais (Sem Valores)..." className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 resize-none"></textarea>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-md transition-colors uppercase">Gerar OS Manual</button>
            {mensagem && <div className="text-green-400 text-xs mt-1 text-center">{mensagem}</div>}
          </form>
        </div>

        {/* LISTA DE OS */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              OSs Ativas e em Campo ({ordensFiltradas.length})
            </h3>
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none w-full" />
            </div>
          </div>
          
          {ordens.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Nenhuma OS gerada até o momento. Aprove um orçamento para aparecer aqui.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {ordensFiltradas.map(os => (
                <div key={os.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 border border-blue-900/50 px-2 py-0.5 rounded">OS-{os.id.toString().slice(-4)}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full 
                        ${os.status === 'Finalizado' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50' : 
                          os.status === 'Em Andamento' ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50' : 
                          'bg-blue-900/40 text-blue-400 border border-blue-800/50'}`}>
                        {os.status === 'Aprovada' ? '👍 APROVADA' : os.status === 'Em Andamento' ? '⏳ EM ANDAMENTO' : '✅ FINALIZADO'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-200 text-sm">Cliente: {os.clienteNome}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      🔧 Téc: {os.tecnicoNome} | 📅 Data: {os.dataAgendamento ? `${os.dataAgendamento.split('-').reverse().join('/')} às ${os.horaAgendamento}` : os.dataCriacao}
                    </p>
                    <p className="text-[11px] text-slate-300 mt-2 bg-slate-900 p-2 rounded border border-slate-800 whitespace-pre-wrap">{os.descricao}</p>
                  </div>
                  
                  <div className="flex flex-wrap sm:flex-col gap-2 h-fit self-end sm:self-center">
                    {/* BOTÕES DE STATUS PROGRESSIVO */}
                    {os.status === "Aprovada" && (
                      <button onClick={() => alterarStatusOS(os.id, "Em Andamento")} className="text-amber-400 hover:text-amber-300 text-xs font-bold bg-amber-950/30 px-3 py-1.5 rounded border border-amber-900/50 hover:bg-amber-900/40 transition-colors whitespace-nowrap">
                        ▶️ Iniciar Serviço
                      </button>
                    )}
                    {os.status === "Em Andamento" && (
                      <button onClick={() => alterarStatusOS(os.id, "Finalizado")} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold bg-emerald-950/30 px-3 py-1.5 rounded border border-emerald-900/50 hover:bg-emerald-900/40 transition-colors whitespace-nowrap">
                        ✅ Finalizar Serviço
                      </button>
                    )}
                    {os.status === "Finalizado" && (
                      <button onClick={() => alterarStatusOS(os.id, "Aprovada")} className="text-slate-400 hover:text-slate-300 text-xs font-medium bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-800 transition-colors whitespace-nowrap">
                        🔄 Reabrir OS
                      </button>
                    )}

                    <button onClick={() => imprimirOS(os)} className="text-blue-400 hover:text-blue-300 text-xs font-bold bg-blue-950/30 px-3 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                      🖨️ Imprimir OS
                    </button>
                    <button onClick={() => apagarOS(os.id)} className="text-red-500 hover:text-red-400 text-xs font-medium bg-red-950/30 px-3 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors flex items-center justify-center">
                      Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* IMPRESSÃO OS CENTRALIZADA (VISÍVEL APENAS NA IMPRESSÃO) */}
      {osParaImprimir && (
        <div className="hidden print:block print:bg-white print:text-black w-full min-h-screen font-sans">
          <div className="border-2 border-black p-8 rounded-lg max-w-4xl mx-auto mt-8">
            
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

              <h2 className="text-2xl font-black tracking-widest text-gray-800 uppercase">Ordem de Serviço</h2>
              <p className="text-sm font-mono text-gray-600 font-bold mt-1">Nº OS-{osParaImprimir.id.toString().slice(-4)} • Documento de Execução</p>
              <div className="mt-3 inline-block bg-black text-white px-4 py-1 font-bold tracking-widest uppercase rounded">
                OS {osParaImprimir.status}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-x-8 gap-y-6 mb-8">
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-lg font-bold uppercase">{osParaImprimir.clienteNome}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Técnico</p>
                <p className="text-lg font-bold uppercase">{osParaImprimir.tecnicoNome}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data de Execução</p>
                <p className="text-lg font-bold uppercase">
                  {osParaImprimir.dataAgendamento 
                    ? `${osParaImprimir.dataAgendamento.split('-').reverse().join('/')} ${osParaImprimir.horaAgendamento}`
                    : osParaImprimir.dataCriacao}
                </p>
              </div>
            </div>

            <div className="mb-12">
              <p className="text-sm font-bold text-black uppercase tracking-wider mb-3 bg-gray-200 py-1.5 px-3 rounded-t border-b-2 border-black">
                Instruções, Serviço e Materiais a Levar
              </p>
              <div className="border border-gray-400 p-5 min-h-[250px] whitespace-pre-wrap text-sm leading-relaxed rounded-b bg-gray-50">
                {osParaImprimir.descricao}
              </div>
              <p className="text-[10px] text-gray-500 mt-2 italic text-right">* Este documento destina-se apenas à execução técnica e não possui validade financeira.</p>
            </div>

            <div className="mt-16 flex justify-between px-10">
              <div className="text-center w-64">
                <div className="border-t-2 border-black mb-2"></div>
                <p className="text-sm font-bold uppercase">{osParaImprimir.clienteNome}</p>
                <p className="text-xs text-gray-600">Assinatura do Cliente / Recebedor</p>
              </div>
              <div className="text-center w-64">
                <div className="border-t-2 border-black mb-2"></div>
                <p className="text-sm font-bold uppercase">{osParaImprimir.tecnicoNome}</p>
                <p className="text-xs text-gray-600">Assinatura do Técnico Executante</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
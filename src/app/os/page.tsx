"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

interface Cliente { id: number; nome: string; telefone?: string; email?: string; cnpjCpf?: string; }
interface Tecnico { id: number; nome: string; status: string; }
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

export default function OSPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [servicoExecutar, setServicoExecutar] = useState("");
  const [materiaisLevar, setMateriaisLevar] = useState("");
  
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [osParaImprimir, setOsParaImprimir] = useState<OrdemServico | null>(null);

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    const clientesSalvos = localStorage.getItem("clientes_cadastrados");
    if (clientesSalvos) setClientes(JSON.parse(clientesSalvos));

    const tecnicosSalvos = localStorage.getItem("tecnicos_cadastrados");
    if (tecnicosSalvos) setTecnicos(JSON.parse(tecnicosSalvos));

    carregarOrdensNuvem();
  }, [router]);

  const carregarOrdensNuvem = async () => {
    try {
      const { data, error } = await supabase.from("ordens_servico").select("*").order("id", { ascending: false });
      if (error) throw error;
      if (data) {
        const ordensFormatadas: OrdemServico[] = data.map((os: any) => ({
          id: os.id,
          orcamentoId: os.orcamento_id,
          clienteId: os.cliente_id,
          clienteNome: os.cliente_nome,
          tecnicoId: os.tecnico_id,
          tecnicoNome: os.tecnico_nome,
          descricao: os.descricao,
          status: os.status,
          dataCriacao: os.data_criacao,
          dataAgendamento: os.data_agendamento,
          horaAgendamento: os.hora_agendamento
        }));
        setOrdens(ordensFormatadas);
        localStorage.setItem("ordens_servico", JSON.stringify(ordensFormatadas)); 
      }
    } catch (err) {
      console.error("Erro ao carregar OS da nuvem:", err);
    }
  };

  const handleGerarOSManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !tecnicoId || !servicoExecutar.trim()) {
      setMensagem("Selecione o Cliente, Técnico e o Serviço a ser executado."); return;
    }

    const clienteSelecionado = clientes.find(c => c.id === Number(clienteId));
    const tecnicoSelecionado = tecnicos.find(t => t.id === Number(tecnicoId));

    let descFormatada = "";
    if (materiaisLevar.trim()) {
      descFormatada += "MATERIAIS A LEVAR:\n" + materiaisLevar.trim() + "\n\n";
    }
    descFormatada += "SERVIÇO A SER EXECUTADO:\n" + servicoExecutar.trim();

    const novaOSNuvem = {
      id: Date.now(),
      cliente_id: Number(clienteId),
      cliente_nome: clienteSelecionado?.nome || "Desconhecido",
      tecnico_id: Number(tecnicoId),
      tecnico_nome: tecnicoSelecionado?.nome || "Desconhecido",
      descricao: descFormatada,
      status: "Aprovada",
      data_criacao: new Date().toLocaleDateString("pt-BR")
    };

    try {
      const { error } = await supabase.from("ordens_servico").insert([novaOSNuvem]);
      if (error) throw error;

      setMensagem("Ordem de Serviço manual gerada na nuvem com sucesso!");
      setClienteId(""); setTecnicoId(""); setServicoExecutar(""); setMateriaisLevar("");
      await carregarOrdensNuvem();
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao gerar OS na nuvem.");
    }
    setTimeout(() => setMensagem(""), 3000);
  };

  const alterarStatusOS = async (id: number, novoStatus: "Aprovada" | "Em Andamento" | "Finalizado") => {
    try {
      const { error } = await supabase.from("ordens_servico").update({ status: novoStatus }).eq("id", id);
      if (error) throw error;
      await carregarOrdensNuvem();
    } catch (err) {
      alert("Erro ao alterar o status na nuvem.");
    }
  };

  const apagarOS = async (id: number) => {
    if (window.confirm("Tem certeza que deseja apagar esta OS permanentemente da nuvem?")) {
      try {
        const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
        if (error) throw error;
        await carregarOrdensNuvem();
      } catch (err) {
        alert("Erro ao apagar a OS.");
      }
    }
  };

  const imprimirOS = (os: OrdemServico) => {
    setOsParaImprimir(os);
    setTimeout(() => window.print(), 200);
  };

  const ordensFiltradas = ordens.filter(os => 
    os.clienteNome.toLowerCase().includes(busca.toLowerCase()) || 
    os.tecnicoNome.toLowerCase().includes(busca.toLowerCase()) ||
    os.id.toString().includes(busca)
  );

  const clienteImpressao = osParaImprimir ? clientes.find(c => c.id === osParaImprimir.clienteId) : null;

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar OS da nuvem...</div>;

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
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              + Gerar OS Manualmente (Avulsa)
            </h2>
            <button onClick={carregarOrdensNuvem} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-3 py-1.5 rounded border border-slate-700 transition-colors">
              🔄 Atualizar da Nuvem
            </button>
          </div>
          
          <form onSubmit={handleGerarOSManual} className="flex flex-col gap-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500">
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500">
                <option value="">Selecione o técnico...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              <textarea value={servicoExecutar} onChange={(e) => setServicoExecutar(e.target.value)} rows={2} placeholder="Descreva o Serviço a ser executado *" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 resize-none outline-none focus:border-blue-500"></textarea>
              <textarea value={materiaisLevar} onChange={(e) => setMateriaisLevar(e.target.value)} rows={2} placeholder="Materiais a levar (Opcional)" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 resize-none outline-none focus:border-blue-500"></textarea>
            </div>

            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-md transition-colors uppercase">Gerar OS na Nuvem</button>
            {mensagem && <div className={`text-xs mt-1 text-center ${mensagem.includes("Erro") || mensagem.includes("Selecione") ? "text-red-400" : "text-green-400"}`}>{mensagem}</div>}
          </form>
        </div>

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
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Nenhuma OS gerada até o momento.</div>
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

      {osParaImprimir && (
        <div className="hidden print:block print:bg-white print:text-black w-full min-h-screen font-sans">
          <div className="border-2 border-black p-8 rounded-lg max-w-4xl mx-auto mt-8">
            <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6 text-center">
              {/* IMAGEM FIXA DA LOGO NA IMPRESSÃO DA OS */}
              <img src="/logo.jpg" alt="Logo SOS Casa de Praia" className="h-24 object-contain mb-2" />
              <div className="text-[11px] font-bold text-gray-700 mb-4 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-300 print:border-black">
                CNPJ: 38.250.620.0001-07 | Contato / WhatsApp: (13) 98131-1644
              </div>
              <h2 className="text-2xl font-black tracking-widest text-gray-800 uppercase">Ordem de Serviço</h2>
              <p className="text-sm font-mono text-gray-600 font-bold mt-1">Nº OS-{osParaImprimir.id.toString().slice(-4)} • Documento de Execução</p>
              <div className="mt-3 inline-block bg-black text-white px-4 py-1 font-bold tracking-widest uppercase rounded">OS {osParaImprimir.status}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-x-8 gap-y-6 mb-8">
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-lg font-bold uppercase">{osParaImprimir.clienteNome}</p>
                {clienteImpressao && (clienteImpressao.telefone || clienteImpressao.cnpjCpf || clienteImpressao.email) && (
                  <div className="mt-2 pt-2 border-t border-gray-300 text-sm text-gray-700 flex flex-col gap-0.5">
                    {clienteImpressao.telefone && <p><span className="font-bold text-gray-900">Tel:</span> {clienteImpressao.telefone}</p>}
                    {clienteImpressao.cnpjCpf && <p><span className="font-bold text-gray-900">Doc:</span> {clienteImpressao.cnpjCpf}</p>}
                    {clienteImpressao.email && <p><span className="font-bold text-gray-900">Email:</span> {clienteImpressao.email}</p>}
                  </div>
                )}
              </div>
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Técnico</p>
                <p className="text-lg font-bold uppercase">{osParaImprimir.tecnicoNome}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded border border-gray-300">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data de Execução</p>
                <p className="text-lg font-bold uppercase">
                  {osParaImprimir.dataAgendamento ? `${osParaImprimir.dataAgendamento.split('-').reverse().join('/')} ${osParaImprimir.horaAgendamento}` : osParaImprimir.dataCriacao}
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
            </div>

            <div className="mt-16 flex justify-between px-10">
              <div className="text-center w-64"><div className="border-t-2 border-black mb-2"></div><p className="text-sm font-bold uppercase">{osParaImprimir.clienteNome}</p><p className="text-xs text-gray-600">Assinatura do Cliente</p></div>
              <div className="text-center w-64"><div className="border-t-2 border-black mb-2"></div><p className="text-sm font-bold uppercase">{osParaImprimir.tecnicoNome}</p><p className="text-xs text-gray-600">Assinatura do Técnico</p></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
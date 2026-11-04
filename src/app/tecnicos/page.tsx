"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Tecnico {
  id: number;
  nome: string;
  telefone: string;
  especialidade: string;
  status: "Ativo" | "Inativo";
  senha?: string; // NOVO: Senha de acesso individual
}

export default function TecnicosPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [senha, setSenha] = useState(""); // NOVO: Estado da senha
  
  const [mensagem, setMensagem] = useState("");
  const [tecnicoEditandoId, setTecnicoEditandoId] = useState<number | null>(null);
  
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    
    const usuario = JSON.parse(usuarioStr);
    if (usuario.tipo === "tecnico") { router.push("/app-tecnico"); return; }

    const tecnicosSalvos = localStorage.getItem("tecnicos_cadastrados");
    if (tecnicosSalvos) setTecnicos(JSON.parse(tecnicosSalvos));
  }, [router]);

  // Função para gerar senha aleatória de 6 caracteres
  const gerarSenhaAutomatica = () => {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let novaSenha = "";
    for (let i = 0; i < 6; i++) {
      novaSenha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    setSenha(novaSenha);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !especialidade.trim() || !senha.trim()) {
      setMensagem("Por favor, preencha Nome, Telefone, Especialidade e Senha.");
      return;
    }

    if (tecnicoEditandoId !== null) {
      const novaLista = tecnicos.map(tec => 
        tec.id === tecnicoEditandoId ? { ...tec, nome, telefone, especialidade, status, senha } : tec
      );
      setTecnicos(novaLista);
      localStorage.setItem("tecnicos_cadastrados", JSON.stringify(novaLista));
      setMensagem(`Técnico "${nome}" atualizado com sucesso!`);
      setTecnicoEditandoId(null);
    } else {
      const novoTecnico: Tecnico = { id: Date.now(), nome, telefone, especialidade, status, senha };
      const novaLista = [...tecnicos, novoTecnico];
      setTecnicos(novaLista);
      localStorage.setItem("tecnicos_cadastrados", JSON.stringify(novaLista));
      setMensagem(`Técnico "${nome}" cadastrado com sucesso!`);
    }
    
    setNome(""); setTelefone(""); setEspecialidade(""); setStatus("Ativo"); setSenha("");
    setTimeout(() => setMensagem(""), 3500);
  };

  const apagarTecnico = (id: number) => {
    if (window.confirm("Tem certeza que deseja apagar este técnico permanentemente?")) {
      const novaLista = tecnicos.filter(tec => tec.id !== id);
      setTecnicos(novaLista);
      localStorage.setItem("tecnicos_cadastrados", JSON.stringify(novaLista));
      if (tecnicoEditandoId === id) cancelarEdicao();
    }
  };

  const editarTecnico = (tec: Tecnico) => {
    setNome(tec.nome); setTelefone(tec.telefone); setEspecialidade(tec.especialidade); setStatus(tec.status); setSenha(tec.senha || "");
    setTecnicoEditandoId(tec.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setNome(""); setTelefone(""); setEspecialidade(""); setStatus("Ativo"); setSenha("");
    setTecnicoEditandoId(null); setMensagem("");
  };

  const tecnicosFiltrados = tecnicos.filter(tec => 
    tec.nome.toLowerCase().includes(busca.toLowerCase()) || 
    tec.telefone.includes(busca) ||
    tec.especialidade.toLowerCase().includes(busca.toLowerCase())
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar painel de técnicos...</div>;

  return (
    <div className="w-full flex flex-col gap-6 print:hidden">
      
      {/* FORMULÁRIO DE CADASTRO DO MASTER */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {tecnicoEditandoId ? "✏️ Editar Técnico" : "+ Novo Técnico"}
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-2.5">
          {/* Ajustei o grid para 5 colunas para caber a senha perfeitamente */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome Completo *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Carlos Silva" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Telefone / WhatsApp *</label>
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(13) 99999-9999" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Especialidade *</label>
              <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full appearance-none">
                <option value="">Selecione...</option>
                <option value="Câmeras e CFTV">Câmeras e CFTV</option>
                <option value="Motores e Portões">Motores e Portões</option>
                <option value="Cerca Elétrica">Cerca Elétrica</option>
                <option value="Interfones e Fechaduras">Interfones e Fechaduras</option>
                <option value="Técnico Geral">Técnico Geral</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "Ativo" | "Inativo")} className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full appearance-none">
                <option value="Ativo">🟢 Ativo (Trabalhando)</option>
                <option value="Inativo">🔴 Inativo (Afastado)</option>
              </select>
            </div>
            
            {/* NOVO CAMPO: SENHA DE ACESSO */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Senha de Acesso *</label>
              <div className="flex gap-1">
                <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Ex: TEC123" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-blue-500 w-full font-mono" />
                <button type="button" onClick={gerarSenhaAutomatica} title="Gerar Senha Aleatória" className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 rounded-md text-sm border border-slate-700 transition-colors flex items-center justify-center">
                  🎲
                </button>
              </div>
            </div>
          </div>

          {mensagem && (
            <div className={`p-2 rounded-md text-[11px] font-medium mt-1 ${mensagem.includes("Por favor") ? "bg-red-950/50 border border-red-800 text-red-400" : "bg-green-950/50 border border-green-800 text-green-400"}`}>
              {mensagem}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button type="submit" className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${tecnicoEditandoId ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {tecnicoEditandoId ? "Salvar Alterações" : "+ Guardar Técnico"}
            </button>
            {tecnicoEditandoId && (
              <button type="button" onClick={cancelarEdicao} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 px-6 rounded-md transition-colors border border-slate-700">
                Cancelar Edição
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ÁREA DE LISTAGEM DE TÉCNICOS COM PESQUISA */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Técnicos Registados ({tecnicosFiltrados.length})
          </h3>
          
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar técnico..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors" />
          </div>
        </div>
        
        {tecnicos.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">
            Nenhum técnico cadastrado ainda.
          </div>
        ) : tecnicosFiltrados.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">
            Nenhum técnico encontrado.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tecnicosFiltrados.map(tec => (
              <div key={tec.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-200 text-sm">{tec.nome}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tec.status === 'Ativo' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {tec.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">📱 {tec.telefone} | 🔧 {tec.especialidade}</p>
                </div>
                
                {/* EXIBIÇÃO DA SENHA E BOTÕES DE AÇÃO */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                  
                  {tec.senha ? (
                    <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Acesso:</span>
                      <span className="text-xs font-mono font-bold text-green-400">{tec.senha}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-500 border border-amber-900/50 bg-amber-950/20 px-2 py-1 rounded">⚠️ Sem senha definida</span>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => editarTecnico(tec)} className="text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-950/30 px-3 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors">Editar</button>
                    <button onClick={() => apagarTecnico(tec.id)} className="text-red-500 hover:text-red-400 text-xs font-medium bg-red-950/30 px-3 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors">Apagar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
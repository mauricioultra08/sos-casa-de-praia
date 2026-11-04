"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  
  // Controlo de abas: Admin (Master) vs Técnico
  const [tipoLogin, setTipoLogin] = useState<"admin" | "tecnico">("admin");

  // Estado Master
  const [pinMaster, setPinMaster] = useState("");

  // Estados Técnico
  const [nomeTecnico, setNomeTecnico] = useState("");
  const [pinTecnico, setPinTecnico] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    // LOGIN MASTER: Lê o PIN dinâmico que o Master salvou (ou 123456 como fábrica)
    const pinCorreto = localStorage.getItem("pin_master") || "123456";

    if (pinMaster === pinCorreto) {
      const adminLogado = { id: 0, nome: "Master", tipo: "admin" };
      localStorage.setItem("usuario_logado", JSON.stringify(adminLogado));
      
      setMensagem("Acesso Master autorizado!");
      setTimeout(() => router.push("/"), 800);
    } else {
      setErro("PIN Master incorreto.");
    }
  };

  const handleLoginTecnico = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (!nomeTecnico.trim() || !pinTecnico.trim()) {
      setErro("Preencha o seu nome e o seu PIN.");
      return;
    }

    const tecsSalvos = localStorage.getItem("tecnicos_cadastrados");
    
    if (!tecsSalvos) {
      setErro("Nenhum técnico cadastrado no sistema ainda.");
      return;
    }

    const tecnicos = JSON.parse(tecsSalvos);
    
    // Verifica se existe um técnico com aquele nome (ignorando maiúsculas) e com o mesmo PIN
    const tecEncontrado = tecnicos.find((t: any) => 
      t.nome.toLowerCase().includes(nomeTecnico.toLowerCase().trim()) && 
      t.senhaAcesso === pinTecnico.trim()
    );

    if (tecEncontrado) {
      if (tecEncontrado.status === "Inativo") {
        setErro("O seu acesso encontra-se inativo. Fale com a administração.");
        return;
      }

      // LOGIN TÉCNICO BEM SUCEDIDO
      const usuarioLogado = { 
        id: tecEncontrado.id, 
        nome: tecEncontrado.nome, 
        tipo: "tecnico" 
      };
      localStorage.setItem("usuario_logado", JSON.stringify(usuarioLogado));
      
      setMensagem(`Bem-vindo, ${tecEncontrado.nome}!`);
      setTimeout(() => router.push("/app-tecnico"), 800);
    } else {
      setErro("Nome ou PIN incorretos.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0f19] p-4">
      
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* CABEÇALHO DO LOGIN */}
        <div className="p-8 pb-6 text-center border-b border-slate-800">
          <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">
            <span className="text-blue-500">SOS</span> Casa de Praia
          </h1>
          <p className="text-sm text-slate-400 font-medium">Sistema Integrado de Gestão & OS</p>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex w-full bg-slate-900/50">
          <button 
            onClick={() => { setTipoLogin("admin"); setErro(""); setMensagem(""); }} 
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tipoLogin === "admin" ? "bg-blue-600/10 text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            Acesso Master
          </button>
          <button 
            onClick={() => { setTipoLogin("tecnico"); setErro(""); setMensagem(""); }} 
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tipoLogin === "tecnico" ? "bg-amber-600/10 text-amber-400 border-b-2 border-amber-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            Acesso Técnico
          </button>
        </div>

        {/* FORMULÁRIO DE LOGIN */}
        <div className="p-8 pt-6">
          
          {/* MENSAGENS DE ERRO OU SUCESSO */}
          {erro && <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-xs font-bold rounded-md text-center">{erro}</div>}
          {mensagem && <div className="mb-4 p-3 bg-green-950/50 border border-green-900/50 text-green-400 text-xs font-bold rounded-md text-center">{mensagem}</div>}

          {/* FORMULÁRIO MASTER */}
          {tipoLogin === "admin" && (
            <form onSubmit={handleLoginAdmin} className="flex flex-col gap-4">
              <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-md mb-2">
                <p className="text-xs text-blue-500/80 leading-relaxed text-center">
                  Acesso exclusivo à administração.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-center">PIN MASTER</label>
                <input 
                  type="password" 
                  value={pinMaster} 
                  onChange={(e) => setPinMaster(e.target.value)} 
                  placeholder="••••••" 
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-md py-3 px-3 text-lg font-bold tracking-[0.5em] text-center text-blue-400 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-md transition-colors shadow-lg">
                Entrar no Painel Master
              </button>
            </form>
          )}

          {/* FORMULÁRIO TÉCNICO */}
          {tipoLogin === "tecnico" && (
            <form onSubmit={handleLoginTecnico} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">O seu Nome (Primeiro Nome)</label>
                <input 
                  type="text" 
                  value={nomeTecnico} 
                  onChange={(e) => setNomeTecnico(e.target.value)} 
                  placeholder="Ex: Carlos" 
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-md py-2.5 px-3 text-sm text-slate-200 outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">PIN de Acesso</label>
                <input 
                  type="password" 
                  value={pinTecnico} 
                  onChange={(e) => setPinTecnico(e.target.value)} 
                  placeholder="Ex: 2026" 
                  className="w-full bg-[#0b0f19] border border-slate-700 rounded-md py-2.5 px-3 text-sm font-bold tracking-widest text-amber-400 outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <button type="submit" className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-3 rounded-md transition-colors shadow-lg">
                Aceder às minhas OS
              </button>
            </form>
          )}

        </div>
      </div>
      
    </div>
  );
}
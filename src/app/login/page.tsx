"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const logoSalva = localStorage.getItem("app_logo");
    if (logoSalva) setLogoUrl(logoSalva);
    
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (usuarioStr) {
      const usuario = JSON.parse(usuarioStr);
      if (usuario.tipo === "admin") router.push("/");
      else router.push("/app-tecnico");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    const senhaLimpa = codigo.trim();

    if (!senhaLimpa) {
      setErro("Por favor, insira o seu código de acesso.");
      return;
    }

    // 1. Verificação Master (oculta nos bastidores)
    if (senhaLimpa === "MASTER2026") {
      localStorage.setItem("usuario_logado", JSON.stringify({ tipo: "admin", nome: "Master" }));
      router.push("/");
      return;
    }

    // 2. Verificação de Técnicos no Supabase + Fallback LocalStorage
    try {
      const { data: tecnicosNuvem, error } = await supabase
        .from("tecnicos")
        .select("*");

      if (error) {
        console.error("Erro ao consultar técnicos:", error);
        setErro(`Erro na nuvem: ${error.message}`);
        return;
      }

      // Junta os técnicos do Supabase com os que estiverem salvos localmente no navegador
      const tecnicosLocalStr = localStorage.getItem("tecnicos") || localStorage.getItem("app_tecnicos") || "[]";
      let tecnicosLocal: any[] = [];
      try {
        tecnicosLocal = JSON.parse(tecnicosLocalStr);
      } catch {}

      const todosTecnicos = [...(tecnicosNuvem || []), ...(Array.isArray(tecnicosLocal) ? tecnicosLocal : [])];

      const tecnico = todosTecnicos.find(
        (t: any) =>
          String(t.senha || "").trim().toLowerCase() === senhaLimpa.toLowerCase() ||
          String(t.codigo || "").trim().toLowerCase() === senhaLimpa.toLowerCase()
      );

      if (tecnico) {
        const statusAtual = String(tecnico.status || "Ativo").trim().toLowerCase();
        if (statusAtual === "inativo" || statusAtual === "bloqueado") {
          setErro("Acesso bloqueado. Contacte a administração.");
          return;
        }

        localStorage.setItem("usuario_logado", JSON.stringify({ 
          tipo: "tecnico", 
          id: tecnico.id, 
          nome: tecnico.nome 
        }));

        router.push("/app-tecnico");
        return;
      }

      const totalNuvem = tecnicosNuvem ? tecnicosNuvem.length : 0;
      if (totalNuvem === 0) {
        setErro("Código inválido (0 técnicos encontrados na tabela do Supabase).");
      } else {
        setErro(`Código de acesso inválido (${totalNuvem} técnico(s) registado(s) na nuvem).`);
      }
    } catch (err) {
      console.error(err);
      setErro("Falha na autenticação.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl p-8">
        
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-24 w-auto object-contain mb-4 rounded-xl shadow-lg" />
          ) : (
            <div className="h-24 w-24 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
              <span className="text-3xl">🔐</span>
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-widest text-center">SOS Casa de Praia</h1>
          <p className="text-xs text-slate-500 mt-1">Acesso Restrito na Nuvem</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">
              Código de Acesso
            </label>
            <input 
              type="password" 
              value={codigo} 
              onChange={(e) => setCodigo(e.target.value)} 
              placeholder="Insira a sua senha..." 
              className="bg-[#0b0f19] border border-slate-700 rounded-xl py-3 px-4 text-center text-lg font-mono text-slate-200 w-full outline-none focus:border-blue-500 transition-colors shadow-inner" 
            />
          </div>

          {erro && (
            <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-xs text-center py-2.5 rounded-lg font-bold animate-pulse">
              {erro}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-900/50 uppercase tracking-wider text-sm mt-2"
          >
            Entrar no Sistema
          </button>
        </form>

      </div>
    </div>
  );
}

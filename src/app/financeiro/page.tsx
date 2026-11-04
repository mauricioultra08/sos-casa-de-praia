"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

interface Transacao {
  id: number;
  tipo: "Entrada" | "Saída";
  descricao: string;
  valor: string;
  data_registro: string;
  os_id?: number | null;
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  // Estados do formulário
  const [tipoMovimento, setTipoMovimento] = useState<"Entrada" | "Saída">("Saída");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  
  // Estados de controlo
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setMontado(true);
    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }
    if (JSON.parse(usuarioStr).tipo === "tecnico") { router.push("/app-tecnico"); return; }

    carregarFinanceiroNuvem();
  }, [router]);

  const carregarFinanceiroNuvem = async () => {
    try {
      const { data, error } = await supabase.from("financeiro").select("*").order("id", { ascending: false });
      if (error) throw error;
      if (data) {
        setTransacoes(data);
        localStorage.setItem("financeiro_cadastrado", JSON.stringify(data)); // Cache local por precaução
      }
    } catch (err) {
      console.error("Erro ao carregar o financeiro da nuvem:", err);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor.trim()) {
      setMensagem("Preencha a descrição e o valor.");
      return;
    }

    const valorFormatado = valor.replace(",", ".");
    if (isNaN(Number(valorFormatado))) {
      setMensagem("Valor inválido.");
      return;
    }

    const novaTransacao = {
      id: Date.now(),
      tipo: tipoMovimento,
      descricao: descricao.trim(),
      valor: valorFormatado,
      data_registro: new Date().toLocaleDateString("pt-BR")
    };

    try {
      const { error } = await supabase.from("financeiro").insert([novaTransacao]);
      if (error) throw error;

      setMensagem(`${tipoMovimento} registada na nuvem com sucesso!`);
      setDescricao(""); setValor("");
      await carregarFinanceiroNuvem();
    } catch (err) {
      setMensagem("Erro ao gravar na nuvem.");
    }
    
    setTimeout(() => setMensagem(""), 3000);
  };

  const apagarTransacao = async (id: number) => {
    if (window.confirm("Deseja apagar este registo financeiro permanentemente da nuvem?")) {
      try {
        const { error } = await supabase.from("financeiro").delete().eq("id", id);
        if (error) throw error;
        await carregarFinanceiroNuvem();
      } catch (err) {
        alert("Erro ao apagar registo da nuvem.");
      }
    }
  };

  // Cálculos do Painel
  const totalEntradas = transacoes.filter(t => t.tipo === "Entrada").reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalSaidas = transacoes.filter(t => t.tipo === "Saída").reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saldoAtual = totalEntradas - totalSaidas;

  const transacoesFiltradas = transacoes.filter(t => 
    t.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    t.data_registro.includes(busca)
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar painel financeiro...</div>;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* CARDS DE RESUMO (DASHBOARD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-lg shadow-sm flex flex-col justify-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total de Entradas</p>
          <p className="text-2xl font-black text-emerald-400">R$ {totalEntradas.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-lg shadow-sm flex flex-col justify-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total de Saídas / Despesas</p>
          <p className="text-2xl font-black text-red-400">R$ {totalSaidas.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className={`border p-5 rounded-lg shadow-sm flex flex-col justify-center ${saldoAtual >= 0 ? "bg-emerald-950/20 border-emerald-900/50" : "bg-red-950/20 border-red-900/50"}`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${saldoAtual >= 0 ? "text-emerald-500" : "text-red-500"}`}>Saldo em Caixa (Líquido)</p>
          <p className={`text-3xl font-black ${saldoAtual >= 0 ? "text-emerald-400" : "text-red-400"}`}>R$ {saldoAtual.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      {/* FORMULÁRIO DE LANÇAMENTO AVULSO */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          ➕ Novo Lançamento Manual
        </h2>

        <form onSubmit={handleSalvar} className="flex flex-col gap-3">
          <div className="flex gap-4 mb-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input type="radio" name="tipoMov" value="Entrada" checked={tipoMovimento === "Entrada"} onChange={() => setTipoMovimento("Entrada")} className="accent-emerald-500 w-4 h-4" />
              <span className="text-emerald-400">Receita (Entrada)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input type="radio" name="tipoMov" value="Saída" checked={tipoMovimento === "Saída"} onChange={() => setTipoMovimento("Saída")} className="accent-red-500 w-4 h-4" />
              <span className="text-red-400">Despesa (Saída)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Descrição / Motivo *</label>
              <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Compra de Cabos RJ45 / Combustível" className="bg-[#0b0f19] border border-slate-700 rounded-md py-2 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor (R$) *</label>
              <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 150,00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-2 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full font-bold" />
            </div>
          </div>
          
          {mensagem && <div className={`text-xs mt-1 ${mensagem.includes("Erro") || mensagem.includes("Preencha") ? "text-red-400" : "text-emerald-400"}`}>{mensagem}</div>}

          <button type="submit" className={`mt-1 text-white text-xs font-bold py-2.5 rounded-md transition-colors uppercase tracking-wider ${tipoMovimento === "Entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
            Registar {tipoMovimento} na Nuvem
          </button>
        </form>
      </div>

      {/* LISTA (EXTRATO) */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Extrato de Movimentos ({transacoesFiltradas.length})
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." className="bg-[#0b0f19] border border-slate-700 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full transition-colors" />
          </div>
        </div>
        
        {transacoes.length === 0 ? (
           <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-md bg-[#0b0f19]">Sem movimentos registados na nuvem.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {transacoesFiltradas.map(trans => (
              <div key={trans.id} className="bg-[#0b0f19] border border-slate-800 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trans.tipo === 'Entrada' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50' : 'bg-red-900/40 text-red-400 border border-red-800/50'}`}>
                      {trans.tipo === 'Entrada' ? '⬇️ ENTRADA' : '⬆️ SAÍDA'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{trans.data_registro}</span>
                  </div>
                  <p className="font-bold text-slate-200 text-sm">{trans.descricao}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <p className={`font-black text-base ${trans.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trans.tipo === 'Entrada' ? '+' : '-'} R$ {Number(trans.valor).toFixed(2).replace('.', ',')}
                  </p>
                  <button onClick={() => apagarTransacao(trans.id)} className="text-slate-500 hover:text-red-400 text-xs font-medium px-2 py-1 transition-colors">
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
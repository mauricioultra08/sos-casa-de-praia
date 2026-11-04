"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase"; 

interface Cliente { 
  id: number; 
  nome: string; 
  telefone: string; 
  email?: string; 
  cnpjCpf?: string; 
  rua: string; 
  numero: string; 
  bairro: string; 
  cidade: string; 
}

export default function ClientesPage() {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do formulário de clientes
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState(""); 
  const [cnpjCpf, setCnpjCpf] = useState(""); 
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Praia Grande");
  
  // Estados de controlo
  const [mensagem, setMensagem] = useState("");
  const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");

  // ESTADOS DO MODAL DE TROCAR PIN MASTER
  const [modalPinAberto, setModalPinAberto] = useState(false);
  const [pinAtual, setPinAtual] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [mensagemPin, setMensagemPin] = useState("");

  // ESTADOS DE BACKUP
  const [mensagemBackup, setMensagemBackup] = useState("");

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
      const { data, error } = await supabase.from("clientes").select("*").order("id", { ascending: false });
      if (!error && data) {
        setClientes(data);
        localStorage.setItem("clientes_cadastrados", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Erro ao carregar clientes da nuvem:", err);
    }
  };

  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim() || !cidade.trim()) {
      setMensagem("Por favor, preencha pelo menos o Nome, Telefone e Cidade.");
      return;
    }

    const dadosCliente = {
      nome: nome.trim(), telefone: telefone.trim(), email: email.trim(), cnpjCpf: cnpjCpf.trim(),
      rua: rua.trim(), numero: numero.trim(), bairro: bairro.trim(), cidade: cidade.trim()
    };

    try {
      if (clienteEditandoId !== null) {
        const { error } = await supabase.from("clientes").update(dadosCliente).eq("id", clienteEditandoId);
        if (error) throw error;
        setMensagem(`Cliente "${nome}" atualizado na nuvem com sucesso!`);
        setClienteEditandoId(null);
      } else {
        const { error } = await supabase.from("clientes").insert([dadosCliente]);
        if (error) throw error;
        setMensagem(`Cliente "${nome}" cadastrado na nuvem com sucesso!`);
      }
      setNome(""); setTelefone(""); setEmail(""); setCnpjCpf(""); setRua(""); setNumero(""); setBairro("");
      await carregarClientesNuvem();
    } catch (err: any) {
      setMensagem("Erro ao salvar na nuvem: " + (err.message || "Erro desconhecido"));
    }
    setTimeout(() => setMensagem(""), 3500);
  };

  const apagarCliente = async (id: number) => {
    if (window.confirm("Tem certeza que deseja apagar este cliente permanentemente da nuvem?")) {
      try {
        const { error } = await supabase.from("clientes").delete().eq("id", id);
        if (error) throw error;
        await carregarClientesNuvem();
        if (clienteEditandoId === id) cancelarEdicao();
      } catch (err) {
        alert("Erro ao apagar cliente da nuvem.");
      }
    }
  };

  const editarCliente = (cliente: Cliente) => {
    setNome(cliente.nome); setTelefone(cliente.telefone); setEmail(cliente.email || "");
    setCnpjCpf(cliente.cnpjCpf || ""); setRua(cliente.rua || ""); setNumero(cliente.numero || ""); 
    setBairro(cliente.bairro || ""); setCidade(cliente.cidade || "");
    setClienteEditandoId(cliente.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setNome(""); setTelefone(""); setEmail(""); setCnpjCpf(""); setRua(""); setNumero(""); setBairro(""); setClienteEditandoId(null); setMensagem("");
  };

  const handleTrocarPin = (e: React.FormEvent) => {
    e.preventDefault();
    const pinSalvo = localStorage.getItem("pin_master") || "123456"; 
    
    if (pinAtual !== pinSalvo) {
      setMensagemPin("❌ Erro: O PIN atual está incorreto.");
      return;
    }
    if (novoPin.length < 4) {
      setMensagemPin("❌ Erro: O novo PIN deve ter pelo menos 4 dígitos.");
      return;
    }

    localStorage.setItem("pin_master", novoPin);
    setMensagemPin("✅ Sucesso: PIN Master alterado! Use-o no próximo login.");
    
    setTimeout(() => {
      setModalPinAberto(false); setPinAtual(""); setNovoPin(""); setMensagemPin("");
    }, 2500);
  };

  // =========================================================================
  // SISTEMA DE BACKUP E RESTAURO GERAL (EXPORTAR / IMPORTAR)
  // =========================================================================

  const exportarBackup = () => {
    try {
      const backupData = {
        clientes: JSON.parse(localStorage.getItem("clientes_cadastrados") || "[]"),
        estoque: JSON.parse(localStorage.getItem("estoque_cadastrado") || "[]"),
        orcamentos: JSON.parse(localStorage.getItem("orcamentos_cadastrados") || "[]"),
        ordens_servico: JSON.parse(localStorage.getItem("ordens_servico") || "[]"),
        financeiro: JSON.parse(localStorage.getItem("financeiro_cadastrado") || "[]"),
        tecnicos: JSON.parse(localStorage.getItem("tecnicos_cadastrados") || "[]"),
        dataBackup: new Date().toISOString()
      };

      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `SOS_Praia_Backup_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMensagemBackup("✅ Backup exportado com sucesso! Guarde o ficheiro num local seguro.");
      setTimeout(() => setMensagemBackup(""), 4000);
    } catch (error) {
      console.error("Erro ao exportar backup:", error);
      setMensagemBackup("❌ Erro ao exportar o backup.");
      setTimeout(() => setMensagemBackup(""), 4000);
    }
  };

  const handleImportarBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm("⚠️ ATENÇÃO: Restaurar um backup irá SUBSTITUIR todos os dados locais atuais do Estoque, Financeiro, Orçamentos e Técnicos. Os clientes são geridos na nuvem.\n\nTem a certeza que deseja continuar?")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const backupData = JSON.parse(content);

          if (!backupData.dataBackup) {
             throw new Error("Ficheiro inválido.");
          }

          // Restaura apenas os dados locais
          if (backupData.estoque) localStorage.setItem("estoque_cadastrado", JSON.stringify(backupData.estoque));
          if (backupData.orcamentos) localStorage.setItem("orcamentos_cadastrados", JSON.stringify(backupData.orcamentos));
          if (backupData.ordens_servico) localStorage.setItem("ordens_servico", JSON.stringify(backupData.ordens_servico));
          if (backupData.financeiro) localStorage.setItem("financeiro_cadastrado", JSON.stringify(backupData.financeiro));
          if (backupData.tecnicos) localStorage.setItem("tecnicos_cadastrados", JSON.stringify(backupData.tecnicos));

          setMensagemBackup("✅ Backup restaurado com sucesso! A recarregar o sistema...");
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);

        } catch (error) {
          console.error("Erro ao processar ficheiro de backup:", error);
          setMensagemBackup("❌ Erro: O ficheiro de backup é inválido ou está corrompido.");
          setTimeout(() => setMensagemBackup(""), 4000);
        }
      };
      reader.readAsText(file);
    }
    
    // Reset do input de ficheiro
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.telefone.includes(busca) ||
    (c.email && c.email.toLowerCase().includes(busca.toLowerCase())) ||
    (c.cnpjCpf && c.cnpjCpf.includes(busca)) ||
    (c.cidade && c.cidade.toLowerCase().includes(busca.toLowerCase())) ||
    (c.bairro && c.bairro.toLowerCase().includes(busca.toLowerCase()))
  );

  if (!montado) return <div className="w-full text-center py-12 text-slate-500 text-sm">A carregar painel de clientes...</div>;

  return (
    <div className="w-full flex flex-col gap-6 relative">
      
      {/* CABEÇALHO DA TELA INICIAL COM BOTÃO DE TROCAR PIN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Painel Master</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestão central de clientes e sistema</p>
        </div>
        <button onClick={() => setModalPinAberto(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-md transition-colors border border-slate-700 flex items-center gap-2 shadow-sm">
          ⚙️ Alterar Senha (PIN Master)
        </button>
      </div>

      {/* MODAL: TROCAR PIN MASTER */}
      {modalPinAberto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Mudar PIN de Acesso</h3>
            <p className="text-xs text-slate-400 mb-5">Altere o PIN usado para entrar no sistema como Master.</p>
            
            <form onSubmit={handleTrocarPin} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">PIN Atual</label>
                <input type="password" value={pinAtual} onChange={e => setPinAtual(e.target.value)} placeholder="••••••" className="w-full bg-[#0b0f19] border border-slate-700 rounded-md py-2 px-3 text-sm text-center tracking-widest text-slate-200 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Novo PIN Master</label>
                <input type="password" value={novoPin} onChange={e => setNovoPin(e.target.value)} placeholder="••••••" className="w-full bg-[#0b0f19] border border-slate-700 rounded-md py-2 px-3 text-sm text-center tracking-widest text-blue-400 font-bold outline-none focus:border-blue-500" />
              </div>
              
              {mensagemPin && <div className={`text-[11px] font-bold text-center mt-1 ${mensagemPin.includes("Erro") ? "text-red-400" : "text-green-400"}`}>{mensagemPin}</div>}

              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-md transition-colors">
                  Salvar Novo PIN
                </button>
                <button type="button" onClick={() => {setModalPinAberto(false); setMensagemPin(""); setPinAtual(""); setNovoPin("");}} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 rounded-md transition-colors border border-slate-700">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMULÁRIO COMPACTO DE CLIENTES */}
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 shadow-sm">
        <h2 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          {clienteEditandoId ? "✏️ Editar Cliente (Nuvem)" : "+ Novo Cliente (Nuvem Ativa)"}
        </h2>

        <form onSubmit={handleSalvarCliente} className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome Completo *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Telefone / WhatsApp *</label>
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(13) 99999-9999" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">CNPJ / CPF</label>
              <input type="text" value={cnpjCpf} onChange={(e) => setCnpjCpf(e.target.value)} placeholder="000.000.000-00" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-[#0b0f19] border border-slate-700 rounded-md py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-blue-500 w-full" />
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
          
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome, tel, CPF ou cidade..." 
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
                    📱 {cliente.telefone} 
                    {cliente.cnpjCpf && ` | 📄 ${cliente.cnpjCpf}`}
                    {cliente.email && ` | ✉️ ${cliente.email}`}
                    <br />
                    📍 {cliente.cidade}
                    {cliente.bairro && ` - ${cliente.bairro}`}
                    {cliente.rua && ` - ${cliente.rua}, ${cliente.numero}`}
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button onClick={() => editarCliente(cliente)} className="flex-1 sm:flex-none text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-950/30 px-4 py-1.5 rounded border border-blue-900/50 hover:bg-blue-900/40 transition-colors text-center">Editar</button>
                  <button onClick={() => apagarCliente(cliente.id)} className="flex-1 sm:flex-none text-red-500 hover:text-red-400 text-xs font-medium bg-red-950/30 px-4 py-1.5 rounded border border-red-900/50 hover:bg-red-900/40 transition-colors text-center">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ÁREA DE BACKUP DO SISTEMA */}
      <div className="bg-[#0b0f19] border border-indigo-900/40 rounded-lg p-5 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-indigo-400 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
              💾 Backup de Segurança (Local)
            </h3>
            <p className="text-[11px] text-slate-500">Exporte ou restaure todo o seu sistema (Estoque, OS, Orçamentos, Financeiro) de uma só vez.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button onClick={exportarBackup} className="bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 border border-indigo-700 text-xs font-bold py-2.5 px-6 rounded-md transition-colors whitespace-nowrap">
              ⬇️ Exportar Backup
            </button>
            
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold py-2.5 px-6 rounded-md transition-colors cursor-pointer text-center whitespace-nowrap">
              ⬆️ Importar Restauro
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImportarBackup}
              />
            </label>
          </div>
        </div>
        
        {mensagemBackup && (
          <div className={`mt-4 p-3 rounded-md text-xs font-bold text-center border ${mensagemBackup.includes("Erro") ? "bg-red-950/30 border-red-900/50 text-red-400" : "bg-green-950/30 border-green-900/50 text-green-400"}`}>
            {mensagemBackup}
          </div>
        )}
      </div>

    </div>
  );
}
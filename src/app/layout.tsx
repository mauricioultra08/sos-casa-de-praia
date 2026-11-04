"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [carregando, setCarregando] = useState(true);
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  const isLoginPage = pathname === "/login";
  const isAppTecnico = pathname === "/app-tecnico";

  useEffect(() => {
    const logoSalva = localStorage.getItem("app_logo");
    if (logoSalva) setLogoUrl(logoSalva);

    if (isLoginPage) { setCarregando(false); return; }

    const usuarioStr = localStorage.getItem("usuario_logado");
    if (!usuarioStr) { router.push("/login"); return; }

    const usuario = JSON.parse(usuarioStr);
    if (usuario.tipo === "tecnico" && !isAppTecnico) { router.push("/app-tecnico"); return; }
    if (usuario.tipo === "admin" && isAppTecnico) { router.push("/"); return; }

    setCarregando(false);
  }, [pathname, isLoginPage, isAppTecnico, router]);

  const handleSair = () => {
    localStorage.removeItem("usuario_logado");
    router.push("/login");
  };

  const handleTrocarLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);
        localStorage.setItem("app_logo", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoverLogo = () => {
    setLogoUrl(null);
    localStorage.removeItem("app_logo");
  };

  if (carregando) return <html lang="pt-BR"><head><script src="https://cdn.tailwindcss.com"></script></head><body className="bg-[#0b0f19] text-slate-200 min-h-screen flex items-center justify-center"><div className="text-sm text-slate-500 animate-pulse">A carregar painel...</div></body></html>;
  if (isLoginPage || isAppTecnico) return <html lang="pt-BR"><head><script src="https://cdn.tailwindcss.com"></script></head><body className="bg-[#0b0f19] text-slate-200 m-0 p-0 font-sans min-h-screen print:bg-white print:text-black">{children}</body></html>;

  return (
    <html lang="pt-BR">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-[#0b0f19] text-slate-200 m-0 p-0 font-sans min-h-screen flex flex-col print:bg-white print:text-black">
        <header className="bg-[#0b0f19] border-b border-slate-800 p-4 print:hidden">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            
            <div className="flex items-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo do Sistema" 
                  className="h-16 md:h-20 w-auto object-contain rounded-2xl drop-shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => inputLogoRef.current?.click()}
                  title="Clique para alterar a imagem"
                />
              ) : (
                <div 
                  className="h-16 w-64 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center font-bold text-xs text-slate-500 cursor-pointer hover:bg-slate-800 transition-colors text-center p-2"
                  onClick={() => inputLogoRef.current?.click()}
                >
                  Clique para enviar a<br/>sua Logo Completa
                </div>
              )}
            </div>

            <div className="flex gap-3 items-center">
              <input type="file" accept="image/*" ref={inputLogoRef} onChange={handleTrocarLogo} className="hidden" />
              <span className="bg-[#0f172a] text-green-500 border border-green-900/50 px-4 py-2 rounded-md text-xs flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]"></span> Banco Local Ativo
              </span>
              <button onClick={() => inputLogoRef.current?.click()} className="bg-transparent text-slate-300 border border-slate-700 px-4 py-2 rounded-md text-xs hover:bg-slate-800 transition-colors flex items-center gap-2">
                🖼️ Trocar Logo
              </button>
              {logoUrl && (
                <button onClick={handleRemoverLogo} className="text-slate-600 hover:text-red-500 text-xs ml-1 font-bold" title="Remover Logo">✖</button>
              )}
              <button onClick={handleSair} className="bg-red-950/40 text-red-400 border border-red-800 px-4 py-2 rounded-md text-xs hover:bg-red-900/60 transition-colors ml-4">
                Sair
              </button>
            </div>
          </div>

          <nav className="max-w-7xl mx-auto mt-6 flex justify-between items-end overflow-x-auto pb-2">
            {/* BOTÕES DE NAVEGAÇÃO À ESQUERDA */}
            <div className="flex gap-2">
              <Link href="/" className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${pathname === "/" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>👥 Clientes</Link>
              <Link href="/tecnicos" className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${pathname === "/tecnicos" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>🔧 Técnicos</Link>
              <Link href="/estoque" className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${pathname === "/estoque" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>📦 Estoque</Link>
              <Link href="/orcamentos" className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${pathname === "/orcamentos" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>📄 Orçamentos</Link>
              <Link href="/os" className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${pathname === "/os" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>📋 OS</Link>
              <Link href="/financeiro" className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${pathname === "/financeiro" ? "bg-orange-600 text-white" : "text-orange-500 hover:bg-slate-800"}`}>💰 Financeiro</Link>
            </div>
            
            {/* ASSINATURA E SUPORTE À DIREITA */}
            <div className="hidden sm:flex flex-col text-right text-[10px] text-slate-500 ml-4 pb-1 pr-2">
              <p>Desenvolvido por <strong className="text-blue-500">Projeta® Informática™</strong></p>
              <p>Suporte: <span className="font-mono text-slate-400">(11) 94867-5132</span></p>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 print:p-0">{children}</main>
      </body>
    </html>
  );
}
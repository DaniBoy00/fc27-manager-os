'use client';

import { useState, useEffect } from 'react';
import { Bell, ShieldAlert } from 'lucide-react';

export function Header() {
  const [userName, setUserName] = useState<string>('Treinador');
  const [userInitial, setUserInitial] = useState<string>('T');
  const [activeCareer, setActiveCareer] = useState<any | null>(null);

  useEffect(() => {
    // 1. Busca Usuário Logado
    const savedUser = localStorage.getItem('career_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.username) {
          setUserName(parsed.username);
          setUserInitial(parsed.username.charAt(0).toUpperCase());
        }
      } catch (e) {
        console.error('Erro ao ler usuário no Header:', e);
      }
    }

    // 2. Busca Carreira Ativa
    const savedCareer = localStorage.getItem('active_career');
    if (savedCareer) {
      try {
        const parsedCareer = JSON.parse(savedCareer);
        setActiveCareer(parsedCareer);
      } catch (e) {
        console.error('Erro ao ler carreira ativa no Header:', e);
      }
    }
  }, []);

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      
      {/* Badge da Carreira Ativa */}
      <div className="flex items-center gap-3">
        {activeCareer ? (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-[#00b2e3]/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Carreira Ativa:</span>
            <span className="font-bold text-[#00b2e3]">{activeCareer.club_name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500/70" />
            <span>Nenhuma carreira selecionada</span>
          </div>
        )}
      </div>

      {/* Perfil e Notificações */}
      <div className="flex items-center gap-4">
        <button 
          className="relative p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-xl transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00b2e3] rounded-full ring-2 ring-slate-900" />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#00b2e3] to-emerald-400 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md shadow-[#00b2e3]/20 text-sm">
            {userInitial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-400 leading-tight">Treinador Principal</p>
          </div>
        </div>
      </div>

    </header>
  );
}
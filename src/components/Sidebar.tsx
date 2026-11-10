'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Search, 
  ArrowLeftRight, 
  Sliders, 
  Swords, 
  User, 
  Lock,
  LogOut
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasActiveCareer, setHasActiveCareer] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const savedCareer = localStorage.getItem('active_career');
    if (savedCareer) {
      setHasActiveCareer(true);
    } else {
      setHasActiveCareer(false);
    }

    const savedUser = localStorage.getItem('career_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUsername(parsed.username || '');
      } catch (e) {
        console.error('Erro ao ler usuário:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('career_user');
    localStorage.removeItem('active_career');
    router.push('/login');
  };

  // Lista de Módulos da Aplicação
  const navigation = [
    { name: 'Perfil / Saves', href: '/profile', icon: User, requiresCareer: false },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiresCareer: true },
    { name: 'Elenco', href: '/squad', icon: Users, requiresCareer: true },
    { name: 'Head Scout', href: '/scout', icon: Search, requiresCareer: true },
    { name: 'Transferências', href: '/transfers', icon: ArrowLeftRight, requiresCareer: true },
    { name: 'Departamento Tático', href: '/tactics', icon: Sliders, requiresCareer: true },
    { name: 'Central de Partidas', href: '/matches', icon: Swords, requiresCareer: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-5">
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#00b2e3] to-emerald-400 rounded-xl flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-[#00b2e3]/20">
            FC
          </div>
          <div>
            <h1 className="font-black text-sm text-white tracking-wider">FC 27 MANAGER</h1>
            <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Career OS</p>
          </div>
        </div>

        {/* Links do Menu */}
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const isLocked = item.requiresCareer && !hasActiveCareer;

            if (isLocked) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-950/40 border border-transparent cursor-not-allowed select-none"
                  title="Selecione ou crie uma carreira no seu Perfil para desbloquear este módulo."
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-slate-600" />
                    <span>{item.name}</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                </div>
              );
            }

            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#00b2e3] text-slate-950 shadow-lg shadow-[#00b2e3]/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>

      </div>

      {/* Rodapé da Sidebar com Info do Treinador e Botão de Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {username && (
          <div className="px-2 text-xs text-slate-400 truncate">
            Logado como: <strong className="text-white">{username}</strong>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 hover:border-red-500/30 transition-all text-xs font-bold flex items-center justify-center gap-2 group"
        >
          <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Encerrar Sessão</span>
        </button>

        <div className="text-[10px] text-slate-600 font-mono text-center pt-1">
          FC 27 Manager OS • v1.0
        </div>
      </div>
    </aside>
  );
}
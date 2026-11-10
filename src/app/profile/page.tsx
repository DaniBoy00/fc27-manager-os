'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Plus, Trash2, Play, Trophy, DollarSign, Target, LogOut, Loader2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [careers, setCareers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Criação
  const [showModal, setShowModal] = useState(false);
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedLeagueName, setSelectedLeagueName] = useState<string>('');
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('');
  
  const [startingBudget, setStartingBudget] = useState('50000000');
  const [displayBudget, setDisplayBudget] = useState('50.000.000');
  const [goals, setGoals] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingModalData, setLoadingModalData] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('career_user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    fetchCareers(parsedUser.id);
  }, []);

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setStartingBudget('0');
      setDisplayBudget('');
      return;
    }
    const numericValue = Number(rawValue);
    setStartingBudget(rawValue);
    setDisplayBudget(numericValue.toLocaleString('de-DE'));
  };

  // Busca as ligas do Supabase
  useEffect(() => {
    if (!showModal) return;

    async function fetchLeaguesFromTable() {
      setLoadingModalData(true);
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setLeagues(data || []);
      } catch (err) {
        console.error('Erro ao buscar ligas:', err);
      } finally {
        setLoadingModalData(false);
      }
    }

    fetchLeaguesFromTable();
  }, [showModal]);

  // Busca os clubes da liga selecionada
  useEffect(() => {
    if (!selectedLeagueId) {
      setClubs([]);
      setSelectedClub('');
      return;
    }

    async function fetchClubsFromTable() {
      setLoadingModalData(true);
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('id, name')
          .eq('league_id', selectedLeagueId)
          .order('name', { ascending: true });

        if (error) throw error;
        setClubs(data || []);
        setSelectedClub('');
      } catch (err) {
        console.error('Erro ao buscar clubes:', err);
      } finally {
        setLoadingModalData(false);
      }
    }

    fetchClubsFromTable();
  }, [selectedLeagueId]);

  const fetchCareers = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('careers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCareers(data || []);
    } catch (err) {
      console.error('Erro ao buscar carreiras:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub || !selectedLeagueName || !selectedLeagueId) return;

    setCreating(true);
    try {
      // 1. Cria a carreira principal
      const { data: careerData, error: careerError } = await supabase
        .from('careers')
        .insert([
          {
            user_id: user.id,
            club_name: selectedClub,
            league_name: selectedLeagueName,
            starting_budget: Number(startingBudget),
            goals: goals.trim(),
            active: true
          }
        ])
        .select()
        .single();

      if (careerError) throw careerError;

      // 2. Mapeamento blindado de regiões/países baseado no nome da liga
      let countryRegion = 'Romênia'; // Fallback padrão inicial
      const lName = selectedLeagueName.toLowerCase();
      
      if (lName.includes('superliga') || lName.includes('romênia') || lName.includes('romenia')) {
        countryRegion = 'Romênia';
      } else if (lName.includes('eredivisie') || lName.includes('países baixos') || lName.includes('holanda')) {
        countryRegion = 'Países Baixos';
      } else if (lName.includes('portugal') || lName.includes('liga portugal')) {
        countryRegion = 'Portugal';
      } else if (lName.includes('bundesliga')) {
        countryRegion = 'Alemanha';
      } else if (lName.includes('laliga') || lName.includes('espanha') || lName.includes('la liga')) {
        countryRegion = 'Espanha';
      } else if (lName.includes('premier league') || lName.includes('inglaterra')) {
        countryRegion = 'Inglaterra';
      } else if (lName.includes('serie a') || lName.includes('itália') || lName.includes('italia')) {
        countryRegion = 'Itália';
      } else if (lName.includes('ligue 1') || lName.includes('frança')) {
        countryRegion = 'França';
      }

      // 3. Consulta dinâmica robusta na tabela 'competitions' (procurando com e sem acento)
      let copaNacional = 'Copa Nacional';
      
      let { data: cupData } = await supabase
        .from('competitions')
        .select('name')
        .eq('type', 'copa_nacional')
        .ilike('region', countryRegion)
        .limit(1)
        .single();

      // Se não achar com acento, tenta sem acento
      if (!cupData && countryRegion === 'Romênia') {
        const { data: cupFallback } = await supabase
          .from('competitions')
          .select('name')
          .eq('type', 'copa_nacional')
          .ilike('region', 'Romenia')
          .limit(1)
          .single();
        cupData = cupFallback;
      }

      if (cupData) {
        copaNacional = cupData.name;
      }

      // 4. Insere a Liga e a Copa Correta nas competições ativas da carreira
      const initialCompetitions = [
        { career_id: careerData.id, competition_name: selectedLeagueName, competition_type: 'league', is_active: true },
        { career_id: careerData.id, competition_name: copaNacional, competition_type: 'cup', is_active: true }
      ];

      await supabase.from('career_competitions').insert(initialCompetitions);

      localStorage.setItem('active_career', JSON.stringify(careerData));
      setShowModal(false);
      setSelectedLeagueId('');
      setSelectedLeagueName('');
      setSelectedClub('');
      setGoals('');
      fetchCareers(user.id);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao criar carreira:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCareer = async (careerId: string) => {
    if (!confirm('Tem certeza que deseja deletar este save de carreira?')) return;

    try {
      const { error } = await supabase.from('careers').delete().eq('id', careerId);
      if (error) throw error;

      const active = localStorage.getItem('active_career');
      if (active) {
        const parsed = JSON.parse(active);
        if (parsed.id === careerId) {
          localStorage.removeItem('active_career');
        }
      }

      fetchCareers(user.id);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao deletar carreira:', err);
    }
  };

  const handleSelectCareer = (career: any) => {
    localStorage.setItem('active_career', JSON.stringify(career));
    router.push('/squad');
  };

  const handleLogout = () => {
    localStorage.removeItem('career_user');
    localStorage.removeItem('active_career');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#00b2e3] to-emerald-400 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-950 shadow-lg shadow-[#00b2e3]/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  Treinador {user.username}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Painel Executivo • {careers.length} Carreiras Registradas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2.5 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nova Carreira
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 rounded-xl transition-all text-xs flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" /> Meus Saves de Carreira
            </h2>

            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#00b2e3] animate-spin" />
              </div>
            ) : careers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <p className="text-slate-400 font-bold">Nenhuma carreira iniciada ainda.</p>
                <p className="text-xs text-slate-500">Clique em "Nova Carreira" e escolha seu clube para desbloquear os módulos do sistema!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {careers.map((career) => (
                  <div
                    key={career.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white group-hover:text-[#00b2e3] transition-colors">
                          {career.club_name}
                        </h3>
                        <button
                          onClick={() => handleDeleteCareer(career.id)}
                          className="text-slate-600 hover:text-red-400 p-1 rounded-lg transition-colors"
                          title="Deletar Carreira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 font-medium">
                        Liga: <span className="text-slate-200">{career.league_name}</span>
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
                        <DollarSign className="w-3.5 h-3.5" />
                        Orçamento: € {Number(career.starting_budget).toLocaleString('de-DE')}
                      </div>

                      {career.goals && (
                        <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 mt-2">
                          <strong className="text-slate-300">Metas:</strong> {career.goals}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelectCareer(career)}
                      className="w-full py-2.5 bg-slate-950 hover:bg-[#00b2e3] text-slate-300 hover:text-slate-950 font-bold rounded-xl border border-slate-800 hover:border-[#00b2e3] transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5" /> Entrar no Modo Carreira
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#00b2e3]" /> Iniciar Nova Carreira
                </h2>

                <form onSubmit={handleCreateCareer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Selecione a Liga / Competição
                    </label>
                    <select
                      required
                      value={selectedLeagueId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedLeagueId(id);
                        const found = leagues.find(l => l.id === id);
                        setSelectedLeagueName(found ? found.name : '');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer"
                    >
                      <option value="">Selecione uma liga...</option>
                      {leagues.map(l => (
                        <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#00b2e3]" /> Selecione o Clube
                    </label>
                    <select
                      required
                      disabled={!selectedLeagueId || loadingModalData}
                      value={selectedClub}
                      onChange={(e) => setSelectedClub(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!selectedLeagueId ? 'Primeiro escolha uma liga' : loadingModalData ? 'Carregando clubes...' : 'Selecione um clube...'}
                      </option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Orçamento Inicial (€)
                    </label>
                    <input
                      type="text"
                      required
                      value={displayBudget}
                      onChange={handleBudgetChange}
                      placeholder="Ex: 50.000.000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-[#00b2e3]"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                      Valor real gravado: € {Number(startingBudget || 0).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-400" /> Metas da Diretoria
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Subir de divisão, revelar jovens da base..."
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00b2e3]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 font-bold rounded-xl border border-slate-800 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !selectedClub}
                      className="flex-1 py-2.5 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {creating ? 'Criando...' : 'Iniciar Carreira'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Trophy, Shield, Calendar, Award, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SquadPage() {
  const router = useRouter();
  const [activeCareer, setActiveCareer] = useState<any>(null);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal Inteligente de Upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'standings' | 'round'>('standings');
  const [modalCompetition, setModalCompetition] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const savedCareer = localStorage.getItem('active_career');
    if (!savedCareer) {
      router.push('/profile');
      return;
    }
    const career = JSON.parse(savedCareer);
    setActiveCareer(career);
    fetchCompetitions(career.id);
  }, []);

  // Busca as competições ativas da carreira direto da tabela career_competitions
  const fetchCompetitions = async (careerId: string) => {
    try {
      const { data, error } = await supabase
        .from('career_competitions')
        .select('*')
        .eq('career_id', careerId);

      if (error) throw error;
      setCompetitions(data || []);
      if (data && data.length > 0) {
        setSelectedCompetition(data[0].competition_name);
        setModalCompetition(data[0].competition_name);
      }
    } catch (err) {
      console.error('Erro ao buscar competições:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCareer || !selectedCompetition) return;

    async function fetchStandings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('league_standings')
          .select('*')
          .eq('career_id', activeCareer.id)
          .eq('competition_name', selectedCompetition)
          .order('points', { ascending: false })
          .order('goal_difference', { ascending: false });

        if (error) throw error;
        setStandings(data || []);
      } catch (err) {
        console.error('Erro ao buscar classificação:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, [activeCareer, selectedCompetition]);

  const handleConfirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !activeCareer) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('career_id', activeCareer.id);
      formData.append('competition_name', modalCompetition);
      formData.append('upload_type', uploadType);

      selectedFiles.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      const res = await fetch('/api/update-standings', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar imagens');

      alert('Mágica feita! 🚀 Dados consolidados com sucesso pelo Gemini.');
      setShowUploadModal(false);
      setSelectedFiles([]);
      window.location.reload();
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert(`Erro ao processar: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  if (!activeCareer) return null;

  const myTeamStats = standings.find(s => s.club_name === activeCareer.club_name) || {
    position: '—',
    points: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
  };

  const winRate = myTeamStats.played > 0 
    ? ((myTeamStats.won / myTeamStats.played) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#00b2e3] to-emerald-400 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-950 shadow-lg shadow-[#00b2e3]/20">
                <Shield className="w-8 h-8 text-slate-950" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  {activeCareer.club_name}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Liga Principal: <span className="text-emerald-400 font-bold">{activeCareer.league_name}</span> • Orçamento: € {Number(activeCareer.starting_budget).toLocaleString('de-DE')}
                </p>
              </div>
            </div>

            {/* Seletor de Competições dinâmico */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {competitions.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompetition(comp.competition_name)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedCompetition === comp.competition_name
                      ? 'bg-[#00b2e3] text-slate-950 shadow-lg shadow-[#00b2e3]/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" /> {comp.competition_name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold">Posição</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-white">{myTeamStats.position}º</span>
                <span className="text-[10px] text-emerald-400 font-mono">Na tabela</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold">Pontuação</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-400">{myTeamStats.points}</span>
                <span className="text-[10px] text-slate-500 font-mono">Pts</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold">Jogos (V-E-D)</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-lg font-bold text-white">{myTeamStats.played}</span>
                <span className="text-xs text-slate-400">({myTeamStats.won}-{myTeamStats.drawn}-{myTeamStats.lost})</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold">Saldo de Gols</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-2xl font-black font-mono ${myTeamStats.goal_difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {myTeamStats.goal_difference > 0 ? `+${myTeamStats.goal_difference}` : myTeamStats.goal_difference}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">({myTeamStats.goals_for}:{myTeamStats.goals_against})</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between col-span-2">
              <span className="text-xs text-slate-400 font-semibold">Aproveitamento</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-black text-[#00b2e3]">{winRate}%</span>
                <div className="flex gap-1">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center justify-center">V</span>
                  <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-bold text-[10px] flex items-center justify-center">E</span>
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center justify-center">V</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> Classificação • {selectedCompetition}
                </h2>
                <span className="text-xs text-slate-500 font-mono">{standings.length} Clubes na disputa</span>
              </div>

              {loading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#00b2e3] animate-spin" />
                </div>
              ) : standings.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800/60 rounded-xl p-8 text-center space-y-2">
                  <p className="text-slate-400 text-xs font-bold">Nenhum dado na tabela ainda.</p>
                  <p className="text-[11px] text-slate-500">Clique no botão ao lado para enviar os prints da tabela dividida!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Pos</th>
                        <th className="py-2.5 px-3">Clube</th>
                        <th className="py-2.5 px-2 text-center">J</th>
                        <th className="py-2.5 px-2 text-center">V</th>
                        <th className="py-2.5 px-2 text-center">E</th>
                        <th className="py-2.5 px-2 text-center">D</th>
                        <th className="py-2.5 px-2 text-center">SG</th>
                        <th className="py-2.5 px-3 text-center font-bold text-white">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {standings.map((row, index) => {
                        const isMyTeam = row.club_name === activeCareer.club_name;
                        return (
                          <tr key={row.id || index} className={`transition-colors ${isMyTeam ? 'bg-[#00b2e3]/10 font-bold border-l-2 border-[#00b2e3]' : 'hover:bg-slate-800/30'}`}>
                            <td className="py-3 px-3 font-mono text-slate-400">{index + 1}</td>
                            <td className={`py-3 px-3 flex items-center gap-2 ${isMyTeam ? 'text-white' : 'text-slate-300'}`}>
                              <Shield className={`w-3.5 h-3.5 ${isMyTeam ? 'text-[#00b2e3]' : 'text-slate-600'}`} />
                              {row.club_name}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-400">{row.played}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-400">{row.won}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-400">{row.drawn}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-400">{row.lost}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-400">{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>
                            <td className="py-3 px-3 text-center font-mono font-black text-emerald-400">{row.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00b2e3]" /> Próximo Confronto
                </h2>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-center space-y-3">
                  <span className="text-[10px] font-mono bg-slate-900 px-2.5 py-1 rounded-md text-slate-400 border border-slate-800">
                    Rodada Atual • {selectedCompetition}
                  </span>
                  <div className="flex items-center justify-between font-bold text-sm text-white pt-2">
                    <span className="flex-1 text-right truncate">{activeCareer.club_name}</span>
                    <span className="px-3 text-slate-500 font-mono text-xs">VS</span>
                    <span className="flex-1 text-left truncate text-slate-400">Adversário</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" /> Atualizar via Imagem (IA)
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Envie até 3 prints divididos da tabela ou da rodada. O Gemini consolida tudo e atualiza o banco.
                </p>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full py-3 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Abrir Central de Uploads (IA)
                </button>
              </div>

            </div>

          </div>

        </main>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#00b2e3]" /> Assistente de IA • Sincronização
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpload} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  O que você está enviando nestes prints?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadType('standings')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      uploadType === 'standings'
                        ? 'bg-[#00b2e3]/20 border-[#00b2e3] text-[#00b2e3]'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Award className="w-4 h-4" /> Tabela de Classificação
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadType('round')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      uploadType === 'round'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Calendar className="w-4 h-4" /> Resultados da Rodada
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  A qual campeonato pertence este print?
                </label>
                <select
                  value={modalCompetition}
                  onChange={(e) => setModalCompetition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3]"
                >
                  {competitions.map((comp) => (
                    <option key={comp.id} value={comp.competition_name}>
                      {comp.competition_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Selecione os Prints (Até 3 imagens para tabelas divididas)
                </label>
                <label className="border-2 border-dashed border-slate-800 hover:border-[#00b2e3] bg-slate-950 hover:bg-slate-900/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                  <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-[#00b2e3]" />
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} arquivo(s) selecionado(s)` : 'Clique para escolher as imagens'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Suporta PNG, JPG (Até 3 prints)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 3) {
                        alert('Você pode selecionar no máximo 3 imagens por vez.');
                        return;
                      }
                      setSelectedFiles(files);
                    }}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFiles.map((file, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-[#00b2e3]" /> {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 font-bold rounded-xl border border-slate-800 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage || selectedFiles.length === 0}
                  className="flex-1 py-2.5 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processando com IA...
                    </>
                  ) : (
                    'Enviar e Processar'
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
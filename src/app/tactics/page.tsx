'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Users, Shield, Award, Plus, Trash2, Edit2, Check, X, Loader2, Sparkles, Shirt } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function TacticsPage() {
  const router = useRouter();
  const [activeCareer, setActiveCareer] = useState<any>(null);
  const [tactics, setTactics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal / Formulário de Tática
  const [showModal, setShowModal] = useState(false);
  const [formationName, setFormationName] = useState('');
  const [formationStyle, setFormationStyle] = useState('Equilibrado');
  const [instructions, setInstructions] = useState('');
  const [selectedTactic, setSelectedTactic] = useState<any>(null);

  useEffect(() => {
    const savedCareer = localStorage.getItem('active_career');
    if (!savedCareer) {
      router.push('/profile');
      return;
    }
    const career = JSON.parse(savedCareer);
    setActiveCareer(career);
    fetchTactics(career.id);
  }, []);

  const fetchTactics = async (careerId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tactics')
        .select('*')
        .eq('career_id', careerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTactics(data || []);
      
      // Se houver táticas cadastradas e nenhuma selecionada, seleciona a primeira
      if (data && data.length > 0 && !selectedTactic) {
        setSelectedTactic(data[0]);
      }
    } catch (err) {
      console.error('Erro ao buscar táticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTactic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCareer || !formationName) return;

    try {
      const { data, error } = await supabase
        .from('tactics')
        .insert([
          {
            career_id: activeCareer.id,
            name: formationName,
            style: formationStyle,
            instructions: instructions.trim()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setTactics([data, ...tactics]);
      if (!selectedTactic) setSelectedTactic(data);

      setShowModal(false);
      setFormationName('');
      setFormationStyle('Equilibrado');
      setInstructions('');
    } catch (err) {
      console.error('Erro ao salvar tática:', err);
      alert('Erro ao salvar formação tática.');
    }
  };

  const handleDeleteTactic = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta formação tática?')) return;

    try {
      const { error } = await supabase.from('tactics').delete().eq('id', id);
      if (error) throw error;

      const updated = tactics.filter(t => t.id !== id);
      setTactics(updated);
      if (selectedTactic?.id === id) {
        setSelectedTactic(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error('Erro ao deletar tática:', err);
    }
  };

  if (!activeCareer) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Cabeçalho da Página */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-[#00b2e3] rounded-2xl flex items-center justify-center font-black text-2xl text-slate-950 shadow-lg shadow-emerald-500/20">
                <Users className="w-8 h-8 text-slate-950" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  Gestão Tática & Elenco
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clube: <span className="text-emerald-400 font-bold">{activeCareer.club_name}</span> • Configure esquemas, posturas e instruções.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs flex items-center gap-2 cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" /> Nova Formação Tática
            </button>
          </div>

          {/* Conteúdo Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lista de Táticas Salvas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-400" /> Esquemas Salvos
              </h2>

              {loading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#00b2e3] animate-spin" />
                </div>
              ) : tactics.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center space-y-2">
                  <p className="text-xs text-slate-400 font-bold">Nenhuma tática cadastrada.</p>
                  <p className="text-[11px] text-slate-500">Crie sua primeira formação tática para o time!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tactics.map((tactic) => {
                    const isSelected = selectedTactic?.id === tactic.id;
                    return (
                      <div
                        key={tactic.id}
                        onClick={() => setSelectedTactic(tactic)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#00b2e3]/10 border-[#00b2e3]'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <h3 className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {tactic.name}
                          </h3>
                          <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                            Estilo: {tactic.style}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTactic(tactic.id);
                          }}
                          className="text-slate-600 hover:text-red-400 p-2 rounded-lg transition-colors"
                          // Nota: Removido o atributo title direto no ícone para evitar erro de tipo no TypeScript
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detalhes / Prancheta Tática */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00b2e3]" /> Prancheta Tática
              </h2>

              {selectedTactic ? (
                <div className="space-y-6">
                  
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00b2e3]/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#00b2e3] font-bold">Esquema Ativo</span>
                        <h3 className="text-2xl font-black text-white mt-0.5">{selectedTactic.name}</h3>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold rounded-lg">
                        {selectedTactic.style}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instruções Táticas & Comportamento</h4>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        {selectedTactic.instructions || 'Nenhuma instrução específica detalhada para esta formação.'}
                      </p>
                    </div>
                  </div>

                  {/* Campo Visual Ilustrativo */}
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6 h-64 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="w-24 h-24 rounded-full border border-emerald-500/30 absolute" />
                    <div className="w-full h-[1px] bg-emerald-500/20 absolute" />
                    
                    <div className="z-10 text-center space-y-1">
                      <Shirt className="w-10 h-10 text-emerald-400 mx-auto animate-pulse" />
                      <p className="text-xs font-black text-white uppercase tracking-wider">Simulação do Campo • {selectedTactic.name}</p>
                      <p className="text-[10px] text-emerald-400/80 font-mono">Posicionamento tático otimizado para o Manager OS</p>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
                  <p className="text-slate-400 font-bold text-xs">Nenhuma formação selecionada.</p>
                  <p className="text-[11px] text-slate-500">Escolha uma tática ao lado ou cadastre uma nova para visualizar os detalhes.</p>
                </div>
              )}
            </div>

          </div>

        </main>
      </div>

      {/* Modal de Nova Tática */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00b2e3]" /> Nova Formação Tática
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTactic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome do Esquema (Ex: 4-3-3 Ofensivo)</label>
                <input
                  type="text"
                  required
                  value={formationName}
                  onChange={(e) => setFormationName(e.target.value)}
                  placeholder="Ex: 4-2-3-1 / 3-5-2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Estilo de Jogo</label>
                <select
                  value={formationStyle}
                  onChange={(e) => setFormationStyle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer"
                >
                  <option value="Equilibrado">Equilibrado</option>
                  <option value="Pressão Alta / Gegenpress">Pressão Alta / Gegenpress</option>
                  <option value="Posse de Bola / Tiki-Taka">Posse de Bola / Tiki-Taka</option>
                  <option value="Contra-Ataque Rápido">Contra-Ataque Rápido</option>
                  <option value="Defesa Sólida / Est linha baixa">Defesa Sólida / Bloco Baixo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Instruções Coletivas e Individuais</label>
                <textarea
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex: Laterais apoiam o ataque, pontas cortam para dentro, armador livre..."
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
                  className="flex-1 py-2.5 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs"
                >
                  Salvar Tática
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Sliders, Shield, Users, RefreshCw, X, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const FORMATIONS: Record<string, { role: string; x: number; y: number }[]> = {
  '4-3-3': [
    { role: 'GK', x: 50, y: 88 },
    { role: 'LB', x: 15, y: 70 },
    { role: 'CB', x: 38, y: 72 },
    { role: 'CB', x: 62, y: 72 },
    { role: 'RB', x: 85, y: 70 },
    { role: 'CDM', x: 50, y: 55 },
    { role: 'CM', x: 30, y: 42 },
    { role: 'CM', x: 70, y: 42 },
    { role: 'LW', x: 15, y: 22 },
    { role: 'ST', x: 50, y: 18 },
    { role: 'RW', x: 85, y: 22 },
  ],
  '4-4-2': [
    { role: 'GK', x: 50, y: 88 },
    { role: 'LB', x: 15, y: 70 },
    { role: 'CB', x: 38, y: 72 },
    { role: 'CB', x: 62, y: 72 },
    { role: 'RB', x: 85, y: 70 },
    { role: 'LM', x: 15, y: 45 },
    { role: 'CM', x: 38, y: 48 },
    { role: 'CM', x: 62, y: 48 },
    { role: 'RM', x: 85, y: 45 },
    { role: 'ST', x: 38, y: 20 },
    { role: 'ST', x: 62, y: 20 },
  ],
  '3-5-2': [
    { role: 'GK', x: 50, y: 88 },
    { role: 'CB', x: 25, y: 72 },
    { role: 'CB', x: 50, y: 74 },
    { role: 'CB', x: 75, y: 72 },
    { role: 'LWB', x: 10, y: 45 },
    { role: 'CDM', x: 38, y: 52 },
    { role: 'CM', x: 50, y: 40 },
    { role: 'CDM', x: 62, y: 52 },
    { role: 'RWB', x: 90, y: 45 },
    { role: 'ST', x: 38, y: 20 },
    { role: 'ST', x: 62, y: 20 },
  ]
};

export default function TacticsPage() {
  const [activeCareer, setActiveCareer] = useState<any>(null);
  const [squad, setSquad] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [formation, setFormation] = useState<string>('4-3-3');
  const [starters, setStarters] = useState<Record<number, any>>({});
  const [benchIds, setBenchIds] = useState<string[]>([]);
  
  // Controle universal de seleção
  const [selection, setSelection] = useState<{ type: 'field' | 'bench'; index?: number; playerId?: string } | null>(null);

  // Raio-X Técnico
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<any | null>(null);

  useEffect(() => {
    const savedCareer = localStorage.getItem('active_career');
    if (savedCareer) {
      try {
        setActiveCareer(JSON.parse(savedCareer));
      } catch (e) {
        console.error('Erro ao ler carreira ativa:', e);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchSquad() {
      if (!activeCareer?.club_name) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('club', activeCareer.club_name)
          .order('overall_rating', { ascending: false });

        if (error) throw error;
        setSquad(data || []);
      } catch (err) {
        console.error('Erro ao buscar elenco para tática:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSquad();
  }, [activeCareer]);

  // Inicializa escalação e banco de reservas de forma blindada
  useEffect(() => {
    if (squad.length === 0) return;

    const currentSlots = FORMATIONS[formation];
    const initialLineup: Record<number, any> = {};
    const usedIds = new Set<string>();

    currentSlots.forEach((slot, index) => {
      let found = squad.find(p => !usedIds.has(p.id) && (p.position || '').toUpperCase().includes(slot.role));
      if (!found && slot.role === 'GK') {
        found = squad.find(p => !usedIds.has(p.id) && (p.position || '').toUpperCase() === 'GK');
      }
      if (!found) {
        found = squad.find(p => !usedIds.has(p.id));
      }

      if (found) {
        initialLineup[index] = found;
        usedIds.add(found.id);
      }
    });

    setStarters(initialLineup);

    // O restante vai estritamente para o banco de reservas
    const initialBench = squad.filter(p => !usedIds.has(p.id)).map(p => p.id);
    setBenchIds(initialBench);

    setSelection(null);
  }, [squad, formation]);

  // Mapeia os jogadores do banco na ordem exata dos IDs em `benchIds`
  const benchPlayers = benchIds.map(id => squad.find(p => p.id === id)).filter(Boolean);

  const isPositionValid = (player: any, role: string) => {
    if (!player) return true;
    const pos = (player.position || '').toUpperCase();
    const alt = (player.alternate_positions || '').toUpperCase();
    const target = role.toUpperCase();

    if (pos.includes(target) || alt.includes(target)) return true;
    
    if (target === 'CB' && (pos.includes('CB') || alt.includes('CB'))) return true;
    if ((target === 'LB' || target === 'RB' || target === 'LWB' || target === 'RWB') && (pos.includes('B') || alt.includes('B'))) return true;
    if (target.includes('M') && (pos.includes('M') || alt.includes('M'))) return true;
    if (target.includes('W') || target.includes('ST') || target.includes('CF')) {
      if (pos.includes('F') || pos.includes('W') || alt.includes('F') || alt.includes('W') || alt.includes('ST')) return true;
    }

    return false;
  };

  const handleItemClick = (type: 'field' | 'bench', index?: number, playerId?: string) => {
    if (!selection) {
      setSelection({ type, index, playerId });
      return;
    }

    if (selection.type === type && selection.index === index && selection.playerId === playerId) {
      setSelection(null);
      return;
    }

    // 1. Titular ⇄ Titular
    if (selection.type === 'field' && type === 'field' && selection.index !== undefined && index !== undefined) {
      const sourceIdx = selection.index;
      const targetIdx = index;
      setStarters(prev => {
        const playerA = prev[sourceIdx];
        const playerB = prev[targetIdx];
        return {
          ...prev,
          [sourceIdx]: playerB,
          [targetIdx]: playerA
        };
      });
      setSelection(null);
      return;
    }

    // 2. Titular ⇄ Banco (ou Banco ⇄ Titular)
    const isFieldToBench = selection.type === 'field' && type === 'bench' && selection.index !== undefined && playerId;
    const isBenchToField = selection.type === 'bench' && type === 'field' && selection.playerId && index !== undefined;

    if (isFieldToBench || isBenchToField) {
      const fieldIdx = isFieldToBench ? selection.index! : index!;
      const benchPlayerId = isFieldToBench ? playerId! : selection.playerId!;

      const currentStarter = starters[fieldIdx];
      const targetBenchPlayer = squad.find(p => p.id === benchPlayerId);

      if (targetBenchPlayer && currentStarter) {
        // O titular ganha o jogador do banco
        setStarters(prev => ({
          ...prev,
          [fieldIdx]: targetBenchPlayer
        }));

        // O antigo titular ocupa exatamente o lugar do reserva na lista de IDs do banco
        setBenchIds(prevIds => {
          return prevIds.map(id => (id === benchPlayerId ? currentStarter.id : id));
        });
      }
      setSelection(null);
      return;
    }

    // 3. Banco ⇄ Banco (Reordenação exata na lista)
    if (selection.type === 'bench' && type === 'bench' && selection.playerId && playerId) {
      setBenchIds(prevIds => {
        const newIds = [...prevIds];
        const idxA = newIds.indexOf(selection.playerId!);
        const idxB = newIds.indexOf(playerId);
        if (idxA !== -1 && idxB !== -1) {
          const temp = newIds[idxA];
          newIds[idxA] = newIds[idxB];
          newIds[idxB] = temp;
        }
        return newIds;
      });
      setSelection(null);
      return;
    }

    setSelection(null);
  };

  const starterValues = Object.values(starters);
  const avgLineupOverall = starterValues.length > 0 
    ? Math.round(starterValues.reduce((acc: number, p: any) => acc + (p?.overall_rating || 0), 0) / starterValues.length) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                <Sliders className="w-7 h-7 text-[#00b2e3]" /> Departamento Tático • {activeCareer?.club_name || 'Clube'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Substituições e reordenações seguras: nenhum atleta some do plantel.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Média do Onze: <strong className="text-white">{avgLineupOverall}</strong></span>
              </div>
              
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer"
              >
                <option value="4-3-3">Formação: 4-3-3</option>
                <option value="4-4-2">Formação: 4-4-2</option>
                <option value="3-5-2">Formação: 3-5-2</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* MINI CAMPO INTERATIVO */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center relative min-h-[600px] overflow-hidden">
              
              <div className="absolute inset-4 bg-gradient-to-b from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-between p-6 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-emerald-500/20 rounded-full" />
                <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-emerald-500/20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-b border-x border-emerald-500/20 rounded-b-xl" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 border-t border-x border-emerald-500/20 rounded-t-xl" />
              </div>

              {loading ? (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-[#00b2e3] animate-spin" />
                </div>
              ) : (
                <div className="relative w-full h-[550px]">
                  {FORMATIONS[formation].map((slot, index) => {
                    const player = starters[index];
                    const isValid = isPositionValid(player, slot.role);
                    const isSelected = selection?.type === 'field' && selection?.index === index;

                    return (
                      <div
                        key={index}
                        onClick={() => handleItemClick('field', index)}
                        onDoubleClick={() => player && setSelectedPlayerModal(player)}
                        style={{ top: `${slot.y}%`, left: `${slot.x}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
                        title="Clique para selecionar e trocar | Duplo clique para Raio-X"
                      >
                        <div className={`w-11 h-11 bg-slate-950/90 border-2 rounded-2xl flex flex-col items-center justify-center shadow-xl transition-all ${
                          isSelected 
                            ? 'border-emerald-400 ring-4 ring-emerald-400/30 scale-110 bg-emerald-500/20' 
                            : !isValid 
                              ? 'border-amber-500 bg-amber-500/10' 
                              : 'border-[#00b2e3] group-hover:scale-110 group-hover:bg-[#00b2e3] group-hover:text-slate-950'
                        }`}>
                          <span className={`text-[10px] font-black leading-none ${isSelected ? 'text-white' : !isValid ? 'text-amber-400' : 'text-emerald-400 group-hover:text-slate-950'}`}>
                            {player?.overall_rating || '-'}
                          </span>
                          <span className={`text-[9px] font-mono font-bold ${isSelected ? 'text-emerald-300' : !isValid ? 'text-amber-300' : 'text-slate-300 group-hover:text-slate-950'} mt-0.5`}>
                            {slot.role}
                          </span>
                        </div>

                        <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md border shadow-md transition-all ${
                          isSelected ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-950/90 border-slate-800 text-white'
                        }`}>
                          {!isValid && (
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" title="Jogador fora de sua posição habitual!" />
                          )}
                          <span className="text-[10px] font-bold truncate max-w-[80px]">
                            {player ? (player.common_name || player.last_name || player.first_name) : 'Vazio'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 text-center text-xs text-slate-400 z-10">
                {selection !== null ? (
                  <span className="text-emerald-400 font-bold animate-pulse">
                    ✨ Item selecionado! Clique em outro titular ou reserva para trocar ou substituir.
                  </span>
                ) : (
                  <span>💡 <strong className="text-white">Clique</strong> em qualquer jogador para iniciar a movimentação.</span>
                )}
              </div>
            </div>

            {/* BANCO DE RESERVAS LATERAL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[600px]">
              <h2 className="text-sm font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" /> Banco de Reservas
                </span>
                <span className="text-xs font-mono text-slate-500">({benchPlayers.length})</span>
              </h2>
              <p className="text-[11px] text-slate-400 mb-3">
                Clique num reserva e num titular para substituir, ou em dois reservas para reordenar a lista.
              </p>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {benchPlayers.map((player, bIndex) => {
                  const isSelected = selection?.type === 'bench' && selection?.playerId === player.id;

                  return (
                    <div
                      key={`${player.id}-${bIndex}`}
                      onClick={() => handleItemClick('bench', undefined, player.id)}
                      onDoubleClick={() => setSelectedPlayerModal(player)}
                      className={`border rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected 
                          ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400/30' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center font-black text-xs text-emerald-400">
                          {player.overall_rating}
                        </div>
                        <div>
                          <p className={`text-xs font-bold transition-colors ${isSelected ? 'text-emerald-300' : 'text-white group-hover:text-[#00b2e3]'}`}>
                            {player.common_name || `${player.first_name || ''} ${player.last_name || ''}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {player.position} {player.alternate_positions ? `• Alt: ${player.alternate_positions}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300">
                        {isSelected ? 'Selecionado' : 'Trocar'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* MODAL DE RAIO-X TÉCNICO */}
          {selectedPlayerModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center font-black text-lg text-emerald-400">
                      {selectedPlayerModal.overall_rating}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        {selectedPlayerModal.common_name || `${selectedPlayerModal.first_name || ''} ${selectedPlayerModal.last_name || ''}`}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {selectedPlayerModal.position} • {selectedPlayerModal.club || '-'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPlayerModal(null)} className="text-slate-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Nacionalidade</span>
                    <strong className="text-white">{selectedPlayerModal.nationality || '-'}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Idade</span>
                    <strong className="text-white">{selectedPlayerModal.age || '-'}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Valor de Mercado</span>
                    <strong className="text-emerald-400 font-mono">€ {Number(selectedPlayerModal.value_eur || 0).toLocaleString('de-DE')}</strong>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedPlayerModal(null)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Fechar Raio-X
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
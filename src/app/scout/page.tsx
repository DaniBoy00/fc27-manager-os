'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Search, Globe, Shield, Trophy, Filter, Loader2, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ScoutPage() {
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('TODAS');
  
  const [clubs, setClubs] = useState<string[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('TODOS');

  const [nationalities, setNationalities] = useState<string[]>([]);
  const [selectedNationality, setSelectedNationality] = useState<string>('TODAS');

  const [positions, setPositions] = useState<string[]>(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']);
  const [selectedPosition, setSelectedPosition] = useState<string>('TODAS');

  const [minOverall, setMinOverall] = useState<string>('');
  const [maxOverall, setMaxOverall] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');

  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Total da base global vs. Total filtrado pelo Supabase
  const [globalTotalCount, setGlobalTotalCount] = useState<number>(0);
  const [filteredTotalCount, setFilteredTotalCount] = useState<number>(0);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);

  // 1. Carrega opções iniciais (Ligas e Nacionalidades)
  useEffect(() => {
    async function initScoutData() {
      try {
        const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
        if (count) setGlobalTotalCount(count);

        let allLeagues = new Set<string>();
        let allNationalities = new Set<string>();
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('players')
            .select('league, nationality')
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            data.forEach((item: any) => {
              if (item.league) allLeagues.add(item.league);
              if (item.nationality) allNationalities.add(item.nationality);
            });
            page++;
            if (data.length < pageSize) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        setLeagues(Array.from(allLeagues).sort());
        setNationalities(Array.from(allNationalities).sort());
      } catch (err) {
        console.error('Erro ao inicializar filtros:', err);
      }
    }

    initScoutData();
  }, []);

  // 2. Atualiza clubes ao mudar a liga
  useEffect(() => {
    async function fetchClubsForLeague() {
      if (selectedLeague === 'TODAS') {
        setClubs([]);
        setSelectedClub('TODOS');
        return;
      }

      try {
        let allClubs = new Set<string>();
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('players')
            .select('club')
            .eq('league', selectedLeague)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            data.forEach((item: any) => {
              if (item.club) allClubs.add(item.club);
            });
            page++;
            if (data.length < pageSize) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        setClubs(Array.from(allClubs).sort());
        setSelectedClub('TODOS');
      } catch (err) {
        console.error('Erro ao buscar clubes:', err);
      }
    }

    fetchClubsForLeague();
  }, [selectedLeague]);

  // Reseta para a página 1 sempre que qualquer filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLeague, selectedClub, selectedNationality, minOverall, maxOverall, searchName, selectedPosition, itemsPerPage]);

  // 3. CONSULTA 100% SUPABASE: Todos os filtros são aplicados diretamente na query do PostgreSQL
  useEffect(() => {
    async function fetchPlayersFromSupabase() {
      setLoading(true);
      try {
        let query = supabase.from('players').select('*', { count: 'exact' });

        // A) Filtro de Nome (Inspeciona Nome, Sobrenome e Apelido)
        if (searchName.trim() !== '') {
          const term = `%${searchName.trim()}%`;
          query = query.or(`first_name.ilike.${term},last_name.ilike.${term},common_name.ilike.${term}`);
        }

        // B) Filtro de Liga
        if (selectedLeague !== 'TODAS') {
          query = query.eq('league', selectedLeague);
        }

        // C) Filtro de Clube
        if (selectedLeague !== 'TODAS' && selectedClub !== 'TODOS') {
          query = query.eq('club', selectedClub);
        }

        // D) Filtro de Nacionalidade
        if (selectedNationality !== 'TODAS') {
          query = query.eq('nationality', selectedNationality);
        }

        // E) Filtro de Overall Mínimo e Máximo
        if (minOverall !== '') {
          query = query.gte('overall_rating', Number(minOverall));
        }
        if (maxOverall !== '') {
          query = query.lte('overall_rating', Number(maxOverall));
        }

        // F) Filtro de Posição (Polivalência: Principal ou Alternativa)
        if (selectedPosition !== 'TODAS') {
          const posTerm = `%${selectedPosition}%`;
          query = query.or(`position.ilike.${posTerm},alternate_positions.ilike.${posTerm}`);
        }

        // Paginação direto no Banco de Dados
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, count, error } = await query
          .order('overall_rating', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setPlayers(data || []);
        setFilteredTotalCount(count || 0);
      } catch (err) {
        console.error('Erro ao buscar atletas no Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce leve para evitar requisições a cada tecla digitada no campo de nome
    const timer = setTimeout(() => {
      fetchPlayersFromSupabase();
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedLeague, selectedClub, selectedNationality, minOverall, maxOverall, selectedPosition, searchName, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTotalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Cabeçalho */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                <Search className="w-7 h-7 text-[#00b2e3]" /> Head Scout • Radar Global Avançado
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Consultas unificadas executadas 100% direto no banco de dados Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-xs text-slate-300">
              <Globe className="w-4 h-4 text-[#00b2e3]" />
              <span>{globalTotalCount > 0 ? `${globalTotalCount.toLocaleString()} Atletas no Banco` : 'Carregando...'}</span>
            </div>
          </div>

          {/* PAINEL DE FILTROS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            
            {/* Nome */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-[#00b2e3]" /> Nome do Atleta
              </label>
              <input
                type="text"
                placeholder="Ex: Bellingham, Rodri..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00b2e3]"
              />
            </div>

            {/* Liga */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Liga
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer"
              >
                <option value="TODAS">🌐 Todas as Ligas</option>
                {leagues.map(league => (
                  <option key={league} value={league} className="bg-slate-900 text-white">
                    {league}
                  </option>
                ))}
              </select>
            </div>

            {/* Clube */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#00b2e3]" /> Clube
              </label>
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                disabled={selectedLeague === 'TODAS'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="TODOS">{selectedLeague === 'TODAS' ? 'Selecione uma Liga' : '🛡️ Todos os Clubes'}</option>
                {clubs.map(club => (
                  <option key={club} value={club} className="bg-slate-900 text-white">
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {/* Posição */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Posição (Polivalência)
              </label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#00b2e3] cursor-pointer"
              >
                <option value="TODAS">⚡ Todas as Posições</option>
                {positions.map(pos => (
                  <option key={pos} value={pos} className="bg-slate-900 text-white">
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            {/* Intervalo de Overall */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-purple-400" /> Intervalo de Overall
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Mín"
                  value={minOverall}
                  onChange={(e) => setMinOverall(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white placeholder-slate-600 text-center focus:outline-none focus:border-[#00b2e3]"
                />
                <span className="text-slate-500 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={maxOverall}
                  onChange={(e) => setMaxOverall(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-xs text-white placeholder-slate-600 text-center focus:outline-none focus:border-[#00b2e3]"
                />
              </div>
            </div>

          </div>

          {/* Tabela de Resultados */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative flex flex-col min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-[#00b2e3] animate-spin" />
              </div>
            )}

            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between bg-slate-950/40 text-xs text-slate-400 gap-2">
              <span>
                Mostrando <strong className="text-white">{filteredTotalCount > 0 ? startIndex + 1 : 0}</strong> a <strong className="text-white">{Math.min(startIndex + itemsPerPage, filteredTotalCount)}</strong> de <strong className="text-white">{filteredTotalCount.toLocaleString()}</strong> atletas filtrados
              </span>
              
              <div className="flex items-center gap-2">
                <span>Exibir por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs font-bold focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4">Atleta</th>
                    <th className="p-4 text-center">OVR</th>
                    <th className="p-4">Posição</th>
                    <th className="p-4">Pos. Alternativas</th>
                    <th className="p-4">Clube</th>
                    <th className="p-4">Liga</th>
                    <th className="p-4">Nacionalidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-white">
                        {player.common_name || `${player.first_name || ''} ${player.last_name || ''}`}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-1 rounded font-black text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          {player.overall_rating}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono font-bold text-[#00b2e3]">
                          {player.position}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono">
                        {player.alternate_positions || '-'}
                      </td>
                      <td className="p-4 text-xs text-slate-300 font-medium">
                        {player.club || '-'}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {player.league || '-'}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {player.nationality || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && players.length === 0 && (
                <div className="p-16 text-center text-slate-500 text-sm space-y-2">
                  <p className="font-bold text-slate-400">Nenhum atleta encontrado com os critérios pesquisados.</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            {!loading && players.length > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>

                <div className="text-xs text-slate-400">
                  Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 flex items-center gap-1"
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}
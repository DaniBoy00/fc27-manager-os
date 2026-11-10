'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Upload, Database, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ImportPage() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função para ler o arquivo CSV selecionado
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFileName(uploadedFile.name);
    setErrorMessage(null);
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Dados do CSV carregados:', results.data.length);
        setFileData(results.data);
        setSuccessCount(null);
      },
      error: (error) => {
        console.error('Erro ao ler CSV:', error);
        setErrorMessage('Erro ao ler o arquivo CSV.');
      }
    });
  };

  // Envio em lotes (batch) direto para a tabela `players` do Supabase
  const handleConfirmImport = async () => {
    if (fileData.length === 0) return;

    setImporting(true);
    setErrorMessage(null);

    try {
      // Mapeia e limpa os dados para bater com as colunas exatas da tabela do Supabase
      const formattedPlayers = fileData.map((row: any) => ({
        player_id: String(row.player_id || ''),
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        common_name: row.common_name || null,
        overall_rating: row.overall_rating ? parseInt(row.overall_rating) : null,
        position: row.position || null,
        alternate_positions: row.alternate_positions || null,
        club: row.club || null,
        league: row.league || null,
        nationality: row.nationality || null,
        gender: row.gender || null,
        preferred_foot: row.preferred_foot || null,
        skill_moves: row.skill_moves ? parseInt(row.skill_moves) : null,
        weak_foot: row.weak_foot ? parseInt(row.weak_foot) : null,
        height_cm: row.height_cm ? parseFloat(row.height_cm) : null,
        weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : null,
        birthdate: row.birthdate || null,
        pace: row.pace ? parseInt(row.pace) : null,
        shooting: row.shooting ? parseInt(row.shooting) : null,
        passing: row.passing ? parseInt(row.passing) : null,
        dribbling: row.dribbling ? parseInt(row.dribbling) : null,
        defending: row.defending ? parseInt(row.defending) : null,
        physicality: row.physicality ? parseInt(row.physicality) : null,
        edition: row.edition || 'fc27'
      }));

      // Divide em blocos de 500 em 500 registros para enviar com segurança máxima
      const batchSize = 500;
      for (let i = 0; i < formattedPlayers.length; i += batchSize) {
        const batch = formattedPlayers.slice(i, i + batchSize);
        
        const { error } = await supabase.from('players').insert(batch);
        
        if (error) {
          throw new Error(error.message);
        }
      }

      setImporting(false);
      setSuccessCount(fileData.length);
    } catch (err: any) {
      console.error('Erro ao salvar no Supabase:', err);
      setErrorMessage(err.message || 'Erro ao sincronizar com o banco de dados.');
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Cabeçalho da Seção */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Database className="w-7 h-7 text-[#00b2e3]" /> Base Mestre de Dados • Supabase Cloud
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Faça o upload do seu CSV oficial do EA FC para salvar os atletas permanentemente na nuvem.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-950/30 border border-red-500/40 p-4 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Área de Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Caixa de selecionar arquivo */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Carregar Arquivo CSV
                </h3>
                
                <label className="border-2 border-dashed border-slate-700 hover:border-[#00b2e3] transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 text-center group">
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-[#00b2e3] mb-3 transition-colors" />
                  <span className="text-sm font-semibold text-slate-200">Clique para selecionar o CSV</span>
                  <span className="text-xs text-slate-500 mt-1">Base Global Completa (18k+ atletas)</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>

                {fileName && (
                  <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-medium truncate">📄 {fileName}</span>
                    <span className="text-slate-400">{fileData.length} registros</span>
                  </div>
                )}
              </div>

              {fileData.length > 0 && successCount === null && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="mt-6 w-full py-3 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 disabled:opacity-50"
                >
                  {importing ? 'Enviando para o Supabase...' : 'Confirmar Importação para Nuvem'}
                </button>
              )}
            </div>

            {/* Prévia dos Dados / Status */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Pré-visualização da Base</h3>

              {successCount !== null ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3" />
                  <h4 className="text-xl font-bold text-white">Importação para a Nuvem Concluída!</h4>
                  <p className="text-sm text-slate-400 mt-1">
                    {successCount} atletas foram salvos com sucesso no seu banco de dados Supabase.
                  </p>
                </div>
              ) : fileData.length > 0 ? (
                <div className="flex-1 overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                        {Object.keys(fileData[0]).slice(0, 5).map((key) => (
                          <th key={key} className="p-3 font-semibold">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-b border-slate-900/50 hover:bg-slate-900/30">
                          {Object.values(row).slice(0, 5).map((val: any, i) => (
                            <td key={i} className="p-3 text-slate-300 truncate max-w-[150px]">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500 p-3 text-center">Mostrando as primeiras 5 linhas de {fileData.length} registros totais prontos para envio.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 border border-slate-800/80 rounded-xl text-slate-500">
                  <AlertTriangle className="w-12 h-12 mb-2 text-slate-600" />
                  <p className="text-sm font-medium">Nenhum arquivo CSV carregado ainda.</p>
                  <p className="text-xs text-slate-600 mt-1">Selecione o seu arquivo CSV do EA FC ao lado para iniciar.</p>
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
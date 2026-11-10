'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        // Criar Novo Usuário
        const { data, error } = await supabase
          .from('users')
          .insert([{ username: username.trim(), password }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') throw new Error('Este nome de usuário já está em uso.');
          throw error;
        }

        // Salva na sessão local e redireciona
        localStorage.setItem('career_user', JSON.stringify(data));
        router.push('/profile');
      } else {
        // Autenticar Usuário
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username.trim())
          .eq('password', password)
          .single();

        if (error || !data) {
          throw new Error('Usuário ou senha incorretos.');
        }

        localStorage.setItem('career_user', JSON.stringify(data));
        router.push('/profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Detalhe estético de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00b2e3]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#00b2e3] to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-[#00b2e3]/20 mb-4">
            <Shield className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">FC 27 Manager OS</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister ? 'Crie seu perfil de Treinador' : 'Acesse suas Carreiras & Saves'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#00b2e3]" /> Nome de Usuário
            </label>
            <input
              type="text"
              required
              placeholder="Ex: TreinadorDani"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00b2e3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#00b2e3]" /> Senha
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00b2e3]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#00b2e3] hover:bg-[#009abf] text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-[#00b2e3]/20 text-xs flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : isRegister ? 'Criar Conta de Treinador' : 'Entrar no Hub de Carreiras'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="text-xs text-slate-400 hover:text-[#00b2e3] transition-colors"
          >
            {isRegister ? 'Já tem um perfil? Faça login' : 'Não tem conta? Cadastre-se agora'}
          </button>
        </div>

      </div>
    </div>
  );
}
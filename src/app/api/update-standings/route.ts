import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ai = new GoogleGenAI();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const careerId = formData.get('career_id') as string;
    const competitionName = formData.get('competition_name') as string;
    const uploadType = formData.get('upload_type') as string; // 'standings' ou 'round'

    // Pega todos os arquivos enviados (até 3)
    const files: File[] = [];
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`image_${i}`) as File;
      if (file) files.push(file);
    }

    if (files.length === 0 || !careerId || !competitionName || !uploadType) {
      return NextResponse.json({ error: 'Faltam dados obrigatórios ou imagens.' }, { status: 400 });
    }

    // Prepara os dados das imagens para o Gemini multimodal
    const imageParts = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageParts.push({
        inlineData: {
          mimeType: file.type || 'image/png',
          data: buffer.toString('base64'),
        },
      });
    }

    let prompt = '';

    if (uploadType === 'standings') {
      prompt = `
        Você é um assistente especialista em análise de dados do EA Sports FC.
        Estas ${files.length} imagem(ns) mostram uma tabela de classificação de campeonato de futebol (pode estar dividida em partes devido à rolagem da tela).
        Consolide todas as imagens, una as informações sem duplicar clubes e extraia a tabela completa de ponta a ponta com os seguintes dados exatos de cada clube:
        - Posição (position)
        - Nome do clube (club_name)
        - Jogos disputados (played)
        - Vitórias (won)
        - Empates (drawn)
        - Derrotas (lost)
        - Gols marcados (goals_for)
        - Gols sofridos (goals_against)
        - Saldo de gols (goal_difference)
        - Pontos (points)

        Retorne APENAS um JSON puro no formato de array, sem blocos de código markdown:
        [
          {
            "position": 1,
            "club_name": "Nome do Clube",
            "played": 0,
            "won": 0,
            "drawn": 0,
            "lost": 0,
            "goals_for": 0,
            "goals_against": 0,
            "goal_difference": 0,
            "points": 0
          }
        ]
      `;
    } else {
      prompt = `
        Você é um assistente especialista em EA Sports FC.
        Estas ${files.length} imagem(ns) mostram os resultados de partidas de uma rodada de campeonato.
        Extraia todos os confrontos disputados com os seguintes dados:
        - Nome do time da casa (home_team)
        - Nome do time de fora (away_team)
        - Gols do time da casa (home_score)
        - Gols do time de fora (away_score)

        Retorne APENAS um JSON puro no formato de array, sem blocos de código markdown:
        [
          {
            "home_team": "Time A",
            "away_team": "Time B",
            "home_score": 2,
            "away_score": 1
          }
        ]
      `;
    }

    // Chama o Gemini com todas as imagens enviadas simultaneamente
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...imageParts, prompt],
    });

    const rawText = response.text;
    if (!rawText) throw new Error('O Gemini não retornou dados.');

    const cleanedJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedJsonText);

    if (uploadType === 'standings') {
      // Atualiza ou insere a classificação no Supabase
      for (const row of parsedData) {
        const { data: existing } = await supabase
          .from('league_standings')
          .select('id')
          .eq('career_id', careerId)
          .eq('competition_name', competitionName)
          .eq('club_name', row.club_name)
          .single();

        if (existing) {
          await supabase.from('league_standings').update({
            position: row.position,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goals_for: row.goals_for,
            goals_against: row.goals_against,
            goal_difference: row.goal_difference,
            points: row.points,
          }).eq('id', existing.id);
        } else {
          await supabase.from('league_standings').insert({
            career_id: careerId,
            competition_name: competitionName,
            club_name: row.club_name,
            position: row.position,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goals_for: row.goals_for,
            goals_against: row.goals_against,
            goal_difference: row.goal_difference,
            points: row.points,
          });
        }
      }
    } else {
      // Salva os resultados das partidas da rodada no Supabase
      for (const match of parsedData) {
        await supabase.from('match_rounds').insert({
          career_id: careerId,
          competition_name: competitionName,
          round_number: 1, // Pode ser ajustado futuramente
          home_team: match.home_team,
          away_team: match.away_team,
          home_score: match.home_score,
          away_score: match.away_score,
          played: true,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Dados processados e salvos com sucesso!' });
  } catch (err: any) {
    console.error('Erro no motor de IA:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar imagens.' }, { status: 500 });
  }
}
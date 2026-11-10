export type Career = {
  id: string;
  name: string;
  club_name: string;
  season: string;
  division: string;
  realism_mode: string;
};

export type Player = {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: string;
  overall: number;
  potential: number;
  market_value: number;
  salary: number;
  contract_until: string;
  morale: string;
  fitness: number;
  squad_status: string;
};

export type Match = {
  id: string;
  opponent: string;
  competition: string;
  venue: 'Casa' | 'Fora';
  score_home?: number;
  score_away?: number;
  status: 'Agendada' | 'Realizada';
};

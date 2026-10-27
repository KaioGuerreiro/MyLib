export interface ItemRanking {
  id: string; // userId
  nome: string;
  xpTotal: number;
  nivelAtual: number;
  ofensivaAtual: number;
  avatarId?: string;
  posicao?: number;
  totalLivrosLidos?: number;
  totalPaginasLidas?: number;
  ultimaLeituraData?: string | null;
  updatedAt?: Date;
}

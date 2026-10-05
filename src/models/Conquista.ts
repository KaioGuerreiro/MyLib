export type CategoriaConquista = 'streak' | 'livros' | 'paginas' | 'geral';

export interface Conquista {
  id?: string;
  usuarioId?: string;
  nome: string;
  descricao: string;
  dataConquista: Date;
  icone?: string;
  categoria?: CategoriaConquista;
  recompensaXp?: number;
  desbloqueada?: boolean;
  progressoAtual?: number;
  progressoAlvo?: number;
}

export type TipoMeta = 'livros_mes' | 'paginas_dia';

export interface Meta {
  id?: string;
  usuarioId: string;
  tipoMeta: TipoMeta;
  valorAlvo: number;
  progressoAtual: number;
  atingida: boolean;
}

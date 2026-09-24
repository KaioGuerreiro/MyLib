export type TipoUnidade = 'paginas' | 'minutos';

export interface SessaoLeitura {
  id?: string;
  usuarioId?: string;
  itemEstanteId: string;
  livroId?: string;
  livroTitulo?: string;
  data: Date;
  quantidade: number;
  tipoUnidade: TipoUnidade;
  xpGanho?: number;
}

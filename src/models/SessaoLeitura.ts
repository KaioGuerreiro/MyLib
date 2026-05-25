export type TipoUnidade = 'paginas' | 'minutos';

export interface SessaoLeitura {
  id?: string;
  itemEstanteId: string;
  data: Date;
  quantidade: number;
  tipoUnidade: TipoUnidade;
}

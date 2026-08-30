import { Livro } from './Livro';

export type StatusLeitura = 'LENDO' | 'LIDO' | 'NA_FILA';

export interface ItemEstante {
  id?: string;
  usuarioId: string;
  livroId: string; // Referência ao ID do Livro (idGoogleBooks ou ID interno)
  status: StatusLeitura;
  progressoPaginas: number;
  dataAdicao: Date;
  livro?: Livro;
}

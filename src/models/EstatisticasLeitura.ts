export interface LeituraDiaria {
  diaSemana: string; // 'Seg', 'Ter', 'Qua', etc.
  data: string; // 'YYYY-MM-DD'
  paginas: number;
  minutos: number;
  xp: number;
}

export interface MetricasLeitura {
  totalPaginasLidas: number;
  totalMinutosLidos: number;
  totalLivrosConcluidos: number;
  totalLivrosLendo: number;
  totalSessoes: number;
  diasLidosNaSemana: number;
  mediaPaginasPorDiaSemana: number;
  diaMaisProdutivo: string;
  leituraSemanal: LeituraDiaria[];
}

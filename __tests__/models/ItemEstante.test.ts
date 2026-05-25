import { ItemEstante, StatusLeitura } from '../../src/models/ItemEstante';

describe('Modelo ItemEstante', () => {
  it('deve permitir a criação de um ItemEstante com status LENDO', () => {
    const item: ItemEstante = {
      usuarioId: 'user_1',
      livroId: 'livro_1',
      status: 'LENDO',
      progressoPaginas: 120,
      dataAdicao: new Date('2026-01-10'),
    };

    expect(item.status).toBe('LENDO');
    expect(item.progressoPaginas).toBe(120);
    expect(item.dataAdicao).toBeInstanceOf(Date);
  });

  it('deve aceitar os três status válidos de leitura', () => {
    const statuses: StatusLeitura[] = ['LENDO', 'LIDO', 'NA_FILA'];

    statuses.forEach((status) => {
      const item: ItemEstante = {
        usuarioId: 'user_1',
        livroId: 'livro_1',
        status,
        progressoPaginas: 0,
        dataAdicao: new Date(),
      };
      expect(item.status).toBe(status);
    });
  });

  it('deve ter progressoPaginas zero para livros na fila', () => {
    const item: ItemEstante = {
      usuarioId: 'user_1',
      livroId: 'livro_2',
      status: 'NA_FILA',
      progressoPaginas: 0,
      dataAdicao: new Date(),
    };

    expect(item.progressoPaginas).toBe(0);
  });
});

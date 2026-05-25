import { Livro } from '../../src/models/Livro';

describe('Modelo Livro', () => {
  it('deve permitir a criação de um objeto Livro válido', () => {
    const livro: Livro = {
      idGoogleBooks: 'abc123',
      titulo: 'Clean Code',
      autor: 'Robert C. Martin',
      totalPaginas: 464,
      urlCapa: 'https://books.google.com/capa.jpg',
    };

    expect(livro.idGoogleBooks).toBe('abc123');
    expect(livro.titulo).toBe('Clean Code');
    expect(livro.autor).toBe('Robert C. Martin');
    expect(livro.totalPaginas).toBeGreaterThan(0);
    expect(livro.urlCapa).toMatch(/^https?:\/\//);
  });

  it('deve aceitar livros com diferentes números de páginas', () => {
    const livroFino: Livro = {
      idGoogleBooks: 'xyz999',
      titulo: 'O Principezinho',
      autor: 'Antoine de Saint-Exupéry',
      totalPaginas: 96,
      urlCapa: 'https://example.com/capa.jpg',
    };

    expect(livroFino.totalPaginas).toBe(96);
  });
});

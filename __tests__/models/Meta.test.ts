import { Meta, TipoMeta } from '../../src/models/Meta';

describe('Modelo Meta', () => {
  it('deve criar uma Meta de livros por mês válida', () => {
    const meta: Meta = {
      usuarioId: 'user_1',
      tipoMeta: 'livros_mes',
      valorAlvo: 4,
      progressoAtual: 1,
      atingida: false,
    };

    expect(meta.tipoMeta).toBe('livros_mes');
    expect(meta.valorAlvo).toBe(4);
    expect(meta.progressoAtual).toBeLessThanOrEqual(meta.valorAlvo);
    expect(meta.atingida).toBe(false);
  });

  it('deve criar uma Meta de páginas por dia válida', () => {
    const meta: Meta = {
      usuarioId: 'user_1',
      tipoMeta: 'paginas_dia',
      valorAlvo: 20,
      progressoAtual: 20,
      atingida: true,
    };

    expect(meta.tipoMeta).toBe('paginas_dia');
    expect(meta.atingida).toBe(true);
    expect(meta.progressoAtual).toBe(meta.valorAlvo);
  });

  it('deve aceitar os dois tipos de meta', () => {
    const tipos: TipoMeta[] = ['livros_mes', 'paginas_dia'];

    tipos.forEach((tipoMeta) => {
      const meta: Meta = {
        usuarioId: 'user_1',
        tipoMeta,
        valorAlvo: 10,
        progressoAtual: 0,
        atingida: false,
      };
      expect(meta.tipoMeta).toBe(tipoMeta);
    });
  });

  it('deve ter o campo id como opcional', () => {
    const semId: Meta = {
      usuarioId: 'user_1',
      tipoMeta: 'paginas_dia',
      valorAlvo: 30,
      progressoAtual: 0,
      atingida: false,
    };

    expect(semId.id).toBeUndefined();
  });

  it('deve suportar campos opcionais dataCriacao e periodo', () => {
    const data = new Date('2026-10-01');
    const meta: Meta = {
      id: 'meta_1',
      usuarioId: 'user_1',
      tipoMeta: 'livros_mes',
      valorAlvo: 5,
      progressoAtual: 2,
      atingida: false,
      dataCriacao: data,
      periodo: '2026-10',
    };

    expect(meta.dataCriacao).toBe(data);
    expect(meta.periodo).toBe('2026-10');
  });
});

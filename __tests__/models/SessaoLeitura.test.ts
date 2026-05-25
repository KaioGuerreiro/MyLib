import { SessaoLeitura, TipoUnidade } from '../../src/models/SessaoLeitura';

describe('Modelo SessaoLeitura', () => {
  it('deve criar uma sessão de leitura em páginas válida', () => {
    const sessao: SessaoLeitura = {
      itemEstanteId: 'item_1',
      data: new Date('2026-05-24'),
      quantidade: 30,
      tipoUnidade: 'paginas',
    };

    expect(sessao.itemEstanteId).toBe('item_1');
    expect(sessao.quantidade).toBe(30);
    expect(sessao.tipoUnidade).toBe('paginas');
    expect(sessao.data).toBeInstanceOf(Date);
  });

  it('deve criar uma sessão de leitura em minutos válida', () => {
    const sessao: SessaoLeitura = {
      itemEstanteId: 'item_2',
      data: new Date(),
      quantidade: 45,
      tipoUnidade: 'minutos',
    };

    expect(sessao.tipoUnidade).toBe('minutos');
    expect(sessao.quantidade).toBeGreaterThan(0);
  });

  it('deve aceitar os dois tipos de unidade', () => {
    const unidades: TipoUnidade[] = ['paginas', 'minutos'];

    unidades.forEach((tipoUnidade) => {
      const sessao: SessaoLeitura = {
        itemEstanteId: 'item_1',
        data: new Date(),
        quantidade: 10,
        tipoUnidade,
      };
      expect(sessao.tipoUnidade).toBe(tipoUnidade);
    });
  });
});

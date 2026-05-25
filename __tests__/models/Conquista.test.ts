import { Conquista } from '../../src/models/Conquista';

describe('Modelo Conquista', () => {
  it('deve criar uma Conquista válida', () => {
    const conquista: Conquista = {
      usuarioId: 'user_1',
      nome: 'Leitor Ávido',
      descricao: 'Leu 10 livros',
      dataConquista: new Date('2026-03-15'),
    };

    expect(conquista.nome).toBe('Leitor Ávido');
    expect(conquista.descricao).toBe('Leu 10 livros');
    expect(conquista.usuarioId).toBe('user_1');
    expect(conquista.dataConquista).toBeInstanceOf(Date);
  });

  it('deve ter o campo id como opcional', () => {
    const semId: Conquista = {
      usuarioId: 'user_2',
      nome: 'Maratonista',
      descricao: 'Manteve ofensiva por 30 dias',
      dataConquista: new Date(),
    };

    expect(semId.id).toBeUndefined();

    const comId: Conquista = {
      id: 'conquista_99',
      usuarioId: 'user_2',
      nome: 'Maratonista',
      descricao: 'Manteve ofensiva por 30 dias',
      dataConquista: new Date(),
    };

    expect(comId.id).toBe('conquista_99');
  });
});

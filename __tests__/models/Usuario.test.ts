import { Usuario } from '../../src/models/Usuario';

describe('Modelo Usuario', () => {
  it('deve permitir a criação de um objeto Usuario válido', () => {
    const usuario: Usuario = {
      id: '123',
      nome: 'João Amancio',
      email: 'joao@teste.com',
      xpTotal: 1500,
      nivelAtual: 5,
      ofensivaAtual: 10,
    };

    expect(usuario.id).toBe('123');
    expect(usuario.nome).toBe('João Amancio');
    expect(usuario.xpTotal).toBeGreaterThanOrEqual(0);
    expect(usuario.nivelAtual).toBe(5);
  });
});

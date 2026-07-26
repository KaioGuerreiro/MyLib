import { isValidEmail, validatePasswordCriteria } from '../../src/utils/validation';

describe('Validation Helpers', () => {
  describe('isValidEmail', () => {
    it('deve retornar true para e-mails válidos', () => {
      expect(isValidEmail('usuario@exemplo.com')).toBe(true);
      expect(isValidEmail('kaio.guerreiro@unigran.br')).toBe(true);
    });

    it('deve retornar false para e-mails inválidos', () => {
      expect(isValidEmail('emailinvalido')).toBe(false);
      expect(isValidEmail('usuario@com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('validatePasswordCriteria', () => {
    it('deve validar quando todos os 5 critérios forem atendidos (8+ chars, maiúscula, minúscula, número e símbolo)', () => {
      const res = validatePasswordCriteria('Senha123!');
      expect(res.hasMinLength).toBe(true);
      expect(res.hasUppercase).toBe(true);
      expect(res.hasLowercase).toBe(true);
      expect(res.hasNumber).toBe(true);
      expect(res.hasSpecialChar).toBe(true);
      expect(res.isValid).toBe(true);
    });

    it('deve reprovar senhas com menos de 8 caracteres', () => {
      const res = validatePasswordCriteria('S1!a');
      expect(res.hasMinLength).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('deve reprovar senhas sem letra maiúscula', () => {
      const res = validatePasswordCriteria('senha123!');
      expect(res.hasUppercase).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('deve reprovar senhas sem letra minúscula', () => {
      const res = validatePasswordCriteria('SENHA123!');
      expect(res.hasLowercase).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('deve reprovar senhas sem número', () => {
      const res = validatePasswordCriteria('SenhaExemplo!');
      expect(res.hasNumber).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('deve reprovar senhas sem caractere especial', () => {
      const res = validatePasswordCriteria('Senha1234');
      expect(res.hasSpecialChar).toBe(false);
      expect(res.isValid).toBe(false);
    });
  });
});

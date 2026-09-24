import {
  formatarDataParaString,
  calcularDiferencaDias,
  calcularNovaOfensiva,
  obterOfensivaAtualizada,
  calcularXpSessao,
  calcularNivel,
  calcularProgressoNivel,
  xpNecessarioParaNivel,
  XP_CONFIG,
} from '../../src/utils/gamification';

describe('Gamificação — Utilitários de Regras de Negócio', () => {
  describe('Manipulação de Datas e Diferença de Dias', () => {
    it('deve formatar data para formato YYYY-MM-DD', () => {
      const data = new Date(2026, 4, 25); // 25 de Maio de 2026
      expect(formatarDataParaString(data)).toBe('2026-05-25');
    });

    it('deve calcular corretamente a diferença em dias entre duas datas', () => {
      expect(calcularDiferencaDias('2026-05-20', '2026-05-20')).toBe(0);
      expect(calcularDiferencaDias('2026-05-20', '2026-05-21')).toBe(1);
      expect(calcularDiferencaDias('2026-05-20', '2026-05-25')).toBe(5);
      expect(calcularDiferencaDias('2026-05-31', '2026-06-01')).toBe(1);
    });
  });

  describe('[RF004] Manter Ofensiva (Streak)', () => {
    const hoje = new Date(2026, 4, 25); // 2026-05-25

    it('deve iniciar a ofensiva em 1 se for a primeira leitura do usuário', () => {
      const resultado = calcularNovaOfensiva(null, 0, hoje);
      expect(resultado.novaOfensiva).toBe(1);
      expect(resultado.jaLeuHoje).toBe(false);
      expect(resultado.streakIncrementado).toBe(true);
      expect(resultado.streakResetado).toBe(false);
    });

    it('não deve incrementar a ofensiva se o usuário já leu hoje', () => {
      const resultado = calcularNovaOfensiva('2026-05-25', 5, hoje);
      expect(resultado.novaOfensiva).toBe(5);
      expect(resultado.jaLeuHoje).toBe(true);
      expect(resultado.streakIncrementado).toBe(false);
      expect(resultado.streakResetado).toBe(false);
    });

    it('deve incrementar a ofensiva em 1 se o usuário leu ontem consecutivamente', () => {
      const resultado = calcularNovaOfensiva('2026-05-24', 3, hoje);
      expect(resultado.novaOfensiva).toBe(4);
      expect(resultado.jaLeuHoje).toBe(false);
      expect(resultado.streakIncrementado).toBe(true);
      expect(resultado.streakMantido).toBe(true);
      expect(resultado.streakResetado).toBe(false);
    });

    it('deve resetar a ofensiva para 1 se ficou 2 ou mais dias sem ler', () => {
      const resultado = calcularNovaOfensiva('2026-05-23', 10, hoje); // 2 dias de diferença
      expect(resultado.novaOfensiva).toBe(1);
      expect(resultado.jaLeuHoje).toBe(false);
      expect(resultado.streakResetado).toBe(true);
      expect(resultado.streakIncrementado).toBe(true);
    });

    it('obterOfensivaAtualizada deve retornar 0 se a ofensiva expirou', () => {
      // Leu hoje: continua ativa
      expect(obterOfensivaAtualizada('2026-05-25', 5, hoje)).toBe(5);
      // Leu ontem: ainda pode ler hoje para manter
      expect(obterOfensivaAtualizada('2026-05-24', 5, hoje)).toBe(5);
      // Leu anteontem: expirou à meia-noite
      expect(obterOfensivaAtualizada('2026-05-23', 5, hoje)).toBe(0);
      // Sem data de leitura
      expect(obterOfensivaAtualizada(null, 0, hoje)).toBe(0);
    });
  });

  describe('[RF005] Atribuição de XP', () => {
    it('deve calcular XP base por páginas lidas (5 XP por página)', () => {
      const resultado = calcularXpSessao({
        quantidade: 10,
        tipoUnidade: 'paginas',
        streakAtual: 0,
      });

      expect(resultado.xpBase).toBe(50);
      expect(resultado.bonusStreak).toBe(0);
      expect(resultado.bonusDiario).toBe(0);
      expect(resultado.bonusConclusao).toBe(0);
      expect(resultado.xpTotal).toBe(50);
    });

    it('deve calcular XP base por minutos lidos (3 XP por minuto)', () => {
      const resultado = calcularXpSessao({
        quantidade: 20,
        tipoUnidade: 'minutos',
        streakAtual: 0,
      });

      expect(resultado.xpBase).toBe(60);
      expect(resultado.xpTotal).toBe(60);
    });

    it('deve retornar 0 XP se a quantidade for 0 ou negativa', () => {
      const resultado = calcularXpSessao({
        quantidade: 0,
        tipoUnidade: 'paginas',
      });
      expect(resultado.xpTotal).toBe(0);
    });

    it('deve aplicar bônus de constância (streak) até o teto de 50%', () => {
      // 4 dias de streak = +20%
      const resultado4Dias = calcularXpSessao({
        quantidade: 20, // 100 XP base
        tipoUnidade: 'paginas',
        streakAtual: 4,
      });
      expect(resultado4Dias.xpBase).toBe(100);
      expect(resultado4Dias.bonusStreak).toBe(20); // 100 * 0.20
      expect(resultado4Dias.xpTotal).toBe(120);

      // 15 dias de streak = capped em 50%
      const resultado15Dias = calcularXpSessao({
        quantidade: 20, // 100 XP base
        tipoUnidade: 'paginas',
        streakAtual: 15,
      });
      expect(resultado15Dias.bonusStreak).toBe(50); // 100 * 0.50
      expect(resultado15Dias.xpTotal).toBe(150);
    });

    it('deve aplicar bônus de primeira leitura do dia (+20 XP)', () => {
      const resultado = calcularXpSessao({
        quantidade: 10, // 50 XP
        tipoUnidade: 'paginas',
        isFirstSessionOfDay: true,
      });

      expect(resultado.bonusDiario).toBe(XP_CONFIG.BONUS_PRIMEIRA_LEITURA_DIA);
      expect(resultado.xpTotal).toBe(50 + 20);
    });

    it('deve aplicar bônus de conclusão de livro (+100 XP)', () => {
      const resultado = calcularXpSessao({
        quantidade: 10,
        tipoUnidade: 'paginas',
        concluiuLivro: true,
      });

      expect(resultado.bonusConclusao).toBe(XP_CONFIG.BONUS_CONCLUSAO_LIVRO);
      expect(resultado.xpTotal).toBe(50 + 100);
    });

    it('deve combinar todos os bônus acumulados corretamente', () => {
      const resultado = calcularXpSessao({
        quantidade: 20, // 100 XP base
        tipoUnidade: 'paginas',
        streakAtual: 10, // +50% = 50 XP
        isFirstSessionOfDay: true, // +20 XP
        concluiuLivro: true, // +100 XP
      });

      expect(resultado.xpBase).toBe(100);
      expect(resultado.bonusStreak).toBe(50);
      expect(resultado.bonusDiario).toBe(20);
      expect(resultado.bonusConclusao).toBe(100);
      expect(resultado.xpTotal).toBe(270);
    });
  });

  describe('[RF006] Evolução de Nível', () => {
    it('deve calcular os marcos de XP para cada nível', () => {
      expect(xpNecessarioParaNivel(1)).toBe(0);
      expect(xpNecessarioParaNivel(2)).toBe(100);
      expect(xpNecessarioParaNivel(3)).toBe(300);
      expect(xpNecessarioParaNivel(4)).toBe(600);
      expect(xpNecessarioParaNivel(5)).toBe(1000);
    });

    it('deve calcular o nível correto a partir do XP acumulado', () => {
      expect(calcularNivel(0)).toBe(1);
      expect(calcularNivel(50)).toBe(1);
      expect(calcularNivel(99)).toBe(1);
      expect(calcularNivel(100)).toBe(2);
      expect(calcularNivel(299)).toBe(2);
      expect(calcularNivel(300)).toBe(3);
      expect(calcularNivel(599)).toBe(3);
      expect(calcularNivel(600)).toBe(4);
      expect(calcularNivel(1000)).toBe(5);
    });

    it('deve calcular o progresso detalhado dentro do nível', () => {
      // 50 XP está no nível 1 (0 a 100 XP) -> 50%
      const progresso50 = calcularProgressoNivel(50);
      expect(progresso50.nivel).toBe(1);
      expect(progresso50.xpAtualNoNivel).toBe(50);
      expect(progresso50.xpParaProximoNivel).toBe(100);
      expect(progresso50.xpRestante).toBe(50);
      expect(progresso50.percentual).toBe(50);
      expect(progresso50.tituloNivel).toBe('Novato das Letras');

      // 200 XP está no nível 2 (100 a 300 XP) -> 100 XP acumulados no nível / 200 necessários = 50%
      const progresso200 = calcularProgressoNivel(200);
      expect(progresso200.nivel).toBe(2);
      expect(progresso200.xpAtualNoNivel).toBe(100);
      expect(progresso200.xpParaProximoNivel).toBe(200);
      expect(progresso200.xpRestante).toBe(100);
      expect(progresso200.percentual).toBe(50);
      expect(progresso200.tituloNivel).toBe('Leitor Curioso');
    });
  });
});

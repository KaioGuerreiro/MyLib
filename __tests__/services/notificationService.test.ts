jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/config/firebase', () => ({
  db: { type: 'firestore' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification_id_123')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
  },
  AndroidImportance: {
    HIGH: 4,
  },
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
  doc: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'TIMESTAMP_MOCK'),
}));

import {
  gerarMensagemLembrete,
  calcularAgendaLembretes,
  agendarLembreteDiario,
  cancelarLembreteDiario,
  obterConfiguracaoLembrete,
  salvarConfiguracaoLembrete,
  CONFIGURACAO_LEMBRETE_PADRAO,
  DIAS_AGENDADOS,
} from '../../src/services/notificationService';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('notificationService (Lembretes Diários via Push Notification)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('gerarMensagemLembrete', () => {
    it('deve gerar mensagem especial de preservação de chama para ofensiva >= 7', () => {
      const msg = gerarMensagemLembrete(7);
      expect(msg.titulo).toContain('Ofensiva Lendária de 7 dias!');
      expect(msg.corpo).toContain('chama');
    });

    it('deve gerar mensagem com contagem de dias para ofensiva entre 1 e 6', () => {
      const msg = gerarMensagemLembrete(3);
      expect(msg.titulo).toContain('3 dias');
    });

    it('deve gerar mensagem padrão de estímulo para ofensiva zerada', () => {
      const msg = gerarMensagemLembrete(0);
      expect(msg.titulo).toContain('Hora de Ler no MyLib!');
      expect(msg.corpo).toContain('comece sua ofensiva');
    });
  });

  describe('calcularAgendaLembretes', () => {
    it('deve agendar a partir de amanhã se o horário de hoje já passou', () => {
      const agora = new Date(2026, 9, 5, 21, 0, 0); // 21:00
      const agenda = calcularAgendaLembretes(20, 0, {}, agora); // meta 20:00

      expect(agenda.length).toBe(DIAS_AGENDADOS);
      expect(agenda[0].data.getDate()).toBe(6);
    });

    it('deve agendar a partir de amanhã se o usuário já leu hoje', () => {
      const agora = new Date(2026, 9, 5, 14, 0, 0); // 14:00
      const agenda = calcularAgendaLembretes(
        20,
        0,
        { ofensivaAtual: 3, ultimaLeituraData: '2026-10-05' },
        agora
      );

      expect(agenda.length).toBe(DIAS_AGENDADOS);
      expect(agenda[0].data.getDate()).toBe(6);
      expect(agenda[0].titulo).toContain('3 dias');
    });

    it('deve agendar para hoje se o horário ainda não passou e o usuário ainda não leu hoje', () => {
      const agora = new Date(2026, 9, 5, 14, 0, 0); // 14:00
      const agenda = calcularAgendaLembretes(
        20,
        0,
        { ofensivaAtual: 2, ultimaLeituraData: '2026-10-04' },
        agora
      );

      expect(agenda.length).toBe(DIAS_AGENDADOS);
      expect(agenda[0].data.getDate()).toBe(5);
      expect(agenda[0].titulo).toContain('2 dias');
    });
  });

  describe('agendarLembreteDiario', () => {
    it('deve agendar notificações para os próximos dias com DATE trigger', async () => {
      const resultado = await agendarLembreteDiario(20, 30, { ofensivaAtual: 5 });

      expect(resultado).toBe('agendado');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(DIAS_AGENDADOS);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'mylib_daily_reading_reminder_0',
          trigger: expect.objectContaining({
            channelId: 'reading-reminders',
          }),
        })
      );
    });

    it('deve retornar sem_permissao se o usuário negar permissão', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const resultado = await agendarLembreteDiario(20, 30);
      expect(resultado).toBe('sem_permissao');
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('cancelarLembreteDiario', () => {
    it('deve cancelar todos os slots de notificação agendados', async () => {
      await cancelarLembreteDiario();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(
        DIAS_AGENDADOS + 1
      );
    });
  });

  describe('obter e salvar configurações de lembrete', () => {
    it('deve retornar a configuração padrão quando não há nada salvo', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const config = await obterConfiguracaoLembrete('user_123');
      expect(config).toEqual(CONFIGURACAO_LEMBRETE_PADRAO);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        '@MyLib:reminder_settings:user_123'
      );
    });

    it('deve salvar e agendar quando o lembrete estiver ativo e permitido', async () => {
      const config = { ativo: true, hora: 21, minuto: 15 };
      const resultado = await salvarConfiguracaoLembrete(config, 'user_123', {
        ofensivaAtual: 4,
      });

      expect(resultado).toBe('agendado');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@MyLib:reminder_settings:user_123',
        JSON.stringify(config)
      );
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('deve cancelar o agendamento quando o lembrete for desativado', async () => {
      const config = { ativo: false, hora: 20, minuto: 0 };
      const resultado = await salvarConfiguracaoLembrete(config, 'user_123');

      expect(resultado).toBe('cancelado');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
    });

    it('deve salvar ativo=false e retornar sem_permissao quando a permissao for negada', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const config = { ativo: true, hora: 20, minuto: 0 };
      const resultado = await salvarConfiguracaoLembrete(config, 'user_123');

      expect(resultado).toBe('sem_permissao');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@MyLib:reminder_settings:user_123',
        JSON.stringify({ ...config, ativo: false })
      );
    });
  });
});

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatarDataParaString, calcularDiferencaDias } from '../utils/gamification';

const NOTIFICATION_STORAGE_KEY = '@MyLib:reminder_settings';
const ANDROID_CHANNEL_ID = 'reading-reminders';
export const DAILY_REMINDER_NOTIFICATION_ID = 'mylib_daily_reading_reminder';

/**
 * Quantidade de dias à frente que ficam agendados. O app reagenda sempre que a
 * ofensiva muda (ex.: ao registrar uma sessão ou abrir a tela inicial), então a
 * janela é renovada continuamente enquanto o usuário usa o app.
 */
export const DIAS_AGENDADOS = 7;

export interface ConfiguracaoLembrete {
  ativo: boolean;
  hora: number;
  minuto: number;
}

export interface ContextoLembrete {
  ofensivaAtual?: number;
  ultimaLeituraData?: string | null;
}

export type ResultadoLembrete = 'agendado' | 'cancelado' | 'sem_permissao' | 'erro';

export const CONFIGURACAO_LEMBRETE_PADRAO: ConfiguracaoLembrete = {
  ativo: false,
  hora: 20, // 20:00 padrão
  minuto: 0,
};

export function idLembrete(indiceDia: number): string {
  return `${DAILY_REMINDER_NOTIFICATION_ID}_${indiceDia}`;
}

function chaveConfiguracao(usuarioId?: string): string {
  return usuarioId ? `${NOTIFICATION_STORAGE_KEY}:${usuarioId}` : NOTIFICATION_STORAGE_KEY;
}

// Configurar o comportamento de recebimento de notificações quando o app estiver em primeiro plano
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Ignora erros em ambientes não-nativos/testes
}

/**
 * Solicita permissões de notificação ao usuário caso ainda não concedidas.
 */
export async function solicitarPermissaoNotificacoes(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Lembretes de Leitura',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C5CE7',
      });
    }

    return true;
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificações:', err);
    return false;
  }
}

/**
 * Retorna as mensagens motivacionais de lembrete diário considerando a ofensiva
 * que o usuário terá no dia do disparo (0 = ofensiva inexistente ou já quebrada).
 */
export function gerarMensagemLembrete(ofensivaAtual: number = 0): {
  titulo: string;
  corpo: string;
} {
  if (ofensivaAtual >= 7) {
    return {
      titulo: `🔥 Ofensiva Lendária de ${ofensivaAtual} dias!`,
      corpo: 'Não deixe sua chama se apagar. Dedique alguns minutos para ler seu livro hoje!',
    };
  } else if (ofensivaAtual > 0) {
    return {
      titulo: `🔥 Mantenha sua ofensiva de ${ofensivaAtual} ${ofensivaAtual === 1 ? 'dia' : 'dias'}!`,
      corpo: 'Hora do seu hábito de leitura diário. Vamos avançar mais algumas páginas hoje no MyLib?',
    };
  }

  return {
    titulo: '📖 Hora de Ler no MyLib!',
    corpo: 'Crie seu momento de paz e conhecimento. Abra seu livro e comece sua ofensiva hoje!',
  };
}

export interface LembreteAgendado {
  data: Date;
  titulo: string;
  corpo: string;
}

/**
 * Calcula (sem efeitos colaterais) os próximos lembretes a agendar.
 *
 * Regras:
 * - Se o horário de hoje já passou, ou o usuário já leu hoje, o primeiro lembrete é amanhã.
 * - A mensagem com contagem de ofensiva só é usada no dia em que a ofensiva ainda
 *   está viva (dia seguinte à última leitura). Nos dias posteriores, se o usuário não
 *   tiver voltado ao app, a ofensiva já terá zerado e a mensagem é a genérica.
 */
export function calcularAgendaLembretes(
  hora: number,
  minuto: number,
  contexto: ContextoLembrete = {},
  agora: Date = new Date()
): LembreteAgendado[] {
  const { ofensivaAtual = 0, ultimaLeituraData = null } = contexto;
  const leuHoje = ultimaLeituraData === formatarDataParaString(agora);

  const primeiro = new Date(agora);
  primeiro.setHours(hora, minuto, 0, 0);
  if (primeiro.getTime() <= agora.getTime() || leuHoje) {
    primeiro.setDate(primeiro.getDate() + 1);
  }

  const agenda: LembreteAgendado[] = [];
  for (let i = 0; i < DIAS_AGENDADOS; i++) {
    const data = new Date(primeiro);
    data.setDate(primeiro.getDate() + i);

    const streakVivo =
      ofensivaAtual > 0 &&
      !!ultimaLeituraData &&
      calcularDiferencaDias(ultimaLeituraData, formatarDataParaString(data)) === 1;

    const { titulo, corpo } = gerarMensagemLembrete(streakVivo ? ofensivaAtual : 0);
    agenda.push({ data, titulo, corpo });
  }

  return agenda;
}

/**
 * Cancela todos os lembretes diários agendados (incluindo o formato legado repetitivo).
 */
export async function cancelarLembreteDiario(): Promise<void> {
  const ids = [
    DAILY_REMINDER_NOTIFICATION_ID,
    ...Array.from({ length: DIAS_AGENDADOS }, (_, i) => idLembrete(i)),
  ];
  try {
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (err) {
    console.warn('Erro ao cancelar lembrete diário:', err);
  }
}

/**
 * Agenda os lembretes de leitura dos próximos dias no dispositivo.
 */
export async function agendarLembreteDiario(
  hora: number,
  minuto: number,
  contexto: ContextoLembrete = {},
  agora: Date = new Date()
): Promise<ResultadoLembrete> {
  try {
    // 1. Cancelar lembretes anteriores para evitar duplicidade
    await cancelarLembreteDiario();

    // 2. Verificar/solicitar permissão
    const permitiu = await solicitarPermissaoNotificacoes();
    if (!permitiu) {
      return 'sem_permissao';
    }

    // 3. Agendar um lembrete por dia, cada um com a mensagem adequada àquele dia
    const agenda = calcularAgendaLembretes(hora, minuto, contexto, agora);
    await Promise.all(
      agenda.map((item, i) =>
        Notifications.scheduleNotificationAsync({
          identifier: idLembrete(i),
          content: {
            title: item.titulo,
            body: item.corpo,
            sound: true,
            data: { screen: 'HomeScreen' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: item.data,
            channelId: ANDROID_CHANNEL_ID,
          },
        })
      )
    );

    return 'agendado';
  } catch (err) {
    console.warn('Erro ao agendar lembrete diário:', err);
    return 'erro';
  }
}

/**
 * Obtém a configuração de lembretes do usuário salva no dispositivo.
 */
export async function obterConfiguracaoLembrete(
  usuarioId?: string
): Promise<ConfiguracaoLembrete> {
  try {
    const raw = await AsyncStorage.getItem(chaveConfiguracao(usuarioId));
    if (!raw) return CONFIGURACAO_LEMBRETE_PADRAO;
    return { ...CONFIGURACAO_LEMBRETE_PADRAO, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Erro ao obter configuração de lembretes:', err);
    return CONFIGURACAO_LEMBRETE_PADRAO;
  }
}

/**
 * Salva a preferência de lembrete (por usuário) e agenda/cancela as notificações.
 *
 * Se o usuário pedir para ativar mas a permissão for negada (ou o agendamento falhar),
 * a configuração é persistida como **inativa**, para que a UI reflita o estado real.
 */
export async function salvarConfiguracaoLembrete(
  config: ConfiguracaoLembrete,
  usuarioId?: string,
  contexto: ContextoLembrete = {}
): Promise<ResultadoLembrete> {
  let resultado: ResultadoLembrete;
  let configEfetiva = config;

  if (config.ativo) {
    resultado = await agendarLembreteDiario(config.hora, config.minuto, contexto);
    if (resultado !== 'agendado') {
      configEfetiva = { ...config, ativo: false };
    }
  } else {
    await cancelarLembreteDiario();
    resultado = 'cancelado';
  }

  try {
    await AsyncStorage.setItem(chaveConfiguracao(usuarioId), JSON.stringify(configEfetiva));
  } catch (err) {
    console.warn('Erro ao salvar configuração de lembrete localmente:', err);
    return 'erro';
  }

  // Sincronização com o perfil é secundária: falhas não invalidam o agendamento local
  if (usuarioId) {
    try {
      await updateDoc(doc(db, 'usuarios', usuarioId), {
        lembreteLeitura: configEfetiva,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Erro ao sincronizar configuração de lembrete no Firestore:', err);
    }
  }

  return resultado;
}

/**
 * Renova os lembretes agendados com o estado atual da ofensiva. Se o usuário atual
 * não tiver lembrete ativo, cancela quaisquer notificações remanescentes no aparelho
 * (ex.: deixadas por outra conta que usou o mesmo dispositivo).
 */
export async function reagendarLembreteSeAtivo(
  usuarioId: string,
  contexto: ContextoLembrete = {}
): Promise<void> {
  if (!usuarioId || Platform.OS === 'web') return;

  const config = await obterConfiguracaoLembrete(usuarioId);
  if (config.ativo) {
    await agendarLembreteDiario(config.hora, config.minuto, contexto);
  } else {
    await cancelarLembreteDiario();
  }
}

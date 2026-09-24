import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ItemEstanteCompleto } from '../services/bookshelfService';
import { Usuario } from '../models/Usuario';
import {
  registrarSessaoLeitura,
  ResumoSessaoRegistrada,
} from '../services/readingSessionService';
import { TipoUnidade } from '../models/SessaoLeitura';
import {
  calcularXpSessao,
  calcularProgressoNivel,
  formatarDataParaString,
} from '../utils/gamification';

interface ReadingSessionModalProps {
  visible: boolean;
  book: ItemEstanteCompleto | null;
  user: Usuario | null;
  onClose: () => void;
  onSessionComplete?: (resumo: ResumoSessaoRegistrada) => void;
}

export default function ReadingSessionModal({
  visible,
  book,
  user,
  onClose,
  onSessionComplete,
}: ReadingSessionModalProps) {
  const { theme } = useTheme();

  const [mode, setMode] = useState<TipoUnidade>('paginas');
  const [pageInputMode, setPageInputMode] = useState<'lidas' | 'pagina_atual'>('lidas');
  const [inputValue, setInputValue] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerPagesRead, setTimerPagesRead] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resumoSuccess, setResumoSuccess] = useState<ResumoSessaoRegistrada | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset de estado quando o modal abre ou fecha
  useEffect(() => {
    if (visible) {
      setMode('paginas');
      setPageInputMode('lidas');
      setInputValue('');
      setTimerSeconds(0);
      setIsTimerRunning(false);
      setTimerPagesRead('');
      setSaving(false);
      setErrorMsg(null);
      setResumoSuccess(null);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [visible, book]);

  // Controle do Cronômetro
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning]);

  const progressoAtual = book?.progressoPaginas || 0;
  const totalPaginas = book?.livro?.totalPaginas || 1;

  // Cálculo da quantidade efetiva baseada no modo selecionado
  const quantidadeCalculada = useMemo(() => {
    if (mode === 'paginas') {
      const num = parseInt(inputValue.trim(), 10);
      if (isNaN(num) || num <= 0) return 0;
      if (pageInputMode === 'lidas') {
        return num;
      } else {
        return Math.max(0, num - progressoAtual);
      }
    } else {
      return Math.floor(timerSeconds / 60);
    }
  }, [mode, pageInputMode, inputValue, timerSeconds, progressoAtual]);

  // Estimativa em tempo real de XP
  const xpEstimado = useMemo(() => {
    if (quantidadeCalculada <= 0 || !user) return 0;

    const hojeStr = formatarDataParaString(new Date());
    const isFirstSessionOfDay = user.ultimaLeituraData !== hojeStr;

    let paginasAvancadas = 0;
    if (mode === 'paginas') {
      paginasAvancadas = quantidadeCalculada;
    } else {
      const paginasCronometro = parseInt(timerPagesRead.trim(), 10);
      paginasAvancadas = isNaN(paginasCronometro) ? 0 : Math.max(0, paginasCronometro);
    }

    const concluiu =
      totalPaginas > 0 &&
      progressoAtual + paginasAvancadas >= totalPaginas &&
      progressoAtual < totalPaginas;

    const calculo = calcularXpSessao({
      quantidade: quantidadeCalculada,
      tipoUnidade: mode,
      streakAtual: user.ofensivaAtual || 0,
      isFirstSessionOfDay,
      concluiuLivro: concluiu,
    });

    return calculo.xpTotal;
  }, [quantidadeCalculada, mode, user, timerPagesRead, progressoAtual, totalPaginas]);

  // Formatação do tempo do cronômetro (MM:SS ou HH:MM:SS)
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleToggleTimer = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsTimerRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleQuickAddPages = (qty: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const current = parseInt(inputValue.trim(), 10) || 0;
    setInputValue(String(current + qty));
  };

  const handleSwitchToPages = () => {
    Keyboard.dismiss();
    setMode('paginas');
  };

  const handleSwitchToTimer = () => {
    Keyboard.dismiss();
    setMode('minutos');
  };

  const handleSubmitSession = async () => {
    if (!book || !user) return;
    setErrorMsg(null);

    // Validações
    if (mode === 'paginas') {
      if (quantidadeCalculada <= 0) {
        setErrorMsg(
          pageInputMode === 'pagina_atual'
            ? `A página alcançada deve ser maior que seu progresso atual (${progressoAtual} pág.).`
            : 'Informe uma quantidade de páginas lidas maior que zero.'
        );
        return;
      }

      if (pageInputMode === 'pagina_atual') {
        const pagAtual = parseInt(inputValue.trim(), 10);
        if (pagAtual > totalPaginas) {
          setErrorMsg(`A página informada excede o total do livro (${totalPaginas} pág.).`);
          return;
        }
      } else {
        if (totalPaginas > 1 && progressoAtual + quantidadeCalculada > totalPaginas) {
          const restantes = Math.max(0, totalPaginas - progressoAtual);
          setErrorMsg(
            restantes === 0
              ? 'Você já concluiu a leitura de todas as páginas deste livro.'
              : `A quantidade informada (${quantidadeCalculada} pág.) excede o restante do livro. Faltam apenas ${restantes} páginas.`
          );
          return;
        }
      }
    } else {
      if (timerSeconds < 60) {
        setErrorMsg('O tempo de leitura deve ser de pelo menos 1 minuto para registrar a sessão.');
        return;
      }
    }

    setSaving(true);

    try {
      let paginasLidasAdicionais = 0;
      if (mode === 'minutos') {
        const paginas = parseInt(timerPagesRead.trim(), 10);
        if (!isNaN(paginas) && paginas > 0) {
          paginasLidasAdicionais = paginas;
        }
      }

      const resumo = await registrarSessaoLeitura({
        usuarioId: user.id,
        itemEstanteId: book.id || '',
        livroId: book.livro.idGoogleBooks,
        livroTitulo: book.livro.titulo,
        totalPaginasLivro: totalPaginas,
        progressoAtualLivro: progressoAtual,
        quantidade: quantidadeCalculada,
        tipoUnidade: mode,
        paginasLidasAdicionais,
        usuarioAtual: {
          xpTotal: user.xpTotal || 0,
          nivelAtual: user.nivelAtual || 1,
          ofensivaAtual: user.ofensivaAtual || 0,
          ultimaLeituraData: user.ultimaLeituraData || null,
        },
      });

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setResumoSuccess(resumo);
      if (onSessionComplete) {
        onSessionComplete(resumo);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível registrar a sessão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishAndClose = () => {
    onClose();
  };

  if (!visible || !book) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.avoidingView}
          >
            <View style={[styles.sheetContainer, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
              {/* Barra superior de arrasto / indicador visual */}
              <View style={styles.grabberContainer}>
                <View style={[styles.grabber, { backgroundColor: theme.cardBorder }]} />
              </View>

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* TELA DE RECOMPENSA / SUCESSO */}
                {resumoSuccess ? (
                  <View style={styles.centerContainer}>
                    {/* Ícone com celebração */}
                    <View
                      style={[
                        styles.celebrationIconContainer,
                        {
                          backgroundColor: `${theme.streak}25`,
                          borderColor: `${theme.streak}50`,
                        },
                      ]}
                    >
                      <Ionicons name="sparkles" size={40} color={theme.streak} />
                    </View>

                    <Text style={[styles.celebrationTitle, { color: theme.text }]}>
                      Sessão Concluída! 🎉
                    </Text>
                    <Text style={[styles.celebrationSubtitle, { color: theme.textSecondary }]}>
                      Excelente progresso em &ldquo;{book.livro.titulo}&rdquo;
                    </Text>

                    {/* Card de Gamificação com Recompensas */}
                    <View
                      style={[
                        styles.cardWrapper,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                    >
                      {/* XP Ganho */}
                      <View style={[styles.rewardRow, { borderBottomColor: theme.cardBorder }]}>
                        <View style={styles.rowLeft}>
                          <View style={[styles.rewardIconBox, { backgroundColor: `${theme.accent}25` }]}>
                            <Ionicons name="star" size={20} color={theme.accent} />
                          </View>
                          <View>
                            <Text style={[styles.rewardLabel, { color: theme.text }]}>
                              XP Conquistado
                            </Text>
                            <Text style={[styles.rewardSubtext, { color: theme.textSecondary }]}>
                              {resumoSuccess.detalhesXp.bonusStreak > 0
                                ? 'Inclui bônus de constância'
                                : 'Recompensa por leitura'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.rewardValue, { color: theme.accent }]}>
                          +{resumoSuccess.xpGanho} XP
                        </Text>
                      </View>

                      {/* Ofensiva / Streak */}
                      <View style={[styles.rewardRow, { borderBottomColor: theme.cardBorder }]}>
                        <View style={styles.rowLeft}>
                          <View style={[styles.rewardIconBox, { backgroundColor: `${theme.streak}25` }]}>
                            <Ionicons name="flame" size={22} color={theme.streak} />
                          </View>
                          <View>
                            <Text style={[styles.rewardLabel, { color: theme.text }]}>
                              Ofensiva de Leitura
                            </Text>
                            <Text style={[styles.rewardSubtext, { color: theme.textSecondary }]}>
                              {resumoSuccess.streakResetado
                                ? 'Chama reiniciada!'
                                : resumoSuccess.streakIncrementado
                                ? 'Chama mantida acesa!'
                                : 'Meta diária mantida!'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.rewardValue, { color: theme.streak }]}>
                          {resumoSuccess.novaOfensiva} dias 🔥
                        </Text>
                      </View>

                      {/* Progresso do Livro */}
                      <View style={styles.rewardRowNoBorder}>
                        <View style={styles.rowLeft}>
                          <View style={[styles.rewardIconBox, { backgroundColor: `${theme.accent}25` }]}>
                            <Ionicons name="book" size={20} color={theme.accent} />
                          </View>
                          <View>
                            <Text style={[styles.rewardLabel, { color: theme.text }]}>
                              {resumoSuccess.concluiuLivro ? 'Livro Concluído! 🏆' : 'Páginas do Livro'}
                            </Text>
                            <Text style={[styles.rewardSubtext, { color: theme.textSecondary }]}>
                              {resumoSuccess.novoProgressoPaginas} de {totalPaginas} páginas
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.rewardValue, { color: theme.text }]}>
                          {Math.min(
                            100,
                            Math.round((resumoSuccess.novoProgressoPaginas / totalPaginas) * 100)
                          )}%
                        </Text>
                      </View>
                    </View>

                    {/* Evolução de Nível */}
                    {(() => {
                      const progresso = calcularProgressoNivel(resumoSuccess.novoXpTotal);
                      return (
                        <View style={styles.levelProgressContainer}>
                          <View style={styles.levelRow}>
                            <Text style={[styles.levelTitle, { color: theme.text }]}>
                              Nível {progresso.nivel} — {progresso.tituloNivel}
                            </Text>
                            <Text style={[styles.levelXpText, { color: theme.accentText }]}>
                              {progresso.xpAtualNoNivel} / {progresso.xpParaProximoNivel} XP
                            </Text>
                          </View>
                          <View style={[styles.levelBarBackground, { backgroundColor: theme.cardBorder }]}>
                            <View
                              style={[
                                styles.levelBarFill,
                                {
                                  backgroundColor: theme.accent,
                                  width: `${progresso.percentual}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })()}

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                      onPress={handleFinishAndClose}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>
                        Continuar Jornada
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* FORMULÁRIO DE REGISTRO DE SESSÃO */
                  <>
                    {/* Cabeçalho */}
                    <View style={styles.headerRow}>
                      <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                          Registrar Sessão
                        </Text>
                        <Text
                          style={[styles.headerSubtitle, { color: theme.textSecondary }]}
                          numberOfLines={1}
                        >
                          {book.livro.titulo}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: `${theme.cardBorder}66` }]}
                        onPress={onClose}
                        disabled={saving}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={20} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Resumo do Progresso Atual do Livro */}
                    <View
                      style={[
                        styles.progressSummaryCard,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                    >
                      <View>
                        <Text style={[styles.progressSummaryLabel, { color: theme.textSecondary }]}>
                          Progresso Atual
                        </Text>
                        <Text style={[styles.progressSummaryValue, { color: theme.text }]}>
                          {progressoAtual} de {totalPaginas} páginas
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.percentBadge,
                          {
                            backgroundColor: `${theme.accent}25`,
                            borderColor: `${theme.accent}50`,
                          },
                        ]}
                      >
                        <Text style={[styles.percentBadgeText, { color: theme.accentText }]}>
                          {Math.min(100, Math.round((progressoAtual / totalPaginas) * 100))}%
                        </Text>
                      </View>
                    </View>

                    {/* Tabs: Modo Páginas vs Cronômetro */}
                    <View
                      style={[
                        styles.modeTabsContainer,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.modeTabButton,
                          mode === 'paginas' && { backgroundColor: theme.primary },
                        ]}
                        onPress={handleSwitchToPages}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="book-outline"
                          size={16}
                          color={mode === 'paginas' ? '#FFFFFF' : theme.textMuted}
                        />
                        <Text
                          style={[
                            styles.modeTabText,
                            {
                              color: mode === 'paginas' ? '#FFFFFF' : theme.textMuted,
                              fontWeight: mode === 'paginas' ? '700' : '500',
                            },
                          ]}
                        >
                          Páginas Lidas
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.modeTabButton,
                          mode === 'minutos' && { backgroundColor: theme.primary },
                        ]}
                        onPress={handleSwitchToTimer}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="timer-outline"
                          size={16}
                          color={mode === 'minutos' ? '#FFFFFF' : theme.textMuted}
                        />
                        <Text
                          style={[
                            styles.modeTabText,
                            {
                              color: mode === 'minutos' ? '#FFFFFF' : theme.textMuted,
                              fontWeight: mode === 'minutos' ? '700' : '500',
                            },
                          ]}
                        >
                          Cronômetro
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* CONTEÚDO: MODO PÁGINAS */}
                    {mode === 'paginas' ? (
                      <View style={styles.modeSection}>
                        {/* Sub-toggle: Quantidade lida vs Página atual */}
                        <View style={styles.subToggleRow}>
                          <TouchableOpacity
                            style={[
                              styles.subToggleButton,
                              pageInputMode === 'lidas'
                                ? { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }
                                : { borderColor: theme.cardBorder, backgroundColor: theme.card },
                            ]}
                            onPress={() => setPageInputMode('lidas')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.subToggleText,
                                {
                                  color: pageInputMode === 'lidas' ? theme.accent : theme.textSecondary,
                                },
                              ]}
                            >
                              Li X Páginas
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.subToggleButton,
                              pageInputMode === 'pagina_atual'
                                ? { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }
                                : { borderColor: theme.cardBorder, backgroundColor: theme.card },
                            ]}
                            onPress={() => setPageInputMode('pagina_atual')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.subToggleText,
                                {
                                  color:
                                    pageInputMode === 'pagina_atual'
                                      ? theme.accent
                                      : theme.textSecondary,
                                },
                              ]}
                            >
                              Parei na Página Y
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Input Principal de Páginas */}
                        <View style={styles.inputCenterBox}>
                          <Text style={[styles.inputLabel, { color: theme.label }]}>
                            {pageInputMode === 'lidas'
                              ? 'Quantas páginas você leu?'
                              : 'Em qual página você está agora?'}
                          </Text>
                          <TextInput
                            style={[
                              styles.numberInput,
                              {
                                borderColor: theme.inputBorder,
                                backgroundColor: theme.inputBg,
                                color: theme.text,
                              },
                            ]}
                            value={inputValue}
                            onChangeText={setInputValue}
                            keyboardType="numeric"
                            maxLength={5}
                            placeholder="0"
                            placeholderTextColor={theme.textMuted}
                            autoFocus={true}
                            selectTextOnFocus
                          />
                          {pageInputMode === 'pagina_atual' && quantidadeCalculada > 0 && (
                            <Text style={[styles.calculatedPagesText, { color: theme.accent }]}>
                              +{quantidadeCalculada} páginas avançadas
                            </Text>
                          )}
                        </View>

                        {/* Botões Rápidos (+5, +10, +20, +50) */}
                        {pageInputMode === 'lidas' && (
                          <View style={styles.quickAddRow}>
                            {[5, 10, 20, 50].map((qty) => (
                              <TouchableOpacity
                                key={qty}
                                style={[
                                  styles.quickAddButton,
                                  {
                                    borderColor: theme.cardBorder,
                                    backgroundColor: theme.card,
                                  },
                                ]}
                                onPress={() => handleQuickAddPages(qty)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.quickAddText, { color: theme.text }]}>
                                  +{qty}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : (
                      /* CONTEÚDO: MODO CRONÔMETRO */
                      <View style={styles.modeSection}>
                        {/* Display de Tempo Circular */}
                        <View
                          style={[
                            styles.timerCircle,
                            {
                              borderColor: `${theme.accent}40`,
                              backgroundColor: `${theme.accent}15`,
                            },
                          ]}
                        >
                          <Text style={[styles.timerDigits, { color: theme.text }]}>
                            {formatTimer(timerSeconds)}
                          </Text>
                          <Text style={[styles.timerStatusText, { color: theme.textSecondary }]}>
                            {isTimerRunning ? 'Leitura em andamento...' : 'Cronômetro pausado'}
                          </Text>
                        </View>

                        {/* Controles do Cronômetro */}
                        <View style={styles.timerControlsRow}>
                          <TouchableOpacity
                            style={[
                              styles.timerResetButton,
                              {
                                borderColor: theme.cardBorder,
                                backgroundColor: theme.card,
                              },
                            ]}
                            onPress={handleResetTimer}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="refresh" size={22} color={theme.textMuted} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.timerPlayButton,
                              {
                                backgroundColor: isTimerRunning ? theme.warning : theme.primary,
                              },
                            ]}
                            onPress={handleToggleTimer}
                            activeOpacity={0.85}
                          >
                            <Ionicons
                              name={isTimerRunning ? 'pause' : 'play'}
                              size={20}
                              color="#FFFFFF"
                            />
                            <Text style={[styles.timerPlayButtonText, { color: '#FFFFFF' }]}>
                              {isTimerRunning ? 'Pausar' : 'Iniciar'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Campo Opcional de Páginas Lidas */}
                        <View style={styles.timerPagesBox}>
                          <Text style={[styles.timerPagesLabel, { color: theme.label }]}>
                            Páginas lidas durante o tempo (opcional):
                          </Text>
                          <View
                            style={[
                              styles.timerPagesInputRow,
                              {
                                borderColor: theme.inputBorder,
                                backgroundColor: theme.inputBg,
                              },
                            ]}
                          >
                            <Ionicons
                              name="book-outline"
                              size={18}
                              color={theme.textMuted}
                              style={styles.timerPagesIcon}
                            />
                            <TextInput
                              style={[styles.timerPagesInput, { color: theme.text }]}
                              value={timerPagesRead}
                              onChangeText={setTimerPagesRead}
                              placeholder="Ex: 12 páginas"
                              placeholderTextColor={theme.textMuted}
                              keyboardType="numeric"
                              maxLength={4}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Mensagem de Erro */}
                    {errorMsg && (
                      <View
                        style={[
                          styles.errorContainer,
                          {
                            borderColor: `${theme.danger}60`,
                            backgroundColor: `${theme.danger}20`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="alert-circle"
                          size={18}
                          color={theme.danger}
                          style={styles.errorIcon}
                        />
                        <Text style={[styles.errorText, { color: theme.danger }]}>
                          {errorMsg}
                        </Text>
                      </View>
                    )}

                    {/* Card com Preview de XP Ganho */}
                    <View
                      style={[
                        styles.xpPreviewCard,
                        {
                          borderColor: `${theme.accent}40`,
                          backgroundColor: `${theme.accent}18`,
                        },
                      ]}
                    >
                      <View style={styles.rowLeft}>
                        <Ionicons
                          name="star"
                          size={18}
                          color={theme.accent}
                          style={styles.xpPreviewIcon}
                        />
                        <Text style={[styles.xpPreviewLabel, { color: theme.text }]}>
                          Recompensa Estimada
                        </Text>
                      </View>
                      <Text style={[styles.xpPreviewValue, { color: theme.accent }]}>
                        +{xpEstimado} XP
                      </Text>
                    </View>

                    {/* Botão de Conclusão */}
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                      onPress={handleSubmitSession}
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <View style={styles.submitButtonContent}>
                          <Ionicons
                            name="checkmark-done"
                            size={20}
                            color="#FFFFFF"
                            style={styles.submitButtonIcon}
                          />
                          <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>
                            Salvar Sessão de Leitura
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  avoidingView: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  grabberContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  celebrationIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  cardWrapper: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  rewardRowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rewardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  rewardSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  rewardValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  levelProgressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  levelXpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressSummaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  percentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabsContainer: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modeSection: {
    marginBottom: 16,
  },
  subToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  subToggleButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  subToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputCenterBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  numberInput: {
    width: 160,
    height: 76,
    textAlign: 'center',
    fontSize: 36,
    fontWeight: '800',
    borderRadius: 18,
    borderWidth: 1,
  },
  calculatedPagesText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  quickAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timerCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  timerDigits: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
  },
  timerStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  timerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  timerResetButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timerPlayButton: {
    paddingHorizontal: 32,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timerPlayButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timerPagesBox: {
    width: '100%',
    marginTop: 8,
  },
  timerPagesLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  timerPagesInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  timerPagesIcon: {
    marginRight: 8,
  },
  timerPagesInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  xpPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  xpPreviewIcon: {
    marginRight: 8,
  },
  xpPreviewLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  xpPreviewValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonIcon: {
    marginRight: 8,
  },
});

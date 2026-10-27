import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { LeituraDiaria } from '../models/EstatisticasLeitura';

interface ReadingBarChartProps {
  dadosSemanais: LeituraDiaria[];
  tipoInicial?: 'paginas' | 'minutos';
}

export function ReadingBarChart({
  dadosSemanais,
  tipoInicial = 'paginas',
}: ReadingBarChartProps) {
  const { theme, isDark } = useTheme();
  const [metrica, setMetrica] = useState<'paginas' | 'minutos'>(tipoInicial);
  const [diaSelecionado, setDiaSelecionado] = useState<LeituraDiaria | null>(null);

  const alternarMetrica = (nova: 'paginas' | 'minutos') => {
    if (nova !== metrica) {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
      setMetrica(nova);
      setDiaSelecionado(null);
    }
  };

  const valores = dadosSemanais.map((d) => (metrica === 'paginas' ? d.paginas : d.minutos));
  const valorMaximo = Math.max(...valores, metrica === 'paginas' ? 20 : 30);

  const handleBarPress = (item: LeituraDiaria) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDiaSelecionado((prev) => (prev?.data === item.data ? null : item));
  };

  const totalVolume = valores.reduce((acc, curr) => acc + curr, 0);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(28, 26, 46, 0.70)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(145, 132, 217, 0.20)' : 'rgba(108, 92, 231, 0.12)',
        },
      ]}
    >
      {/* Header com Título e Seletor de Métrica */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.titulo, { color: theme.text }]}>Histórico Semanal</Text>
          <Text style={[styles.subtitulo, { color: theme.textSecondary }]}>
            {totalVolume} {metrica === 'paginas' ? 'páginas lidas' : 'minutos dedicados'} nos últimos 7 dias
          </Text>
        </View>

        {/* Segmented Control Páginas / Minutos */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: isDark ? 'rgba(18, 16, 31, 0.60)' : 'rgba(235, 231, 252, 0.80)',
              borderColor: isDark ? 'rgba(145, 132, 217, 0.18)' : 'rgba(108, 92, 231, 0.15)',
            },
          ]}
        >
          <Pressable
            onPress={() => alternarMetrica('paginas')}
            style={[
              styles.segmentButton,
              metrica === 'paginas' && {
                backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.40)' : 'rgba(108, 92, 231, 0.25)',
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: metrica === 'paginas' ? theme.primary : theme.textSecondary,
                  fontWeight: metrica === 'paginas' ? '700' : '500',
                },
              ]}
            >
              Páginas
            </Text>
          </Pressable>

          <Pressable
            onPress={() => alternarMetrica('minutos')}
            style={[
              styles.segmentButton,
              metrica === 'minutos' && {
                backgroundColor: isDark ? 'rgba(145, 132, 217, 0.35)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(215, 210, 255, 0.40)' : 'rgba(108, 92, 231, 0.25)',
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: metrica === 'minutos' ? theme.primary : theme.textSecondary,
                  fontWeight: metrica === 'minutos' ? '700' : '500',
                },
              ]}
            >
              Minutos
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Banner de Detalhes do Dia Selecionado */}
      {diaSelecionado && (
        <View
          style={[
            styles.detalheCard,
            {
              backgroundColor: isDark ? 'rgba(145, 132, 217, 0.16)' : 'rgba(108, 92, 231, 0.08)',
              borderColor: isDark ? 'rgba(215, 210, 255, 0.30)' : 'rgba(108, 92, 231, 0.20)',
            },
          ]}
        >
          <Text style={[styles.detalheTexto, { color: theme.text }]}>
            <Text style={{ fontWeight: '700' }}>{diaSelecionado.diaSemana} ({diaSelecionado.data}):</Text>{' '}
            {diaSelecionado.paginas} páginas • {diaSelecionado.minutos} min • +{diaSelecionado.xp} XP
          </Text>
        </View>
      )}

      {/* Área do Gráfico de Barras */}
      <View style={styles.chartArea}>
        {dadosSemanais.map((item, index) => {
          const valor = metrica === 'paginas' ? item.paginas : item.minutos;
          const proporcao = valorMaximo > 0 ? valor / valorMaximo : 0;
          const barHeight = Math.max(Math.round(proporcao * 110), valor > 0 ? 12 : 4);
          const isSelected = diaSelecionado?.data === item.data;
          const isHighest = valor > 0 && valor === Math.max(...valores);

          return (
            <Pressable
              key={item.data || index}
              onPress={() => handleBarPress(item)}
              style={styles.colunaWrapper}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              {/* Valor acima da barra */}
              <Text
                style={[
                  styles.barValueText,
                  {
                    color: isHighest
                      ? theme.primary
                      : isDark
                      ? 'rgba(255, 255, 255, 0.70)'
                      : theme.textSecondary,
                    fontWeight: isHighest || isSelected ? '700' : '500',
                    opacity: valor > 0 ? 1 : 0,
                  },
                ]}
              >
                {valor}
              </Text>

              {/* Trilho da Barra */}
              <View
                style={[
                  styles.barTrack,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(108, 92, 231, 0.06)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      borderRadius: 6,
                      borderWidth: isSelected ? 1.5 : 0,
                      borderColor: '#FFFFFF',
                    },
                  ]}
                >
                  <LinearGradient
                    colors={
                      valor === 0
                        ? isDark
                          ? ['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.05)']
                          : ['rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.04)']
                        : isHighest
                        ? isDark
                          ? ['#FFB020', '#F59E0B']
                          : ['#F59E0B', '#D97706']
                        : isDark
                        ? ['#B4A8F8', '#8B5CF6']
                        : ['#8B5CF6', '#6C5CE7']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>

              {/* Rótulo do Dia da Semana */}
              <Text
                style={[
                  styles.diaSemanaLabel,
                  {
                    color: isSelected
                      ? theme.primary
                      : isDark
                      ? 'rgba(215, 210, 255, 0.80)'
                      : theme.textSecondary,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {item.diaSemana}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitulo: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  segmentButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 11,
  },
  detalheCard: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  detalheTexto: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 10,
    paddingBottom: 4,
  },
  colunaWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValueText: {
    fontSize: 10,
    marginBottom: 4,
    height: 14,
  },
  barTrack: {
    width: 22,
    height: 110,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    overflow: 'hidden',
  },
  diaSemanaLabel: {
    fontSize: 11,
    marginTop: 6,
  },
});

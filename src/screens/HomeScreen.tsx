import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemeSlider } from '../components/ThemeSlider';
import { ThemeType } from '../theme/colors';
import { sendVerificationEmail } from '../services/authService';

export default function HomeScreen() {
  const { isDark, theme, toggleTheme, toggleAnim } = useTheme();
  const { user, userData, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  const fullName = userData?.nome || user?.displayName || user?.email?.split('@')[0] || 'Leitor';
  const firstName = fullName.trim().split(' ')[0];

  const handleSignOut = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza de que deseja encerrar sua sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const [sendingVerification, setSendingVerification] = useState(false);

  const handleResendVerification = async () => {
    if (!user || sendingVerification) return;
    setSendingVerification(true);
    try {
      await sendVerificationEmail(user);
      Alert.alert('E-mail Enviado!', `Enviamos o e-mail de verificação para ${user.email}. Verifique também sua caixa de Spam.`);
    } catch (err: any) {
      Alert.alert('Atenção', 'Não foi possível reenviar o e-mail no momento. Tente novamente mais tarde.');
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <View style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style={theme.statusBar} />

      {/* Blobs decorativos de fundo */}
      <View style={[s.blob, s.blobTopLeft]} />
      <View style={[s.blob, s.blobBottomRight]} />

      <View style={s.container}>
        {/* Slider de Tema no topo */}
        <View style={s.sliderPosition}>
          <ThemeSlider isDark={isDark} onToggle={toggleTheme} anim={toggleAnim} />
        </View>

        {/* Conteúdo Central Simplificado */}
        <View style={s.content}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={s.greetingSubtitle}>Bem-vindo de volta,</Text>
          <Text style={s.greetingTitle}>{firstName} 👋</Text>
          <Text style={s.welcomeMessage}>Você está autenticado no MyLib.</Text>

          {/* Banner de Verificação de E-mail se não verificado */}
          {user && !user.emailVerified && (
            <TouchableOpacity
              style={s.verifyBanner}
              onPress={handleResendVerification}
              disabled={sendingVerification}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-unread-outline" size={18} color={theme.warning} style={{ marginRight: 8 }} />
              <Text style={s.verifyBannerText}>
                {sendingVerification ? 'Enviando e-mail...' : 'E-mail não verificado. Clique para reenviar!'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Botão Sair */}
          <TouchableOpacity
            style={s.logoutButton}
            onPress={handleSignOut}
            activeOpacity={0.85}
            accessibilityLabel="Sair da conta"
            id="btn-logout"
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={s.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function makeStyles(t: ThemeType) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.bg,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
    },

    /* Blobs */
    blob: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.15,
    },
    blobTopLeft: {
      top: -80,
      left: -80,
      width: 260,
      height: 260,
      backgroundColor: t.blobLeft,
    },
    blobBottomRight: {
      bottom: -60,
      right: -60,
      width: 200,
      height: 200,
      backgroundColor: t.blobRight,
    },

    /* Slider Position */
    sliderPosition: {
      alignSelf: 'flex-end',
      marginTop: 12,
    },

    /* Conteúdo Principal */
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 40,
    },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: t.primaryShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    avatarText: {
      color: t.bg,
      fontSize: 32,
      fontWeight: '800',
    },
    greetingSubtitle: {
      color: t.textSub,
      fontSize: 16,
      fontWeight: '500',
    },
    greetingTitle: {
      color: t.text,
      fontSize: 30,
      fontWeight: '800',
      marginTop: 4,
      marginBottom: 8,
      textAlign: 'center',
    },
    welcomeMessage: {
      color: t.textSub,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
    },
    verifyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(224, 165, 78, 0.15)',
      borderColor: 'rgba(224, 165, 78, 0.3)',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 28,
    },
    verifyBannerText: {
      color: t.warning,
      fontSize: 13,
      fontWeight: '600',
    },

    /* Botão Sair */
    logoutButton: {
      backgroundColor: t.danger,
      borderRadius: 14,
      height: 52,
      paddingHorizontal: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.danger,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { DARK, LIGHT, ThemeType } from "../theme/colors";
import { ThemeSlider } from "../components/ThemeSlider";
import { InputField } from "../components/InputField";
import { isValidEmail } from "../utils/validation";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { useTheme } from "../theme/ThemeContext";
import { sendPasswordReset, getAuthErrorMessage } from "../services/authService";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;
type ForgotPasswordRouteProp = RouteProp<AuthStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({
  navigation,
  route,
}: {
  navigation: NavigationProp;
  route?: ForgotPasswordRouteProp;
}) {
  const { isDark, theme, toggleTheme, toggleAnim, setIsDark } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successSent, setSuccessSent] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState("");

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeEmailAnim = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  useEffect(() => {
    if (route?.params?.isDark !== undefined && route.params.isDark !== isDark) {
      setIsDark(route.params.isDark);
    }
  }, [route?.params?.isDark]);

  const shakeField = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError("O e-mail é obrigatório.");
      return false;
    }
    if (!isValidEmail(value)) {
      setEmailError("Digite um e-mail válido.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleResetPassword = async () => {
    if (loading) return;
    setGeneralError("");

    const emailOk = validateEmail(email);

    if (!emailOk) {
      Vibration.vibrate(50);
      shakeField(shakeEmailAnim);
      return;
    }

    setLoading(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start();

    try {
      await sendPasswordReset(email);
      setSuccessSent(true);
    } catch (err: any) {
      Vibration.vibrate(50);
      shakeField(shakeEmailAnim);
      const msg = getAuthErrorMessage(err?.code || "");
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <StatusBar style={theme.statusBar} />

      {/* Blobs decorativos */}
      <View style={[s.blob, s.blobTopLeft]} />
      <View style={[s.blob, s.blobBottomRight]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={true}
        >
          {/* Slider de tema — topo direito */}
          <View style={s.sliderPosition}>
            <ThemeSlider
              isDark={isDark}
              onToggle={handleToggleTheme}
              anim={toggleAnim}
            />
          </View>

          {/* Header / Brand */}
          <View style={s.header}>
            <View style={s.logoCircle}>
              <Ionicons
                name="key-outline"
                size={32}
                color={theme.bg}
              />
            </View>
            <Text style={s.brandName}>MyLib</Text>
            <Text style={s.brandSubtitle}>Recuperação de Acesso</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {!successSent ? (
              <>
                <Text style={s.cardTitle}>Esqueceu a senha?</Text>
                <Text style={s.cardSubtitle}>
                  Informe seu e-mail para receber as instruções de redefinição de senha.
                </Text>

                {!!generalError && (
                  <View style={s.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.danger} style={{ marginRight: 8 }} />
                    <Text style={s.errorBannerText}>{generalError}</Text>
                  </View>
                )}

                {/* E-mail */}
                <Animated.View style={{ transform: [{ translateX: shakeEmailAnim }] }}>
                  <InputField
                    label="E-MAIL CADASTRADO"
                    icon="mail-outline"
                    isFocused={emailFocused}
                    hasError={!!emailError}
                    errorMessage={emailError}
                    onFocus={() => {
                      setEmailFocused(true);
                      setEmailError("");
                    }}
                    onBlur={() => {
                      setEmailFocused(false);
                      validateEmail(email);
                    }}
                    theme={theme}
                    s={s}
                    inputProps={{
                      placeholder: "seu@email.com",
                      placeholderTextColor: theme.textSub,
                      value: email,
                      onChangeText: setEmail,
                      keyboardType: "email-address",
                      autoCapitalize: "none",
                      autoCorrect: false,
                      returnKeyType: "done",
                      onSubmitEditing: handleResetPassword,
                      accessibilityLabel: "Campo de e-mail para recuperação de senha",
                      id: "input-forgot-email",
                    }}
                  />
                </Animated.View>

                {/* Botão Enviar Link */}
                <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 12 }}>
                  <TouchableOpacity
                    style={[s.resetButton, loading && s.resetButtonDisabled]}
                    onPress={handleResetPassword}
                    activeOpacity={0.85}
                    disabled={loading}
                    accessibilityLabel="Enviar link de recuperação de senha"
                    id="btn-send-reset-link"
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.bg} size="small" />
                    ) : (
                      <View style={s.resetButtonContent}>
                        <Text style={s.resetButtonText}>Enviar Link</Text>
                        <Ionicons
                          name="paper-plane-outline"
                          size={18}
                          color={theme.bg}
                          style={s.resetArrow}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              /* Card de Sucesso */
              <View style={s.successContainer}>
                <View style={s.successIconCircle}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={theme.primary} />
                </View>
                <Text style={s.cardTitle}>E-mail Enviado!</Text>
                <Text style={s.successText}>
                  Enviamos as instruções de redefinição para{"\n"}
                  <Text style={s.emailHighlight}>{email}</Text>
                </Text>
                <View style={s.infoBox}>
                  <Ionicons name="time-outline" size={16} color={theme.forgotText} style={{ marginRight: 6 }} />
                  <Text style={s.infoText}>O link de redefinição expira em 30 minutos.</Text>
                </View>

                <TouchableOpacity
                  style={s.resendButton}
                  onPress={() => setSuccessSent(false)}
                  activeOpacity={0.7}
                  accessibilityLabel="Reenviar e-mail de recuperação"
                  id="btn-resend-email"
                >
                  <Text style={s.resendText}>Tentar outro e-mail</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Link voltar para login */}
            <View style={s.signInRow}>
              <Text style={s.signInText}>Lembrou a senha? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Login", { isDark })}
                accessibilityLabel="Voltar para a tela de login"
                id="btn-back-to-login"
              >
                <Text style={s.signInLink}>Voltar ao Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Estilos dinâmicos ─────────────────────────────────────────────────────────
function makeStyles(t: ThemeType) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.bg,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "flex-start",
      paddingHorizontal: 24,
    },
    sliderPosition: {
      alignSelf: "flex-end",
      marginTop: 0,
      marginBottom: 50,
      zIndex: 10,
    },

    /* Blobs */
    blob: {
      position: "absolute",
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

    /* Header */
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    logoCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      shadowColor: t.primaryShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 12,
    },
    brandName: {
      fontSize: 28,
      fontWeight: "800",
      color: t.text,
      letterSpacing: 1.5,
    },
    brandSubtitle: {
      fontSize: 13,
      color: t.label,
      marginTop: 4,
      letterSpacing: 1.2,
    },

    /* Card */
    card: {
      backgroundColor: t.card,
      borderRadius: 24,
      padding: 28,
      borderWidth: 1,
      borderColor: t.cardBorder,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 16,
    },
    cardTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: t.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 13,
      color: t.textSub,
      marginBottom: 28,
      lineHeight: 18,
    },

    /* Campos */
    fieldWrapper: { marginBottom: 16 },
    label: {
      fontSize: 11,
      fontWeight: "700",
      color: t.label,
      marginBottom: 6,
      letterSpacing: 1,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.inputBg,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: t.inputBorder,
      paddingHorizontal: 14,
      height: 52,
    },
    inputContainerFocused: {
      borderColor: t.inputBorderFocus,
      backgroundColor: t.inputBgFocus,
      shadowColor: t.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    inputContainerError: {
      borderColor: t.danger,
      backgroundColor: t.bg === DARK.bg ? "rgba(224, 115, 107, 0.1)" : "#FFF5F5",
      shadowColor: t.danger,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    errorText: {
      color: t.danger,
      fontSize: 12,
      marginTop: 5,
      marginLeft: 2,
      fontWeight: "500",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(224, 115, 107, 0.12)",
      borderColor: "rgba(224, 115, 107, 0.3)",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    errorBannerText: {
      color: t.danger,
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      color: t.text,
      fontSize: 15,
      paddingVertical: 0,
    },

    /* Botão reset */
    resetButton: {
      backgroundColor: t.primary,
      borderRadius: 14,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: t.primaryShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 10,
    },
    resetButtonDisabled: { opacity: 0.7 },
    resetButtonContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    resetButtonText: {
      color: t.bg,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    resetArrow: {
      marginLeft: 8,
    },

    /* Card Sucesso */
    successContainer: {
      alignItems: "center",
      paddingVertical: 12,
    },
    successIconCircle: {
      marginBottom: 12,
    },
    successText: {
      fontSize: 14,
      color: t.textSub,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },
    emailHighlight: {
      color: t.text,
      fontWeight: "700",
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 16,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 12,
      color: t.forgotText,
      fontWeight: "600",
    },
    resendButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    resendText: {
      color: t.primary,
      fontSize: 13,
      fontWeight: "700",
    },

    /* Sign In Link */
    signInRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 24,
    },
    signInText: { color: t.textSub, fontSize: 13 },
    signInLink: { color: t.signUpLink, fontSize: 13, fontWeight: "700" },
  });
}

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

  useEffect(() => {
    if (route?.params?.isDark !== undefined && route.params.isDark !== isDark) {
      setIsDark(route.params.isDark);
    }
  }, [isDark, route?.params?.isDark, setIsDark]);

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
    <View className="flex-1" style={{ backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.statusBar} />

      {/* Blobs decorativos */}
      <View
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-15"
        style={{ backgroundColor: theme.blobLeft }}
      />
      <View
        className="absolute -bottom-16 -right-16 w-52 h-52 rounded-full opacity-15"
        style={{ backgroundColor: theme.blobRight }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Slider de tema — topo direito */}
          <View className="self-end mb-6 z-10">
            <ThemeSlider
              isDark={isDark}
              onToggle={toggleTheme}
              anim={toggleAnim}
            />
          </View>

          {/* Header / Brand */}
          <View className="items-center mb-8">
            <View
              className="w-18 h-18 rounded-full items-center justify-center mb-3 shadow-lg elevation-6"
              style={{ backgroundColor: theme.primary }}
            >
              <Ionicons name="key-outline" size={32} color={theme.bg} />
            </View>
            <Text className="text-4xl font-extrabold tracking-wider" style={{ color: theme.text }}>
              MyLib
            </Text>
            <Text className="text-xs mt-1 tracking-widest uppercase font-medium" style={{ color: theme.label }}>
              Recuperação de Acesso
            </Text>
          </View>

          {/* Card */}
          <View
            className="rounded-3xl p-6 border shadow-xl elevation-8 mb-6"
            style={{
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            }}
          >
            {!successSent ? (
              <>
                <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
                  Esqueceu a senha?
                </Text>
                <Text className="text-sm mb-6 leading-5" style={{ color: theme.textSecondary }}>
                  Informe seu e-mail para receber as instruções de redefinição de senha.
                </Text>

                {!!generalError && (
                  <View className="flex-row items-center p-3.5 rounded-xl border border-danger/40 bg-danger/10 mb-4">
                    <Ionicons name="alert-circle-outline" size={18} color={theme.danger} className="mr-2" />
                    <Text className="flex-1 text-xs font-medium" style={{ color: theme.danger }}>
                      {generalError}
                    </Text>
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
                    inputProps={{
                      placeholder: "seu@email.com",
                      placeholderTextColor: theme.textMuted,
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
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mt-3">
                  <TouchableOpacity
                    className={`h-13 rounded-2xl items-center justify-center flex-row shadow-lg elevation-4 ${
                      loading ? 'opacity-60' : ''
                    }`}
                    style={{ backgroundColor: theme.primary }}
                    onPress={handleResetPassword}
                    activeOpacity={0.85}
                    disabled={loading}
                    accessibilityLabel="Enviar link de recuperação de senha"
                    id="btn-send-reset-link"
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.bg} size="small" />
                    ) : (
                      <View className="flex-row items-center">
                        <Text className="text-base font-bold tracking-wide mr-2" style={{ color: theme.bg }}>
                          Enviar Link
                        </Text>
                        <Ionicons name="paper-plane-outline" size={18} color={theme.bg} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              /* Card de Sucesso */
              <View className="items-center py-4">
                <View className="mb-4">
                  <Ionicons name="checkmark-circle-outline" size={48} color={theme.primary} />
                </View>
                <Text className="text-2xl font-bold mb-2 text-center" style={{ color: theme.text }}>
                  E-mail Enviado!
                </Text>
                <Text className="text-sm text-center mb-6 leading-6" style={{ color: theme.textSecondary }}>
                  Enviamos as instruções de redefinição para{"\n"}
                  <Text className="font-bold" style={{ color: theme.primary }}>{email}</Text>
                </Text>
                <View
                  className="flex-row items-center p-3 rounded-xl border border-accent/20 bg-accent/10 mb-6"
                >
                  <Ionicons name="time-outline" size={16} color={theme.forgotText} className="mr-2" />
                  <Text className="text-xs flex-1" style={{ color: theme.forgotText }}>
                    O link de redefinição expira em 30 minutos.
                  </Text>
                </View>

                <TouchableOpacity
                  className="py-2.5 px-4 rounded-xl border border-cardBorder"
                  onPress={() => setSuccessSent(false)}
                  activeOpacity={0.7}
                  accessibilityLabel="Reenviar e-mail de recuperação"
                  id="btn-resend-email"
                >
                  <Text className="text-xs font-semibold" style={{ color: theme.textSecondary }}>
                    Tentar outro e-mail
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Link voltar para login */}
            <View className="flex-row items-center justify-center mt-6">
              <Text className="text-xs" style={{ color: theme.signUpText }}>
                Lembrou a senha?{" "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Login", { isDark })}
                accessibilityLabel="Voltar para a tela de login"
                id="btn-back-to-login"
              >
                <Text className="text-xs font-bold" style={{ color: theme.signUpLink }}>
                  Voltar ao Entrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

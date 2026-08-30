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
import { signInUser, getAuthErrorMessage } from "../services/authService";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: { navigation: NavigationProp }) {
  const { isDark, theme, toggleTheme, toggleAnim } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakePasswordAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();

  const shakeEmail = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const shakePassword = () => {
    shakePasswordAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakePasswordAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakePasswordAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakePasswordAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakePasswordAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakePasswordAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
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

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("A senha é obrigatória.");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleLogin = async () => {
    if (loading) return;
    setGeneralError("");
    const emailOk = validateEmail(email);
    const passwordOk = validatePassword(password);

    if (!emailOk || !passwordOk) {
      Vibration.vibrate(50);
      if (!emailOk) shakeEmail();
      if (!passwordOk) shakePassword();
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
      await signInUser(email, password);
      console.log("Login realizado com sucesso!");
    } catch (err: any) {
      Vibration.vibrate(50);
      shakeEmail();
      shakePassword();
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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Slider de tema — topo direito */}
          <View className="self-end mb-8 z-10">
            <ThemeSlider
              isDark={isDark}
              onToggle={toggleTheme}
              anim={toggleAnim}
            />
          </View>

          {/* Header / Brand */}
          <View className="items-center mb-10">
            <View
              className="w-18 h-18 rounded-full items-center justify-center mb-3 shadow-lg elevation-6"
              style={{ backgroundColor: theme.primary }}
            >
              <Ionicons name="book" size={32} color={theme.primaryText} />
            </View>
            <Text className="text-4xl font-extrabold tracking-wider" style={{ color: theme.text }}>
              MyLib
            </Text>
            <Text className="text-xs mt-1 tracking-widest uppercase font-semibold" style={{ color: theme.label }}>
              Sua jornada de leitura
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
            <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
              Entrar
            </Text>
            <Text className="text-sm mb-6 font-medium" style={{ color: theme.textSecondary }}>
              Bem-vindo, leitor!
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
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <InputField
                label="E-MAIL"
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
                  returnKeyType: "next",
                  onSubmitEditing: () => passwordRef.current?.focus(),
                  blurOnSubmit: false,
                  accessibilityLabel: "Campo de e-mail",
                  id: "input-email",
                }}
              />
            </Animated.View>

            {/* Senha */}
            <Animated.View style={{ transform: [{ translateX: shakePasswordAnim }] }}>
              <InputField
                label="SENHA"
                icon="lock-closed-outline"
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                inputRef={passwordRef}
                isFocused={passwordFocused}
                hasError={!!passwordError}
                errorMessage={passwordError}
                onFocus={() => {
                  setPasswordFocused(true);
                  setPasswordError("");
                }}
                onBlur={() => {
                  setPasswordFocused(false);
                  validatePassword(password);
                }}
                theme={theme}
                inputProps={{
                  placeholder: "••••••••",
                  placeholderTextColor: theme.textMuted,
                  value: password,
                  onChangeText: setPassword,
                  secureTextEntry: !showPassword,
                  returnKeyType: "done",
                  onSubmitEditing: handleLogin,
                  accessibilityLabel: "Campo de senha",
                  id: "input-password",
                }}
              />
            </Animated.View>

            {/* Esqueceu a senha */}
            <TouchableOpacity
              className="self-end my-2 py-1"
              onPress={() => navigation.navigate("ForgotPassword")}
              activeOpacity={0.7}
              accessibilityLabel="Recuperar senha"
              id="btn-forgot-password"
            >
              <Text className="text-xs font-semibold" style={{ color: theme.forgotText }}>
                Esqueceu a senha?
              </Text>
            </TouchableOpacity>

            {/* Botão Entrar */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mt-4">
              <TouchableOpacity
                className={`h-13 rounded-2xl items-center justify-center flex-row shadow-lg elevation-4 ${
                  loading ? 'opacity-60' : ''
                }`}
                style={{ backgroundColor: theme.primary }}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
                accessibilityLabel="Botão de login"
                id="btn-login"
              >
                {loading ? (
                  <ActivityIndicator color={theme.primaryText} size="small" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-base font-bold tracking-wide mr-2" style={{ color: theme.primaryText }}>
                      Entrar
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={theme.primaryText} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Link cadastro */}
            <View className="flex-row items-center justify-center mt-6">
              <Text className="text-xs" style={{ color: theme.signUpText }}>
                Não tem uma conta?{" "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                id="btn-signup"
                accessibilityLabel="Criar conta"
                onPress={() => navigation.navigate("Register")}
              >
                <Text className="text-xs font-bold" style={{ color: theme.signUpLink }}>
                  Cadastre-se
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

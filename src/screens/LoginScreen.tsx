import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
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
import { signInUser, getAuthErrorMessage } from "../services/authService";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginRouteProp = RouteProp<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: { navigation: NavigationProp; route?: LoginRouteProp }) {
  const { isDark, theme, toggleTheme, toggleAnim, setIsDark } = useTheme();
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
  const s = makeStyles(theme);

  const shakeEmail = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shakePassword = () => {
    shakePasswordAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakePasswordAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakePasswordAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakePasswordAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakePasswordAnim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakePasswordAnim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
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

  useEffect(() => {
    if (route?.params?.isDark !== undefined && route.params.isDark !== isDark) {
      setIsDark(route.params.isDark);
    }
  }, [route?.params?.isDark]);

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleLogin = async () => {
    if (loading) return;
    setGeneralError("");
    const emailOk = validateEmail(email);
    const passwordOk = validatePassword(password);

    if (!emailOk || !passwordOk) {
      Vibration.vibrate(50); // Feedback tátil de erro
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

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword", { isDark });
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
        {/* Tudo dentro de um único ScrollView */}
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom },
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
            <View>
              <Ionicons
                name="book"
                size={32}
                color={theme.accent}
              />
            </View>
            <Text style={s.brandName}>MyLib</Text>
            <Text style={s.brandSubtitle}>Sua jornada de leitura</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Entrar</Text>
            <Text style={s.cardSubtitle}>Bem-vindo, leitor!</Text>

            {!!generalError && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={theme.danger} style={{ marginRight: 8 }} />
                <Text style={s.errorBannerText}>{generalError}</Text>
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
                s={s}
                inputProps={{
                  placeholder: "seu@email.com",
                  placeholderTextColor: theme.textSub,
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
            <Animated.View
              style={{ transform: [{ translateX: shakePasswordAnim }] }}
            >
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
                s={s}
                inputProps={{
                  placeholder: "••••••••",
                  placeholderTextColor: theme.textSub,
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
              style={s.forgotWrapper}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
              accessibilityLabel="Recuperar senha"
              id="btn-forgot-password"
            >
              <Text style={s.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {/* Botão Entrar */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[s.loginButton, loading && s.loginButtonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
                accessibilityLabel="Botão de login"
                id="btn-login"
              >
                {loading ? (
                  <ActivityIndicator color={theme.bg} size="small" />
                ) : (
                  <View style={s.loginButtonContent}>
                    <Text style={s.loginButtonText}>Entrar</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={theme.bg}
                      style={s.loginArrow}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Link cadastro */}
            <View style={s.signUpRow}>
              <Text style={s.signUpText}>Não tem uma conta? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                id="btn-signup"
                accessibilityLabel="Criar conta"
                onPress={() => navigation.navigate("Register", { isDark })}
              >
                <Text style={s.signUpLink}>Cadastre-se</Text>
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
      marginBottom: 50,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
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
      fontSize: 38,
      fontWeight: "800",
      color: t.text,
      letterSpacing: 2,
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

    /* Esqueceu */
    forgotWrapper: {
      alignSelf: "flex-end",
      marginBottom: 24,
      marginTop: 4,
    },
    forgotText: {
      color: t.forgotText,
      fontSize: 13,
      fontWeight: "600",
    },

    /* Botão login */
    loginButton: {
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
    loginButtonDisabled: { opacity: 0.7 },
    loginButtonContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    loginButtonText: {
      color: t.bg,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    loginArrow: {
      marginLeft: 8,
    },

    /* Sign up */
    signUpRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    signUpText: { color: t.textSub, fontSize: 13 },
    signUpLink: { color: t.signUpLink, fontSize: 13, fontWeight: "700" },
  });
}

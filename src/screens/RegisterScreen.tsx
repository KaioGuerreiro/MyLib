import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
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

import { DARK, ThemeType } from "../theme/colors";
import { ThemeSlider } from "../components/ThemeSlider";
import { InputField } from "../components/InputField";
import { isValidEmail, validatePasswordCriteria } from "../utils/validation";

import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { useTheme } from "../theme/ThemeContext";
import { signUpUser, getAuthErrorMessage } from "../services/authService";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;
type RegisterRouteProp = RouteProp<AuthStackParamList, "Register">;

export default function RegisterScreen({
  navigation,
  route,
}: {
  navigation: NavigationProp;
  route?: RegisterRouteProp;
}) {
  const { isDark, theme, toggleTheme, toggleAnim, setIsDark } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [successCreated, setSuccessCreated] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const shakeNameAnim = useRef(new Animated.Value(0)).current;
  const shakeEmailAnim = useRef(new Animated.Value(0)).current;
  const shakePasswordAnim = useRef(new Animated.Value(0)).current;
  const shakeConfirmPasswordAnim = useRef(new Animated.Value(0)).current;

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();
  const s = makeStyles(theme);

  useEffect(() => {
    if (route?.params?.isDark !== undefined && route.params.isDark !== isDark) {
      setIsDark(route.params.isDark);
    }
  }, [isDark, route?.params?.isDark, setIsDark]);

  const shakeField = (anim: Animated.Value) => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("O nome é obrigatório.");
      return false;
    }
    if (value.trim().length < 3) {
      setNameError("O nome deve ter pelo menos 3 caracteres.");
      return false;
    }
    setNameError("");
    return true;
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

  const passCriteria = validatePasswordCriteria(password);

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("A senha é obrigatória.");
      return false;
    }
    const criteria = validatePasswordCriteria(value);
    if (!criteria.isValid) {
      setPasswordError("A senha não cumpre todos os requisitos exigidos.");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordError("Confirme sua senha.");
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError("As senhas não coincidem.");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleRegister = async () => {
    if (loading) return;
    setGeneralError("");

    const nameOk = validateName(name);
    const emailOk = validateEmail(email);
    const passwordOk = validatePassword(password);
    const confirmPasswordOk = validateConfirmPassword(confirmPassword);

    if (!nameOk || !emailOk || !passwordOk || !confirmPasswordOk) {
      Vibration.vibrate(50); // Feedback tátil de erro
      if (!nameOk) shakeField(shakeNameAnim);
      if (!emailOk) shakeField(shakeEmailAnim);
      if (!passwordOk) shakeField(shakePasswordAnim);
      if (!confirmPasswordOk) shakeField(shakeConfirmPasswordAnim);
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
      await signUpUser(name, email, password);
      setSuccessCreated(true);
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
              <Ionicons name="person-add" size={32} color={theme.bg} />
            </View>
            <Text style={s.brandName}>MyLib</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {!successCreated ? (
              <>
                <Text style={s.cardTitle}>Cadastrar</Text>
                <Text style={s.cardSubtitle}>
                  Junte-se à nossa jornada de leitura!
                </Text>

                {!!generalError && (
                  <View style={s.errorBanner}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={theme.danger}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={s.errorBannerText}>{generalError}</Text>
                  </View>
                )}

                {/* Nome */}
                <Animated.View
                  style={{ transform: [{ translateX: shakeNameAnim }] }}
                >
                  <InputField
                    label="NOME COMPLETO"
                    icon="person-outline"
                    isFocused={nameFocused}
                    hasError={!!nameError}
                    errorMessage={nameError}
                    onFocus={() => {
                      setNameFocused(true);
                      setNameError("");
                    }}
                    onBlur={() => {
                      setNameFocused(false);
                      validateName(name);
                    }}
                    theme={theme}
                    s={s}
                    inputProps={{
                      placeholder: "Seu nome",
                      placeholderTextColor: theme.textSub,
                      value: name,
                      onChangeText: setName,
                      autoCapitalize: "words",
                      returnKeyType: "next",
                      onSubmitEditing: () => emailRef.current?.focus(),
                      blurOnSubmit: false,
                    }}
                  />
                </Animated.View>

                {/* E-mail */}
                <Animated.View
                  style={{ transform: [{ translateX: shakeEmailAnim }] }}
                >
                  <InputField
                    label="E-MAIL"
                    icon="mail-outline"
                    inputRef={emailRef}
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
                      returnKeyType: "next",
                      onSubmitEditing: () =>
                        confirmPasswordRef.current?.focus(),
                      blurOnSubmit: false,
                    }}
                  />

                  {/* Requisitos de Senha */}
                  {(passwordFocused || password.length > 0) && (
                    <View style={s.reqContainer}>
                      <Text
                        style={[
                          s.reqText,
                          passCriteria.hasMinLength && s.reqMet,
                        ]}
                      >
                        <Ionicons
                          name={
                            passCriteria.hasMinLength
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={12}
                        />{" "}
                        Mínimo 8 caracteres
                      </Text>
                      <Text
                        style={[
                          s.reqText,
                          passCriteria.hasUppercase && s.reqMet,
                        ]}
                      >
                        <Ionicons
                          name={
                            passCriteria.hasUppercase
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={12}
                        />{" "}
                        Pelo menos 1 letra maiúscula (A-Z)
                      </Text>
                      <Text
                        style={[
                          s.reqText,
                          passCriteria.hasLowercase && s.reqMet,
                        ]}
                      >
                        <Ionicons
                          name={
                            passCriteria.hasLowercase
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={12}
                        />{" "}
                        Pelo menos 1 letra minúscula (a-z)
                      </Text>
                      <Text
                        style={[s.reqText, passCriteria.hasNumber && s.reqMet]}
                      >
                        <Ionicons
                          name={
                            passCriteria.hasNumber
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={12}
                        />{" "}
                        Pelo menos 1 número (0-9)
                      </Text>
                      <Text
                        style={[
                          s.reqText,
                          passCriteria.hasSpecialChar && s.reqMet,
                        ]}
                      >
                        <Ionicons
                          name={
                            passCriteria.hasSpecialChar
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={12}
                        />{" "}
                        Pelo menos 1 caractere especial (!@#$...)
                      </Text>
                    </View>
                  )}
                </Animated.View>

                {/* Confirmar Senha */}
                <Animated.View
                  style={{
                    transform: [{ translateX: shakeConfirmPasswordAnim }],
                  }}
                >
                  <InputField
                    label="CONFIRMAR SENHA"
                    icon="lock-closed-outline"
                    rightIcon={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    onRightIconPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    inputRef={confirmPasswordRef}
                    isFocused={confirmPasswordFocused}
                    hasError={!!confirmPasswordError}
                    errorMessage={confirmPasswordError}
                    onFocus={() => {
                      setConfirmPasswordFocused(true);
                      setConfirmPasswordError("");
                    }}
                    onBlur={() => {
                      setConfirmPasswordFocused(false);
                      validateConfirmPassword(confirmPassword);
                    }}
                    theme={theme}
                    s={s}
                    inputProps={{
                      placeholder: "••••••••",
                      placeholderTextColor: theme.textSub,
                      value: confirmPassword,
                      onChangeText: setConfirmPassword,
                      secureTextEntry: !showConfirmPassword,
                      returnKeyType: "done",
                      onSubmitEditing: handleRegister,
                    }}
                  />
                </Animated.View>

                {/* Botão Cadastrar */}
                <Animated.View
                  style={{ transform: [{ scale: scaleAnim }], marginTop: 12 }}
                >
                  <TouchableOpacity
                    style={[
                      s.registerButton,
                      loading && s.registerButtonDisabled,
                    ]}
                    onPress={handleRegister}
                    activeOpacity={0.85}
                    disabled={loading}
                    accessibilityLabel="Criar conta"
                    id="btn-register-submit"
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.bg} size="small" />
                    ) : (
                      <View style={s.registerButtonContent}>
                        <Text style={s.registerButtonText}>Criar Conta</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color={theme.bg}
                          style={s.registerArrow}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Link voltar para login */}
                <View style={s.signInRow}>
                  <Text style={s.signInText}>Já tem uma conta? </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("Login", { isDark })}
                  >
                    <Text style={s.signInLink}>Entrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Card de Sucesso */
              <View style={s.successContainer}>
                <View style={s.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={56} color={theme.success} />
                </View>
                <Text style={s.cardTitle}>Conta Criada!</Text>
                <Text style={s.successText}>
                  Parabéns, <Text style={s.nameHighlight}>{name}</Text>!{"\n"}
                  Sua conta no <Text style={s.brandHighlight}>MyLib</Text> foi
                  criada com sucesso.
                </Text>

                <TouchableOpacity
                  style={s.loginActionButton}
                  onPress={() => navigation.navigate("Login", { isDark })}
                  activeOpacity={0.85}
                  accessibilityLabel="Ir para a tela de login"
                  id="btn-go-to-login"
                >
                  <Text style={s.loginActionButtonText}>Ir para o Login</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={theme.bg}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>
            )}
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

    /* Requisitos Senha */
    reqContainer: {
      marginTop: -8,
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    reqText: {
      color: t.textSub,
      fontSize: 11,
      marginBottom: 4,
    },
    reqMet: {
      color: t.primary,
      fontWeight: "600",
    },

    /* Botão cadastrar */
    registerButton: {
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
    registerButtonDisabled: { opacity: 0.7 },
    registerButtonContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    registerButtonText: {
      color: t.bg,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    registerArrow: {
      marginLeft: 8,
    },

    /* Card Sucesso */
    successContainer: {
      alignItems: "center",
      paddingVertical: 16,
    },
    successIconCircle: {
      marginBottom: 16,
    },
    successText: {
      fontSize: 14,
      color: t.textSub,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 24,
      lineHeight: 22,
    },
    nameHighlight: {
      color: t.text,
      fontWeight: "700",
    },
    brandHighlight: {
      color: t.primary,
      fontWeight: "700",
    },
    loginActionButton: {
      backgroundColor: t.primary,
      borderRadius: 14,
      height: 50,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: t.primaryShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    loginActionButtonText: {
      color: t.bg,
      fontSize: 15,
      fontWeight: "800",
    },

    /* Sign In */
    signInRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 24,
    },
    signInText: { color: t.textSub, fontSize: 13 },
    signInLink: { color: t.signUpLink, fontSize: 13, fontWeight: "700" },
  });
}

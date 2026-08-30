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
import { isValidEmail, validatePasswordCriteria } from "../utils/validation";

import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthNavigator";
import { useTheme } from "../theme/ThemeContext";
import { signUpUser, getAuthErrorMessage } from "../services/authService";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export default function RegisterScreen({
  navigation,
}: {
  navigation: NavigationProp;
}) {
  const { isDark, theme, toggleTheme, toggleAnim } = useTheme();
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

  const handleRegister = async () => {
    if (loading) return;
    setGeneralError("");

    const nameOk = validateName(name);
    const emailOk = validateEmail(email);
    const passwordOk = validatePassword(password);
    const confirmPasswordOk = validateConfirmPassword(confirmPassword);

    if (!nameOk || !emailOk || !passwordOk || !confirmPasswordOk) {
      Vibration.vibrate(50);
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
              <Ionicons name="person-add" size={32} color={theme.primaryText} />
            </View>
            <Text className="text-4xl font-extrabold tracking-wider" style={{ color: theme.text }}>
              MyLib
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
            {!successCreated ? (
              <>
                <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
                  Cadastrar
                </Text>
                <Text className="text-sm mb-6" style={{ color: theme.textSecondary }}>
                  Junte-se à nossa jornada de leitura!
                </Text>

                {!!generalError && (
                  <View className="flex-row items-center p-3.5 rounded-xl border border-danger/40 bg-danger/10 mb-4">
                    <Ionicons name="alert-circle-outline" size={18} color={theme.danger} className="mr-2" />
                    <Text className="flex-1 text-xs font-medium" style={{ color: theme.danger }}>
                      {generalError}
                    </Text>
                  </View>
                )}

                {/* Nome */}
                <Animated.View style={{ transform: [{ translateX: shakeNameAnim }] }}>
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
                    inputProps={{
                      placeholder: "Seu nome",
                      placeholderTextColor: theme.textMuted,
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
                <Animated.View style={{ transform: [{ translateX: shakeEmailAnim }] }}>
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
                      returnKeyType: "next",
                      onSubmitEditing: () => confirmPasswordRef.current?.focus(),
                      blurOnSubmit: false,
                    }}
                  />

                  {/* Requisitos de Senha */}
                  {(passwordFocused || password.length > 0) && (
                    <View className="mb-4 p-3 rounded-xl bg-inputBg border border-inputBorder">
                      <Text
                        className={`text-xs my-0.5 ${passCriteria.hasMinLength ? 'text-success font-medium' : 'text-textMuted'}`}
                      >
                        <Ionicons
                          name={passCriteria.hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                          size={12}
                        />{" "}
                        Mínimo 8 caracteres
                      </Text>
                      <Text
                        className={`text-xs my-0.5 ${passCriteria.hasUppercase ? 'text-success font-medium' : 'text-textMuted'}`}
                      >
                        <Ionicons
                          name={passCriteria.hasUppercase ? "checkmark-circle" : "ellipse-outline"}
                          size={12}
                        />{" "}
                        Pelo menos 1 letra maiúscula (A-Z)
                      </Text>
                      <Text
                        className={`text-xs my-0.5 ${passCriteria.hasLowercase ? 'text-success font-medium' : 'text-textMuted'}`}
                      >
                        <Ionicons
                          name={passCriteria.hasLowercase ? "checkmark-circle" : "ellipse-outline"}
                          size={12}
                        />{" "}
                        Pelo menos 1 letra minúscula (a-z)
                      </Text>
                      <Text
                        className={`text-xs my-0.5 ${passCriteria.hasNumber ? 'text-success font-medium' : 'text-textMuted'}`}
                      >
                        <Ionicons
                          name={passCriteria.hasNumber ? "checkmark-circle" : "ellipse-outline"}
                          size={12}
                        />{" "}
                        Pelo menos 1 número (0-9)
                      </Text>
                      <Text
                        className={`text-xs my-0.5 ${passCriteria.hasSpecialChar ? 'text-success font-medium' : 'text-textMuted'}`}
                      >
                        <Ionicons
                          name={passCriteria.hasSpecialChar ? "checkmark-circle" : "ellipse-outline"}
                          size={12}
                        />{" "}
                        Pelo menos 1 caractere especial (!@#$...)
                      </Text>
                    </View>
                  )}
                </Animated.View>

                {/* Confirmar Senha */}
                <Animated.View style={{ transform: [{ translateX: shakeConfirmPasswordAnim }] }}>
                  <InputField
                    label="CONFIRMAR SENHA"
                    icon="lock-closed-outline"
                    rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    inputProps={{
                      placeholder: "••••••••",
                      placeholderTextColor: theme.textMuted,
                      value: confirmPassword,
                      onChangeText: setConfirmPassword,
                      secureTextEntry: !showConfirmPassword,
                      returnKeyType: "done",
                      onSubmitEditing: handleRegister,
                    }}
                  />
                </Animated.View>

                {/* Botão Cadastrar */}
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mt-3">
                  <TouchableOpacity
                    className={`h-13 rounded-2xl items-center justify-center flex-row shadow-lg elevation-4 ${
                      loading ? 'opacity-60' : ''
                    }`}
                    style={{ backgroundColor: theme.primary }}
                    onPress={handleRegister}
                    activeOpacity={0.85}
                    disabled={loading}
                    accessibilityLabel="Criar conta"
                    id="btn-register-submit"
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.primaryText} size="small" />
                    ) : (
                      <View className="flex-row items-center">
                        <Text className="text-base font-bold tracking-wide mr-2" style={{ color: theme.primaryText }}>
                          Criar Conta
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color={theme.primaryText} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Link voltar para login */}
                <View className="flex-row items-center justify-center mt-6">
                  <Text className="text-xs" style={{ color: theme.signUpText }}>
                    Já tem uma conta?{" "}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("Login")}
                  >
                    <Text className="text-xs font-bold" style={{ color: theme.signUpLink }}>
                      Entrar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Card de Sucesso */
              <View className="items-center py-6">
                <View className="mb-4">
                  <Ionicons name="checkmark-circle" size={56} color={theme.success} />
                </View>
                <Text className="text-2xl font-bold mb-2 text-center" style={{ color: theme.text }}>
                  Conta Criada!
                </Text>
                <Text className="text-sm text-center mb-8 leading-6" style={{ color: theme.textSecondary }}>
                  Parabéns, <Text className="font-bold" style={{ color: theme.primary }}>{name}</Text>!{"\n"}
                  Sua conta no <Text className="font-bold" style={{ color: theme.primary }}>MyLib</Text> foi criada com sucesso.
                </Text>

                <TouchableOpacity
                  className="w-full h-13 rounded-2xl items-center justify-center flex-row shadow-lg elevation-4"
                  style={{ backgroundColor: theme.primary }}
                  onPress={() => navigation.navigate("Login")}
                  activeOpacity={0.85}
                  accessibilityLabel="Ir para a tela de login"
                  id="btn-go-to-login"
                >
                  <Text className="text-base font-bold tracking-wide mr-2" style={{ color: theme.primaryText }}>
                    Ir para o Login
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.primaryText} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

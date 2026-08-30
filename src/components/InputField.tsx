import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeType } from '../theme/colors';

interface InputFieldProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
  onRightIconPress?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  isFocused: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onFocus: () => void;
  onBlur: () => void;
  theme: ThemeType;
  s?: any; // Suporte a estilos legados caso passados
  inputProps: React.ComponentProps<typeof TextInput>;
}

export function InputField({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  inputRef,
  isFocused,
  hasError = false,
  errorMessage,
  onFocus,
  onBlur,
  theme,
  s,
  inputProps,
}: InputFieldProps) {
  const localRef = useRef<TextInput>(null);
  const ref = inputRef || localRef;

  const iconColor = hasError
    ? theme.danger
    : isFocused
    ? theme.primary
    : theme.iconColor;

  return (
    <View className="mb-4">
      <Text
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: theme.label }}
      >
        {label}
      </Text>
      <Pressable
        className={`flex-row items-center h-13 px-4 rounded-xl border ${
          hasError
            ? 'border-danger bg-danger/10'
            : isFocused
            ? 'border-accent bg-surface'
            : 'border-inputBorder bg-inputBg'
        }`}
        style={{
          backgroundColor: isFocused ? theme.inputBgFocus : theme.inputBg,
          borderColor: hasError
            ? theme.danger
            : isFocused
            ? theme.inputBorderFocus
            : theme.inputBorder,
        }}
        onPress={() => ref.current?.focus()}
      >
        <Ionicons name={icon} size={18} color={iconColor} className="mr-3" />
        <TextInput
          ref={ref}
          className="flex-1 text-base h-full"
          style={{ color: theme.text }}
          placeholderTextColor={theme.textMuted}
          onFocus={onFocus}
          onBlur={onBlur}
          {...inputProps}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            hitSlop={8}
            className="pl-2 pr-1"
            accessibilityLabel="Alternar visibilidade da senha"
          >
            <Ionicons name={rightIcon} size={20} color={iconColor} />
          </Pressable>
        )}
        {hasError && (
          <Ionicons name="alert-circle" size={18} color={theme.danger} className="ml-2" />
        )}
      </Pressable>
      {hasError && errorMessage ? (
        <Text
          className="text-xs font-medium mt-1.5 ml-1"
          style={{ color: theme.danger }}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

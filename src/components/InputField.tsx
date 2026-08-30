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
  s: any; // We pass the dynamic styles here
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

  const borderStyle = hasError
    ? s.inputContainerError
    : isFocused
    ? s.inputContainerFocused
    : null;

  const iconColor = hasError
    ? theme.danger
    : isFocused
    ? theme.primary
    : theme.iconColor;

  return (
    <View style={s.fieldWrapper}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        style={[s.inputContainer, borderStyle]}
        onPress={() => ref.current?.focus()}
      >
        <Ionicons name={icon} size={18} color={iconColor} style={s.inputIcon} />
        <TextInput
          ref={ref}
          style={s.input}
          onFocus={onFocus}
          onBlur={onBlur}
          {...inputProps}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            hitSlop={8}
            style={{ paddingLeft: 6, paddingRight: hasError ? 6 : 0 }}
            accessibilityLabel="Alternar visibilidade da senha"
          >
            <Ionicons name={rightIcon} size={20} color={iconColor} />
          </Pressable>
        )}
        {hasError && (
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
        )}
      </Pressable>
      {hasError && errorMessage ? (
        <Text style={s.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

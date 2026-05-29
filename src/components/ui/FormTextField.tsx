import FontAwesome from '@expo/vector-icons/FontAwesome';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { Text } from '@/components/ui/Themed';

import Colors from '@/constants/Colors';

import { useColorScheme } from '@/hooks/useColorScheme';

type Props = {
  label: string;
  errorText?: string;
  containerStyle?: object;
  hint?: string;
  /** Mostra ícone para revelar/ocultar senha (use com `secureTextEntry`). */
  passwordToggle?: boolean;
} & TextInputProps;

export const FormTextField = forwardRef<TextInput, Props>(function FormTextField(
  {
    label,
    errorText,
    containerStyle,
    hint,
    style,
    passwordToggle,
    secureTextEntry,
    ...inputProps
  },
  ref,
) {
  const scheme = useColorScheme() ?? 'light';
  const [passwordHidden, setPasswordHidden] = useState(true);

  const border =
    scheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.14)';
  const inputBg =
    scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const textColor = scheme === 'dark' ? Colors.dark.text : Colors.light.text;
  const iconColor =
    scheme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)';

  const a11yHint =
    errorText && hint
      ? `Erro: ${errorText}. ${hint}`
      : errorText
        ? `Erro: ${errorText}`
        : hint;

  const effectiveSecure =
    passwordToggle ? passwordHidden : Boolean(secureTextEntry);

  const inputStyles = [
    styles.input,
    passwordToggle && styles.inputWithToggle,
    {
      borderColor: errorText ? '#c62828' : border,
      backgroundColor: inputBg,
      color: textColor,
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      <Text accessibilityRole="text" style={styles.label}>
        {label}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={effectiveSecure}
          style={inputStyles}
          placeholderTextColor={scheme === 'dark' ? '#999' : '#666'}
          accessibilityLabel={label}
          accessibilityHint={a11yHint}
        />
        {passwordToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordHidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setPasswordHidden((v) => !v)}
            style={styles.toggle}>
            <FontAwesome
              name={passwordHidden ? 'eye' : 'eye-slash'}
              size={20}
              color={iconColor}
            />
          </Pressable>
        ) : null}
      </View>
      {errorText ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 6,
  },
  inputRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 48,
  },
  toggle: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    minHeight: 44,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: '#c62828',
  },
});

import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Text } from '@/components/Themed';

import Colors from '@/constants/Colors';

import { useColorScheme } from '@/hooks/useColorScheme';

type Props = {
  label: string;
  errorText?: string;
  containerStyle?: object;
  hint?: string;
} & TextInputProps;

export function FormTextField({
  label,
  errorText,
  containerStyle,
  hint,
  style,
  ...inputProps
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const border =
    scheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.14)';
  const inputBg =
    scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const textColor = scheme === 'dark' ? Colors.dark.text : Colors.light.text;

  const a11yHint =
    errorText && hint
      ? `Erro: ${errorText}. ${hint}`
      : errorText
        ? `Erro: ${errorText}`
        : hint;

  return (
    <View style={containerStyle}>
      <Text accessibilityRole="text" style={styles.label}>
        {label}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        {...inputProps}
        style={[
          styles.input,
          {
            borderColor: errorText ? '#c62828' : border,
            backgroundColor: inputBg,
            color: textColor,
          },
          style,
        ]}
        placeholderTextColor={scheme === 'dark' ? '#999' : '#666'}
        accessibilityLabel={label}
        accessibilityHint={a11yHint}
      />
      {errorText ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: '#c62828',
  },
});

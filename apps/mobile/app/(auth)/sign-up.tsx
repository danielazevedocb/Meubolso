import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import type { SignUpValues } from '@/forms/auth-group-schemas';
import { signUpSchema } from '@/forms/auth-group-schemas';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/services/supabase-errors';
import { useState } from 'react';

export default function SignUpScreen() {
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmEmailBanner, setConfirmEmailBanner] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setBanner(null);
    setConfirmEmailBanner(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        data: { name: values.displayName.trim() },
      },
    });
    if (error) {
      setBanner(mapAuthError(error));
      return;
    }
    if (!data.session) {
      setConfirmEmailBanner(
        'Enviamos um link para confirmar seu e-mail. Após confirmar, volte e entre na conta.',
      );
      return;
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Criar conta' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.sub}>Cadastre nome, e-mail e senha (PRD).</Text>

            {banner ? (
              <Text accessibilityRole="alert" style={styles.bannerError}>
                {banner}
              </Text>
            ) : null}
            {confirmEmailBanner ? (
              <Text accessibilityRole="text" style={styles.bannerInfo}>
                {confirmEmailBanner}
              </Text>
            ) : null}

            <Controller
              control={control}
              name="displayName"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormTextField
                  label="Nome"
                  autoComplete="name"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  containerStyle={styles.field}
                  errorText={errors.displayName?.message}
                  hint="Como será exibido no app."
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormTextField
                  label="E-mail"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  containerStyle={styles.field}
                  errorText={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormTextField
                  label="Senha"
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  containerStyle={styles.field}
                  errorText={errors.password?.message}
                  hint="Mínimo de 8 caracteres."
                />
              )}
            />

            <PrimaryButton
              label="Cadastrar e continuar"
              loading={isSubmitting}
              onPress={() => void onSubmit()}
            />

            <Link href="/(auth)/sign-in" accessibilityRole="link" style={styles.link}>
              Já tenho conta
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  card: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    opacity: 0.75,
    marginBottom: 20,
    lineHeight: 22,
  },
  bannerError: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 14,
    color: '#c62828',
  },
  bannerInfo: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 14,
    opacity: 0.85,
    lineHeight: 20,
  },
  field: {
    marginBottom: 14,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
    opacity: 0.85,
  },
});

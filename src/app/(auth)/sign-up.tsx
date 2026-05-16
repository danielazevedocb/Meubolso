import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import type { SignUpValues } from '@/forms/auth-group-schemas';
import { signUpSchema } from '@/forms/auth-group-schemas';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/services/supabase-errors';
import { useCallback, useEffect, useRef, useState } from 'react';

const RESEND_COOLDOWN_MS = 60_000;

export default function SignUpScreen() {
  const router = useRouter();
  const navHeaderHeight = useHeaderHeight();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  /** Cadastro OK mas o projeto exige confirmar e-mail (sem sessão ainda). */
  const [awaitingEmailVerify, setAwaitingEmailVerify] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const resendCooldownEndsAtRef = useRef<number | null>(null);
  const [resendCooldownEndsAt, setResendCooldownEndsAt] = useState<number | null>(null);
  const [resendCooldownRemainingSec, setResendCooldownRemainingSec] = useState(0);

  useEffect(() => {
    if (resendCooldownEndsAt === null) {
      setResendCooldownRemainingSec(0);
      return;
    }

    const tick = () => {
      const sec = Math.max(0, Math.ceil((resendCooldownEndsAt - Date.now()) / 1000));
      setResendCooldownRemainingSec(sec);
      if (sec <= 0) {
        resendCooldownEndsAtRef.current = null;
        setResendCooldownEndsAt(null);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resendCooldownEndsAt]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates: { height: number } }) =>
      setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const goToSignIn = useCallback(() => {
    router.replace('/(auth)/sign-in');
  }, [router]);

  const handleResendConfirmation = useCallback(async () => {
    if (!registeredEmail.trim()) return;

    const now = Date.now();
    const activeUntil = resendCooldownEndsAtRef.current;
    if (activeUntil !== null && now < activeUntil) return;

    const until = now + RESEND_COOLDOWN_MS;
    resendCooldownEndsAtRef.current = until;
    setResendCooldownEndsAt(until);

    setResendFeedback(null);
    setResendSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail.trim(),
      });
      if (error) {
        setResendFeedback(mapAuthError(error));
        return;
      }
      setResendFeedback('E-mail de confirmação reenviado. Verifique a caixa de entrada e o spam.');
    } finally {
      setResendSubmitting(false);
    }
  }, [registeredEmail]);

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
    if (data.session) {
      /** Confirmação por e-mail desligada: o AuthProvider segue o fluxo logado. */
      return;
    }

    const email = values.email.trim();
    const password = values.password;

    /**
     * `signUp` sem sessão pode ser (1) novo utilizador a aguardar confirmação ou (2) e-mail já
     * registado sem revelação explícita (Supabase). Um `signIn` com as mesmas credenciais ajuda:
     * — sessão → conta já confirmada, entra normalmente;
     * — “e-mail não confirmado” → manter ecrã de verificação / reenvio;
     * — credenciais inválidas → e-mail provavelmente já existe com outra senha (Entrar / recuperar).
     */
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData.session) {
      return;
    }

    const signInMsg = signInError?.message?.toLowerCase() ?? '';
    if (signInMsg.includes('email not confirmed')) {
      setRegisteredEmail(email);
      setAwaitingEmailVerify(true);
      setResendFeedback(null);
      return;
    }

    if (
      signInMsg.includes('invalid login credentials') ||
      signInMsg.includes('invalid_credentials')
    ) {
      setBanner(
        'Este e-mail já está associado a uma conta. Use Entrar com a senha correta ou recupere o acesso. Se acabou de cadastrar, confirme o e-mail antes de entrar.',
      );
      return;
    }

    if (signInError) {
      setBanner(mapAuthError(signInError));
      return;
    }

    setRegisteredEmail(email);
    setAwaitingEmailVerify(true);
    setResendFeedback(null);
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? navHeaderHeight : 0}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: 24 + keyboardHeight,
            justifyContent: keyboardHeight > 0 ? 'flex-start' : 'center',
          },
        ]}>
          <View style={styles.card}>
            {awaitingEmailVerify ? (
              <>
                <Text style={styles.title}>Verifique seu e-mail</Text>
                <Text style={styles.sub}>
                  Enviamos um link de confirmação para{' '}
                  <Text style={styles.emailHighlight}>{registeredEmail}</Text>. Abra a caixa de
                  entrada (e o spam) e toque no link para ativar a conta. Depois use
                  &quot;Entrar&quot; no app.
                </Text>
                <View style={styles.successBox}>
                  <Text accessibilityRole="text" style={styles.bannerInfo}>
                    Quando confirmar o e-mail, use a mesma senha que cadastrou.
                  </Text>
                </View>

                {resendFeedback ? (
                  <Text
                    accessibilityRole={resendFeedback.startsWith('E-mail') ? 'text' : 'alert'}
                    style={
                      resendFeedback.startsWith('E-mail') ? styles.resendOk : styles.resendErr
                    }>
                    {resendFeedback}
                  </Text>
                ) : null}

                <PrimaryButton
                  label="Reenviar e-mail de confirmação"
                  loading={resendSubmitting}
                  disabled={resendCooldownRemainingSec > 0}
                  onPress={() => void handleResendConfirmation()}
                />
                {resendCooldownRemainingSec > 0 ? (
                  <Text style={styles.resendCooldownHint} accessibilityLiveRegion="polite">
                    {resendCooldownRemainingSec === 1
                      ? 'Aguarde 1 segundo para enviar novamente.'
                      : `Aguarde ${resendCooldownRemainingSec} segundos para enviar novamente.`}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ir para tela de entrar"
                  onPress={goToSignIn}
                  style={styles.goSignInBtn}>
                  <Text style={styles.goSignInText}>Ir para entrar</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Criar conta</Text>
                <Text style={styles.sub}>Cadastre nome, e-mail e senha.</Text>

                {banner ? (
                  <Text accessibilityRole="alert" style={styles.bannerError}>
                    {banner}
                  </Text>
                ) : null}

            <Controller
              control={control}
              name="displayName"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormTextField
                  label="Nome"
                  placeholder="Digite seu nome"
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
                  placeholder="Digite seu e-mail"
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
                  placeholder="Digite sua senha"
                  secureTextEntry
                  passwordToggle
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

            <Link href="/(auth)/sign-in" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.link}>Já tenho conta</Text>
              </Pressable>
            </Link>
              </>
            )}
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
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
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 21,
  },
  successBox: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(47, 149, 220, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(47, 149, 220, 0.35)',
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#2f95dc',
  },
  resendOk: {
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
    opacity: 0.9,
    color: '#81c784',
  },
  resendErr: {
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
    color: '#ef9a9a',
  },
  resendCooldownHint: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.75,
    lineHeight: 18,
  },
  field: {
    marginBottom: 14,
  },
  goSignInBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  goSignInText: {
    fontSize: 16,
    color: '#2f95dc',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
    opacity: 0.9,
    color: '#2f95dc',
    textDecorationLine: 'underline',
  },
});

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { FormTextField } from '@/components/ui/FormTextField';
import { MeubolsoWordmark } from '@/components/shared/MeubolsoWordmark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text, View } from '@/components/ui/Themed';
import Colors from '@/constants/Colors';
import type { SignInValues } from '@/forms/auth-group-schemas';
import { signInSchema } from '@/forms/auth-group-schemas';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/services/google-auth';
import { mapAuthError } from '@/services/supabase-errors';

const STAGGER = 70;

export default function SignInScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [banner, setBanner] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, {
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const brandPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setBanner(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });
    if (error) setBanner(mapAuthError(error));
  });

  const onGoogleSignIn = async () => {
    setBanner(null);
    setGoogleLoading(true);
    try {
      const err = await signInWithGoogle();
      if (err) setBanner(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
          <View style={styles.centerBlock}>
            <Animated.View
              entering={FadeIn.duration(650).easing(Easing.out(Easing.cubic))}
              style={styles.brandRow}>
              <Animated.View style={[styles.brandInner, brandPulseStyle]}>
                <MeubolsoWordmark />
              </Animated.View>
            </Animated.View>

            <View style={styles.card}>
            {banner ? (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text accessibilityRole="alert" style={styles.banner}>
                  {banner}
                </Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(STAGGER).duration(450)}>
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
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(STAGGER * 2).duration(450)}>
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
                    textContentType="password"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    containerStyle={styles.field}
                    errorText={errors.password?.message}
                  />
                )}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(STAGGER * 3).duration(450)}
              style={styles.btnWrap}>
              <PrimaryButton
                label="Entrar"
                loading={isSubmitting}
                onPress={() => void onSubmit()}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(STAGGER * 4).duration(450)} style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: palette.borderSubtle }]} />
              <Text style={[styles.dividerText, { color: palette.caption }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.borderSubtle }]} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(STAGGER * 5).duration(450)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Entrar com Google"
                disabled={googleLoading || isSubmitting}
                onPress={() => void onGoogleSignIn()}
                style={({ pressed }) => [
                  styles.googleBtn,
                  {
                    borderColor: palette.borderSubtle,
                    backgroundColor: palette.surfaceSubtle,
                    opacity: pressed || googleLoading || isSubmitting ? 0.7 : 1,
                  },
                ]}>
                {googleLoading ? (
                  <ActivityIndicator size="small" color={palette.text} />
                ) : (
                  <>
                    <FontAwesome name="google" size={18} color="#EA4335" style={styles.googleIcon} />
                    <Text style={[styles.googleLabel, { color: palette.text }]}>
                      Entrar com Google
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(STAGGER * 6).duration(450)}>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable accessibilityRole="link">
                  <Text style={styles.link}>Novo aqui? Criar conta</Text>
                </Pressable>
              </Link>
            </Animated.View>
            </View>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  centerBlock: {
    width: '100%',
    justifyContent: 'center',
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    minHeight: 52,
  },
  brandInner: {
    alignItems: 'center',
  },
  card: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  banner: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 14,
    color: '#c62828',
  },
  field: {
    marginBottom: 14,
  },
  btnWrap: {
    marginTop: 4,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
    opacity: 0.9,
    color: '#2f95dc',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 8,
    minHeight: 48,
    gap: 10,
  },
  googleIcon: {
    lineHeight: 20,
  },
  googleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});

import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { FormTextField } from '@/components/ui/FormTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text, View } from '@/components/ui/Themed';
import Colors from '@/constants/Colors';
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
  profileDisplayNameSchema,
  type ProfileDisplayNameValues,
} from '@/forms/profile-schemas';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useKeyboardScrollPadding } from '@/hooks/useKeyboardScrollPadding';
import { updateOwnPassword, updateOwnProfileDisplayName } from '@/services/profile';
import { mapAuthError, mapPostgrestOrRpcError } from '@/services/supabase-errors';

export default function PerfilScreen() {
  const navHeaderHeight = useHeaderHeight();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { profile, user, refreshProfile, signOut } = useAuth();

  const email = user?.email?.trim() ?? '';

  const nameForm = useForm<ProfileDisplayNameValues>({
    resolver: zodResolver(profileDisplayNameSchema),
    defaultValues: { displayName: '' },
  });

  const pwdForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    const metaName = user?.user_metadata?.name;
    const fromMeta = typeof metaName === 'string' ? metaName.trim() : '';
    const initial =
      profile?.display_name?.trim() ||
      fromMeta ||
      email.split('@')[0] ||
      '';
    nameForm.reset({ displayName: initial });
  }, [profile?.display_name, user?.user_metadata, email, nameForm]);

  const onSaveName = nameForm.handleSubmit(async (values) => {
    Keyboard.dismiss();
    try {
      await updateOwnProfileDisplayName(values.displayName);
      await refreshProfile();
      Alert.alert('Nome atualizado', 'Suas alterações foram salvas.');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'details' in err
          ? mapPostgrestOrRpcError(err as PostgrestError)
          : mapAuthError(err as AuthError | null | undefined);
      Alert.alert('Não foi possível salvar o nome', msg);
    }
  });

  const onChangePassword = pwdForm.handleSubmit(async (values) => {
    Keyboard.dismiss();
    if (!email) {
      Alert.alert(
        'E-mail indisponível',
        'Não encontramos o e-mail da conta. Encerre a sessão e entre novamente.',
      );
      return;
    }
    try {
      const current = values.currentPassword.trim();
      await updateOwnPassword({
        email,
        newPassword: values.newPassword,
        currentPassword: current || undefined,
      });
      pwdForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      Alert.alert('Senha alterada', 'Use a nova senha nas próximas entradas.');
    } catch (err: unknown) {
      Alert.alert('Não foi possível alterar a senha', mapAuthError(err as AuthError | null | undefined));
    }
  });

  const { scrollRef, contentPaddingBottom, scrollToEndOnFocus } = useKeyboardScrollPadding();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? navHeaderHeight : 0}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: 12,
            paddingBottom: contentPaddingBottom,
          },
        ]}>
        <Text style={[styles.lead, { color: palette.caption }]}>
          Nome e senha da sua conta. O nome aparece na visão geral e nas contas do grupo.
        </Text>

        {email ? (
          <View
            style={[
              styles.emailCard,
              { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
            ]}>
            <Text style={[styles.emailLabel, { color: palette.caption }]}>E-mail</Text>
            <Text style={[styles.emailValue, { color: palette.text }]} accessibilityLabel={`E-mail ${email}`}>
              {email}
            </Text>
            <Text style={[styles.emailHint, { color: palette.caption }]}>
              O e-mail não pode ser alterado aqui.
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Nome</Text>
        <Controller
          control={nameForm.control}
          name="displayName"
          render={({ field: { value, onChange, onBlur } }) => (
            <FormTextField
              label="Nome exibido"
              placeholder="Seu nome"
              autoComplete="name"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              containerStyle={styles.field}
              errorText={nameForm.formState.errors.displayName?.message}
              hint="Salvo no seu perfil e sincronizado com a conta."
            />
          )}
        />
        <PrimaryButton
          label="Salvar nome"
          loading={nameForm.formState.isSubmitting}
          onPress={() => void onSaveName()}
        />

        <Text style={[styles.sectionTitle, styles.sectionSpacer, { color: palette.text }]}>
          Alterar senha
        </Text>
        <Text style={[styles.sectionBody, { color: palette.caption }]}>
          Opcional: informe a senha atual se o servidor solicitar reautenticação.
        </Text>

        <Controller
          control={pwdForm.control}
          name="currentPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <FormTextField
              label="Senha atual (opcional)"
              placeholder="Deixe em branco se não for necessário"
              secureTextEntry
              passwordToggle
              autoCapitalize="none"
              textContentType="password"
              value={value}
              onBlur={onBlur}
              onFocus={scrollToEndOnFocus}
              onChangeText={onChange}
              containerStyle={styles.field}
              errorText={pwdForm.formState.errors.currentPassword?.message}
            />
          )}
        />

        <Controller
          control={pwdForm.control}
          name="newPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <FormTextField
              label="Nova senha"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              passwordToggle
              autoCapitalize="none"
              textContentType="newPassword"
              value={value}
              onBlur={onBlur}
              onFocus={scrollToEndOnFocus}
              onChangeText={onChange}
              containerStyle={styles.field}
              errorText={pwdForm.formState.errors.newPassword?.message}
              hint="Não compartilhe sua senha."
            />
          )}
        />

        <Controller
          control={pwdForm.control}
          name="confirmNewPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <FormTextField
              label="Confirmar nova senha"
              placeholder="Repita a nova senha"
              secureTextEntry
              passwordToggle
              autoCapitalize="none"
              textContentType="newPassword"
              value={value}
              onBlur={onBlur}
              onFocus={scrollToEndOnFocus}
              onChangeText={onChange}
              containerStyle={styles.field}
              errorText={pwdForm.formState.errors.confirmNewPassword?.message}
            />
          )}
        />

        <PrimaryButton
          label="Alterar senha"
          loading={pwdForm.formState.isSubmitting}
          onPress={() => void onChangePassword()}
        />

        <Text style={[styles.sectionTitle, styles.sectionSpacer, { color: palette.text }]}>
          Sessão
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Encerrar sessão"
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.65 : 1 }]}>
          <Text style={[styles.signOutText, { color: palette.balanceNegative }]}>Encerrar sessão</Text>
        </Pressable>
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
    gap: 0,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  emailCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 24,
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionSpacer: {
    marginTop: 28,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    marginTop: -4,
  },
  field: {
    marginBottom: 14,
  },
  signOut: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

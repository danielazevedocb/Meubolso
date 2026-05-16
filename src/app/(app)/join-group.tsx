import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import type { JoinInviteValues } from '@/forms/auth-group-schemas';
import { joinInviteSchema } from '@/forms/auth-group-schemas';
import { setPreferredGroupId } from '@/lib/active-group-preference';
import { setSoloPreference } from '@/lib/onboarding-preference';
import {
  isGroupFull,
  joinGroupByInvite,
  lookupInvite,
} from '@/services/groups';
import { mapPostgrestOrRpcError } from '@/services/supabase-errors';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function JoinGroupScreen() {
  const { refreshOnboarding } = useAuth();
  const [banner, setBanner] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JoinInviteValues>({
    resolver: zodResolver(joinInviteSchema),
    defaultValues: { code: '' },
  });

  const codeValue = watch('code');

  const prefetchInvite = async () => {
    const trimmed = codeValue.trim();
    if (trimmed.length < 4) {
      setPreview(null);
      return;
    }
    setBanner(null);
    try {
      const rows = await lookupInvite(trimmed);
      if (!rows.length) {
        setPreview('Não encontramos grupo com esse código.');
        return;
      }
      const row = rows[0]!;
      if (isGroupFull(row)) {
        setPreview(
          `O grupo “${row.title}” já está cheio (6 membros). Não é possível entrar agora.`,
        );
        return;
      }
      setPreview(
        `Grupo “${row.title}”: ${row.current_member_count} membro(s). Você pode entrar.`,
      );
    } catch (e) {
      setPreview(mapPostgrestOrRpcError(e as Error));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setBanner(null);
    try {
      const rows = await lookupInvite(values.code);
      if (rows.length && isGroupFull(rows[0]!)) {
        setBanner(
          'Este grupo já atingiu o limite de 6 membros. Peça um novo convite ou outro grupo.',
        );
        return;
      }

      const groupId = await joinGroupByInvite(values.code);
      await setPreferredGroupId(groupId);
      await setSoloPreference(false);
      await refreshOnboarding();
      router.push('/(app)/overview');
    } catch (e) {
      setBanner(mapPostgrestOrRpcError(e as Error));
    }
  });

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.title}>Código de convite</Text>
            <Text style={styles.sub}>
              Digite o código que o criador do grupo compartilhou. Conferimos o grupo antes de
              conectar.
            </Text>

            {preview ? (
              <Text style={styles.preview} accessibilityRole="text">
                {preview}
              </Text>
            ) : null}

            {banner ? (
              <Text accessibilityRole="alert" style={styles.banner}>
                {banner}
              </Text>
            ) : null}

            <Controller
              control={control}
              name="code"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormTextField
                  label="Código"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={value}
                  onBlur={() => {
                    onBlur();
                    void prefetchInvite();
                  }}
                  onChangeText={(t) => {
                    onChange(t);
                    setPreview(null);
                  }}
                  containerStyle={styles.field}
                  errorText={errors.code?.message}
                  hint="Letras e números, como no convite."
                />
              )}
            />

            <PrimaryButton
              label="Verificar código"
              disabled={isSubmitting}
              onPress={() => void prefetchInvite()}
            />
            <View style={styles.spacer} />
            <PrimaryButton
              label="Entrar no grupo"
              loading={isSubmitting}
              onPress={() => void onSubmit()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  card: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 16,
  },
  preview: {
    marginBottom: 14,
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
  banner: {
    marginBottom: 14,
    color: '#c62828',
    fontSize: 14,
  },
  field: {
    marginBottom: 14,
  },
  spacer: { height: 12 },
});

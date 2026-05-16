import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import type { CreateGroupValues } from '@/forms/auth-group-schemas';
import { createGroupSchema } from '@/forms/auth-group-schemas';
import { createGroup, ensureSelfProfile } from '@/services/groups';
import { mapPostgrestOrRpcError } from '@/services/supabase-errors';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function CreateGroupScreen() {
  const { user, refreshOnboarding } = useAuth();
  const [banner, setBanner] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!user?.id) {
      setBanner('Faça login novamente para criar um grupo.');
      return;
    }
    setBanner(null);
    try {
      await ensureSelfProfile(user);
      const { inviteCode } = await createGroup({ name: values.name, creatorId: user.id });
      await refreshOnboarding();
      Alert.alert(
        'Grupo criado',
        `Compartilhe o código ${inviteCode}. O grupo aceita até 6 pessoas no total.`,
        [{ text: 'Ir para início', onPress: () => router.replace('/(tabs)') }],
      );
    } catch (e) {
      setBanner(mapPostgrestOrRpcError(e as Error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Criar grupo' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.title}>Novo grupo</Text>
            <Text style={styles.sub}>
              Defina um nome (ex.: “Finanças Casa”). Você vira administrador e recebe um código de
              convite para compartilhar (máx. 6 pessoas).
            </Text>

            {banner ? (
              <Text accessibilityRole="alert" style={styles.banner}>
                {banner}
              </Text>
            ) : null}

            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange, onBlur } }) => (
                <FormTextField
                  label="Nome do grupo"
                  autoCapitalize="sentences"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  containerStyle={styles.field}
                  errorText={errors.name?.message}
                />
              )}
            />

            <PrimaryButton
              label="Criar grupo"
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
    marginBottom: 20,
  },
  banner: {
    marginBottom: 14,
    color: '#c62828',
    fontSize: 14,
  },
  field: {
    marginBottom: 16,
  },
});

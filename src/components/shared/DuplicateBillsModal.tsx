import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text, View } from '@/components/ui/Themed';
import Colors from '@/constants/Colors';
import { formatMonthHeadingPt } from '@/lib/month-key';
import type { DuplicatePreview } from '@/services/bill-duplication';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type Props = {
  visible: boolean;
  preview: DuplicatePreview | null;
  loadingPreview: boolean;
  executing: boolean;
  mergeWarning: boolean;
  existingBillCount?: number;
  onClose: () => void;
  onConfirm: () => void;
};

export function DuplicateBillsModal({
  visible,
  preview,
  loadingPreview,
  executing,
  mergeWarning,
  existingBillCount,
  onClose,
  onConfirm,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const srcHeading = preview ? formatMonthHeadingPt(preview.sourceMonthLabel) : '';
  const tgtHeading = preview ? formatMonthHeadingPt(preview.targetMonthLabel) : '';

  const summaryParts = preview
    ? preview.members
        .filter((m) => m.toInsert > 0 || m.skippedDuplicate > 0)
        .map((m) => {
          const parts: string[] = [];
          if (m.toInsert > 0) parts.push(`${m.toInsert} novas`);
          if (m.skippedDuplicate > 0) {
            parts.push(`${m.skippedDuplicate} ignoradas (nome repetido)`);
          }
          return `${m.displayName}: ${parts.join(' · ')}`;
        })
    : [];

  const canConfirm = !!preview && preview.totalToInsert > 0 && !executing && !loadingPreview;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar diálogo"
        accessibilityState={{ disabled: executing }}
        accessibilityHint="Toque fora do painel para cancelar a cópia"
        style={styles.backdrop}
        disabled={executing}
        onPress={executing ? undefined : onClose}>
        <Pressable
          accessible={false}
          style={[styles.sheet, { backgroundColor: palette.background, borderColor: palette.borderSubtle }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: palette.text }]}>Copiar contas</Text>
          {preview ? (
            <Text style={[styles.titleSub, { color: palette.text }]}>
              {srcHeading} → {tgtHeading}
            </Text>
          ) : null}

          {mergeWarning && typeof existingBillCount === 'number' ? (
            <View
              style={[styles.warn, { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle }]}>
              <Text style={[styles.warnText, { color: palette.text }]}>
                Este mês já tem {existingBillCount} conta(s). As importações serão somadas sem apagar o que já
                existe. Itens com o mesmo nome serão ignorados.
              </Text>
            </View>
          ) : null}

          {loadingPreview ? (
            <View style={styles.center}>
              <ActivityIndicator color={palette.tint} />
              <Text style={[styles.hint, { color: palette.caption }]}>Montando prévia…</Text>
            </View>
          ) : null}

          {!loadingPreview && preview && preview.totalToInsert === 0 ? (
            <Text style={[styles.body, { color: palette.caption }]}>
              Nada novo para importar: todas as contas do mês anterior já existem aqui (mesmo nome por membro),
              ou não há contas na origem.
            </Text>
          ) : null}

          {!loadingPreview && preview && preview.totalToInsert > 0 ? (
            <>
              <Text style={[styles.meta, { color: palette.caption }]}>
                Total: {preview.totalToInsert} conta(s) nova(s)
                {preview.totalSkipped > 0
                  ? ` · ${preview.totalSkipped} ignorada(s) por nome duplicado`
                  : ''}
              </Text>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>Resumo por membro</Text>
              {summaryParts.map((line) => (
                <Text key={line} style={[styles.summaryLine, { color: palette.caption }]}>
                  • {line}
                </Text>
              ))}
              <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 12 }]}>Prévia (trecho)</Text>
              <ScrollView style={styles.previewScroll} nestedScrollEnabled>
                {preview.members.map((m) =>
                  m.sampleLines.length > 0 ? (
                    <View key={m.userId} style={styles.memberBlock}>
                      <Text style={[styles.memberName, { color: palette.text }]}>{m.displayName}</Text>
                      {m.sampleLines.map((line) => (
                        <Text key={`${m.userId}-${line.company}`} style={[styles.line, { color: palette.caption }]}>
                          {line.company} — {money.format(line.amount)}
                        </Text>
                      ))}
                    </View>
                  ) : null,
                )}
              </ScrollView>
              <Text style={[styles.footerNote, { color: palette.caption }]}>
                Status das contas copiadas: pendente. A nota do mês de destino não é alterada; o salário de cada
                membro será alinhado ao mês de origem.
              </Text>
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              disabled={executing}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  borderColor: palette.borderSubtle,
                  opacity: executing ? 0.45 : pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.cancelLabel, { color: palette.tint }]}>Cancelar</Text>
            </Pressable>
            <View style={styles.confirmWrap}>
              <PrimaryButton
                label={executing ? 'Copiando…' : 'Confirmar cópia'}
                disabled={!canConfirm}
                loading={executing}
                onPress={onConfirm}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    maxHeight: '88%',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleSub: {
    fontSize: 16,
    fontWeight: '700',
  },
  warn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  warnText: {
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  hint: {
    fontSize: 14,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  previewScroll: {
    maxHeight: 200,
  },
  memberBlock: {
    marginBottom: 10,
    gap: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  line: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 4,
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'stretch',
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  confirmWrap: {
    flex: 1,
  },
});

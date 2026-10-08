import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { ProductPreferencesController } from '../../application';
import { useLocalization } from '../../localization';
import { useAppTheme } from '../theme';

export function TelemetryConsent({
  preferences,
}: {
  preferences: ProductPreferencesController;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const [usage, setUsage] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const save = async (enabled: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await preferences.updatePreferences({
        analyticsEnabled: enabled && usage,
        diagnosticsEnabled: enabled && diagnostics,
        telemetryConsentDecided: true,
      });
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        save(false).catch(() => undefined);
      }}
    >
      <View style={styles.backdrop}>
        <ScrollView
          style={[styles.card, { backgroundColor: palette.background }]}
          contentContainerStyle={styles.content}
        >
          <Text style={[styles.title, { color: palette.ink }]}>
            {t('analytics.title')}
          </Text>
          <Text style={{ color: palette.ink }}>{t('analytics.intro')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: palette.ink }]}>
              {t('analytics.usage')}
            </Text>
            <Switch
              accessibilityLabel={t('analytics.usage')}
              disabled={saving}
              value={usage}
              onValueChange={setUsage}
            />
          </View>
          <Text style={{ color: palette.ink }}>{t('analytics.usageBody')}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: palette.ink }]}>
              {t('analytics.diagnostics')}
            </Text>
            <Switch
              accessibilityLabel={t('analytics.diagnostics')}
              disabled={saving}
              value={diagnostics}
              onValueChange={setDiagnostics}
            />
          </View>
          <Text style={{ color: palette.ink }}>
            {t('analytics.diagnosticsBody')}
          </Text>
          {failed ? (
            <Text accessibilityRole="alert" style={{ color: palette.ink }}>
              {t('analytics.saveFailed')}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('analytics.save')}
            disabled={saving}
            onPress={() => {
              save(true).catch(() => undefined);
            }}
            style={styles.button}
          >
            <Text style={{ color: palette.ink }}>{t('analytics.save')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('analytics.decline')}
            disabled={saving}
            onPress={() => {
              save(false).catch(() => undefined);
            }}
            style={styles.button}
          >
            <Text style={{ color: palette.ink }}>{t('analytics.decline')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0009',
    justifyContent: 'center',
    padding: 24,
  },
  card: { flexGrow: 0, maxHeight: '90%', borderRadius: 16 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1, fontSize: 17 },
  button: { paddingVertical: 14, minHeight: 48 },
});

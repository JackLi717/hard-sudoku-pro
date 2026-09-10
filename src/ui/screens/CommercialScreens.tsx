import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  AdAvailability,
  CommercialSnapshot,
  PurchaseResult,
  RestoreResult,
  RewardedAdRedemptionResult,
} from '../../application/commercial/contracts';
import type { CreditResource } from '../../domain/game/contracts';
import { TranslationKey, useLocalization } from '../../localization';
import { useScreenScroll } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';

type OperationMessage = {
  tone: 'success' | 'neutral' | 'error';
  key: TranslationKey;
};

const PURCHASE_MESSAGES: Readonly<
  Record<PurchaseResult['status'], OperationMessage>
> = {
  purchased: { tone: 'success', key: 'premium.purchaseSuccess' },
  pending: { tone: 'neutral', key: 'premium.purchasePending' },
  cancelled: { tone: 'neutral', key: 'premium.purchaseCancelled' },
  unavailable: { tone: 'error', key: 'premium.storeUnavailable' },
  failed: { tone: 'error', key: 'premium.purchaseFailed' },
};

const RESTORE_MESSAGES: Readonly<
  Record<RestoreResult['status'], OperationMessage>
> = {
  restored: { tone: 'success', key: 'premium.restoreSuccess' },
  nothing_to_restore: { tone: 'neutral', key: 'premium.nothingToRestore' },
  unavailable: { tone: 'error', key: 'premium.storeUnavailable' },
  failed: { tone: 'error', key: 'premium.restoreFailed' },
};

function BackHeader({ title, onBack }: { title: string; onBack(): void }) {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={t('app.back')}
        accessibilityRole="button"
        onPress={onBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹ {t('app.back')}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

function PrimaryButton({
  label,
  busy = false,
  disabled = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress(): void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy || disabled }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (busy || disabled) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.background} size="small" />
      ) : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  busy = false,
  disabled = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress(): void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy || disabled }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        (busy || disabled) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? <ActivityIndicator color={palette.accent} size="small" /> : null}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function PremiumScreen({
  snapshot,
  onBack,
  onLoadProduct,
  onPurchase,
  onRestore,
}: {
  snapshot: CommercialSnapshot;
  onBack(): void;
  onLoadProduct(): Promise<void>;
  onPurchase(): Promise<PurchaseResult>;
  onRestore(): Promise<RestoreResult>;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scroll = useScreenScroll('premium');
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [message, setMessage] = useState<OperationMessage | null>(null);
  const product = snapshot.products[0] ?? null;
  const premium = snapshot.entitlement.status === 'premium';

  const loadProduct = async () => {
    setLoadingProduct(true);
    setMessage(null);
    try {
      await onLoadProduct();
    } catch {
      setMessage({ tone: 'error', key: 'premium.storeUnavailable' });
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    if (!product && !loadingProduct) {
      loadProduct().catch(() => undefined);
    }
    // Only retry automatically when the page is first opened. Later retries
    // remain an explicit user action so an offline storefront cannot loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const purchase = async () => {
    setMessage(null);
    try {
      const result = await onPurchase();
      setMessage(PURCHASE_MESSAGES[result.status]);
    } catch {
      setMessage({ tone: 'error', key: 'premium.purchaseFailed' });
    }
  };

  const restore = async () => {
    setMessage(null);
    try {
      const result = await onRestore();
      setMessage(RESTORE_MESSAGES[result.status]);
    } catch {
      setMessage({ tone: 'error', key: 'premium.restoreFailed' });
    }
  };

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.content}>
      <BackHeader onBack={onBack} title={t('premium.title')} />

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('premium.oneTime')}</Text>
        <Text style={styles.heroTitle}>
          {premium ? t('premium.activeTitle') : t('premium.heroTitle')}
        </Text>
        <Text style={styles.body}>
          {premium ? t('premium.activeBody') : t('premium.heroBody')}
        </Text>
        {!premium ? (
          <Text accessibilityLiveRegion="polite" style={styles.price}>
            {product?.displayPrice ??
              (loadingProduct
                ? t('premium.loadingPrice')
                : t('premium.priceUnavailable'))}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('premium.includes')}</Text>
        {(
          [
            'premium.benefitNoAds',
            'premium.benefitStartingInventory',
            'premium.benefitCompletionRewards',
            'premium.benefitFinite',
          ] as const
        ).map(key => (
          <View key={key} style={styles.benefitRow}>
            <Text accessibilityElementsHidden style={styles.bullet}>
              ✓
            </Text>
            <Text style={styles.benefitText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      {message ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            message.tone === 'success' && styles.noticeSuccess,
            message.tone === 'error' && styles.noticeError,
          ]}
        >
          <Text style={styles.noticeText}>{t(message.key)}</Text>
        </View>
      ) : null}

      {!premium ? (
        <PrimaryButton
          busy={snapshot.purchaseBusy}
          disabled={!product || snapshot.restoreBusy || loadingProduct}
          label={
            snapshot.purchaseBusy
              ? t('premium.purchasing')
              : product
              ? t('premium.buyFor', { price: product.displayPrice })
              : t('premium.buy')
          }
          onPress={() => purchase().catch(() => undefined)}
        />
      ) : null}
      {!product && !loadingProduct && !premium ? (
        <SecondaryButton
          label={t('premium.retryPrice')}
          onPress={() => loadProduct().catch(() => undefined)}
        />
      ) : null}
      <SecondaryButton
        busy={snapshot.restoreBusy}
        disabled={snapshot.purchaseBusy}
        label={
          snapshot.restoreBusy ? t('premium.restoring') : t('premium.restore')
        }
        onPress={() => restore().catch(() => undefined)}
      />
      <Text style={styles.footnote}>{t('premium.storeFootnote')}</Text>
    </ScrollView>
  );
}

function availabilityMessage(availability: AdAvailability): TranslationKey {
  if (availability.status === 'available') return 'credits.ready';
  if (availability.status === 'disabled') {
    return availability.reason === 'premium'
      ? 'credits.premiumUnavailable'
      : 'credits.inventoryFull';
  }
  if (availability.reason === 'offline') return 'credits.offline';
  if (availability.reason === 'consent') return 'credits.consentUnavailable';
  if (availability.reason === 'market') return 'credits.marketUnavailable';
  if (availability.reason === 'not_loaded') return 'credits.loadingAd';
  return 'credits.unavailable';
}

export function CreditTopUpModal({
  visible,
  resource,
  balance,
  onClose,
  onCheckAvailability,
  onRedeem,
}: {
  visible: boolean;
  resource: CreditResource;
  balance: number;
  onClose(): void;
  onCheckAvailability(): Promise<AdAvailability>;
  onRedeem(): Promise<RewardedAdRedemptionResult>;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [availability, setAvailability] = useState<AdAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<OperationMessage | null>(null);
  const resourceName = t(
    resource === 'smart_hint' ? 'credits.smartHint' : 'credits.quickPencil',
  );

  const check = async () => {
    setChecking(true);
    setResult(null);
    try {
      setAvailability(await onCheckAvailability());
    } catch {
      setAvailability({ status: 'unavailable', reason: 'offline' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setAvailability(null);
      setResult(null);
      check().catch(() => undefined);
    }
    // Opening the sheet is the sole automatic availability check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, resource]);

  const redeem = async () => {
    setRedeeming(true);
    setResult(null);
    try {
      const next = await onRedeem();
      let nextMessage: OperationMessage;
      if (next.status === 'credited') {
        nextMessage = { tone: 'success', key: 'credits.rewardSuccess' };
      } else if (next.status === 'dismissed') {
        nextMessage = { tone: 'neutral', key: 'credits.dismissed' };
      } else if (next.status === 'unavailable') {
        nextMessage = { tone: 'error', key: 'credits.unavailable' };
      } else {
        nextMessage = { tone: 'error', key: 'credits.failed' };
      }
      await check();
      setResult(nextMessage);
    } catch {
      setResult({ tone: 'error', key: 'credits.failed' });
    } finally {
      setRedeeming(false);
    }
  };

  const ready = availability?.status === 'available';
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.modalCard}>
          <Text style={styles.eyebrow}>{t('credits.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            {t('credits.title', { resource: resourceName })}
          </Text>
          <Text style={styles.body}>
            {t('credits.body', { resource: resourceName })}
          </Text>
          <Text style={styles.balance}>
            {t('credits.balance', { count: balance })}
          </Text>

          <View accessibilityLiveRegion="polite" style={styles.adStatus}>
            {checking ? (
              <ActivityIndicator color={palette.accent} size="small" />
            ) : null}
            <Text style={styles.adStatusText}>
              {checking
                ? t('credits.checking')
                : result
                ? t(result.key)
                : availability
                ? t(availabilityMessage(availability))
                : t('credits.unavailable')}
            </Text>
          </View>

          <View style={styles.modalActions}>
            <SecondaryButton label={t('app.cancel')} onPress={onClose} />
            {ready && !result ? (
              <PrimaryButton
                busy={redeeming}
                label={redeeming ? t('credits.watching') : t('credits.watch')}
                onPress={() => redeem().catch(() => undefined)}
              />
            ) : availability?.status === 'disabled' ? null : (
              <PrimaryButton
                busy={checking}
                disabled={redeeming}
                label={t('credits.retry')}
                onPress={() => check().catch(() => undefined)}
              />
            )}
          </View>
          <Text style={styles.footnote}>{t('credits.footnote')}</Text>
        </View>
      </View>
    </Modal>
  );
}

export type TrustPage = 'privacy' | 'support' | 'licenses';

const TRUST_TITLES: Readonly<Record<TrustPage, TranslationKey>> = {
  privacy: 'trust.privacyTitle',
  support: 'trust.supportTitle',
  licenses: 'trust.licensesTitle',
};

export function TrustScreen({
  page,
  onBack,
  onPrivacyOptionsRequired,
  onShowPrivacyOptions,
}: {
  page: TrustPage;
  onBack(): void;
  onPrivacyOptionsRequired?(): Promise<boolean>;
  onShowPrivacyOptions?(): Promise<boolean>;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scroll = useScreenScroll(`trust:${page}`);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<TranslationKey | null>(
    null,
  );

  useEffect(() => {
    if (page === 'privacy' && onPrivacyOptionsRequired) {
      onPrivacyOptionsRequired()
        .then(setPrivacyRequired)
        .catch(() => setPrivacyRequired(false));
    }
  }, [onPrivacyOptionsRequired, page]);

  const showPrivacyOptions = async () => {
    const shown = await onShowPrivacyOptions?.();
    setPrivacyMessage(
      shown ? 'trust.privacyUpdated' : 'trust.privacyOptionsUnavailable',
    );
  };

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.content}>
      <BackHeader onBack={onBack} title={t(TRUST_TITLES[page])} />
      {page === 'privacy' ? (
        <>
          <CopySection
            body="trust.privacyLocalBody"
            title="trust.privacyLocalTitle"
          />
          <CopySection
            body="trust.privacyAdsBody"
            title="trust.privacyAdsTitle"
          />
          <CopySection
            body="trust.privacyPurchaseBody"
            title="trust.privacyPurchaseTitle"
          />
          {privacyRequired ? (
            <SecondaryButton
              label={t('trust.managePrivacy')}
              onPress={() => showPrivacyOptions().catch(() => undefined)}
            />
          ) : (
            <Text style={styles.footnote}>{t('trust.privacyNotRequired')}</Text>
          )}
          {privacyMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
              {t(privacyMessage)}
            </Text>
          ) : null}
        </>
      ) : null}
      {page === 'support' ? (
        <>
          <CopySection
            body="trust.supportGameBody"
            title="trust.supportGameTitle"
          />
          <CopySection
            body="trust.supportPurchaseBody"
            title="trust.supportPurchaseTitle"
          />
          <CopySection
            body="trust.supportDataBody"
            title="trust.supportDataTitle"
          />
        </>
      ) : null}
      {page === 'licenses' ? (
        <>
          <Text style={styles.body}>{t('trust.licensesIntro')}</Text>
          <License name="React · React Native" license="MIT" />
          <License
            name="React Native Safe Area Context · Nitro Modules · Nitro SQLite"
            license="MIT"
          />
          <License name="react-native-google-mobile-ads" license="Apache-2.0" />
          <License name="Google Play Billing Library" license="Apache-2.0" />
          <Text style={styles.footnote}>{t('trust.licensesSystem')}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function CopySection({
  title,
  body,
}: {
  title: TranslationKey;
  body: TranslationKey;
}) {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t(title)}</Text>
      <Text style={styles.body}>{t(body)}</Text>
    </View>
  );
}

function License({ name, license }: { name: string; license: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.licenseRow}>
      <Text style={styles.licenseName}>{name}</Text>
      <Text style={styles.licenseType}>{license}</Text>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      paddingBottom: 38,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    header: { marginBottom: 22 },
    backButton: {
      alignSelf: 'flex-start',
      justifyContent: 'center',
      minHeight: 44,
    },
    backText: { color: palette.accent, fontSize: 16, fontWeight: '700' },
    title: {
      color: palette.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      marginTop: 8,
    },
    heroCard: {
      backgroundColor: palette.surface,
      borderColor: palette.accentWarm,
      borderRadius: 22,
      borderWidth: 1,
      padding: 20,
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    heroTitle: {
      color: palette.ink,
      fontSize: 25,
      fontWeight: '800',
      marginTop: 8,
    },
    body: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },
    price: {
      color: palette.ink,
      fontSize: 22,
      fontWeight: '900',
      marginTop: 18,
    },
    section: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 14,
      padding: 18,
    },
    sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
    benefitRow: { flexDirection: 'row', marginTop: 13 },
    bullet: { color: palette.accent, fontSize: 16, fontWeight: '900' },
    benefitText: {
      color: palette.ink,
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 10,
    },
    notice: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 13,
      marginTop: 14,
      padding: 13,
    },
    noticeSuccess: { backgroundColor: palette.accentSoft },
    noticeError: { backgroundColor: palette.errorSoft },
    noticeText: { color: palette.ink, fontSize: 14, lineHeight: 20 },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginTop: 14,
      minHeight: 50,
      paddingHorizontal: 18,
    },
    primaryButtonText: {
      color: palette.background,
      fontSize: 15,
      fontWeight: '800',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: palette.accent,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginTop: 10,
      minHeight: 48,
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      color: palette.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.72 },
    footnote: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 14,
    },
    modalBackdrop: {
      alignItems: 'center',
      backgroundColor: palette.modalBackdrop,
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: palette.surface,
      borderRadius: 22,
      maxWidth: 460,
      padding: 22,
      width: '100%',
    },
    modalTitle: {
      color: palette.ink,
      fontSize: 23,
      fontWeight: '800',
      marginTop: 8,
    },
    balance: {
      color: palette.ink,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 14,
    },
    adStatus: {
      alignItems: 'center',
      backgroundColor: palette.surfaceStrong,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 9,
      marginTop: 14,
      minHeight: 46,
      padding: 12,
    },
    adStatusText: { color: palette.ink, flex: 1, fontSize: 13, lineHeight: 18 },
    modalActions: {
      alignItems: 'stretch',
      flexDirection: 'column-reverse',
      marginTop: 6,
    },
    licenseRow: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 13,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 10,
      padding: 14,
    },
    licenseName: { color: palette.ink, fontSize: 14, fontWeight: '700' },
    licenseType: { color: palette.muted, fontSize: 13, marginTop: 4 },
  });
}

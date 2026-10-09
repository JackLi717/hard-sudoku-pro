import { LocalizedModal as Modal } from '../components/LocalizedModal';
import { LocalizedText as Text } from '../components/LocalizedText';
import { productAnalytics } from '../../application/analytics/contracts';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable } from '../components/FocusablePressable';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type {
  AdAvailability,
  CommercialSnapshot,
  PurchaseResult,
  ReviewerAccessResult,
  RestoreResult,
  RewardedAdRedemptionResult,
} from '../../application/commercial/contracts';
import {
  LocalizationProvider,
  TranslationKey,
  useLocalization,
} from '../../localization';
import { PRIVACY_COPY } from './privacy-copy';
import { APP_ICON_SIZE, AppIcon } from '../components/AppIcon';
import { useScreenScroll } from '../screen-state';
import { AppPalette, type ResolvedTheme, useAppTheme } from '../theme';

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
        <View style={styles.backContent}>
          <AppIcon
            color={palette.accent}
            name="back"
            size={APP_ICON_SIZE.standard}
          />
          <Text style={styles.backText}>{t('app.back')}</Text>
        </View>
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
  featured = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  featured?: boolean;
  onPress(): void;
}) {
  const { palette, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, mode), [palette, mode]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy || disabled }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        featured && styles.premiumPrimaryButton,
        (busy || disabled) && !(featured && mode === 'dark') && styles.disabled,
        featured &&
          mode === 'dark' &&
          disabled &&
          !busy &&
          styles.premiumDisabledButton,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={
            featured
              ? styles.premiumPrimaryButtonText.color
              : palette.background
          }
          size="small"
        />
      ) : null}
      <Text
        style={[
          styles.primaryButtonText,
          featured && styles.premiumPrimaryButtonText,
          featured &&
            mode === 'dark' &&
            disabled &&
            !busy &&
            styles.premiumDisabledButtonText,
        ]}
      >
        {label}
      </Text>
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
  onReviewerAccess,
  onRestore,
}: {
  snapshot: CommercialSnapshot;
  onBack(): void;
  onLoadProduct(): Promise<void>;
  onPurchase(): Promise<PurchaseResult>;
  onReviewerAccess?(code: string): ReviewerAccessResult;
  onRestore(): Promise<RestoreResult>;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, mode), [palette, mode]);
  const scroll = useScreenScroll('premium');
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [message, setMessage] = useState<OperationMessage | null>(null);
  const [reviewerAccessOpen, setReviewerAccessOpen] = useState(false);
  const [reviewerCode, setReviewerCode] = useState('');
  const [reviewerMessage, setReviewerMessage] = useState<TranslationKey | null>(
    null,
  );
  const product = snapshot.products[0] ?? null;
  const premium = snapshot.entitlement.status === 'premium';
  const closedBeta = snapshot.entitlement.source === 'closed_beta';
  const previewPrice = __DEV__ && !product ? 'US$9.99' : null;

  const loadProduct = async () => {
    setLoadingProduct(true);
    setMessage(null);
    try {
      await onLoadProduct();
    } catch {
      // The plan card already explains that the price is unavailable.
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

  const unlockReviewerAccess = () => {
    const result = onReviewerAccess?.(reviewerCode) ?? 'invalid';
    const key: Record<ReviewerAccessResult, TranslationKey> = {
      granted: 'premium.reviewerGranted',
      invalid: 'premium.reviewerInvalid',
      expired: 'premium.reviewerExpired',
    };
    setReviewerMessage(key[result]);
    if (result === 'granted') setReviewerAccessOpen(false);
  };

  return (
    <>
      <ScrollView {...scroll} contentContainerStyle={styles.premiumContent}>
        <View style={styles.premiumHero} testID="premium-hero">
          <View accessibilityElementsHidden style={styles.premiumHalo} />
          <Pressable
            accessibilityLabel={t('app.back')}
            accessibilityRole="button"
            onPress={onBack}
            style={styles.backButton}
          >
            <View style={styles.backContent}>
              <AppIcon
                color={palette.accent}
                name="back"
                size={APP_ICON_SIZE.standard}
              />
              <Text style={styles.backText}>{t('app.back')}</Text>
            </View>
          </Pressable>
          <View style={styles.premiumHeroBody}>
            <View style={styles.premiumHeroCopy}>
              <Text style={styles.premiumEyebrow}>{t('premium.title')}</Text>
              <Text accessibilityRole="header" style={styles.premiumHeroTitle}>
                {closedBeta
                  ? t('premium.closedBetaTitle')
                  : premium
                  ? t('premium.activeTitle')
                  : t('premium.heroTitle')}
              </Text>
              <Text style={styles.premiumHeroDescription}>
                {closedBeta
                  ? t('premium.closedBetaBody')
                  : premium
                  ? t('premium.activeBody')
                  : t('premium.heroBody')}
              </Text>
            </View>
            <View
              accessibilityElementsHidden
              style={styles.premiumBadge}
              testID="premium-no-ads-badge"
            >
              <Text style={styles.premiumBadgeText}>AD</Text>
              <View style={styles.premiumBadgeSlash} />
            </View>
          </View>
        </View>

        <View style={styles.premiumBody}>
          <Text style={styles.premiumSectionTitle}>
            {t(closedBeta ? 'premium.closedBetaTitle' : 'premium.includes')}
          </Text>
          {(
            [
              'premium.benefitUnlimitedHints',
              'premium.benefitAllCourses',
              'premium.benefitNoAds',
              'premium.benefitLifetime',
            ] as const
          )
            .filter(key => !closedBeta || key !== 'premium.benefitLifetime')
            .map(key => (
              <View key={key} style={styles.premiumBenefitRow}>
                <AppIcon
                  color={palette.accentWarm}
                  name="check"
                  size={APP_ICON_SIZE.navigation}
                  style={styles.premiumCheck}
                />
                <Text style={styles.premiumBenefitText}>{t(key)}</Text>
              </View>
            ))}
          {!premium ? (
            <View style={styles.premiumPlan}>
              <View style={styles.premiumPlanCopy}>
                <Text style={styles.premiumPlanLabel}>
                  {t('premium.oneTime')}
                </Text>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.premiumPlanPrice,
                    !product &&
                      !previewPrice &&
                      styles.premiumPlanPriceUnavailable,
                  ]}
                >
                  {product?.displayPrice ??
                    previewPrice ??
                    (loadingProduct
                      ? t('premium.loadingPrice')
                      : t('premium.priceUnavailable'))}
                </Text>
                {previewPrice ? (
                  <Text style={styles.premiumPreviewPrice}>
                    {t('premium.previewPrice')}
                  </Text>
                ) : null}
              </View>
              <View accessibilityElementsHidden style={styles.premiumPlanCheck}>
                <AppIcon
                  color={mode === 'dark' ? '#18201D' : palette.ink}
                  name="check"
                  size={APP_ICON_SIZE.navigation}
                />
              </View>
            </View>
          ) : null}

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
              featured
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
          <Pressable
            accessibilityLabel={
              snapshot.restoreBusy
                ? t('premium.restoring')
                : t('premium.restore')
            }
            accessibilityRole="button"
            accessibilityState={{
              busy: snapshot.restoreBusy,
              disabled: snapshot.restoreBusy || snapshot.purchaseBusy,
            }}
            disabled={snapshot.restoreBusy || snapshot.purchaseBusy}
            onPress={() => restore().catch(() => undefined)}
            style={({ pressed }) => [
              styles.premiumRestore,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.premiumRestoreText}>
              {snapshot.restoreBusy
                ? t('premium.restoring')
                : t('premium.restore')}
            </Text>
          </Pressable>
          <Text style={styles.premiumFootnote}>
            {t('premium.storeFootnote')}
          </Text>
          {!premium ? (
            <Pressable
              accessibilityLabel={t('premium.reviewerOpen')}
              accessibilityRole="button"
              onPress={() => {
                setReviewerMessage(null);
                setReviewerAccessOpen(true);
              }}
              style={styles.reviewerAccessButton}
            >
              <Text style={styles.reviewerAccessText}>
                {t('premium.reviewerOpen')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => setReviewerAccessOpen(false)}
        transparent
        visible={reviewerAccessOpen}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Text style={styles.eyebrow}>{t('premium.reviewerEyebrow')}</Text>
            <Text accessibilityRole="header" style={styles.modalTitle}>
              {t('premium.reviewerTitle')}
            </Text>
            <Text style={styles.body}>{t('premium.reviewerBody')}</Text>
            <TextInput
              accessibilityLabel={t('premium.reviewerCode')}
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={setReviewerCode}
              placeholder={t('premium.reviewerCode')}
              placeholderTextColor={palette.muted}
              style={styles.reviewerCodeInput}
              value={reviewerCode}
            />
            {reviewerMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                {t(reviewerMessage)}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <SecondaryButton
                label={t('app.cancel')}
                onPress={() => setReviewerAccessOpen(false)}
              />
              <PrimaryButton
                label={t('premium.reviewerUnlock')}
                onPress={unlockReviewerAccess}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  resource: 'smart_hint';
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

  useEffect(() => {
    if (visible && availability?.status === 'available')
      productAnalytics.track('rewarded_ad_offer_view', {
        entry: 'home_credit_store',
      });
  }, [visible, availability?.status]);
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

const TRUST_TITLES: Readonly<
  Record<Exclude<TrustPage, 'privacy'>, TranslationKey>
> = {
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
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (page === 'privacy' && onPrivacyOptionsRequired) {
      onPrivacyOptionsRequired()
        .then(setPrivacyRequired)
        .catch(() => setPrivacyRequired(false));
    }
    if (page === 'support')
      productAnalytics.track('support_action', { action: 'view' });
  }, [onPrivacyOptionsRequired, page]);

  const showPrivacyOptions = async () => {
    const shown = await onShowPrivacyOptions?.();
    setPrivacyMessage(
      shown
        ? PRIVACY_COPY.privacyUpdated
        : PRIVACY_COPY.privacyOptionsUnavailable,
    );
  };

  const content = (
    <ScrollView {...scroll} contentContainerStyle={styles.content}>
      <BackHeader
        onBack={onBack}
        title={page === 'privacy' ? PRIVACY_COPY.title : t(TRUST_TITLES[page])}
      />
      {page === 'privacy' ? (
        <>
          {PRIVACY_COPY.sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
          {privacyRequired ? (
            <SecondaryButton
              label={PRIVACY_COPY.managePrivacy}
              onPress={() => showPrivacyOptions().catch(() => undefined)}
            />
          ) : (
            <Text style={styles.footnote}>
              {PRIVACY_COPY.privacyNotRequired}
            </Text>
          )}
          {privacyMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
              {privacyMessage}
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
          <License
            name="Firebase Crashlytics Android SDK"
            license="Apache-2.0"
          />
          <Text style={styles.footnote}>{t('trust.licensesSystem')}</Text>
        </>
      ) : null}
    </ScrollView>
  );
  return page === 'privacy' ? (
    <LocalizationProvider locale="en">{content}</LocalizationProvider>
  ) : (
    content
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

function createStyles(palette: AppPalette, mode: ResolvedTheme = 'light') {
  const dark = mode === 'dark';
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
    backContent: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    title: {
      color: palette.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      marginTop: 8,
    },
    premiumContent: {
      backgroundColor: palette.background,
      flexGrow: 1,
      paddingBottom: 38,
    },
    premiumHero: {
      backgroundColor: dark ? palette.surfaceStrong : '#FCE4C0',
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      overflow: 'hidden',
      paddingBottom: 32,
      paddingHorizontal: 24,
      paddingTop: 12,
    },
    premiumHalo: {
      borderColor: dark
        ? 'rgba(240, 179, 92, 0.10)'
        : 'rgba(233, 162, 59, 0.16)',
      borderRadius: 150,
      borderWidth: 36,
      height: 250,
      position: 'absolute',
      right: -110,
      top: -80,
      width: 250,
    },
    premiumHeroBody: {
      alignItems: 'center',
      flexDirection: 'row',
      marginTop: 24,
    },
    premiumHeroCopy: { flex: 1, paddingRight: 10 },
    premiumEyebrow: {
      color: dark ? palette.accentWarm : palette.accent,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
    },
    premiumHeroTitle: {
      color: palette.ink,
      fontSize: 39,
      fontWeight: '800',
      letterSpacing: -1.2,
      lineHeight: 46,
      marginTop: 8,
    },
    premiumHeroDescription: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 10,
    },
    premiumBadge: {
      alignItems: 'center',
      backgroundColor: dark ? '#493823' : '#FFD59A',
      borderColor: dark ? palette.accentWarm : '#F3BC71',
      borderRadius: 30,
      borderWidth: 2,
      height: 88,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 88,
    },
    premiumBadgeText: {
      color: dark ? palette.accentWarm : '#895629',
      fontSize: 27,
      fontWeight: '800',
    },
    premiumBadgeSlash: {
      backgroundColor: dark ? palette.accentWarm : '#C77639',
      height: 100,
      position: 'absolute',
      transform: [{ rotate: '-45deg' }],
      width: 5,
    },
    premiumBody: { paddingHorizontal: 24, paddingTop: 27 },
    premiumSectionTitle: {
      color: palette.ink,
      fontSize: 16,
      fontWeight: '800',
    },
    premiumBenefitRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      marginTop: 19,
    },
    premiumCheck: {},
    premiumBenefitText: {
      color: palette.ink,
      flex: 1,
      fontSize: 16,
      lineHeight: 23,
      marginLeft: 13,
    },
    premiumLimitNote: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 18,
    },
    premiumPlan: {
      alignItems: 'center',
      backgroundColor: dark ? palette.panelSurface : palette.surface,
      borderColor: palette.accentWarm,
      borderRadius: 18,
      borderWidth: 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 28,
      minHeight: 96,
      paddingHorizontal: 19,
      paddingVertical: 15,
    },
    premiumPlanCopy: { flex: 1 },
    premiumPlanLabel: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '700',
    },
    premiumPlanPrice: {
      color: palette.ink,
      fontSize: 28,
      fontWeight: '800',
      marginTop: 4,
    },
    premiumPlanPriceUnavailable: {
      color: palette.muted,
      fontSize: 17,
    },
    premiumPreviewPrice: {
      color: palette.muted,
      fontSize: 11,
      marginTop: 4,
    },
    premiumPlanCheck: {
      alignItems: 'center',
      backgroundColor: palette.accentWarm,
      borderRadius: 18,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    premiumRestore: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 9,
      minHeight: 48,
    },
    premiumRestoreText: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    premiumFootnote: {
      color: palette.muted,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 13,
      textAlign: 'center',
    },
    reviewerAccessButton: {
      alignItems: 'center',
      marginTop: 12,
      minHeight: 40,
    },
    reviewerAccessText: {
      color: palette.muted,
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    reviewerCodeInput: {
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      color: palette.ink,
      fontSize: 15,
      marginTop: 16,
      minHeight: 48,
      paddingHorizontal: 13,
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    body: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
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
    premiumPrimaryButton: {
      backgroundColor: dark ? palette.accentWarm : '#F2BF58',
      borderRadius: 16,
      marginTop: 16,
      minHeight: 60,
    },
    premiumPrimaryButtonText: {
      color: dark ? '#18201D' : palette.ink,
      fontSize: 17,
    },
    premiumDisabledButton: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
    },
    premiumDisabledButtonText: { color: palette.muted },
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

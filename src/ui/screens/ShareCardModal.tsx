import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useLocalization } from '../../localization';
import { RootPageHeader } from '../components/RootPageHeader';
import { useAdaptiveLayout } from '../layout/adaptive-layout';
import { AppPalette, useAppTheme } from '../theme';
import {
  formatShareTime,
  SHARE_CARD_COPY,
  ShareCardFacts,
  shareCardLine,
} from './share-card-presentation';

const GRID_INDICES = Array.from({ length: 9 }, (_, index) => index);
const CARD_COLORS = {
  background: '#FFFEFB',
  ink: '#1C2825',
  muted: '#65716D',
  accent: '#176B57',
  line: '#C5D0CA',
  decoration: '#EDF7F2',
  badge: '#E5F5EE',
};
const TABLET_SHARE_CARD_MIN_WIDTH = 252;
const TABLET_SHARE_CARD_MAX_WIDTH = 390;
const TABLET_SHARE_VERTICAL_RESERVE = 400;

export function resolveShareCardWidth({
  height,
  tablet,
  width,
}: {
  height: number;
  tablet: boolean;
  width: number;
}): number {
  if (!tablet) return Math.min(width - (width < 380 ? 32 : 56), 390);
  return Math.min(
    width - 80,
    TABLET_SHARE_CARD_MAX_WIDTH,
    Math.max(
      TABLET_SHARE_CARD_MIN_WIDTH,
      height - TABLET_SHARE_VERTICAL_RESERVE,
    ),
  );
}

export function ShareCardModal({
  facts,
  onClose,
}: {
  facts: ShareCardFacts | null;
  onClose(): void;
}): React.JSX.Element {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={facts !== null}
    >
      {facts ? (
        Platform.OS === 'ios' ? (
          <SafeAreaProvider>
            <ShareCardContent facts={facts} onClose={onClose} />
          </SafeAreaProvider>
        ) : (
          <ShareCardContent facts={facts} onClose={onClose} />
        )
      ) : null}
    </Modal>
  );
}

export function ShareCardContent({
  facts,
  onClose,
}: {
  facts: ShareCardFacts;
  onClose(): void;
}): React.JSX.Element {
  const { locale, t } = useLocalization();
  const copy = SHARE_CARD_COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { height, width } = useWindowDimensions();
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
  const cardWidth = resolveShareCardWidth({
    height,
    tablet: useLandscapeTabletLayout,
    width,
  });
  const cardRef = useRef<React.ElementRef<typeof View>>(null);
  const [laidOut, setLaidOut] = useState(false);
  const [captureAttempt, setCaptureAttempt] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<'capture' | 'share' | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!laidOut || !cardRef.current) return;
    let cancelled = false;
    setImageUri(null);
    setError(null);
    const timer = setTimeout(() => {
      if (!cardRef.current) return;
      const handle = findNodeHandle(cardRef.current);
      if (!handle) {
        if (!cancelled) setError('capture');
        return;
      }
      try {
        const { captureRef } = require('react-native-view-shot') as {
          captureRef(
            viewHandle: number,
            options: { format: 'png'; result: 'tmpfile' },
          ): Promise<string>;
        };
        captureRef(handle, { format: 'png', result: 'tmpfile' })
          .then(uri => {
            if (!cancelled) setImageUri(uri);
          })
          .catch(() => {
            if (!cancelled) setError('capture');
          });
      } catch {
        if (!cancelled) setError('capture');
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [laidOut, captureAttempt, cardWidth]);

  const share = async () => {
    if (!imageUri || sharing) return;
    setSharing(true);
    setError(null);
    try {
      const Share = (
        require('react-native-share') as typeof import('react-native-share')
      ).default;
      await Share.open({
        url: imageUri,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch {
      setError('share');
    } finally {
      setSharing(false);
    }
  };

  const shareCard = (
    <View
      style={[styles.cardShell, { width: cardWidth }]}
      testID="share-card-shell"
    >
      <View
        collapsable={false}
        onLayout={() => setLaidOut(true)}
        ref={cardRef}
        style={styles.card}
        testID="share-card"
      >
        <View pointerEvents="none" style={styles.topDecoration} />
        <View pointerEvents="none" style={styles.bottomDecoration} />
        <View style={styles.cardContent}>
          <Text allowFontScaling={false} style={styles.brand}>
            {t('home.title').toUpperCase()}
          </Text>
          {facts.kind === 'current_board' || facts.isNewRecord ? (
            <View style={styles.badge}>
              {facts.kind === 'result' ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.trophy}
                >
                  <View style={styles.trophyLeftHandle} />
                  <View style={styles.trophyRightHandle} />
                  <View style={styles.trophyCup} />
                  <View style={styles.trophyStem} />
                  <View style={styles.trophyBase} />
                </View>
              ) : null}
              <Text allowFontScaling={false} style={styles.badgeText}>
                {(facts.kind === 'current_board'
                  ? copy.replayBadge(facts.step)
                  : copy.badge.newRecord
                ).toUpperCase()}
              </Text>
            </View>
          ) : null}
          <Text
            allowFontScaling={false}
            style={[styles.headline, cardWidth < 330 && styles.compactHeadline]}
          >
            {facts.kind === 'result'
              ? copy.line[shareCardLine(facts)]
              : facts.step < facts.totalSteps
              ? copy.currentBoardLine
              : copy.finalBoardLine}
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.metrics, cardWidth < 330 && styles.compactMetrics]}
          >
            {facts.kind === 'result' ? (
              <>
                <Text style={styles.metricHighlight}>
                  {formatShareTime(facts.elapsedMs)}
                </Text>
                {'  ·  '}
                {t('game.level', { level: facts.difficultyLevel })}
                {'  ·  '}
                {copy.mistakes(facts.mistakes)}
                {'  ·  '}
                {copy.hints(facts.hints)}
              </>
            ) : (
              t('game.level', { level: facts.difficultyLevel })
            )}
          </Text>
          <View style={styles.board} testID="share-card-board">
            {GRID_INDICES.map(row => (
              <View key={row} style={styles.boardRow}>
                {GRID_INDICES.map(column => {
                  const cell = row * 9 + column;
                  const value = facts.boardSnapshot.values[cell];
                  return (
                    <View
                      key={cell}
                      style={[
                        styles.cell,
                        column % 3 === 0 && styles.boxLeft,
                        row % 3 === 0 && styles.boxTop,
                      ]}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.digit,
                          cardWidth < 330 && styles.compactDigit,
                          facts.boardSnapshot.givens[cell] !== null &&
                            styles.givenDigit,
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <Text allowFontScaling={false} style={styles.challenge}>
            {facts.kind === 'result'
              ? copy.challenge
              : facts.step < facts.totalSteps
              ? copy.currentBoardChallenge
              : copy.finalBoardChallenge}
          </Text>
          <View style={styles.footerRow}>
            <View style={styles.footerRule} />
            <Text allowFontScaling={false} style={styles.footer}>
              {t('home.title').toUpperCase()}
            </Text>
            <View style={styles.footerRule} />
          </View>
        </View>
      </View>
    </View>
  );
  const actions = (
    <View
      style={[
        styles.actions,
        useLandscapeTabletLayout && styles.tabletActions,
        useLandscapeTabletLayout && { width: cardWidth },
      ]}
      testID="share-card-actions"
    >
      {error ? (
        <Text style={styles.error}>
          {error === 'capture' ? copy.failed : copy.shareFailed}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !imageUri || sharing }}
        disabled={!imageUri || sharing}
        onPress={share}
        style={[styles.shareButton, (!imageUri || sharing) && styles.disabled]}
        testID="share-card-export"
      >
        {sharing || (!imageUri && !error) ? (
          <ActivityIndicator color={palette.white} />
        ) : null}
        <Text style={styles.shareText}>
          {sharing || (!imageUri && !error) ? copy.preparing : copy.share}
        </Text>
      </Pressable>
      {error === 'capture' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setCaptureAttempt(attempt => attempt + 1)}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>{copy.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <RootPageHeader
        backLabel={t('app.back')}
        onBack={onClose}
        title={copy.title}
      />
      {useLandscapeTabletLayout ? (
        <View style={styles.tabletContent} testID="share-card-tablet-static">
          {shareCard}
          {actions}
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            style={styles.scroll}
            testID="share-card-scroll"
          >
            {shareCard}
          </ScrollView>
          {actions}
        </>
      )}
    </SafeAreaView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    scroll: { flex: 1 },
    scrollContent: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    tabletContent: {
      alignItems: 'center',
      flex: 1,
      gap: 14,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    cardShell: {
      borderRadius: 22,
      backgroundColor: CARD_COLORS.background,
      shadowColor: '#22352D',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.13,
      shadowRadius: 19,
      elevation: 8,
    },
    card: {
      borderRadius: 22,
      backgroundColor: CARD_COLORS.background,
      overflow: 'hidden',
    },
    topDecoration: {
      position: 'absolute',
      top: -125,
      left: -80,
      width: 275,
      height: 245,
      borderRadius: 130,
      backgroundColor: CARD_COLORS.decoration,
      transform: [{ rotate: '-16deg' }],
    },
    bottomDecoration: {
      position: 'absolute',
      right: -100,
      bottom: -145,
      width: 270,
      height: 240,
      borderRadius: 130,
      backgroundColor: CARD_COLORS.decoration,
      transform: [{ rotate: '-18deg' }],
    },
    cardContent: {
      alignItems: 'center',
      paddingBottom: 22,
      paddingHorizontal: 24,
      paddingTop: 22,
    },
    brand: {
      color: CARD_COLORS.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 4,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: CARD_COLORS.badge,
      borderRadius: 18,
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      marginTop: 18,
      minHeight: 32,
      paddingHorizontal: 17,
    },
    trophy: { height: 20, width: 23 },
    trophyCup: {
      position: 'absolute',
      top: 2,
      left: 4,
      width: 15,
      height: 10,
      borderBottomLeftRadius: 7,
      borderBottomRightRadius: 7,
      backgroundColor: CARD_COLORS.accent,
    },
    trophyLeftHandle: {
      position: 'absolute',
      top: 3,
      left: 0,
      width: 7,
      height: 8,
      borderColor: CARD_COLORS.accent,
      borderWidth: 2,
      borderRadius: 5,
    },
    trophyRightHandle: {
      position: 'absolute',
      top: 3,
      right: 0,
      width: 7,
      height: 8,
      borderColor: CARD_COLORS.accent,
      borderWidth: 2,
      borderRadius: 5,
    },
    trophyStem: {
      position: 'absolute',
      top: 12,
      left: 10,
      width: 3,
      height: 5,
      backgroundColor: CARD_COLORS.accent,
    },
    trophyBase: {
      position: 'absolute',
      top: 17,
      left: 5,
      width: 13,
      height: 2,
      borderRadius: 1,
      backgroundColor: CARD_COLORS.accent,
    },
    badgeText: {
      color: CARD_COLORS.accent,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.7,
    },
    headline: {
      color: CARD_COLORS.ink,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: -1.1,
      lineHeight: 38,
      marginTop: 17,
      textAlign: 'center',
    },
    compactHeadline: {
      fontSize: 29,
      lineHeight: 33,
    },
    metrics: {
      color: CARD_COLORS.muted,
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 20,
      marginBottom: 17,
      marginTop: 12,
      textAlign: 'center',
    },
    compactMetrics: { fontSize: 11 },
    metricHighlight: { color: CARD_COLORS.accent, fontWeight: '800' },
    board: {
      alignSelf: 'stretch',
      aspectRatio: 1,
      borderBottomColor: CARD_COLORS.ink,
      borderBottomWidth: 2,
      borderRightColor: CARD_COLORS.ink,
      borderRightWidth: 2,
    },
    boardRow: { flex: 1, flexDirection: 'row' },
    cell: {
      alignItems: 'center',
      borderLeftColor: CARD_COLORS.line,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderTopColor: CARD_COLORS.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flex: 1,
      justifyContent: 'center',
    },
    boxLeft: { borderLeftColor: CARD_COLORS.ink, borderLeftWidth: 2 },
    boxTop: { borderTopColor: CARD_COLORS.ink, borderTopWidth: 2 },
    digit: { color: CARD_COLORS.accent, fontSize: 19, fontWeight: '600' },
    compactDigit: { fontSize: 16 },
    givenDigit: { color: CARD_COLORS.ink, fontWeight: '800' },
    challenge: {
      color: CARD_COLORS.muted,
      fontSize: 15,
      marginTop: 17,
      textAlign: 'center',
    },
    footerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 11,
      marginTop: 21,
    },
    footerRule: {
      backgroundColor: CARD_COLORS.line,
      height: 1,
      width: 22,
    },
    footer: {
      color: CARD_COLORS.muted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 3,
    },
    actions: { paddingHorizontal: 16, paddingVertical: 16 },
    tabletActions: {
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    shareButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      minHeight: 52,
    },
    disabled: { opacity: 0.65 },
    shareText: { color: palette.white, fontSize: 16, fontWeight: '800' },
    error: { color: palette.error, marginBottom: 8, textAlign: 'center' },
    retryButton: { alignItems: 'center', padding: 10 },
    retryText: { color: palette.accent, fontWeight: '700' },
  });
}

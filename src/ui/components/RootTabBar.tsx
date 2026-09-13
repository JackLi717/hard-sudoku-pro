import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalization } from '../../localization';
import { ROOT_PAGE } from '../root-page-design';
import { AppPalette, useAppTheme } from '../theme';
import { RootTabIcon } from './RootTabIcon';

export type RootTab = 'home' | 'replay' | 'statistics';

const tabs: readonly {
  tab: RootTab;
  label: 'tab.home' | 'tab.replay' | 'tab.statistics';
}[] = [
  { tab: 'home', label: 'tab.home' },
  { tab: 'replay', label: 'tab.replay' },
  { tab: 'statistics', label: 'tab.statistics' },
];

export function RootTabBar({
  activeTab,
  onSelect,
}: {
  activeTab: RootTab;
  onSelect(tab: RootTab): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.tabBar}>
      {tabs.map(({ tab, label }) => (
        <Pressable
          accessibilityLabel={t(label)}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab }}
          key={tab}
          onPress={() => onSelect(tab)}
          style={styles.tab}
          testID={`tab-${tab}`}
        >
          <RootTabIcon
            color={activeTab === tab ? palette.accent : palette.muted}
            name={tab}
          />
          <Text
            maxFontSizeMultiplier={1.4}
            style={[
              styles.tabLabel,
              activeTab === tab && styles.tabLabelActive,
            ]}
          >
            {t(label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    tabBar: {
      backgroundColor: palette.surface,
      borderTopColor: palette.line,
      borderTopWidth: ROOT_PAGE.dividerWidth,
      flexDirection: 'row',
      minHeight: ROOT_PAGE.tabBarHeight,
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: ROOT_PAGE.tabBarHeight,
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    tabLabel: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
      textAlign: 'center',
    },
    tabLabelActive: {
      color: palette.accent,
      fontWeight: '700',
    },
  });
}

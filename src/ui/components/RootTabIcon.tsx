import React from 'react';
import { StyleSheet, View } from 'react-native';

export type RootTabIconName = 'home' | 'replay' | 'statistics';

export function RootTabIcon({
  name,
  color,
}: {
  name: RootTabIconName;
  color: string;
}): React.JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.canvas}
      testID={`tab-icon-${name}`}
    >
      {name === 'home' ? (
        <>
          <View
            style={[
              styles.homeRoof,
              { borderLeftColor: color, borderTopColor: color },
            ]}
          />
          <View style={[styles.homeWalls, { borderColor: color }]} />
          <View style={[styles.homeDoor, { borderColor: color }]} />
        </>
      ) : null}
      {name === 'replay' ? (
        <>
          <View style={[styles.clockOutline, { borderColor: color }]} />
          <View style={[styles.clockHourHand, { backgroundColor: color }]} />
          <View style={[styles.clockMinuteHand, { backgroundColor: color }]} />
        </>
      ) : null}
      {name === 'statistics' ? (
        <>
          <View style={[styles.barShort, { borderColor: color }]} />
          <View style={[styles.barMedium, { borderColor: color }]} />
          <View style={[styles.barTall, { borderColor: color }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { height: 24, width: 24 },
  homeRoof: {
    borderLeftWidth: 1.7,
    borderTopWidth: 1.7,
    height: 13,
    left: 5.5,
    position: 'absolute',
    top: 3,
    transform: [{ rotate: '45deg' }],
    width: 13,
  },
  homeWalls: {
    borderBottomWidth: 1.7,
    borderLeftWidth: 1.7,
    borderRightWidth: 1.7,
    height: 11,
    left: 4,
    position: 'absolute',
    top: 11,
    width: 16,
  },
  homeDoor: {
    borderLeftWidth: 1.7,
    borderRightWidth: 1.7,
    borderTopWidth: 1.7,
    height: 7,
    left: 9,
    position: 'absolute',
    top: 15,
    width: 6,
  },
  clockOutline: {
    borderRadius: 10,
    borderWidth: 1.7,
    height: 20,
    left: 2,
    position: 'absolute',
    top: 2,
    width: 20,
  },
  clockHourHand: {
    height: 6,
    left: 11.2,
    position: 'absolute',
    top: 6,
    width: 1.7,
  },
  clockMinuteHand: {
    height: 1.7,
    left: 11.2,
    position: 'absolute',
    top: 10.5,
    width: 5,
  },
  barShort: {
    borderRadius: 1.5,
    borderWidth: 1.7,
    bottom: 2,
    height: 8,
    left: 2,
    position: 'absolute',
    width: 5,
  },
  barMedium: {
    borderRadius: 1.5,
    borderWidth: 1.7,
    bottom: 2,
    height: 13,
    left: 9.5,
    position: 'absolute',
    width: 5,
  },
  barTall: {
    borderRadius: 1.5,
    borderWidth: 1.7,
    bottom: 2,
    height: 18,
    left: 17,
    position: 'absolute',
    width: 5,
  },
});

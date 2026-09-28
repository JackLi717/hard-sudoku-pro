import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Corner brackets distinguish batch selection without relying on color alone. */
export function BatchSelectionFrame({
  color,
  testID,
}: {
  color: string;
  testID?: string;
}) {
  return (
    <View pointerEvents="none" style={styles.frame} testID={testID}>
      {[
        styles.topLeft,
        styles.topRight,
        styles.bottomLeft,
        styles.bottomRight,
      ].map((corner, index) => (
        <View
          key={index}
          style={[styles.corner, corner, { borderColor: color }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', inset: 2 },
  corner: { position: 'absolute', width: 8, height: 8 },
  topLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
});

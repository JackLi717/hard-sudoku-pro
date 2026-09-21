import React from 'react';
import { View } from 'react-native';
import { AppIcon } from './AppIcon';

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
      testID={`tab-icon-${name}`}
    >
      <AppIcon color={color} name={name} />
    </View>
  );
}

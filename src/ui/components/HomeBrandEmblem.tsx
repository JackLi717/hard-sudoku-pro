import React, { useId } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Pattern,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useAppTheme } from '../theme';

const DIGITS = [1, null, 3, null, 5, null, 7, null, 9] as const;
const OFFSETS = [0, 0.26, 0.44, 0.79, 1];
const METAL = {
  light: {
    face: ['#EEF0E8', '#C5CCC1', '#F7F7ED', '#B5BEB2', '#D7DDD1'],
    edge: '#8C938A',
    base: '#7C857B',
    digit: '#35423A',
    highlight: '#FFFFFF',
    shadowOpacity: 0.1,
  },
  dark: {
    face: ['#D2D9CE', '#A5B1A4', '#E5EADD', '#8C9C8F', '#B9C4B5'],
    edge: '#7E8982',
    base: '#57635B',
    digit: '#1A2C23',
    highlight: '#F3FFF0',
    shadowOpacity: 0.24,
  },
} as const;

/** Decorative brand artwork: bevels and fine grain stay crisp at tablet scale. */
export function HomeBrandEmblem(): React.JSX.Element {
  const { mode } = useAppTheme();
  const id = `home-metal-${useId().replace(/:/g, '')}`;
  const metal = METAL[mode];
  const fontFamily = Platform.select({ ios: 'Georgia', default: 'serif' });
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.emblem}
      testID="home-brand-emblem"
    >
      <Svg height={160} width={160} viewBox="-4 -4 152 154">
        <Defs>
          <LinearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="1">
            {metal.face.map((color, index) => (
              <Stop key={index} offset={OFFSETS[index]} stopColor={color} />
            ))}
          </LinearGradient>
          <LinearGradient id={`${id}-green`} x1="0" y1="0" x2="1" y2="1">
            {['#4E7966', '#1E4D3B', '#507D66', '#143E2E', '#315C46'].map(
              (color, index) => (
                <Stop key={index} offset={OFFSETS[index]} stopColor={color} />
              ),
            )}
          </LinearGradient>
          <LinearGradient id={`${id}-rim`} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset={0} stopColor={metal.highlight} stopOpacity={0.85} />
            <Stop offset={0.5} stopColor={metal.highlight} stopOpacity={0.22} />
            <Stop offset={1} stopColor="#203426" stopOpacity={0.28} />
          </LinearGradient>
          <Pattern
            id={`${id}-grain`}
            patternUnits="userSpaceOnUse"
            width={44}
            height={1.5}
          >
            <Rect width={44} height={0.55} fill="#FFFFFF" fillOpacity={0.08} />
            <Rect
              y={0.8}
              width={44}
              height={0.4}
              fill="#16231E"
              fillOpacity={0.035}
            />
          </Pattern>
        </Defs>
        {DIGITS.map((digit, index) => {
          const accent = digit === 3;
          const digitColor = accent ? '#E8EFE0' : metal.digit;
          return (
            <G
              key={index}
              transform={`translate(${(index % 3) * 50}, ${
                Math.floor(index / 3) * 50
              })`}
            >
              <Rect
                x={-1}
                y={3}
                width={46}
                height={45}
                rx={8}
                fill="#102319"
                opacity={metal.shadowOpacity * 0.45}
              />
              <Rect
                y={3}
                width={44}
                height={44}
                rx={7}
                fill="#102319"
                opacity={metal.shadowOpacity}
              />
              <Rect
                y={2}
                width={44}
                height={44}
                rx={7}
                fill={accent ? '#21372A' : metal.base}
              />
              <Rect
                width={44}
                height={44}
                rx={7}
                fill={`url(#${id}-${accent ? 'green' : 'silver'})`}
                stroke={accent ? '#72937E' : metal.edge}
                strokeWidth={0.8}
              />
              <Rect
                x={0.5}
                y={0.5}
                width={43}
                height={43}
                rx={6.5}
                fill={`url(#${id}-grain)`}
                stroke={`url(#${id}-rim)`}
                strokeWidth={1}
              />
              {digit !== null ? (
                <>
                  <SvgText
                    x={22}
                    y={31.6}
                    textAnchor="middle"
                    fontFamily={fontFamily}
                    fontSize={28}
                    fill={accent ? '#092616' : '#FFFFFF'}
                    opacity={0.8}
                  >
                    {digit}
                  </SvgText>
                  <SvgText
                    x={22}
                    y={30.8}
                    textAnchor="middle"
                    fontFamily={fontFamily}
                    fontSize={28}
                    fill={digitColor}
                  >
                    {digit}
                  </SvgText>
                </>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emblem: {
    height: 160,
    width: 160,
    marginBottom: 30,
    transform: [{ rotate: '-7deg' }],
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TechniqueCode } from '../../domain/hints/techniques';
import { useAppTheme } from '../theme';
import { RecordPreview } from './record-preview';

/** Abstract unit/pattern symbol, deliberately not a solved example or a badge. */
export function TechniqueGraphic({
  code,
  size = 48,
}: {
  code: TechniqueCode;
  size?: number;
}) {
  const { palette: p } = useAppTheme();
  const corners = /Wing|fish|Rectangle/i.test(code);
  const chain = /Chain|Net|Coloring|aic/i.test(code);
  const subset = /Pair|Triple|Quad|locked/i.test(code);
  const marks = corners
    ? [0, 2, 6, 8]
    : chain
    ? [0, 3, 4, 7, 8]
    : subset
    ? [3, 4, 5]
    : [4];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.symbol,
        {
          width: size,
          height: size,
          gap: size * 0.06,
        },
      ]}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.symbolCell,
            {
              width: size * 0.293,
              height: size * 0.293,
              backgroundColor: marks.includes(i) ? p.accent : p.accentSoft,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Actual pre-action values, without miniature candidate text or cell controls. */
export function RecordBoard({
  preview,
  size,
  label,
}: {
  preview: RecordPreview;
  size: number;
  label: string;
}) {
  const { palette: p } = useAppTheme();
  return (
    <View
      testID="growth-record-board"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.board,
        {
          width: size,
          height: size,
          borderColor: p.lineStrong,
          backgroundColor: p.surface,
        },
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.grid}
      >
        {Array.from({ length: 9 }, (_, row) => (
          <View key={row} style={styles.boardRow}>
            {preview.values.slice(row * 9, row * 9 + 9).map((value, column) => {
              const i = row * 9 + column;
              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    i === preview.focus && { backgroundColor: p.hintResult },
                    i % 3 === 2 && styles.rightBox,
                    Math.floor(i / 9) % 3 === 2 && styles.bottomBox,
                    i % 9 === 8 && styles.rightEdge,
                    i >= 72 && styles.bottomEdge,
                    {
                      borderRightColor: i % 3 === 2 ? p.lineStrong : p.line,
                      borderBottomColor:
                        Math.floor(i / 9) % 3 === 2 ? p.lineStrong : p.line,
                    },
                  ]}
                >
                  {value !== null ? (
                    <Text
                      allowFontScaling={false}
                      style={[
                        preview.givens[i] !== null
                          ? styles.given
                          : styles.entered,
                        {
                          fontSize: size / 18,
                          color: preview.givens[i] !== null ? p.ink : p.accent,
                        },
                      ]}
                    >
                      {value}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  symbol: { flexDirection: 'row', flexWrap: 'wrap' },
  symbolCell: { borderRadius: 3 },
  board: { borderWidth: 1.5 },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rightBox: { borderRightWidth: 1.5 },
  bottomBox: { borderBottomWidth: 1.5 },
  rightEdge: { borderRightWidth: 0 },
  bottomEdge: { borderBottomWidth: 0 },
  given: { fontWeight: '700' },
  entered: { fontWeight: '400' },
  grid: { flex: 1 },
  boardRow: { flex: 1, flexDirection: 'row' },
});

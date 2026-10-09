import { localizeCopies } from './catalog';
import type { LessonLocale } from '../domain/lessons/contracts';
import type { TermConceptArticlePattern } from '../data/lessons/term-concept-article-patterns';
import { ARTICLE_PATTERN_LABELS } from './technique-articles';

const SET_SIZE_LABELS: Record<
  LessonLocale,
  Record<'pair' | 'triple' | 'quad', string>
> = localizeCopies({
  'zh-Hans': { pair: '对', triple: '三数组', quad: '四数组' },
  en: { pair: 'Pair', triple: 'Triple', quad: 'Quad' },
  ja: { pair: 'ペア', triple: 'トリプル', quad: 'クアッド' },
  de: { pair: 'Paar', triple: 'Drilling', quad: 'Vierer' },
});

const SIMPLE_LABELS: Record<
  LessonLocale,
  Partial<Record<TermConceptArticlePattern, string>>
> = localizeCopies({
  'zh-Hans': {
    'all-peers': '全部同伴格',
    short: '短链',
    long: '长链',
    'two-nodes': '2 节点',
    'three-nodes': '3 节点',
    'four-nodes': '4 节点',
    horizontal: '横向',
    vertical: '纵向',
    'two-branches': '2 分支',
    'three-branches': '3 分支',
    'four-branches': '4 分支',
  },
  en: {
    'all-peers': 'All peers',
    short: 'Short chain',
    long: 'Long chain',
    'two-nodes': '2 nodes',
    'three-nodes': '3 nodes',
    'four-nodes': '4 nodes',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    'two-branches': '2 branches',
    'three-branches': '3 branches',
    'four-branches': '4 branches',
  },
  ja: {
    'all-peers': 'すべてのピア',
    short: '短いチェーン',
    long: '長いチェーン',
    'two-nodes': '2 節点',
    'three-nodes': '3 節点',
    'four-nodes': '4 節点',
    horizontal: '横向き',
    vertical: '縦向き',
    'two-branches': '2 分岐',
    'three-branches': '3 分岐',
    'four-branches': '4 分岐',
  },
  de: {
    'all-peers': 'Alle Peers',
    short: 'Kurze Kette',
    long: 'Lange Kette',
    'two-nodes': '2 Knoten',
    'three-nodes': '3 Knoten',
    'four-nodes': '4 Knoten',
    horizontal: 'Waagerecht',
    vertical: 'Senkrecht',
    'two-branches': '2 Zweige',
    'three-branches': '3 Zweige',
    'four-branches': '4 Zweige',
  },
});

const RELATION_LABELS: Record<
  LessonLocale,
  Record<'pointing' | 'claiming' | 'xWing' | 'swordfish', string>
> = localizeCopies({
  'zh-Hans': {
    pointing: '宫指向',
    claiming: '行列占位',
    xWing: 'X-Wing',
    swordfish: '剑鱼',
  },
  en: {
    pointing: 'Pointing',
    claiming: 'Claiming',
    xWing: 'X-Wing',
    swordfish: 'Swordfish',
  },
  ja: {
    pointing: 'Pointing',
    claiming: 'Claiming',
    xWing: 'X-Wing',
    swordfish: 'Swordfish',
  },
  de: {
    pointing: 'Pointing',
    claiming: 'Claiming',
    xWing: 'X-Wing',
    swordfish: 'Schwertfisch',
  },
});

export function conceptArticlePatternLabel(
  locale: LessonLocale,
  pattern: TermConceptArticlePattern,
): string {
  if (pattern === 'default') return '';
  const simple = SIMPLE_LABELS[locale][pattern];
  if (simple) return simple;
  if (
    pattern === 'row' ||
    pattern === 'column' ||
    pattern === 'box' ||
    pattern === 'cell'
  )
    return ARTICLE_PATTERN_LABELS[locale][pattern];
  const [family, unit] = pattern.split('-') as [
    (
      | 'pair'
      | 'triple'
      | 'quad'
      | 'pointing'
      | 'claiming'
      | 'xWing'
      | 'swordfish'
    ),
    'row' | 'column' | 'box',
  ];
  const familyLabel =
    family === 'pair' || family === 'triple' || family === 'quad'
      ? SET_SIZE_LABELS[locale][family]
      : RELATION_LABELS[locale][family];
  return `${familyLabel} · ${ARTICLE_PATTERN_LABELS[locale][unit]}`;
}

import { TECHNIQUES, type TechniqueCode } from '../hints/techniques';

const PREMIUM_COURSE_TECHNIQUES: ReadonlySet<TechniqueCode> = new Set([
  'uniqueRectangle',
  'uniqueRectangleType4',
  'hiddenRectangle',
  'avoidableRectangle',
  'bugPlusOne',
  ...TECHNIQUES.filter(item => item.level === 5).map(item => item.code),
]);

export function requiresPremiumCourse(technique: TechniqueCode): boolean {
  return PREMIUM_COURSE_TECHNIQUES.has(technique);
}

import { SessionReviewEntry } from '../application/technique-recognition/session-review';

const english = {
  entry: 'Game technique review · Dev',
  title: 'Game technique review',
  back: 'Back to result',
  list: 'Back to records',
  refresh: 'Refresh',
  intro:
    'Internal prototype · System explanations of recorded actions, not proof of the technique you had in mind. No growth score or mastery is recorded.',
  boundary:
    'Original action segments are retained. Shared opportunity evidence is grouped by the attribution layer, not counted as repeated discoveries. New hint exposures survive restarts; missing historical evidence cannot establish independence.',
  loading: 'Reading local diagnostics…',
  failed:
    'Local diagnostics could not be read. You can retry or return to the result.',
  empty:
    'No local diagnostic records for this game. This does not mean no techniques were used.',
  summary: 'System explanations in this game',
  noExplanation: 'No confirmed system explanation in the available records.',
  count: 'records',
  segment: 'Record',
  opportunity: 'Shared opportunity',
  ambiguousOpportunity: 'Opportunity identity ambiguous · not counted',
  missingOpportunity: 'Opportunity evidence unavailable · not counted',
  open: 'View board and actions',
  start: 'Starting board',
  effects: 'Action marks',
  boardNote:
    'Saved analysis candidates, not your pencil marks. Action marks show only recorded placements and explicit deletions on the starting board; automatic candidate cleanup is excluded.',
  actual: 'Recorded actions',
  missing:
    'Starting board or action evidence is unavailable. No board has been reconstructed from the completed puzzle.',
  missingHint:
    'Historical hint-source evidence is missing. Saved technique labels cannot establish unassisted attribution.',
  candidates: 'Retained candidate explanations',
  candidatesNote:
    'Candidate explanations are retained for inspection. Their presence does not override the record’s eligibility status.',
  none: 'None retained',
  defaultNote:
    'System default: the lowest human-cost reasonable explanation among the saved candidates. This is not a measurement of your effort.',
  hints: 'Recorded hint sources',
  assisted: 'Actions affected by hints',
  noAffected:
    'No directly assisted effect recorded. This does not prove the technique you had in mind.',
  place: 'Place',
  remove: 'Delete candidate',
  applied: 'Applied',
  shown: 'Known / shown',
  hintEffects: 'Hint effects',
  revision: 'Starting revision',
};

const chinese: typeof english = {
  entry: '单局技巧回顾 · 开发模式',
  title: '单局技巧回顾',
  back: '返回完成页',
  list: '返回记录列表',
  refresh: '刷新',
  intro:
    '内部原型 · 展示系统对已记录动作的解释，不证明你脑中使用了该技巧。不记录成长评分或掌握度。',
  boundary:
    '保留原始动作片段，由归因层关联同一技巧机会；片段数量不代表独立发现次数。新提示的曝光证据跨重启保留；缺失的历史证据不能证明独立性。',
  loading: '正在读取本地诊断…',
  failed: '暂时无法读取本地诊断。可刷新重试或返回完成页。',
  empty: '本局没有本地诊断记录，不代表没有使用技巧。',
  summary: '本局的系统解释',
  noExplanation: '现有记录中没有可确认的系统默认解释。',
  count: '条记录',
  segment: '记录',
  opportunity: '关联技巧机会',
  ambiguousOpportunity: '技巧机会有歧义 · 不计数',
  missingOpportunity: '缺少技巧机会证据 · 不计数',
  open: '查看盘面与动作',
  start: '起始盘面',
  effects: '动作标记',
  boardNote:
    '候选来自保存的分析状态，并非你的草稿。动作标记只在起始盘面上标出已记录的落数和明确删除，不包含自动清理候选。',
  actual: '已记录动作',
  missing: '缺少起始盘面或动作证据，未从完成后的棋盘推测还原。',
  missingHint:
    '历史记录缺少提示来源，不能依据旧技巧标签认定为无提示辅助的归因。',
  candidates: '保留的候选解释',
  candidatesNote:
    '候选解释供检查使用；即使存在候选，也不改变该记录的归因准入状态。',
  none: '未保留候选解释',
  defaultNote:
    '系统按已保存候选中的最低人力成本选择默认合理解释，并非测量你的实际用力程度。',
  hints: '已记录的提示来源',
  assisted: '受提示影响的动作',
  noAffected: '未记录直接受助效果；这不证明你脑中使用了哪种技巧。',
  place: '填入',
  remove: '删除候选',
  applied: '已应用',
  shown: '已知／已展示',
  hintEffects: '提示效果',
  revision: '起始修订',
};

export function sessionReviewCopy(locale: string) {
  return locale === 'zh-Hans' ? chinese : english;
}

export function reviewStatus(
  entry: SessionReviewEntry,
  chineseLocale: boolean,
): string {
  const labels = chineseLocale
    ? {
        explained: '系统识别为',
        hint_assisted: '提示辅助 · 不归因',
        invalidated: '归因失效',
        insufficient: '证据不足',
      }
    : {
        explained: 'System explanation',
        hint_assisted: 'Hint assisted · no attribution',
        invalidated: 'Attribution invalidated',
        insufficient: 'Insufficient evidence',
      };
  return labels[entry.status];
}

export function reviewReason(
  reason: SessionReviewEntry['reason'],
  chineseLocale: boolean,
): string {
  if (reason === null) {
    return '';
  }
  const labels: Record<
    NonNullable<SessionReviewEntry['reason']>,
    [string, string]
  > = {
    hint_polluted: [
      '提示影响了该片段，不能作无辅助归因。',
      'Hint exposure or assistance prevents unassisted attribution.',
    ],
    undo_polluted: ['关联动作已撤销。', 'The associated action was undone.'],
    restore_polluted: [
      '候选恢复、擦除或恢复会话使证据失效。',
      'Restoration, erasure or session recovery invalidated the evidence.',
    ],
    revision_expired: [
      '分析返回时，棋盘修订已过期。',
      'The board revision expired before analysis returned.',
    ],
    board_fingerprint_mismatch: [
      '分析与棋盘状态不一致。',
      'Analysis did not match the board state.',
    ],
    rapid_operation_polluted: [
      '连续操作无法可靠排序。',
      'Rapid operations could not be reliably ordered.',
    ],
    incomplete_opportunity_set: [
      '技巧机会未完整枚举，不能选择默认解释。',
      'Opportunity enumeration was incomplete; no default can be chosen.',
    ],
    invalid_effect: [
      '动作未通过分析输入检查。',
      'The action did not pass analysis input checks.',
    ],
    analysis_cancelled: ['分析已取消。', 'Analysis was cancelled.'],
    analysis_failed: ['分析失败。', 'Analysis failed.'],
    missing_request: [
      '缺少可查看的起始盘面和动作证据。',
      'Starting board and action evidence are unavailable.',
    ],
    missing_hint_source: [
      '历史提示来源缺失，未确认归因。',
      'Historical hint provenance is missing; attribution is unverified.',
    ],
    no_match: [
      '保存的分析未找到可解释该片段的技巧。',
      'Saved analysis found no technique explaining this segment.',
    ],
    unfinished: [
      '尚无最终分析记录，可稍后刷新；不会把暂定结果算作识别。',
      'No final analysis record yet. Refresh later; provisional matches are not counted.',
    ],
  };
  return labels[reason][chineseLocale ? 0 : 1];
}

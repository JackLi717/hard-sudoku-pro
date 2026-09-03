import { SessionReviewEntry } from '../application/technique-recognition/session-review';

const english = {
  hintDependent: 'Hint-dependent finish',
  hintDependentNote:
    'Assistance continued through an actually executed move. This finish is not evidence of an independent discovery.',
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
  summary: 'Local action explanations in this game',
  localExplanation: 'This action · not the whole process',
  processTitle: 'Prerequisites and complete process',
  processNote:
    'A simple finish does not replace its prerequisites. Verification uses saved starting snapshots; alternative paths are not independent discoveries or proof of your thoughts.',
  processVerify: 'Verify complete process',
  processCancel: 'Cancel verification',
  processRunning: 'Verifying this record and its possible prerequisites…',
  processFailed:
    'Process verification unavailable or incomplete. No process attribution confirmed; retry if needed.',
  processIncomplete:
    'The opportunity graph was truncated. No process attribution can be published.',
  processMissing:
    'No complete process evidence is available for this record. This does not establish independence.',
  processUnavailable: 'Native process verification is unavailable.',
  processBlocked:
    'This record is ineligible or unfinished. Process verification cannot restore its attribution.',
  processObserved:
    'Dependent finish · recorded prerequisites verified; not another independent discovery.',
  processPossible:
    'Possible mental steps · unperformed eliminations are not recorded evidence.',
  processNotEstablished:
    'No verified prerequisite link established; independence remains unknown.',
  processAmbiguous:
    'Multiple source paths remain possible. No winner is chosen across different starting snapshots.',
  processPath: 'Candidate process',
  processDefault: 'Default for this process',
  processActual: 'Recorded source effects',
  processNoActions: 'No explicit source effects recorded',
  processPartial:
    'Some opportunity effects were not explicitly performed; they are not added to your action history.',
  processAlready:
    'This single was already available at the process start; it was not newly produced by this technique.',
  processLocalScope:
    'This explanation starts at the current action, not at an earlier prerequisite.',
  processBoard: 'View process starting board',
  processBoardTitle: 'Process starting board',
  processReturn: 'Return to this action’s board',
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
  summary: '本局的逐步解释',
  localExplanation: '本步解释 · 不代表完整过程',
  processTitle: '前置技巧与完整过程',
  processNote:
    '简单收尾不覆盖前置推理。复验使用保存的起始快照；备选路径不是独立发现次数，也不证明你的心理过程。',
  hintDependent: '提示后的依赖性收尾',
  hintDependentNote:
    '提示影响沿实际执行的操作继续传递，此收尾不作为独立发现的证据。',
  processVerify: '复验完整过程',
  processCancel: '取消复验',
  processRunning: '正在复验本条记录及可能的前置过程…',
  processFailed: '过程复验失败或证据不完整，未确认整段归因；可重试。',
  processIncomplete: '技巧机会图已截断，不发布整段归因。',
  processMissing: '本条记录缺少完整过程证据，不能据此认定为独立发现。',
  processUnavailable: '当前无法使用本地过程复验。',
  processBlocked:
    '本条记录已失效、受提示影响或尚未完成，过程复验不能恢复归因。',
  processObserved:
    '依赖性收尾 · 已验证实际前置排除或落数，不另算一次独立发现。',
  processPossible: '可能省略了心算步骤 · 未实际执行的排除不是操作证据。',
  processNotEstablished: '尚未建立有效的前置关联，不能据此认定为独立发现。',
  processAmbiguous: '存在多条合理前置路径；不同起点之间不强行选出唯一解释。',
  processPath: '备选过程',
  processDefault: '该过程的默认解释',
  processActual: '实际前置效果',
  processNoActions: '未记录明确的前置效果',
  processPartial: '该机会仍有未明确执行的效果，不补记为你的操作。',
  processAlready: '此单数在过程起点已经成立，不能算作该技巧新推导的结果。',
  processLocalScope: '这条解释从本步开始，并非更早的前置技巧。',
  processBoard: '查看过程起始盘面',
  processBoardTitle: '完整过程的起始盘面',
  processReturn: '返回本步盘面',
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

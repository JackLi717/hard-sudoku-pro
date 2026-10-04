export const rewardPageEnglish = {
  'rewards.unit': 'uses',
  'rewards.received': 'Today: +{{count}} uses received',
  'rewards.partial':
    '{{received}} of {{planned}} uses received. The other {{lost}} uses are not saved or granted later.',
  'rewards.full':
    'Your balance was full when today’s reward was processed. {{count}} uses were not added and will not be granted later.',
  'rewards.week': '7-day login rewards',
  'rewards.today': 'Today',
  'rewards.pending': 'Pending',
  'rewards.dateLabel': '{{date}}, cycle day {{day}}, planned: {{planned}} uses',
  'rewards.actual': 'Received: {{count}} uses',
  'rewards.reading': 'Reading daily rewards…',
  'rewards.waiting': 'Today’s reward has not been recorded yet.',
  'rewards.clock': 'The device date has moved backwards.',
  'rewards.completion': 'New-puzzle rewards',
  'rewards.rules': 'Reward rules',
  'rewards.quickFree': 'Quick Candidates are always free and unlimited',
  'rewards.premiumLink': 'Unlimited hints · Explore Premium',
  'rewards.permanent': 'Permanent Premium',
  'rewards.premiumBody':
    'Unlimited Smart Hints and no ads. Daily rewards are not needed.',
  'rewards.beta': 'Temporary closed-beta Premium',
  'rewards.review': 'Temporary review access',
} as const;

export const rewardPageChinese = {
  'rewards.unit': '次',
  'rewards.received': '今日到账 +{{count}} 次',
  'rewards.partial':
    '本次应发 {{planned}} 次，实际到账 {{received}} 次，其余 {{lost}} 次不保留、不补发。',
  'rewards.full':
    '处理今日奖励时余额已满，本次 {{count}} 次未增加，不保留、不补发。',
  'rewards.week': '连续登录 7 天奖励',
  'rewards.today': '今天',
  'rewards.pending': '待领',
  'rewards.dateLabel': '{{date}}，本轮第 {{day}} 天，计划奖励 {{planned}} 次',
  'rewards.actual': '实际到账 {{count}} 次',
  'rewards.reading': '正在读取每日奖励…',
  'rewards.waiting': '今日奖励尚未记录。',
  'rewards.clock': '手机日期已回退',
  'rewards.completion': '完成新题奖励',
  'rewards.rules': '奖励规则',
  'rewards.quickFree': '快速候选始终免费，不限次数',
  'rewards.premiumLink': '无限提示 · 了解 Premium',
  'rewards.permanent': '永久 Premium',
  'rewards.premiumBody': '智能提示不限次数，不展示广告，无需领取每日奖励。',
  'rewards.beta': '闭测临时 Premium',
  'rewards.review': '临时审核访问',
} satisfies Record<keyof typeof rewardPageEnglish, string>;

export const rewardPageJapanese = {
  'rewards.unit': '回',
  'rewards.received': '今日の受取：+{{count}} 回',
  'rewards.partial':
    '予定{{planned}}回のうち{{received}}回を受け取りました。残り{{lost}}回は保存・後日付与されません。',
  'rewards.full':
    '今日の報酬処理時に残高が上限でした。{{count}}回分は追加されず、後日付与もされません。',
  'rewards.week': '7日連続ログイン報酬',
  'rewards.today': '今日',
  'rewards.pending': '予定',
  'rewards.dateLabel': '{{date}}、周期の{{day}}日目、予定{{planned}}回',
  'rewards.actual': '実際の受取：{{count}}回',
  'rewards.reading': '毎日の報酬を読み込み中…',
  'rewards.waiting': '今日の報酬はまだ記録されていません。',
  'rewards.clock': '端末の日付が以前に戻っています。',
  'rewards.completion': '新しい問題の完了報酬',
  'rewards.rules': '報酬のルール',
  'rewards.quickFree': 'クイック候補は常に無料・無制限',
  'rewards.premiumLink': '無制限ヒント · Premiumを見る',
  'rewards.permanent': '永久 Premium',
  'rewards.premiumBody':
    'スマートヒント無制限、広告なし。毎日の報酬は不要です。',
  'rewards.beta': 'クローズドテスト限定 Premium',
  'rewards.review': '一時的な審査用アクセス',
} satisfies Record<keyof typeof rewardPageEnglish, string>;

export const rewardPageGerman = {
  'rewards.unit': 'Nutzungen',
  'rewards.received': 'Heute erhalten: +{{count}} Nutzungen',
  'rewards.partial':
    '{{received}} von {{planned}} Nutzungen erhalten. Die übrigen {{lost}} werden weder gespeichert noch später gutgeschrieben.',
  'rewards.full':
    'Bei der Verarbeitung war dein Guthaben voll. {{count}} Nutzungen wurden nicht hinzugefügt und werden nicht nachgereicht.',
  'rewards.week': '7 Tage Login-Belohnungen',
  'rewards.today': 'Heute',
  'rewards.pending': 'Offen',
  'rewards.dateLabel':
    '{{date}}, Zyklustag {{day}}, geplant: {{planned}} Nutzungen',
  'rewards.actual': 'Erhalten: {{count}} Nutzungen',
  'rewards.reading': 'Tägliche Belohnungen werden gelesen…',
  'rewards.waiting': 'Die heutige Belohnung wurde noch nicht erfasst.',
  'rewards.clock': 'Das Gerätedatum wurde zurückgestellt.',
  'rewards.completion': 'Belohnung für neue Rätsel',
  'rewards.rules': 'Belohnungsregeln',
  'rewards.quickFree':
    'Schnelle Kandidaten sind immer kostenlos und unbegrenzt',
  'rewards.premiumLink': 'Unbegrenzte Hinweise · Premium ansehen',
  'rewards.permanent': 'Dauerhaftes Premium',
  'rewards.premiumBody':
    'Unbegrenzte intelligente Hinweise ohne Werbung. Tägliche Belohnungen sind nicht nötig.',
  'rewards.beta': 'Temporäres Premium im geschlossenen Test',
  'rewards.review': 'Temporärer Prüfzugang',
} satisfies Record<keyof typeof rewardPageEnglish, string>;

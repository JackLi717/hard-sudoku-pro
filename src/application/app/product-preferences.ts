export const PRODUCT_PREFERENCES_KEY = 'product_preferences_v1';
export const PRODUCT_PREFERENCES_SCHEMA_VERSION = 1 as const;

export const PRODUCT_LOCALES = ['en', 'ja', 'de', 'zh-Hans'] as const;
export type ProductLocale = (typeof PRODUCT_LOCALES)[number];
export type LocalePreference = 'system' | ProductLocale;
export type ThemePreference = 'system' | 'light' | 'dark';

export type ProductPreferences = {
  schemaVersion: typeof PRODUCT_PREFERENCES_SCHEMA_VERSION;
  locale: LocalePreference;
  theme: ThemePreference;
  hintAnimations: boolean;
};

export type ProductPreferenceSnapshot = {
  preferences: ProductPreferences;
  effectiveLocale: ProductLocale;
};

export const DEFAULT_PRODUCT_PREFERENCES: ProductPreferences = {
  schemaVersion: PRODUCT_PREFERENCES_SCHEMA_VERSION,
  locale: 'system',
  theme: 'system',
  hintAnimations: true,
};

export interface ProductPreferenceStore {
  getSetting<Value>(key: string): Promise<Value | null>;
  setSetting<Value>(
    key: string,
    value: Value,
    updatedAtEpochMs: number,
  ): Promise<void>;
}

type Listener = (snapshot: ProductPreferenceSnapshot) => void;

function isProductLocale(value: unknown): value is ProductLocale {
  return PRODUCT_LOCALES.some(locale => locale === value);
}

function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || isProductLocale(value);
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function normalizeProductPreferences(
  value: unknown,
): ProductPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PRODUCT_PREFERENCES;
  }
  const candidate = value as Partial<ProductPreferences>;
  return {
    schemaVersion: PRODUCT_PREFERENCES_SCHEMA_VERSION,
    locale: isLocalePreference(candidate.locale)
      ? candidate.locale
      : DEFAULT_PRODUCT_PREFERENCES.locale,
    theme: isThemePreference(candidate.theme)
      ? candidate.theme
      : DEFAULT_PRODUCT_PREFERENCES.theme,
    hintAnimations:
      typeof candidate.hintAnimations === 'boolean'
        ? candidate.hintAnimations
        : DEFAULT_PRODUCT_PREFERENCES.hintAnimations,
  };
}

export function resolveProductLocale(
  preference: LocalePreference,
  deviceLocale: string,
): ProductLocale {
  if (preference !== 'system') {
    return preference;
  }
  const normalized = deviceLocale.replace(/_/g, '-').toLowerCase();
  if (normalized === 'ja' || normalized.startsWith('ja-')) {
    return 'ja';
  }
  if (normalized === 'de' || normalized.startsWith('de-')) {
    return 'de';
  }
  if (
    normalized === 'zh-hans' ||
    normalized.startsWith('zh-hans-') ||
    normalized === 'zh-cn' ||
    normalized.startsWith('zh-cn-') ||
    normalized === 'zh-sg' ||
    normalized.startsWith('zh-sg-')
  ) {
    return 'zh-Hans';
  }
  return 'en';
}

export function detectDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

export class ProductPreferencesController {
  private listeners = new Set<Listener>();
  private preferences = DEFAULT_PRODUCT_PREFERENCES;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: ProductPreferenceStore,
    private readonly deviceLocale: () => string = detectDeviceLocale,
    private readonly now: () => number = Date.now,
  ) {}

  get snapshot(): ProductPreferenceSnapshot {
    return {
      preferences: this.preferences,
      effectiveLocale: resolveProductLocale(
        this.preferences.locale,
        this.deviceLocale(),
      ),
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async initialize(): Promise<void> {
    const stored = await this.store.getSetting<unknown>(
      PRODUCT_PREFERENCES_KEY,
    );
    this.preferences = normalizeProductPreferences(stored);
    this.emit();
  }

  setLocale(locale: LocalePreference): Promise<void> {
    return this.update({ locale });
  }

  setTheme(theme: ThemePreference): Promise<void> {
    return this.update({ theme });
  }

  setHintAnimations(hintAnimations: boolean): Promise<void> {
    return this.update({ hintAnimations });
  }

  private update(patch: Partial<ProductPreferences>): Promise<void> {
    const write = this.writeQueue.then(async () => {
      const next = normalizeProductPreferences({
        ...this.preferences,
        ...patch,
      });
      await this.store.setSetting(PRODUCT_PREFERENCES_KEY, next, this.now());
      this.preferences = next;
      this.emit();
    });
    this.writeQueue = write.catch(() => undefined);
    return write;
  }

  private emit(): void {
    const snapshot = this.snapshot;
    this.listeners.forEach(listener => listener(snapshot));
  }
}

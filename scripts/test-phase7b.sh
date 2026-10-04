#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
release_mode=false
if [[ "${1:-}" == "--release" ]]; then
  release_mode=true
elif [[ $# -gt 0 ]]; then
  echo "usage: $0 [--release]" >&2
  exit 2
fi

cd "$repo_root"

node - "$release_mode" <<'NODE'
const fs = require('fs');
const path = require('path');

const releaseMode = process.argv[2] === 'true';
const fail = message => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = message => console.log(`PASS: ${message}`);
const warn = message => console.log(`BLOCKED: ${message}`);

const storeKitPath = 'ios/HardSudokuPro/Products.storekit';
const storeKit = JSON.parse(fs.readFileSync(storeKitPath, 'utf8'));
const premiumProducts = storeKit.products.filter(
  product => product.productID === 'premium',
);
if (
  premiumProducts.length === 1 &&
  premiumProducts[0].type === 'NonConsumable'
) {
  pass('StoreKit has exactly one non-consumable premium product');
} else {
  fail('StoreKit must have exactly one non-consumable premium product');
}

if (
  premiumProducts[0]?.displayPrice === '9.99' &&
  storeKit.settings?._storefront === 'USA'
) {
  pass('Local StoreKit Premium price is USD 9.99');
} else {
  fail('Local StoreKit Premium must use USD 9.99');
}

const locales = new Set(
  (premiumProducts[0]?.localizations ?? []).map(item => item.locale),
);
const requiredLocales = ['de_DE', 'en_US', 'ja_JP', 'zh_CN'];
if (requiredLocales.every(locale => locales.has(locale))) {
  pass('StoreKit metadata covers English, German, Japanese, and Simplified Chinese');
} else {
  fail(`StoreKit metadata is missing: ${requiredLocales.filter(locale => !locales.has(locale)).join(', ')}`);
}

const schemePath =
  'ios/HardSudokuPro.xcodeproj/xcshareddata/xcschemes/HardSudokuPro.xcscheme';
const scheme = fs.readFileSync(schemePath, 'utf8');
const reference = scheme.match(
  /StoreKitConfigurationFileReference\s+identifier = "([^"]+)"/,
)?.[1];
const projectContainerPath = path.dirname(
  path.dirname(path.dirname(schemePath)),
);
const resolvedReference = reference
  ? path.resolve(projectContainerPath, reference)
  : null;
if (resolvedReference === path.resolve(storeKitPath)) {
  pass('Debug scheme selects the local StoreKit configuration');
} else {
  fail('Debug scheme does not resolve to Products.storekit');
}

const infoPlist = fs.readFileSync('ios/HardSudokuPro/Info.plist', 'utf8');
if (!infoPlist.includes('NSUserTrackingUsageDescription')) {
  pass('iOS does not declare an ATT tracking prompt');
} else {
  fail('iOS unexpectedly declares NSUserTrackingUsageDescription');
}

const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const ads = appConfig['react-native-google-mobile-ads'] ?? {};
const testIds = new Set([
  'ca-app-pub-3940256099942544~3347511713',
  'ca-app-pub-3940256099942544~1458002511',
]);
for (const platform of ['android', 'ios']) {
  const appId = ads[`${platform}_app_id`];
  if (/^ca-app-pub-\d{16}~\d{10}$/.test(appId ?? '') && !testIds.has(appId)) {
    pass(`${platform} production AdMob app ID is configured`);
  } else if (releaseMode) {
    fail(`${platform} production AdMob app ID is required for release acceptance`);
  } else {
    warn(`${platform} still uses a Google test app ID; local ad testing only`);
  }
}

const adGateway = fs.readFileSync(
  'src/infrastructure/ads/google-mobile-ads-gateway.ts',
  'utf8',
);
const releaseScope = fs.readFileSync('src/app/release-scope.ts', 'utf8');
if (releaseMode && process.env.HSP_CLOSED_BETA_PREMIUM === '1') {
  fail('Build public releases without temporary closed-beta Premium');
}
if (!releaseScope.includes('?.closedBetaPremium === true')) {
  fail('Closed-beta Premium must require an explicit native build flag');
}
if (/!__DEV__ && Platform\.OS === 'android'\s*\? 'ca-app-pub-\d{16}\/\d{10}'\s*:\s*TestIds\.REWARDED/.test(adGateway)) {
  pass('Android Release uses the configured rewarded unit; Debug uses test inventory');
  if (releaseMode) {
    fail('iOS still uses the Google test rewarded unit');
  } else {
    warn('iOS uses the Google test rewarded unit');
  }
} else {
  if (releaseMode) {
    fail('production rewarded units must be configured before public release');
  } else {
    warn('production rewarded unit configuration is not confirmed');
  }
}

if (Array.isArray(ads.sk_ad_network_items) && ads.sk_ad_network_items.length) {
  pass('iOS SKAdNetwork identifiers are configured');
} else if (releaseMode) {
  fail('iOS SKAdNetwork identifiers are required for release acceptance');
} else {
  warn('iOS SKAdNetwork identifiers are missing; local ad testing only');
}

const androidBuild = fs.readFileSync('android/app/build.gradle', 'utf8');
const debugSigningUses = androidBuild.match(/signingConfig signingConfigs\.debug/g) ?? [];
if (
  debugSigningUses.length === 1 &&
  androidBuild.includes('signingConfig signingConfigs.release')
) {
  pass('Android release no longer falls back to the debug signing key');
} else {
  fail('Android release still uses the debug signing key');
}

if (releaseMode) {
  const keys = [
    'HSP_UPLOAD_STORE_FILE',
    'HSP_UPLOAD_STORE_PASSWORD',
    'HSP_UPLOAD_KEY_ALIAS',
    'HSP_UPLOAD_KEY_PASSWORD',
  ];
  let properties = {};
  if (fs.existsSync('android/keystore.properties')) {
    for (const line of fs.readFileSync('android/keystore.properties', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) properties[match[1].trim()] = match[2].trim();
    }
  }
  const values = Object.fromEntries(
    keys.map(key => [key, process.env[key] || properties[key]]),
  );
  const missing = keys.filter(key => !values[key]);
  if (missing.length) {
    fail(`Play upload signing is missing: ${missing.join(', ')}`);
  } else {
    const storeFile = path.resolve('android', values.HSP_UPLOAD_STORE_FILE);
    if (fs.existsSync(storeFile)) pass('Play upload keystore is available');
    else fail('configured Play upload keystore file does not exist');
  }
}
NODE

npm run typecheck
npm test -- --runInBand --no-watchman \
  __tests__/commercial-controller.test.ts \
  __tests__/google-mobile-ads-gateway.test.ts \
  __tests__/native-purchase-gateway.test.ts \
  __tests__/commercial-screens.test.tsx \
  __tests__/accessibility-experience.test.tsx

if [[ "$release_mode" == true ]]; then
  ./android/gradlew -p android :app:bundleRelease
else
  ./android/gradlew -p android :app:assembleRelease
fi

xcodebuild \
  -workspace ios/HardSudokuPro.xcworkspace \
  -scheme HardSudokuPro \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build

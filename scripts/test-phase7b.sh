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
const configuredIds = [ads.android_app_id, ads.ios_app_id];
if (configuredIds.every(value => value && !testIds.has(value))) {
  pass('production AdMob app IDs are configured');
} else if (releaseMode) {
  fail('production AdMob app IDs are required for release acceptance');
} else {
  warn('AdMob still uses Google test app IDs; local ad testing only');
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

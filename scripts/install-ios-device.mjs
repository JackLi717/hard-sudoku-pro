#!/usr/bin/env node

import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const bundleId = 'com.jackli717.sudoku';
const workspace = 'ios/HardSudokuPro.xcworkspace';
const scheme = 'HardSudokuPro';

function run(command, args) {
  const result = spawnSync(command, args, {stdio: 'inherit'});
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function connectedDeviceId() {
  if (process.env.IOS_DEVICE_ID) {
    return process.env.IOS_DEVICE_ID;
  }

  const devices = execFileSync('xcrun', ['devicectl', 'list', 'devices'], {
    encoding: 'utf8',
  });
  const match = devices.match(/^.*?\s+([A-F0-9-]{36})\s+connected\s+/m);

  if (!match) {
    throw new Error(
      'No connected iPhone found. Connect and unlock one, or set IOS_DEVICE_ID.',
    );
  }
  return match[1];
}

const deviceId = connectedDeviceId();
const derivedDataPath = mkdtempSync(join(tmpdir(), 'hsp-ios-device-build-'));
const appPath = join(
  derivedDataPath,
  'Build/Products/Debug-iphoneos/HardSudokuPro.app',
);

try {
  console.log(`Building for device ${deviceId}...`);
  run('xcodebuild', [
    '-workspace',
    workspace,
    '-scheme',
    scheme,
    '-configuration',
    'Debug',
    '-destination',
    `platform=iOS,id=${deviceId}`,
    '-derivedDataPath',
    derivedDataPath,
    'SWIFT_ENABLE_EXPLICIT_MODULES=NO',
    'build',
  ]);

  console.log('Installing app...');
  run('xcrun', ['devicectl', 'device', 'install', 'app', '--device', deviceId, appPath]);

  console.log('Launching app...');
  run('xcrun', [
    'devicectl',
    'device',
    'process',
    'launch',
    '--device',
    deviceId,
    bundleId,
  ]);
} finally {
  rmSync(derivedDataPath, {recursive: true, force: true});
}

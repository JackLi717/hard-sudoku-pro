#!/usr/bin/env node

import { createSign } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const PACKAGE_NAME = 'com.platongames.sudoku';
const PUBLISHING_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_ROOT = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const DEFAULT_AAB = 'android/app/build/outputs/bundle/release/app-release.aab';
const STATUSES = new Set(['draft', 'completed']);

function usage() {
  return `Usage:
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=/absolute/path/play-publisher.json \\
    npm run android:upload:play -- --track internal --status completed --confirm

Options:
  --track <name>       Required Play track, for example internal or production.
  --status <value>     draft (default) or completed.
  --aab <path>         AAB to upload (default: ${DEFAULT_AAB}).
  --confirm            Required acknowledgement that this commits a Play edit.
  --dry-run            Validate arguments and show the intended upload only.
  --help               Show this help.

The service account must have been granted release access in Play Console. The
JSON key stays outside this repository and is never uploaded by this script.`;
}

function parseArgs(argv) {
  const options = {
    aab: DEFAULT_AAB,
    status: 'draft',
    confirm: false,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') return { help: true };
    if (argument === '--confirm') {
      options.confirm = true;
      continue;
    }
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (!['--track', '--status', '--aab'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = argv[++index];
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }
    options[argument.slice(2)] = value;
  }
  if (!options.track) throw new Error('--track is required.');
  if (!/^[a-z0-9][a-z0-9._-]{0,49}$/i.test(options.track)) {
    throw new Error('The track name contains unsupported characters.');
  }
  if (!STATUSES.has(options.status)) {
    throw new Error('--status must be draft or completed.');
  }
  if (!options.confirm) {
    throw new Error('Pass --confirm to commit a Google Play edit.');
  }
  return options;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function signedAssertion(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: PUBLISHING_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(serviceAccount.private_key, 'base64url')}`;
}

async function responseJson(response) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google Play API returned ${response.status}: ${body.slice(0, 500)}`,
    );
  }
  return body ? JSON.parse(body) : {};
}

async function accessToken(serviceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error(
      'The service-account JSON needs client_email and private_key.',
    );
  }
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedAssertion(serviceAccount),
    }),
  });
  const token = await responseJson(response);
  if (typeof token.access_token !== 'string') {
    throw new Error('Google OAuth did not return an access token.');
  }
  return token.access_token;
}

async function api(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  return responseJson(response);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const aabPath = path.resolve(options.aab);
  const file = await stat(aabPath);
  if (!file.isFile() || file.size === 0) {
    throw new Error(`AAB is missing or empty: ${aabPath}`);
  }
  if (options.dryRun) {
    console.log(
      `Would upload ${aabPath} (${file.size} bytes) to ${PACKAGE_NAME}, track ${options.track}, status ${options.status}.`,
    );
    return;
  }
  const keyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!keyPath) {
    throw new Error(
      'Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to a local service-account JSON key.',
    );
  }
  const serviceAccount = JSON.parse(
    await readFile(path.resolve(keyPath), 'utf8'),
  );
  const token = await accessToken(serviceAccount);
  const edit = await api(
    `${API_ROOT}/applications/${PACKAGE_NAME}/edits`,
    token,
    {
      method: 'POST',
    },
  );
  if (typeof edit.id !== 'string') {
    throw new Error('Google Play did not create an edit.');
  }
  const bundle = await api(
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/${edit.id}/bundles?uploadType=media`,
    token,
    {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: await readFile(aabPath),
    },
  );
  if (typeof bundle.versionCode !== 'number') {
    throw new Error(
      'Google Play did not return the uploaded bundle version code.',
    );
  }
  await api(
    `${API_ROOT}/applications/${PACKAGE_NAME}/edits/${edit.id}/tracks/${options.track}`,
    token,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        track: options.track,
        releases: [
          {
            versionCodes: [String(bundle.versionCode)],
            status: options.status,
          },
        ],
      }),
    },
  );
  await api(
    `${API_ROOT}/applications/${PACKAGE_NAME}/edits/${edit.id}:commit`,
    token,
    {
      method: 'POST',
    },
  );
  console.log(
    `Uploaded version ${bundle.versionCode} to ${options.track} with ${options.status} status.`,
  );
}

main().catch(error => {
  console.error(`Google Play upload failed: ${error.message}`);
  process.exitCode = 1;
});

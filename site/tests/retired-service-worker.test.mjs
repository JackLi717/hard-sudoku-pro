import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
  new URL('../public/sw.js', import.meta.url),
  'utf8',
);

function loadWorker(windows = [], unregistered = true) {
  const events = new Map();
  const calls = [];
  const self = {
    addEventListener: (type, handler) => events.set(type, handler),
    skipWaiting: async () => calls.push('skip-waiting'),
    clients: {
      claim: async () => calls.push('claim'),
      matchAll: async options => {
        assert.equal(options.type, 'window');
        assert.equal(options.includeUncontrolled, undefined);
        calls.push('controlled-windows');
        return windows;
      },
    },
    registration: {
      unregister: async () => {
        calls.push('unregister');
        return unregistered;
      },
    },
  };
  runInNewContext(source, { self });
  return {
    events,
    calls,
    async dispatch(type) {
      let completion;
      events.get(type)({ waitUntil: promise => (completion = promise) });
      assert.ok(completion, 'Keep the worker alive until recovery completes');
      await completion;
    },
  };
}

test('the replacement immediately activates and never intercepts requests', async () => {
  const worker = loadWorker();
  assert.deepEqual([...worker.events.keys()], ['install', 'activate']);
  await worker.dispatch('install');
  assert.deepEqual(worker.calls, ['skip-waiting']);
});

test('controlled tabs reload their exact URL after the obsolete registration is removed', async () => {
  const urls = [
    'https://readytradie.com/platon-sudoku/?source=old#who-its-for',
    'https://readytradie.com/bottle-harmony/zh/',
  ];
  const navigations = [];
  const worker = loadWorker(
    urls.map(url => ({
      url,
      navigate: async target => {
        assert.equal(worker.calls.at(-1), 'unregister');
        navigations.push(target);
      },
    })),
  );
  await worker.dispatch('activate');
  assert.deepEqual(navigations, urls);
  assert.deepEqual(worker.calls, ['claim', 'controlled-windows', 'unregister']);
});

test('a tab closing during recovery does not prevent other tabs from recovering', async () => {
  const recovered = [];
  const worker = loadWorker([
    {
      url: 'https://readytradie.com/',
      navigate: async () => Promise.reject(new Error('Tab closed')),
    },
    {
      url: 'https://readytradie.com/bottle-harmony/',
      navigate: async url => recovered.push(url),
    },
  ]);
  await worker.dispatch('activate');
  assert.deepEqual(recovered, ['https://readytradie.com/bottle-harmony/']);
});

test('already-removed registrations and no open tabs are harmless', async () => {
  const worker = loadWorker([], false);
  await worker.dispatch('activate');
  assert.deepEqual(worker.calls, ['claim', 'controlled-windows', 'unregister']);
});

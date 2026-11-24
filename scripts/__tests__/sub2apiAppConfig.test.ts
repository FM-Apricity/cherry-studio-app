import type { ConfigContext } from 'expo/config';

import configureApp from '../../app.config';
import appConfig from '../../app.json';

jest.mock('tsx/cjs', () => ({}));

const originalEnv = process.env;
const context = { config: appConfig.expo } as unknown as ConfigContext;

beforeEach(() => {
  process.env = { ...originalEnv, PROFILE: 'preview' };
  delete process.env.CHERRY_SUB2API_BUILD;
  delete process.env.SUB2API_ANDROID_VERSION_CODE;
  delete process.env.EXPO_PUBLIC_STORYBOOK_ENABLED;
});
afterEach(() => {
  process.env = originalEnv;
});

test('sub2api uses a separate identity and disables official update paths', () => {
  process.env.CHERRY_SUB2API_BUILD = 'true';
  process.env.SUB2API_ANDROID_VERSION_CODE = '17';
  process.env.APK_UPDATES_ENABLED = 'true';
  const config = configureApp(context);
  expect(config.name).toBe('Cherry Studio sub2api');
  expect(config.scheme).toBe('cherrystudio-sub2api');
  expect(config.android?.package).toBe('com.cherryai.cherrystudio_app.sub2api');
  expect(config.android?.versionCode).toBe(17);
  expect(config.updates?.enabled).toBe(false);
  expect(config.extra?.isApkUpdatesEnabled).toBe(false);
  expect(Object.values(config.extra?.reporting.services)).not.toContain(true);
  expect(config.plugins).toContainEqual([
    './scripts/withAppUpdates.js',
    { apkUpdatesEnabled: false, domesticStoresEnabled: false },
  ]);
  expect(config.plugins).not.toContainEqual(expect.arrayContaining(['@sentry/react-native/expo']));
});

test.each([
  ['development', '.dev', 'Cherry Studio Dev', false],
  ['preview', '.preview', 'Cherry Studio Preview', true],
  ['production', '', 'Cherry Studio', true],
])('keeps the original %s identity and OTA policy without opt-in', (profile, suffix, name, ota) => {
  process.env.PROFILE = profile;
  const config = configureApp(context);
  expect(config.name).toBe(name);
  expect(config.android?.package).toBe(`com.cherryai.cherrystudio_app${suffix}`);
  expect(config.updates?.enabled).toBe(ota);
});

test.each(['development', 'production'])('rejects sub2api with %s reporting policy', (profile) => {
  process.env.PROFILE = profile;
  process.env.CHERRY_SUB2API_BUILD = 'true';
  expect(() => configureApp(context)).toThrow('requires PROFILE=preview');
});

test.each(['0', '-1', '1.5', 'NaN', '2100000001'])('rejects invalid version code %s', (value) => {
  process.env.CHERRY_SUB2API_BUILD = 'true';
  process.env.SUB2API_ANDROID_VERSION_CODE = value;
  expect(() => configureApp(context)).toThrow('SUB2API_ANDROID_VERSION_CODE');
});

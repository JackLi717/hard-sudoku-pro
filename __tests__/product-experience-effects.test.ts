import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Vibration } from 'react-native';

jest.mock('../src/native/NativeProductExperience', () => ({
  __esModule: true,
  default: {
    playClick: jest.fn(),
    setKeepAwake: jest.fn(),
  },
}));

import NativeProductExperience from '../src/native/NativeProductExperience';
import { playInteractionFeedback } from '../src/ui/product-experience-effects';

const nativeFeedback = NativeProductExperience as NonNullable<
  typeof NativeProductExperience
>;

describe('product experience effects', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('declares the Android vibration permission', () => {
    const manifest = readFileSync(
      path.join(
        __dirname,
        '..',
        'android',
        'app',
        'src',
        'main',
        'AndroidManifest.xml',
      ),
      'utf8',
    );

    expect(manifest).toContain('android.permission.VIBRATE');
  });

  test('isolates optional feedback failures from the game action', () => {
    const sound = nativeFeedback.playClick as jest.Mock;
    sound.mockImplementation(() => {
      throw new Error('sound unavailable');
    });
    const vibration = jest
      .spyOn(Vibration, 'vibrate')
      .mockImplementation(() => {
        throw new Error('vibration unavailable');
      });

    expect(() =>
      playInteractionFeedback({ haptics: true, soundEffects: true }),
    ).not.toThrow();
    expect(sound).toHaveBeenCalledTimes(1);
    expect(vibration).toHaveBeenCalledWith(12);
  });

  test('does not invoke disabled feedback channels', () => {
    const sound = nativeFeedback.playClick as jest.Mock;
    const vibration = jest.spyOn(Vibration, 'vibrate');

    playInteractionFeedback({ haptics: false, soundEffects: false });

    expect(sound).not.toHaveBeenCalled();
    expect(vibration).not.toHaveBeenCalled();
  });
});

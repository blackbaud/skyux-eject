const mock = require('mock-require');

describe('Check for strict mode', () => {
  let checkForStrictMode;
  let ejectedProjectPath;
  let mockTsConfig;

  beforeEach(() => {
    ejectedProjectPath = 'foo';
    mockTsConfig = undefined;

    mock('../lib/utils/jsonc-utils', {
      readJsonC() {
        return mockTsConfig;
      },
    });

    checkForStrictMode = mock.reRequire(
      '../lib/utils/eject/check-for-strict-mode'
    );
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should return false if strict mode is not already enabled', async () => {
    mockTsConfig = {};

    const strictMode = await checkForStrictMode(ejectedProjectPath);

    expect(strictMode).toBeFalse();
  });

  it('should return true if strict mode is already enabled', async () => {
    mockTsConfig = {
      extends: './node_modules/@skyux-sdk/builder/tsconfig.strict',
    };

    const strictMode = await checkForStrictMode(ejectedProjectPath);

    expect(strictMode).toBeTrue();
  });
});

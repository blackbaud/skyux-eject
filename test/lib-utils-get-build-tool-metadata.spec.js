const mock = require('mock-require');

describe('Get build tool metadata', () => {
  let mockPackageJson;

  beforeEach(() => {
    mockPackageJson = {
      devDependencies: {},
    };

    mock('@blackbaud/skyux-logger', {
      verbose() {},
      warn() {},
    });

    mock('../lib/utils/json-utils', {
      readJson: () => {
        return Promise.resolve(mockPackageJson);
      },
    });
  });

  afterEach(() => {
    mock.stopAll();
  });

  function getUtil() {
    return mock.reRequire('../lib/utils/get-build-tool-metadata');
  }

  it('should return metadata about the currently installed build tool', async () => {
    mockPackageJson.devDependencies = {
      '@skyux-sdk/builder': '4.0.0',
    };

    const getBuildToolMetadata = getUtil();
    const result = await getBuildToolMetadata();

    expect(result).toEqual({
      name: '@skyux-sdk/builder',
      currentlyInstalledVersion: '4.0.0',
      currentlyInstalledMajorVersion: 4,
    });
  });

  it('should handle invalid versions', async () => {
    mockPackageJson.devDependencies = {
      '@skyux-sdk/builder': 'file:.dist',
    };

    const getBuildToolMetadata = getUtil();
    const result = await getBuildToolMetadata();

    expect(result).toEqual({
      name: '@skyux-sdk/builder',
      currentlyInstalledVersion: 'file:.dist',
      currentlyInstalledMajorVersion: null,
    });
  });

  it('should handle missing build tool', async () => {
    mockPackageJson.devDependencies = {
      invalid: '1.0.0',
    };

    const getBuildToolMetadata = getUtil();
    const result = await getBuildToolMetadata();

    expect(result).toBeNull();
  });
});

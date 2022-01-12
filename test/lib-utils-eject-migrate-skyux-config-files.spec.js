const path = require('path');
const mock = require('mock-require');

const CWD = process.cwd();

describe('migrateSkyuxConfigFiles', () => {
  let actualSkyuxConfig;
  let ejectedProjectPath;
  let internalSchemaPath;
  let migrateSkyuxConfigFiles;
  let mockFsExtra;
  let mockSkyuxConfig;
  let writeJsonSpy;

  beforeEach(() => {
    ejectedProjectPath = 'foo';
    internalSchemaPath =
      './node_modules/@blackbaud-internal/skyux-angular-builders/skyuxconfig-schema.json';

    writeJsonSpy = jasmine
      .createSpy('writeJson')
      .and.callFake((file, contents) => {
        if (file.indexOf('skyuxconfig.json') > -1) {
          actualSkyuxConfig = contents;
        }
      });

    mock('glob', {
      sync(pattern) {
        switch (pattern) {
          case 'skyuxconfig?(.*).json':
            return [path.join(CWD, 'skyuxconfig.json')];
        }

        return [];
      },
    });

    mockFsExtra = jasmine.createSpyObj('fs-extra', [
      'readJsonSync',
      'removeSync',
    ]);

    mockFsExtra.readJsonSync.and.callFake(() => mockSkyuxConfig);

    mock('fs-extra', mockFsExtra);

    mock('../lib/utils/eject/write-json', writeJsonSpy);

    migrateSkyuxConfigFiles = mock.reRequire(
      '../lib/utils/eject/migrate-skyux-config-files'
    );
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should migrate only accepted properties in internal skyuxconfig.json files', () => {
    mockSkyuxConfig = {
      name: 'skyux-spa-foobar',
      app: {
        externals: {
          js: {
            before: {
              url: 'script.js',
            },
          },
        },
        theming: {
          supportedThemes: ['default', 'modern'],
          theme: 'modern',
        },
        invalidProp: {}, // <-- should not be included
      },
      appSettings: {
        foo: 'bar',
      },
      auth: true,
      help: {},
      host: {
        url: 'https://foo.blackbaud.com/',
      },
      omnibar: {},
      params: {
        foo: {
          required: true,
        },
        bar: true,
      },
      pipelineSettings: {
        foo: 'bar',
      },
      routes: {
        public: ['/foo'],
      },
      codeCoverageThreshold: 'standard',
      invalidProp: {}, // <-- should not be included
    };

    migrateSkyuxConfigFiles(ejectedProjectPath);

    expect(actualSkyuxConfig).toEqual({
      $schema: internalSchemaPath,
      app: {
        externals: {
          js: {
            before: {
              url: 'script.js',
            },
          },
        },
        theming: {
          supportedThemes: ['default', 'modern'],
          theme: 'modern',
        },
      },
      appSettings: {
        foo: 'bar',
      },
      auth: true,
      help: {},
      host: {
        url: 'https://foo.blackbaud.com/',
      },
      omnibar: {},
      params: {
        foo: {
          required: true,
        },
        bar: true,
      },
      pipelineSettings: {
        foo: 'bar',
        vsts: {
          testSettings: {
            unit: {
              codeCoverageThreshold: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
              },
            },
          },
        },
      },
      routes: {
        public: ['/foo'],
      },
    });
  });

  it('should delete skyuxconfig.json files for public projects', () => {
    migrateSkyuxConfigFiles(ejectedProjectPath, false);
    expect(mockFsExtra.removeSync).toHaveBeenCalledWith(
      path.join(process.cwd(), 'skyuxconfig.json')
    );
    expect(writeJsonSpy).not.toHaveBeenCalled();
  });

  it('should skip supported properties not present in the skyuxconfig.json file', () => {
    mockSkyuxConfig = {
      name: 'skyux-spa-foobar',
      auth: true,
    };

    migrateSkyuxConfigFiles(ejectedProjectPath);

    expect(actualSkyuxConfig).toEqual({
      $schema: internalSchemaPath,
      auth: true,
    });
  });

  it('should migrate known plugins', () => {
    mockSkyuxConfig = {
      name: 'skyux-spa-foobar',
      plugins: ['@blackbaud/skyux-builder-plugin-auth-email-whitelist'],
    };

    migrateSkyuxConfigFiles(ejectedProjectPath);

    expect(actualSkyuxConfig).toEqual({
      $schema: internalSchemaPath,
      experiments: {
        blackbaudEmployee: true,
      },
    });
  });

  it('should migrate code coverage threshold to pipeline settings', () => {
    mockSkyuxConfig = {
      codeCoverageThreshold: 'standard',
    };

    migrateSkyuxConfigFiles(ejectedProjectPath);

    expect(actualSkyuxConfig).toEqual({
      $schema: internalSchemaPath,
      pipelineSettings: {
        vsts: {
          testSettings: {
            unit: {
              codeCoverageThreshold: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
              },
            },
          },
        },
      },
    });
  });

  it('should migrate code coverage threshold when set to "none"', () => {
    mockSkyuxConfig = {
      codeCoverageThreshold: 'none',
    };

    migrateSkyuxConfigFiles(ejectedProjectPath);

    expect(actualSkyuxConfig).toEqual({
      $schema: internalSchemaPath,
      pipelineSettings: {
        vsts: {
          testSettings: {
            unit: {
              codeCoverageThreshold: {
                branches: 0,
                functions: 0,
                lines: 0,
                statements: 0,
              },
            },
          },
        },
      },
    });
  });

  it('should not overwrite other pipeline settings', () => {
    mockSkyuxConfig = {
      codeCoverageThreshold: 'strict',
      pipelineSettings: {
        vsts: {
          testSettings: {
            e2e: {
              browserSet: 'speedy',
            },
            unit: {
              browserSet: 'paranoid',
            },
          },
        },
      },
    };

    migrateSkyuxConfigFiles(ejectedProjectPath);

    expect(actualSkyuxConfig).toEqual({
      $schema: internalSchemaPath,
      pipelineSettings: {
        vsts: {
          testSettings: {
            e2e: {
              browserSet: 'speedy',
            },
            unit: {
              browserSet: 'paranoid',
              codeCoverageThreshold: {
                branches: 100,
                functions: 100,
                lines: 100,
                statements: 100,
              },
            },
          },
        },
      },
    });
  });
});

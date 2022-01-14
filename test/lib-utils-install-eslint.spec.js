const mock = require('mock-require');
const path = require('path');

const MOCK_WORKSPACE_PATH = 'skyux-spa-foo';

describe('Install ESLint', () => {
  const workspaceEslintPath = path.join(MOCK_WORKSPACE_PATH, '.eslintrc.json');

  const projectEslintPath = path.join(
    MOCK_WORKSPACE_PATH,
    'projects/my-lib/.eslintrc.json'
  );

  let installEsLint;
  let mockFsExtra;
  let mockJsonUtils;
  let mockLogger;
  let mockRunNgCommand;
  let projectEslintrcExists;

  let testProjectEslintConfig;
  let testWorkspaceEslintConfig;

  let workspaceEslintrcExists;

  beforeEach(() => {
    testProjectEslintConfig = testWorkspaceEslintConfig = undefined;

    mockRunNgCommand = jasmine.createSpy('runNgCommand');
    mockRunNgCommand.and.callFake(() => {
      return {
        status: 0,
      };
    });

    mockFsExtra = jasmine.createSpyObj('fs-extra', ['existsSync']);

    mockLogger = jasmine.createSpyObj('logger', ['info']);

    mockJsonUtils = jasmine.createSpyObj('json-utils', [
      'readJson',
      'writeJson',
    ]);

    mockJsonUtils.readJson.and.callFake((filePath) => {
      if (filePath === workspaceEslintPath) {
        workspaceEslintrcExists = true;
        return Promise.resolve(testWorkspaceEslintConfig);
      }

      if (filePath === projectEslintPath) {
        return Promise.resolve(testProjectEslintConfig);
      }
    });

    mockJsonUtils.writeJson.and.callFake((filePath, contents) => {
      if (filePath === workspaceEslintPath) {
        testWorkspaceEslintConfig = contents;
      }

      if (filePath === projectEslintPath) {
        testProjectEslintConfig = contents;
      }

      return Promise.resolve();
    });

    workspaceEslintrcExists = false;
    projectEslintrcExists = true;

    mockFsExtra.existsSync.and.callFake((filePath) => {
      if (filePath === workspaceEslintPath) {
        return workspaceEslintrcExists;
      }

      if (filePath === projectEslintPath) {
        return projectEslintrcExists;
      }

      return false;
    });

    mock('@blackbaud/skyux-logger', mockLogger);
    mock('../lib/utils/run-ng-command', mockRunNgCommand);
    mock('fs-extra', mockFsExtra);
    mock('../lib/utils/json-utils', mockJsonUtils);

    installEsLint = mock.reRequire('../lib/utils/install-eslint');
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should setup ESLint for applications', async () => {
    testWorkspaceEslintConfig = {
      root: true,
      ignorePatterns: ['projects/**/*'],
      overrides: [
        {
          files: ['*.ts'],
          parserOptions: {
            project: ['tsconfig.json'],
            createDefaultProgram: true,
          },
          extends: [
            'plugin:@angular-eslint/recommended',
            'plugin:@angular-eslint/template/process-inline-templates',
          ],
          rules: {
            '@angular-eslint/directive-selector': [
              'error',
              {
                type: 'attribute',
                prefix: 'app',
                style: 'camelCase',
              },
            ],
            '@angular-eslint/component-selector': [
              'error',
              {
                type: 'element',
                prefix: 'app',
                style: 'kebab-case',
              },
            ],
          },
        },
        {
          files: ['*.html'],
          extends: ['plugin:@angular-eslint/template/recommended'],
          rules: {},
        },
      ],
    };

    // Project and workspace paths are the same for SPAs.
    await installEsLint(MOCK_WORKSPACE_PATH, MOCK_WORKSPACE_PATH, 'my-app');

    expect(mockRunNgCommand).toHaveBeenCalledWith(
      'add',
      ['@angular-eslint/schematics', '--skip-confirmation'],
      { stdio: 'inherit', cwd: MOCK_WORKSPACE_PATH }
    );

    // Verify ignore patterns are correct.
    expect(testWorkspaceEslintConfig.ignorePatterns).toEqual(['projects/**/*']);

    expect(testProjectEslintConfig).toBeUndefined();

    expect(mockLogger.info).toHaveBeenCalledWith(
      'ESLint configuration updated for root application.'
    );
  });

  it('should handle ESLint config without `overrides` section', async () => {
    testWorkspaceEslintConfig = {
      ignorePatterns: [],
    };

    // Project and workspace paths are the same for SPAs.
    await installEsLint(MOCK_WORKSPACE_PATH, MOCK_WORKSPACE_PATH, 'my-app');

    expect(mockRunNgCommand).toHaveBeenCalledWith(
      'add',
      ['@angular-eslint/schematics', '--skip-confirmation'],
      { stdio: 'inherit', cwd: MOCK_WORKSPACE_PATH }
    );
  });

  it('should setup ESLint for library projects', async () => {
    projectEslintrcExists = true;
    workspaceEslintrcExists = false;

    testProjectEslintConfig = {
      extends: '../../.eslintrc.json',
      ignorePatterns: ['!**/*'],
      overrides: [
        {
          files: ['*.ts'],
          parserOptions: {
            project: [
              'projects/my-lib/tsconfig.lib.json',
              'projects/my-lib/tsconfig.spec.json',
            ],
            createDefaultProgram: true,
          },
          rules: {
            '@angular-eslint/directive-selector': [
              'error',
              {
                type: 'attribute',
                prefix: 'lib',
                style: 'camelCase',
              },
            ],
            '@angular-eslint/component-selector': [
              'error',
              {
                type: 'element',
                prefix: 'lib',
                style: 'kebab-case',
              },
            ],
          },
        },
        {
          files: ['*.html'],
          rules: {},
        },
      ],
    };

    const projectPath = path.join(MOCK_WORKSPACE_PATH, '/projects/my-lib');

    await installEsLint(MOCK_WORKSPACE_PATH, projectPath, 'my-lib');

    expect(testWorkspaceEslintConfig.ignorePatterns).toEqual(['projects/**/*']);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'ESLint configuration updated for library.'
    );
  });

  it('should setup .eslintrc.json file for a project if there are multiple projects', async () => {
    projectEslintrcExists = false;
    workspaceEslintrcExists = false;

    testProjectEslintConfig = {
      extends: '../../.eslintrc.json',
      ignorePatterns: ['!**/*'],
      overrides: [
        {
          files: ['*.ts'],
          parserOptions: {
            project: ['projects/my-lib/tsconfig.app.json'],
            createDefaultProgram: true,
          },
          rules: {
            '@angular-eslint/directive-selector': [
              'error',
              {
                type: 'attribute',
                prefix: 'app',
                style: 'camelCase',
              },
            ],
            '@angular-eslint/component-selector': [
              'error',
              {
                type: 'element',
                prefix: 'app',
                style: 'kebab-case',
              },
            ],
          },
        },
        {
          files: ['*.html'],
          rules: {},
        },
      ],
    };

    const projectPath = path.join(MOCK_WORKSPACE_PATH, '/projects/my-lib');

    await installEsLint(MOCK_WORKSPACE_PATH, projectPath, 'my-lib');

    expect(mockRunNgCommand).toHaveBeenCalledWith(
      'generate',
      ['@angular-eslint/schematics:add-eslint-to-project', 'my-lib'],
      {
        stdio: 'inherit',
        cwd: MOCK_WORKSPACE_PATH,
      }
    );
  });

  it('should handle errors installing ESLint', async () => {
    mockRunNgCommand.and.returnValue({
      status: 1,
    });

    const projectPath = path.join(MOCK_WORKSPACE_PATH, '/');

    await expectAsync(
      installEsLint(MOCK_WORKSPACE_PATH, projectPath)
    ).toBeRejectedWithError('Failed to add ESLint to project.');
  });
});

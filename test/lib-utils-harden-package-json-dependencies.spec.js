const mock = require('mock-require');
const path = require('path');

describe('Harden package.json dependencies', () => {
  let fsExtraSpyObj;
  let loggerSpyObj;
  let mockLibraryPackageJson;
  let mockPackageJson;
  let mockPackageLockJson;

  beforeEach(() => {
    mockPackageJson = {
      dependencies: {
        '@angular/animations': '~12.1.3',
        '@angular/common': '~12.1.3',
        '@angular/compiler': '~12.1.3',
        '@angular/core': '~12.1.3',
        '@angular/forms': '~12.1.3',
        '@angular/platform-browser': '~12.1.3',
        '@angular/platform-browser-dynamic': '~12.1.3',
        '@angular/router': '~12.1.3',
        '@blackbaud-internal/skyux-auth': '^5.0.0-beta.0',
        '@blackbaud-internal/skyux-lib-app-links': '^1.1.1',
        '@blackbaud/auth-client': '2.48.0',
        '@skyux/core': '^5.0.0-beta.7',
        '@skyux/packages': '^5.0.0-beta.4',
        rxjs: '~6.6.0',
        tslib: '^2.0.0',
        'zone.js': '~0.11.4',
      },
      devDependencies: {
        '@angular-devkit/build-angular': '~12.1.3',
        '@angular-eslint/builder': '12.3.1',
        '@angular-eslint/eslint-plugin': '12.3.1',
        '@angular-eslint/eslint-plugin-template': '12.3.1',
        '@angular-eslint/schematics': '12.3.1',
        '@angular-eslint/template-parser': '12.3.1',
        '@angular/cli': '~12.1.3',
        '@angular/compiler-cli': '~12.1.3',
        '@blackbaud-internal/skyux-angular-builders': '^5.0.0-beta.4',
        '@skyux-sdk/testing': '^5.0.0-beta.0',
        '@types/jasmine': '~3.6.0',
        '@types/node': '^12.11.1',
        '@typescript-eslint/eslint-plugin': '4.28.2',
        '@typescript-eslint/parser': '4.28.2',
        eslint: '^7.26.0',
        'jasmine-core': '~3.6.0',
        karma: '~6.3.4',
        'karma-chrome-launcher': '~3.1.0',
        'karma-coverage': '~2.0.3',
        'karma-jasmine': '~4.0.0',
        'karma-jasmine-html-reporter': '^1.5.0',
        'ng-packagr': '^12.2.2',
        typescript: '~4.3.5',
      },
    };

    mockPackageLockJson = {
      dependencies: {},
    };

    mockLibraryPackageJson = {
      peerDependencies: {},
      dependencies: {},
    };

    loggerSpyObj = jasmine.createSpyObj('@blackbaud/skyux-logger', [
      'info',
      'warn',
    ]);

    mock('@blackbaud/skyux-logger', loggerSpyObj);

    fsExtraSpyObj = jasmine.createSpyObj('fs-extra', [
      'readJsonSync',
      'writeJsonSync',
    ]);

    fsExtraSpyObj.readJsonSync.and.callFake((filePath) => {
      const relativePath = path
        .join(filePath.replace(process.cwd(), ''))
        .replace(/\\/g, '/');

      switch (relativePath) {
        case '/angular.json':
          return {
            defaultProject: 'my-lib',
            projects: {
              'my-lib': {
                root: 'my-lib-root',
              },
            },
          };
        case '/package.json':
          return mockPackageJson;
        case '/package-lock.json':
          return mockPackageLockJson;
        case '/my-lib-root/package.json':
          return mockLibraryPackageJson;
      }
    });

    mock('fs-extra', fsExtraSpyObj);
  });

  afterEach(() => {
    mock.stopAll();
  });

  function getUtil() {
    return mock.reRequire('../lib/utils/harden-package-json-dependencies');
  }

  it('should set package.json dependencies to specific versions', async () => {
    mockPackageLockJson.dependencies = {
      '@skyux/packages': {
        version: 'SPECIFIC_VERSION',
      },
    };

    const hardenPackageJsonDependencies = getUtil();
    hardenPackageJsonDependencies();

    expect(
      fsExtraSpyObj.writeJsonSync.calls.argsFor(0)[1].dependencies
    ).toEqual(
      jasmine.objectContaining({ '@skyux/packages': 'SPECIFIC_VERSION' })
    );
  });

  it('should set library package.json dependencies/peers based on what is installed in workspace', async () => {
    mockLibraryPackageJson = {
      peerDependencies: {
        '@skyux/foobar': '^1.0.0',
        '@skyux/missing': '^1.0.0',
      },
      dependencies: {
        moment: '1.2.3',
        tslib: '^2.3.0',
      },
    };

    mockPackageJson = {
      dependencies: {
        '@skyux/foobar': '1.9.1',
        moment: '1.5.0',
        tslib: '2.3.1',
      },
    };

    const hardenPackageJsonDependencies = getUtil();
    hardenPackageJsonDependencies();

    expect(fsExtraSpyObj.writeJsonSync.calls.argsFor(1)[1]).toEqual({
      peerDependencies: {
        '@skyux/foobar': '^1.9.1',
        '@skyux/missing': '^1.0.0',
      },
      dependencies: { moment: '1.5.0', tslib: '^2.3.1' },
    });

    expect(loggerSpyObj.warn).toHaveBeenCalledWith(
      "Warning: The package \"@skyux/missing\" is listed in the library's 'package.json' but is not listed in the root 'package.json'."
    );
  });
});

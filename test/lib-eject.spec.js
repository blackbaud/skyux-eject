const mock = require('mock-require');
const path = require('path');

const CWD = process.cwd();

describe('Eject', () => {
  let ejectedProjectName;
  let ejectedProjectPath;

  let projectDirectoryExists;
  let skyuxConfigExists;
  let notFoundComponentExists;
  let rootIndexHtmlExists;
  let publicDirectoryExists;

  let mockAngularJson;
  let actualAngularJson;

  let mockSkyuxConfig;

  let mockPackageJson;

  let createAngularApplicationSpy;
  let copySyncSpy;
  let deprecateFilesSpy;
  let ensureNotFoundComponentSpy;
  let errorSpy;
  let getBuildToolMetadataSpy;
  let installEsLintSpy;
  let moveEjectedFilesSpy;
  let backupSourceFilesSpy;
  let migrateSkyuxConfigFilesSpy;
  let modifyAppComponentSpy;
  let modifyKarmaConfSpy;
  let modifyPackageJsonSpy;
  let npmInstallSpy;
  let processExitSpy;
  let checkForStrictModeSpy;
  let updateSkyuxPackagesSpy;
  let updateSourceFilesSpy;
  let removeSyncSpy;

  let writeFileSyncSpy;
  let writeJsonSpy;

  let mockBuildToolMetadata;
  let mockComponentData;
  let mockRouteGuardsData;
  let mockRoutesData;

  let mockOriginUrl;
  let isGitClean;

  let copyAssetsDirectorySpy;
  let copySrcAppFilesSpy;
  let copySrcLibFilesSpy;
  let copyStylesDirectorySpy;
  let copyRootProjectFilesSpy;

  beforeEach(() => {
    mockRoutesData = {};
    mockRouteGuardsData = {};
    mockComponentData = {
      'src/app/home.component.ts': `@Component({ selector: 'app-home' }) export class HomeComponent {}`,
    };

    ejectedProjectName = '';
    ejectedProjectPath = '';

    projectDirectoryExists = false;
    skyuxConfigExists = true;
    notFoundComponentExists = true;
    rootIndexHtmlExists = false;
    publicDirectoryExists = false;

    mockAngularJson = {
      projects: {},
    };
    actualAngularJson = undefined;

    mockSkyuxConfig = {
      name: 'skyuxconfig-name',
    };

    mockPackageJson = {
      name: 'packagejson-name',
    };

    writeFileSyncSpy = jasmine.createSpy('writeFileSync');
    errorSpy = jasmine.createSpy('error').and.callThrough();
    copySyncSpy = jasmine.createSpy('copySync');
    createAngularApplicationSpy = jasmine.createSpy('createAngularApplication');
    deprecateFilesSpy = jasmine.createSpy('deprecateFiles');
    ensureNotFoundComponentSpy = jasmine.createSpy('ensureNotFoundComponent');
    updateSkyuxPackagesSpy = jasmine.createSpy('updateSkyuxCore');
    updateSourceFilesSpy = jasmine.createSpy('updateSourceFiles');
    migrateSkyuxConfigFilesSpy = jasmine.createSpy('migrateSkyuxConfigFiles');
    modifyAppComponentSpy = jasmine.createSpy('modifyAppComponent');
    modifyPackageJsonSpy = jasmine.createSpy('modifyPackageJson');
    processExitSpy = spyOn(process, 'exit');
    checkForStrictModeSpy = jasmine.createSpy('checkForStrictMode');
    writeJsonSpy = jasmine.createSpy('writeJson');
    removeSyncSpy = jasmine.createSpy('removeSync');

    // Save the ejected project name.
    createAngularApplicationSpy.and.callFake(
      (_ejectedProjectPath, projectName) => {
        ejectedProjectName = projectName;
        mockAngularJson = {
          projects: {
            [ejectedProjectName]: {
              architect: {
                build: {
                  options: {
                    styles: [],
                  },
                },
                test: {
                  options: {},
                },
              },
            },
          },
        };
      }
    );

    checkForStrictModeSpy.and.returnValue(Promise.resolve(false));

    spyOn(console, 'error');

    mock('@blackbaud/skyux-logger', {
      error: errorSpy,
      info() {},
    });

    mock('fs-extra', {
      copySync: copySyncSpy,
      createFileSync() {},
      existsSync(file) {
        if (!path.extname(file)) {
          const basename = path.basename(file);
          if (basename === 'assets') {
            return true;
          }

          if (basename === 'public') {
            return publicDirectoryExists;
          }

          ejectedProjectPath = file;
          return projectDirectoryExists;
        }

        if (file === path.join(CWD, 'skyuxconfig.json')) {
          return skyuxConfigExists;
        }

        if (file === path.join(CWD, 'src/app/not-found.component.ts')) {
          return notFoundComponentExists;
        }

        if (file === path.join(CWD, 'src/app/index.html')) {
          return rootIndexHtmlExists;
        }

        return true;
      },
      readFileSync(file) {
        if (file === path.join(ejectedProjectPath, 'src/app/app.module.ts')) {
          return '@NgModule({}) export class AppModule {}';
        }

        const foundRouteGuard = Object.keys(mockRouteGuardsData).find(
          (x) => x === file
        );
        if (foundRouteGuard) {
          return mockRouteGuardsData[foundRouteGuard];
        }

        const foundComponent = Object.keys(mockComponentData).find(
          (x) => x === file
        );
        if (foundComponent) {
          return mockComponentData[foundComponent];
        }

        return '';
      },
      readJsonSync(file) {
        if (file === path.join(ejectedProjectPath, 'angular.json')) {
          return mockAngularJson;
        }

        if (file === path.join(CWD, 'skyuxconfig.json')) {
          return mockSkyuxConfig;
        }

        if (file === path.join(CWD, 'package.json')) {
          return mockPackageJson;
        }

        return {};
      },
      removeSync: removeSyncSpy,
      writeFileSync: writeFileSyncSpy,
    });

    mock('glob', {
      sync(pattern) {
        switch (pattern) {
          case 'skyuxconfig?(.*).json':
            return [path.join(CWD, 'skyuxconfig.json')];
          case path.join(CWD, 'src/app/**/*'):
            return [path.join(CWD, 'src/app/home.component.ts')];
          case 'src/app/**/index.html':
            return Object.keys(mockRoutesData);
          case 'src/app/**/index.guard.ts':
            return Object.keys(mockRouteGuardsData);
          case path.join(ejectedProjectPath, 'src/app/**/*.component.ts'):
            return Object.keys(mockComponentData);
        }

        return [];
      },
    });

    mock('../lib/utils/harden-package-json-dependencies', () => {});

    installEsLintSpy = jasmine.createSpy('installEsLint');
    mock('../lib/utils/install-eslint', installEsLintSpy);

    copyAssetsDirectorySpy = jasmine.createSpy('copyAssetsDirectory');
    copySrcAppFilesSpy = jasmine.createSpy('copySrcAppFiles');
    copySrcLibFilesSpy = jasmine.createSpy('copySrcLibFiles');
    copyStylesDirectorySpy = jasmine.createSpy('copyStylesDirectory');
    copyRootProjectFilesSpy = jasmine.createSpy('copyRootProjectFiles');
    mock('../lib/utils/eject/copy-files', {
      copyAssetsDirectory: copyAssetsDirectorySpy,
      copySrcAppFiles: copySrcAppFilesSpy,
      copySrcLibFiles: copySrcLibFilesSpy,
      copyStylesDirectory: copyStylesDirectorySpy,
      copyRootProjectFiles: copyRootProjectFilesSpy,
    });

    modifyKarmaConfSpy = jasmine.createSpy('modifyKarmaConf');
    mock('../lib/utils/eject/modify-karma-config', modifyKarmaConfSpy);

    moveEjectedFilesSpy = jasmine.createSpy('moveEjectedFiles');
    mock('../lib/utils/eject/move-ejected-files', moveEjectedFilesSpy);

    backupSourceFilesSpy = jasmine.createSpy('backupSourceFiles');
    mock('../lib/utils/eject/backup-source-files', backupSourceFilesSpy);

    npmInstallSpy = jasmine
      .createSpy('npmInstall')
      .and.returnValue(Promise.resolve());
    mock('../lib/utils/npm-install', npmInstallSpy);

    mockOriginUrl = 'https://github.com/';
    isGitClean = true;
    mock('../lib/utils/git-utils', {
      getOriginUrl() {
        return mockOriginUrl;
      },
      isGitClean() {
        return isGitClean;
      },
    });

    mock('../lib/utils/app-dependencies', {
      upgradeDependencies(dependencies) {
        return Promise.resolve(dependencies);
      },
    });

    mock('../lib/utils/eject/check-for-strict-mode', checkForStrictModeSpy);
    mock(
      '../lib/utils/eject/create-angular-application',
      createAngularApplicationSpy
    );
    mock('../lib/utils/eject/deprecate-files', deprecateFilesSpy);
    mock(
      '../lib/utils/eject/ensure-not-found-component',
      ensureNotFoundComponentSpy
    );
    mock(
      '../lib/utils/eject/migrate-skyux-config-files',
      migrateSkyuxConfigFilesSpy
    );
    mock('../lib/utils/eject/modify-app-component', modifyAppComponentSpy);
    mock('../lib/utils/eject/modify-package-json', modifyPackageJsonSpy);
    mock('../lib/utils/eject/update-source-files', updateSourceFilesSpy);

    writeJsonSpy.and.callFake((file, contents) => {
      if (file.indexOf('angular.json') > -1) {
        actualAngularJson = contents;
      }
    });

    mock('../lib/utils/eject/write-json', writeJsonSpy);

    mockBuildToolMetadata = {
      name: '@skyux-sdk/builder',
      currentlyInstalledMajorVersion: 4,
    };

    getBuildToolMetadataSpy = jasmine
      .createSpy('getBuildToolMetadata')
      .and.callFake(() => {
        return mockBuildToolMetadata;
      });

    mock('../lib/utils/get-build-tool-metadata', getBuildToolMetadataSpy);

    mock('../lib/utils/install-skyux-packages', updateSkyuxPackagesSpy);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should throw an error if not executed on SKY UX 4 project', async () => {
    const eject = mock.reRequire('../lib/eject');

    mockBuildToolMetadata = {
      name: '@skyux-sdk/builder',
      currentlyInstalledMajorVersion: 3,
    };

    await eject();

    expect(errorSpy).toHaveBeenCalledWith(
      '[skyux eject] Error: The eject command is only available to SKY UX 4 projects. Aborting.'
    );

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should throw an error if uncommitted changes found', async () => {
    const eject = mock.reRequire('../lib/eject');
    isGitClean = false;
    await eject();
    expect(errorSpy).toHaveBeenCalledWith(
      '[skyux eject] Error: Uncommitted changes found. Please commit or stash any changes before ejecting your project.'
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should throw an error if skyuxconfig.json not found', async () => {
    const eject = mock.reRequire('../lib/eject');
    skyuxConfigExists = false;
    await eject();
    expect(errorSpy).toHaveBeenCalledWith(
      '[skyux eject] Error: A skyuxconfig.json file was not found. Please execute this command within a SKY UX project.'
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should set project name from skyuxconfig.name', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(ejectedProjectName).toEqual('skyuxconfig-name');
  });

  it('should set project name from skyuxconfig.app.base', async () => {
    const eject = mock.reRequire('../lib/eject');
    mockSkyuxConfig.app = {
      base: 'foobar',
    };
    await eject();
    expect(ejectedProjectName).toEqual('foobar');
  });

  it('should set project name from packageJson.name', async () => {
    const eject = mock.reRequire('../lib/eject');
    mockSkyuxConfig = {};
    await eject();
    expect(ejectedProjectName).toEqual('packagejson-name');
  });

  it('should run `ng new`', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();

    expect(createAngularApplicationSpy).toHaveBeenCalledWith(
      ejectedProjectPath,
      'skyuxconfig-name',
      false
    );
  });

  it('should check for strict mode', async () => {
    checkForStrictModeSpy.and.returnValue(Promise.resolve(true));

    const eject = mock.reRequire('../lib/eject');
    await eject();

    expect(checkForStrictModeSpy).toHaveBeenCalledWith(CWD);

    expect(createAngularApplicationSpy).toHaveBeenCalledWith(
      ejectedProjectPath,
      'skyuxconfig-name',
      true
    );
  });

  it('should throw an error if new project directory already exists', async () => {
    const eject = mock.reRequire('../lib/eject');

    projectDirectoryExists = true;
    await eject();

    expect(errorSpy).toHaveBeenCalledWith(
      `[skyux eject] Error: The '${ejectedProjectPath}' directory already exists. Delete the directory and rerun the "eject" command.`
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should migrate skyuxconfig.app.styles', async () => {
    const eject = mock.reRequire('../lib/eject');
    mockSkyuxConfig.app = {
      styles: ['foobar/baz.css'],
    };
    await eject();
    expect(
      actualAngularJson.projects[ejectedProjectName].architect.build.options
        .styles
    ).toEqual(['@skyux/theme/css/sky.css', 'foobar/baz.css']);

    expect(
      actualAngularJson.projects[ejectedProjectName].architect.test.options
        .styles
    ).toEqual(['@skyux/theme/css/sky.css', 'foobar/baz.css']);
  });

  it('should not add theme stylesheet again if imported in skyuxconfig.app.styles', async () => {
    const eject = mock.reRequire('../lib/eject');
    mockSkyuxConfig.app = {
      styles: ['foobar/baz.css', '@skyux/theme/css/sky.css'],
    };
    await eject();
    expect(
      actualAngularJson.projects[ejectedProjectName].architect.build.options
        .styles
    ).toEqual(['foobar/baz.css', '@skyux/theme/css/sky.css']);

    expect(
      actualAngularJson.projects[ejectedProjectName].architect.test.options
        .styles
    ).toEqual(['foobar/baz.css', '@skyux/theme/css/sky.css']);
  });

  it('should update source files', async () => {
    const eject = mock.reRequire('../lib/eject');

    await eject();

    expect(updateSourceFilesSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should migrate skyuxconfig.json files', async () => {
    const eject = mock.reRequire('../lib/eject');

    await eject();

    expect(migrateSkyuxConfigFilesSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should update package.json', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();

    expect(modifyPackageJsonSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should copy assets folder', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(copyAssetsDirectorySpy).toHaveBeenCalled();
  });

  it('should copy specific app files', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(copySrcAppFilesSpy).toHaveBeenCalled();
  });

  it('should copy specific ./src/lib files', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(copySrcLibFilesSpy).toHaveBeenCalled();
  });

  it('should copy styles folder', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(copyStylesDirectorySpy).toHaveBeenCalled();
  });

  it('should copy root files', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(copyRootProjectFilesSpy).toHaveBeenCalled();
  });

  it('should handle migrating SPAs without routes', async () => {
    const eject = mock.reRequire('../lib/eject');

    rootIndexHtmlExists = false;
    mockRouteGuardsData = {};
    mockRoutesData = {};

    await eject();

    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      path.join(ejectedProjectPath, 'src/app/app-routing.module.ts'),
      `import {
  NgModule
} from '@angular/core';

import {
  RouterModule,
  Routes
} from '@angular/router';

import {
  RootRouteIndexComponent
} from './index.component';

import {
  NotFoundComponent
} from './not-found.component';

const routes: Routes = [
  { path: '', children: [
    { path: '', component: RootRouteIndexComponent }
  ] },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule { }
`
    );
  });

  it('should migrate complex routes', async () => {
    const eject = mock.reRequire('../lib/eject');

    rootIndexHtmlExists = true;

    mockRoutesData = {
      'src/app/about/#contact/#contributors/index.html': '',
      'src/app/about/#contact/#form/index.html': '',
      'src/app/about/#contact/#form/#foobar/index.html': '',
      'src/app/about/#contact/index.html': '',
      'src/app/about/careers/index.html': '',
      'src/app/about/index.html': '<app-about></app-about>',
      'src/app/users/_userId/index.html': '',
      'src/app/users/_userId/locations/_locationId/index.html': '',
      'src/app/users/_userId/locations/index.html': '',
      'src/app/users/foobar/index.html': '', // <-- This should be registered BEFORE the same route with params (e.g. ':userId')
      'src/app/users/index.html': '',
    };

    mockRouteGuardsData = {
      'src/app/index.guard.ts': `@Injectable({
  providedIn: 'root'
})
export class AppRouteGuard implements CanActivate {
  public canActivate(): Promise<boolean> {
    return Promise.resolve(false);
  }
  public canActivateChild() {}
  public canDeactivate() {}
}`,
      'src/app/users/index.guard.ts': `@Injectable()
export class MyRouteGuard implements CanActivate {
  public canActivate(): Promise<boolean> {
    return Promise.resolve(false);
  }
  public canActivateChild() {}
  public canDeactivate() {}
}`,
    };

    mockSkyuxConfig.redirects = {
      '': 'new-root',
      foobar: 'about',
    };

    await eject();

    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      path.join(ejectedProjectPath, 'src/app/app-routing.module.ts'),
      `import {
  NgModule
} from '@angular/core';

import {
  RouterModule,
  Routes
} from '@angular/router';

import {
  AboutContactContributorsRouteIndexComponent
} from './about/#contact/#contributors/index.component';

import {
  AboutContactFormRouteIndexComponent
} from './about/#contact/#form/index.component';

import {
  AboutContactFormFoobarRouteIndexComponent
} from './about/#contact/#form/#foobar/index.component';

import {
  AboutContactRouteIndexComponent
} from './about/#contact/index.component';

import {
  AboutCareersRouteIndexComponent
} from './about/careers/index.component';

import {
  AboutRouteIndexComponent
} from './about/index.component';

import {
  UsersUserIdRouteIndexComponent
} from './users/_userId/index.component';

import {
  UsersUserIdLocationsLocationIdRouteIndexComponent
} from './users/_userId/locations/_locationId/index.component';

import {
  UsersUserIdLocationsRouteIndexComponent
} from './users/_userId/locations/index.component';

import {
  UsersFoobarRouteIndexComponent
} from './users/foobar/index.component';

import {
  UsersRouteIndexComponent
} from './users/index.component';

import {
  RootRouteIndexComponent
} from './index.component';

import {
  NotFoundComponent
} from './not-found.component';

import {
  AppRouteGuard
} from './index.guard';

import {
  MyRouteGuard
} from './users/index.guard';

const routes: Routes = [
  { path: '', redirectTo: 'new-root', pathMatch: 'full' },
  { path: 'foobar', redirectTo: 'about', pathMatch: 'prefix' },
  { path: '', children: [
    { path: '', component: RootRouteIndexComponent },
    { path: 'about/careers', component: AboutCareersRouteIndexComponent },
    { path: 'about', component: AboutRouteIndexComponent, children: [
      { path: 'contact', component: AboutContactRouteIndexComponent, children: [
        { path: 'contributors', component: AboutContactContributorsRouteIndexComponent },
        { path: 'form', component: AboutContactFormRouteIndexComponent, children: [
          { path: 'foobar', component: AboutContactFormFoobarRouteIndexComponent }
        ] }
      ] }
    ] },
    { path: 'users/foobar', component: UsersFoobarRouteIndexComponent },
    { path: 'users', component: UsersRouteIndexComponent, canActivate: [MyRouteGuard], canActivateChild: [MyRouteGuard], canDeactivate: [MyRouteGuard] },
    { path: 'users/:userId', component: UsersUserIdRouteIndexComponent },
    { path: 'users/:userId/locations/:locationId', component: UsersUserIdLocationsLocationIdRouteIndexComponent },
    { path: 'users/:userId/locations', component: UsersUserIdLocationsRouteIndexComponent }
  ], canActivate: [AppRouteGuard], canActivateChild: [AppRouteGuard], canDeactivate: [AppRouteGuard] },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AppRouteGuard, MyRouteGuard]
})
export class AppRoutingModule { }
`
    );
  });

  it('should catch files that export more than one route guard', async () => {
    const eject = mock.reRequire('../lib/eject');

    rootIndexHtmlExists = true;

    mockRoutesData = {};

    mockRouteGuardsData = {
      'src/app/index.guard.ts': `@Injectable({
  providedIn: 'root'
})
export class AppRouteGuard implements CanActivate {
  public canActivate(): Promise<boolean> {
    return Promise.resolve(false);
  }
  public canActivateChild() {}
  public canDeactivate() {}
}

@Injectable()
export class MyRouteGuard implements CanActivate {
  public canActivate(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
`,
    };

    await eject();

    expect(errorSpy).toHaveBeenCalledWith(
      '[skyux eject] Error: As a best practice, only export one guard per file in "src/app/index.guard.ts".'
    );
  });

  it('should catch files that export malformed route guards', async () => {
    const eject = mock.reRequire('../lib/eject');

    rootIndexHtmlExists = true;

    mockRoutesData = {};

    mockRouteGuardsData = {
      'src/app/index.guard.ts': 'export class InvalidClass {}',
    };

    await eject();

    expect(errorSpy).toHaveBeenCalledWith(
      '[skyux eject] Error: The file "src/app/index.guard.ts" does not export a route guard class, or it is formatted incorrectly.'
    );
  });

  it('should generate a route component with the expected selector', async () => {
    const eject = mock.reRequire('../lib/eject');

    rootIndexHtmlExists = true;

    mockRoutesData = {
      'src/app/users/index.html': '',
    };

    await eject();

    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      path.join(ejectedProjectPath, 'src/app/users/index.component.ts'),
      jasmine.stringMatching(/selector: 'app-users-route-index'/g)
    );
  });

  it('should modify the app component', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();

    expect(modifyAppComponentSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should create the SkyPagesModule', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      path.join(ejectedProjectPath, 'src/app/sky-pages.module.ts'),
      `import {
  CommonModule
} from '@angular/common';

import {
  NgModule
} from '@angular/core';

import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import {
  RouterModule
} from '@angular/router';

import {
  SkyI18nModule
} from '@skyux/i18n';

import {
  SkyAppLinkModule
} from '@skyux/router';

import {
  SkyAppAssetsService
} from '@skyux/assets';

import {
  HomeComponent
} from 'src/app/home.component';

import {
  RootRouteIndexComponent
} from './index.component';

import {
  NotFoundComponent
} from './not-found.component';

import {
  AppExtrasModule
} from './app-extras.module';

/**
 * @deprecated This module was migrated from SKY UX Builder v.4.
 * It is highly recommended that this module be factored-out into separate, lazy-loaded feature modules.
 */
@NgModule({
  imports: [
    AppExtrasModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SkyAppLinkModule,
    SkyI18nModule
  ],
  declarations: [
    HomeComponent,
    NotFoundComponent,
    RootRouteIndexComponent
  ],
  exports: [
    AppExtrasModule,
    HomeComponent,
    NotFoundComponent,
    RootRouteIndexComponent
  ],
  providers: [
    // This provider is to support the legacy SKY UX asset and i18n
    // functionality. You should refactor your application to use Angular's
    // built-in asset handling and i18n processes instead.
    // https://angular.io/guide/file-structure#application-project-files
    // https://angular.io/guide/i18n-overview
    {
      provide: SkyAppAssetsService,
      useValue: {
        getUrl(path: string) {
          return '/assets/' + path;
        },
        getAllUrls() {
          return undefined;
        }
      }
    }
  ]
})
export class SkyPagesModule { }
`
    );
  });

  it('should create a NotFoundComponent if not exists', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();

    expect(ensureNotFoundComponentSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should mark root modules as deprecated', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(deprecateFilesSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should run `npm install` after eject complete', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(npmInstallSpy).toHaveBeenCalled();
  });

  it('should move ejected files to current working directory', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(moveEjectedFilesSpy).toHaveBeenCalled();
  });

  it('should backup original source files', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(backupSourceFilesSpy).toHaveBeenCalled();
  });

  it('should run `ng update @skyux/core`', async () => {
    const eject = mock.reRequire('../lib/eject');
    await eject();
    expect(updateSkyuxPackagesSpy).toHaveBeenCalledWith(ejectedProjectPath);
  });

  it('should add BrowserAnimationsModule to AppModule', async () => {
    mock.reRequire('../lib/utils/angular-utils');

    const eject = mock.reRequire('../lib/eject');

    await eject();

    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      path.join(ejectedProjectPath, 'src/app/app.module.ts'),
      `import {
  BrowserAnimationsModule
} from '@angular/platform-browser/animations';

@NgModule({
imports: [
    BrowserAnimationsModule
  ]
}) export class AppModule {}`
    );
  });

  // it('should install ESLint', async () => {
  //   const eject = mock.reRequire('../lib/eject');

  //   await eject();

  //   expect(installEsLintSpy).toHaveBeenCalledWith(
  //     ejectedProjectPath,
  //     ejectedProjectPath,
  //     'skyuxconfig-name',
  //     false
  //   );
  // });

  it('should modify karma.conf.js', async () => {
    const eject = mock.reRequire('../lib/eject');

    await eject();

    expect(modifyKarmaConfSpy).toHaveBeenCalledWith(
      path.join(ejectedProjectPath, 'karma.conf.js')
    );
  });

  it('should delete node_modules and temp directories', async () => {
    const eject = mock.reRequire('../lib/eject');

    await eject();

    expect(removeSyncSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), 'node_modules')
    );

    expect(removeSyncSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), '.skypageslocales')
    );

    expect(removeSyncSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), '.skypagestmp')
    );
  });
});

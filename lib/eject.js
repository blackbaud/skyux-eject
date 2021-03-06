const logger = require('@blackbaud/skyux-logger');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const angularUtils = require('./utils/angular-utils');
const gitUtils = require('./utils/git-utils');
const installSkyuxPackages = require('./utils/install-skyux-packages');
const npmInstall = require('./utils/npm-install');
const routesGenerator = require('./utils/routes-generator');

const backupSourceFiles = require('./utils/eject/backup-source-files');
const constants = require('./utils/eject/constants');
const copyFiles = require('./utils/eject/copy-files');
const checkForStrictMode = require('./utils/eject/check-for-strict-mode');
const createAngularApplication = require('./utils/eject/create-angular-application');
const deprecateFiles = require('./utils/eject/deprecate-files');
const ensureNotFoundComponent = require('./utils/eject/ensure-not-found-component');
const moveEjectedFilesToCwd = require('./utils/eject/move-ejected-files');
const migrateSkyuxConfigFiles = require('./utils/eject/migrate-skyux-config-files');
const modifyAppComponent = require('./utils/eject/modify-app-component');
const modifyGitignore = require('./utils/eject/modify-gitignore');
const modifyKarmaConfig = require('./utils/eject/modify-karma-config');
const modifyPackageJson = require('./utils/eject/modify-package-json');
const updateSourceFiles = require('./utils/eject/update-source-files');
const writeJson = require('./utils/eject/write-json');

const getBuildToolMetadata = require('./utils/get-build-tool-metadata');
const hardenPackageJsonDependencies = require('./utils/harden-package-json-dependencies');
const installEsLint = require('./utils/install-eslint');

const CWD = process.cwd();

/**
 * Creates a SkyPagesModule, which will handle all of the existing application's routes and component declarations.
 */
function createSkyPagesModule(ejectedProjectPath, routes) {
  logger.info('Creating the SkyPagesModule...');

  const moduleImports = [
    `import {
  CommonModule
} from '@angular/common';`,
    `import {
  NgModule
} from '@angular/core';`,
    `import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';`,
    `import {
  RouterModule
} from '@angular/router';`,
    `import {
  SkyI18nModule
} from '@skyux/i18n';`,
    `import {
  SkyAppLinkModule
} from '@skyux/router';`,
  ];

  const moduleNames = [
    'AppExtrasModule',
    'CommonModule',
    'FormsModule',
    'ReactiveFormsModule',
    'RouterModule',
    'SkyAppLinkModule',
    'SkyI18nModule',
  ];

  const componentFiles = glob.sync(
    path.join(ejectedProjectPath, 'src/app/**/*.component.ts'),
    {
      nodir: true,
      ignore: [
        '**/index.component.ts',
        '**/not-found.component.ts',
        '**/app.component.ts',
        '**/*-route-index.component.ts',
      ],
    }
  );

  const componentNames = componentFiles
    .map((file) => angularUtils.extractComponentName(file))
    .concat(['RootRouteIndexComponent', 'NotFoundComponent']);

  const componentImports = componentFiles.map((file, i) => {
    const importPath = file
      .replace(
        // Glob always returns file paths with forward slashes,
        // so we need to replace what `path.join` generates on Windows machines.
        path.join(ejectedProjectPath, 'src/app/').replace(/\\/g, '/'),
        './'
      )
      .replace('.ts', '');
    return `import {
  ${componentNames[i]}
} from '${importPath}';`;
  });

  const routeComponentImports = routesGenerator.getRouteComponentImports(
    routes.routeComponents
  );
  const routeComponentNames = routes.routeComponents.map((x) => x.className);

  const contents = `${moduleImports.join('\n\n')}

import {
  SkyAppAssetsService
} from '@skyux/assets';

${componentImports.join('\n\n')}

${routeComponentImports.join('\n\n')}

import {
  AppExtrasModule
} from './app-extras.module';

/**
 * @deprecated This module was migrated from SKY UX Builder v.4.
 * It is highly recommended that this module be factored-out into separate, lazy-loaded feature modules.
 */
@NgModule({
  imports: [
    ${moduleNames.sort().join(',\n    ')}
  ],
  declarations: [
    ${componentNames.concat(routeComponentNames).sort().join(',\n    ')}
  ],
  exports: [
    AppExtrasModule,
    ${componentNames.sort().join(',\n    ')}
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
`;

  fs.writeFileSync(
    path.join(ejectedProjectPath, 'src/app/sky-pages.module.ts'),
    contents
  );

  angularUtils.addModuleToMainModuleImports(
    ejectedProjectPath,
    'SkyPagesModule',
    './sky-pages.module'
  );

  logger.info('Done.');
}

/**
 * Converts existing index.html files into route components.
 */
function createRouteComponentFiles(ejectedProjectPath, routes) {
  logger.info('Creating route component files...');

  routes.routeComponents.forEach((indexComponent) => {
    const componentFilePath = path.join(
      ejectedProjectPath,
      indexComponent.relativeFilePath
    );

    /*istanbul ignore if*/
    if (!fs.existsSync(componentFilePath)) {
      fs.createFileSync(componentFilePath);
    }

    fs.writeFileSync(
      componentFilePath,
      routesGenerator.getIndexComponentSource(indexComponent)
    );

    fs.copySync(
      path.join(CWD, indexComponent.templateFilePath),
      path.join(
        ejectedProjectPath,
        indexComponent.relativeFilePath.replace('.ts', '.html')
      )
    );
  });

  logger.info('Done.');
}

/**
 * Makes necessary modifications to the AppRoutingModule.
 */
function modifyRoutingModule(ejectedProjectPath, routes) {
  logger.info('Modifying routing module...');

  const configString = routesGenerator.stringifyRoutesConfig(
    routes.routesConfig
  );
  const routeComponentImports = routesGenerator.getRouteComponentImports(
    routes.routeComponents
  );
  const routeGuardImports = routes.guards.map((guard) => {
    const importPath = guard.fileName
      .replace('src/app', '.')
      .replace('.ts', '');
    return `import {
  ${guard.className}
} from '${importPath}';`;
  });

  let importStatement = '\n' + routeComponentImports.join('\n\n');
  if (routeGuardImports.length) {
    importStatement += '\n\n' + routeGuardImports.join('\n\n');
  }

  const contents = `import {
  NgModule
} from '@angular/core';

import {
  RouterModule,
  Routes
} from '@angular/router';
${importStatement}

const routes: Routes = [
  ${configString}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [${routes.guards.map((x) => x.className).join(', ')}]
})
export class AppRoutingModule { }
`;

  fs.writeFileSync(
    path.join(ejectedProjectPath, 'src/app/app-routing.module.ts'),
    contents
  );

  logger.info('Done.');
}

/**
 * Creates the RootRouteIndexComponent.
 */
function createRootIndexComponent(ejectedProjectPath) {
  const indexHtml = path.join(CWD, 'src/app/index.html');

  let htmlContents = '<router-outlet></router-outlet>';
  if (fs.existsSync(indexHtml)) {
    htmlContents = fs.readFileSync(indexHtml);
  }

  fs.writeFileSync(
    path.join(ejectedProjectPath, 'src/app/index.component.ts'),
    routesGenerator.getIndexComponentSource({
      className: 'RootRouteIndexComponent',
      selector: 'app-root-route-index',
    })
  );

  fs.writeFileSync(
    path.join(ejectedProjectPath, 'src/app/index.component.html'),
    htmlContents
  );
}

function getEjectedProjectName(skyuxConfig) {
  if (skyuxConfig.app && skyuxConfig.app.base) {
    return skyuxConfig.app.base;
  }

  if (skyuxConfig.name) {
    return skyuxConfig.name;
  }

  const packageJson = fs.readJsonSync(path.join(CWD, 'package.json'));
  return packageJson.name.replace(/^blackbaud-skyux-spa-/gi, '');
}

function getSkyuxConfig() {
  const skyuxConfigPath = path.join(CWD, 'skyuxconfig.json');
  if (!fs.existsSync(skyuxConfigPath)) {
    throw new Error(
      'A skyuxconfig.json file was not found. Please execute this command within a SKY UX project.'
    );
  }
  return fs.readJsonSync(skyuxConfigPath);
}

function migrateSkyuxConfigAppStylesArray(
  skyuxConfig,
  ejectedProjectPath,
  projectName
) {
  const skyCssPath = '@skyux/theme/css/sky.css';
  const existingStyles = skyuxConfig.app?.styles || [];

  if (existingStyles.indexOf(skyCssPath) < 0) {
    existingStyles.unshift(skyCssPath);
  }

  const angularJsonPath = path.join(ejectedProjectPath, 'angular.json');
  const angularJson = fs.readJsonSync(angularJsonPath);

  const buildStyles =
    angularJson.projects[projectName].architect.build.options.styles;

  const testStyles = (angularJson.projects[
    projectName
  ].architect.test.options.styles = []);

  existingStyles.forEach((filePath) => {
    buildStyles.push(filePath);
    testStyles.push(filePath);
  });

  writeJson(angularJsonPath, angularJson);
}

/**
 * Migrates an existing SKY UX application into an Angular CLI application.
 */
async function eject() {
  try {
    // Abort if uncommitted changes found.
    if (!gitUtils.isGitClean()) {
      throw new Error(
        'Uncommitted changes found. Please commit or stash any changes before ejecting your project.'
      );
    }

    // Only allow running the eject command on SKY UX 4 projects.
    const buildTool = await getBuildToolMetadata();
    if (
      buildTool.name !== '@skyux-sdk/builder' ||
      buildTool.currentlyInstalledMajorVersion !== 4
    ) {
      throw new Error(
        'The eject command is only available to SKY UX 4 projects. Aborting.'
      );
    }

    const ejectedProjectPath = path.join(CWD, constants.EJECTED_FILES_TEMP_DIR);
    if (fs.existsSync(ejectedProjectPath)) {
      throw new Error(
        `The '${ejectedProjectPath}' directory already exists. Delete the directory and rerun the "eject" command.`
      );
    }

    // Delete the node_modules directory so that local packages cannot affect the Angular CLI commands
    // (if installed, local versions of @angular/cli will be used, which could have negative consequences).
    fs.removeSync(path.join(CWD, 'node_modules'));

    // Remove temporary directories.
    fs.removeSync(path.join(CWD, '.skypageslocales'));
    fs.removeSync(path.join(CWD, '.skypagestmp'));

    const strictMode = await checkForStrictMode(CWD);

    const skyuxConfig = getSkyuxConfig();

    logger.info(
      'Ejecting an Angular CLI application (this might take several minutes)...'
    );

    const projectName = getEjectedProjectName(skyuxConfig);

    // Save a backup of original source files.
    backupSourceFiles(ejectedProjectPath, constants.SOURCE_CODE_BACKUP_DIR);

    // Setup project and packages.
    createAngularApplication(ejectedProjectPath, projectName, strictMode);
    migrateSkyuxConfigAppStylesArray(
      skyuxConfig,
      ejectedProjectPath,
      projectName
    );
    migrateSkyuxConfigFiles();

    // Copy files.
    copyFiles.copyAssetsDirectory(ejectedProjectPath);
    copyFiles.copyStylesDirectory(ejectedProjectPath);
    copyFiles.copySrcAppFiles(ejectedProjectPath);
    copyFiles.copySrcLibFiles(ejectedProjectPath);
    copyFiles.copyRootProjectFiles(ejectedProjectPath);

    // Make changes to source files.
    updateSourceFiles(ejectedProjectPath);

    // Setup routes.
    const routes = routesGenerator.getRoutesData(skyuxConfig);
    createRouteComponentFiles(ejectedProjectPath, routes);
    modifyRoutingModule(ejectedProjectPath, routes);

    // Create additional files.
    modifyAppComponent(ejectedProjectPath);
    createRootIndexComponent(ejectedProjectPath);
    ensureNotFoundComponent(ejectedProjectPath);
    deprecateFiles(ejectedProjectPath);
    createSkyPagesModule(ejectedProjectPath, routes);
    modifyGitignore(ejectedProjectPath, [constants.SOURCE_CODE_BACKUP_DIR]);
    modifyKarmaConfig(path.join(ejectedProjectPath, 'karma.conf.js'));

    // Add `BrowserAnimationsModule` to app module since '@skyux/animations' needs it.
    angularUtils.addModuleToMainModuleImports(
      ejectedProjectPath,
      'BrowserAnimationsModule',
      '@angular/platform-browser/animations'
    );

    // Add `HttpClientModule` to app module since '@skyux/i18n' needs it.
    angularUtils.addModuleToMainModuleImports(
      ejectedProjectPath,
      'HttpClientModule',
      '@angular/common/http'
    );

    await installEsLint(ejectedProjectPath, ejectedProjectPath, projectName);

    // Update SKY UX dependencies.
    await modifyPackageJson(ejectedProjectPath);

    // Install `@skyux/packages`.
    installSkyuxPackages(ejectedProjectPath);

    // Move ejected files.
    moveEjectedFilesToCwd(ejectedProjectPath);

    // Install the packages again since it's faster than moving `node_modules` directly.
    await npmInstall();
    hardenPackageJsonDependencies();

    logger.info('Done ejecting Angular CLI application.');
  } catch (err) {
    logger.error(`[skyux eject] Error: ${err.message}`);
    // Output the error's stack trace.
    console.error(err);
    process.exit(1);
  }
}

module.exports = eject;

const logger = require('@blackbaud/skyux-logger');
const fs = require('fs-extra');
const path = require('path');

const { sortObjectByKeys } = require('../sort-utils');

const writeJson = require('./write-json');

const CWD = process.cwd();

function isValidDependency(packageName, rules) {
  const isIncluded = rules.include.find((x) => x.test(packageName));
  const isExcluded = rules.exclude.find((x) => x.test(packageName));
  return isIncluded && !isExcluded;
}

/**
 * Migrates dependencies to the new Angular CLI package.json file.
 */
function modifyPackageJson(ejectedProjectPath) {
  logger.info('Finalizing changes to package.json...');

  const packageJson = fs.readJsonSync(path.join(CWD, 'package.json'));
  const ejectedPackageJsonPath = path.join(ejectedProjectPath, 'package.json');
  const ejectedPackageJson = fs.readJsonSync(ejectedPackageJsonPath);

  // Dependencies allowed in the `dependencies` section.
  const validDependenciesRules = {
    include: [/^@(angular|blackbaud|skyux)\//, /^(rxjs|tslib|zone.js)$/],
    exclude: [/^@angular\/(cli|compiler-cli)/],
  };

  // Dependencies allowed in the `devDependencies` section.
  const validDevDependenciesRules = {
    include: [
      /^@angular-devkit\//,
      /^@angular\/(cli|compiler-cli)/,
      /^@skyux-sdk\/testing$/,
      /^@types\//,
      /^(jasmine|karma)(.*)?/,
      /^(ts-node|typescript)$/,
    ],
    exclude: [],
  };

  // The following dependencies are no longer valid and should be removed.
  const invalidDependencies = [
    /^@blackbaud\/auth-client$/,
    /^@skyux\/http$/,
    /^@skyux\/omnibar-interop$/,
    /^@skyux-sdk\/builder(.*)?/,
    /^@skyux-sdk\/e2e$/,
    /^codelyzer$/,
    /^karma-jasmine-html-reporter$/,
    /^postcss$/, // Angular handles this dependency internally.
    /^protractor$/,
    /^tslint$/,
  ];

  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.devDependencies = packageJson.devDependencies || {};

  // First, merge all dependencies into a single list.
  // We'll decide which dependencies go in which section later.
  const allDependencies = Object.assign(
    {},
    packageJson.dependencies,
    packageJson.devDependencies,
    ejectedPackageJson.dependencies || {},
    ejectedPackageJson.devDependencies || {}
  );

  const dependencies = {};
  const devDependencies = {};
  const unassigned = {};

  // Assign each dependency to its appropriate section.
  Object.keys(allDependencies).forEach((packageName) => {
    const isInvalid = invalidDependencies.find((x) => x.test(packageName));
    if (isInvalid) {
      return;
    }

    if (isValidDependency(packageName, validDependenciesRules)) {
      dependencies[packageName] = allDependencies[packageName];
      return;
    }

    if (isValidDependency(packageName, validDevDependenciesRules)) {
      devDependencies[packageName] = allDependencies[packageName];
      return;
    }

    // Save any dependencies that we don't recognize for later.
    unassigned[packageName] = allDependencies[packageName];
  });

  // Add any unassigned dependencies to their respective section.
  // (Whichever section the consumer's package.json used.)
  Object.keys(unassigned).forEach((packageName) => {
    if (packageJson.dependencies[packageName]) {
      dependencies[packageName] = unassigned[packageName];
    } else {
      devDependencies[packageName] = unassigned[packageName];
    }
  });

  ejectedPackageJson.dependencies = sortObjectByKeys(dependencies);
  ejectedPackageJson.devDependencies = sortObjectByKeys(devDependencies);

  writeJson(ejectedPackageJsonPath, ejectedPackageJson);

  logger.info('Done.');
}

module.exports = modifyPackageJson;

const logger = require('@blackbaud/skyux-logger');
const fs = require('fs-extra');
const path = require('path');

function hardenDependencyVersions(dependencies, packageLock) {
  for (const packageName in dependencies) {
    const version = dependencies[packageName];
    const installedVersion = packageLock.dependencies[packageName]?.version;

    if (!installedVersion) {
      logger.warn(
        `Warning: The package ${packageName} was found in package.json but is not installed.`
      );
      continue;
    }

    /* istanbul ignore else */
    if (version !== installedVersion) {
      logger.info(
        `Fixing version for dependency ${packageName} @ "${installedVersion}" (was "${version}")...`
      );
      dependencies[packageName] = installedVersion;
    }
  }
}

function updateLibraryDependencySection(
  section,
  packageJson,
  targetDependencies
) {
  for (const packageName in packageJson[section]) {
    const targetVersion = targetDependencies[packageName];
    if (!targetVersion) {
      logger.warn(
        `Warning: The package "${packageName}" is listed in the library's 'package.json' but is not listed in the root 'package.json'.`
      );
      continue;
    }

    packageJson[section][packageName] =
      packageName === 'tslib' || section === 'peerDependencies'
        ? `^${targetVersion}`
        : targetVersion;
  }
}

/**
 * Updates a library's `dependencies` and `peerDependencies` based on what's
 * installed in the workspace package.json.
 * For example, if the workspace has installed `@skyux/foobar@5.1.0`, this function
 * will update the library's peer dependency to `@skyux/foobar@^5.1.0`.
 */
function updateLibraryDependencies(targetDependencies, workingDirectory) {
  const angularJson = fs.readJsonSync(
    path.join(workingDirectory, 'angular.json')
  );

  const defaultProject = angularJson.defaultProject;

  const packageJsonPath = path.join(
    workingDirectory,
    angularJson.projects[defaultProject].root,
    'package.json'
  );
  const packageJson = fs.readJsonSync(packageJsonPath);

  updateLibraryDependencySection(
    'dependencies',
    packageJson,
    targetDependencies
  );

  updateLibraryDependencySection(
    'peerDependencies',
    packageJson,
    targetDependencies
  );

  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
}

/**
 * Sets specific versions for package.json `dependencies` and `devDependencies`.
 */
function hardenPackageJsonDependencies(workingDirectory) {
  logger.info('Hardening package.json dependency versions...');

  workingDirectory = workingDirectory || process.cwd();

  const packageJson = fs.readJsonSync(
    path.join(workingDirectory, 'package.json')
  );

  const packageLockJson = fs.readJsonSync(
    path.join(workingDirectory, 'package-lock.json')
  );

  hardenDependencyVersions(packageJson.dependencies, packageLockJson);
  hardenDependencyVersions(packageJson.devDependencies, packageLockJson);

  fs.writeJsonSync(path.join(workingDirectory, 'package.json'), packageJson, {
    spaces: 2,
  });

  updateLibraryDependencies(packageJson.dependencies, workingDirectory);

  logger.info('Done.');
}

module.exports = hardenPackageJsonDependencies;

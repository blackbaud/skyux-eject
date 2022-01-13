const fs = require('fs-extra');
const glob = require('glob');
const logger = require('@blackbaud/skyux-logger');
const path = require('path');

function migrateAssetsPath(filePath, fileContents) {
  logger.verbose(`Looking for asset paths in ${filePath}...`);

  if (fileContents.indexOf('~/assets/') >= 0) {
    logger.verbose(`Processing asset paths in ${filePath}...`);

    fileContents = fileContents.replace(/~\/assets\//g, 'assets/');
  }

  logger.verbose('Done.');

  return fileContents;
}

function updateSourceFiles(ejectedProjectPath) {
  logger.info('Updating source files...');

  const filePaths = glob.sync(
    path.join(ejectedProjectPath, 'src/app/**/*.+(html|css|scss|ts)'),
    {
      nodir: true,
      ignore: ['**/node_modules'],
    }
  );

  for (const filePath of filePaths) {
    let fileContents = fs.readFileSync(filePath, {
      encoding: 'utf-8',
    });

    const originalFileContents = fileContents;

    fileContents = migrateAssetsPath(filePath, fileContents);

    if (fileContents !== originalFileContents) {
      logger.verbose(`Writing changes to ${filePath}...`);

      fs.writeFileSync(filePath, fileContents, {
        encoding: 'utf-8',
      });
    }
  }

  logger.info('Done.');
}

module.exports = updateSourceFiles;

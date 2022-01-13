const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

/**
 * Migrates skyuxconfig.*.json files; only includes supported properties.
 */
function migrateSkyuxConfigFiles() {
  const files = glob.sync('skyuxconfig?(.*).json');

  // Rename skyuxconfig.json files to indicate they are now obsolete.
  for (const file of files) {
    const oldPath = path.join(file);
    const newPath = oldPath.replace(/\.json$/, '_obsolete.json');

    fs.renameSync(oldPath, newPath);
  }
}

module.exports = migrateSkyuxConfigFiles;

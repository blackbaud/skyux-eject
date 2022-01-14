const path = require('path');
const mock = require('mock-require');

const CWD = process.cwd();

describe('migrateSkyuxConfigFiles', () => {
  let migrateSkyuxConfigFiles;
  let mockFsExtra;

  beforeEach(() => {
    mock('glob', {
      sync(pattern) {
        switch (pattern) {
          case 'skyuxconfig?(.*).json':
            return [path.join(CWD, 'skyuxconfig.json')];
        }

        return [];
      },
    });

    mockFsExtra = jasmine.createSpyObj('fs-extra', ['renameSync']);

    mock('fs-extra', mockFsExtra);

    migrateSkyuxConfigFiles = mock.reRequire(
      '../lib/utils/eject/migrate-skyux-config-files'
    );
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should rename skyuxconfig.json files', () => {
    migrateSkyuxConfigFiles();
    expect(mockFsExtra.renameSync).toHaveBeenCalledWith(
      path.join(process.cwd(), 'skyuxconfig.json'),
      path.join(process.cwd(), 'skyuxconfig_obsolete.json')
    );
  });
});

import * as React from 'react';

import { ipcRenderer } from 'electron';
import { shallow } from 'enzyme';

import { IpcEvents } from '../../../src/ipc-events';
import { AddVersionDialog } from '../../../src/renderer/components/dialog-add-version';
import { AppState } from '../../../src/renderer/state';
import { overrideRendererPlatform } from '../../utils';

describe('AddVersionDialog component', () => {
  let store: AppState;

  const mockFile = '/test/file';

  beforeEach(() => {
    // We render the buttons different depending on the
    // platform, so let' have a uniform platform for unit tests
    overrideRendererPlatform('darwin');

    ({ state: store } = window.ElectronFiddle.app);
  });

  it('renders', () => {
    const wrapper = shallow(<AddVersionDialog appState={store} />);

    wrapper.setState({
      isValidVersion: true,
      isValidElectron: true,
      folderPath: mockFile,
    });

    expect(wrapper).toMatchSnapshot();

    wrapper.setState({
      isValidVersion: false,
      isValidElectron: true,
      folderPath: mockFile,
    });

    expect(wrapper).toMatchSnapshot();

    wrapper.setState({
      isValidVersion: true,
      isValidElectron: true,
      existingLocalVersion: {
        version: '2.2.2',
        localPath: mockFile,
      },
      folderPath: mockFile,
    });

    expect(wrapper).toMatchSnapshot();
  });

  it('overrides default input with Electron dialog', () => {
    const preventDefault = jest.fn();

    const wrapper = shallow(<AddVersionDialog appState={store} />);
    const inp = wrapper.find('#custom-electron-version');
    inp.dive().find('input[type="file"]').simulate('click', { preventDefault });

    expect(ipcRenderer.send as jest.Mock).toHaveBeenCalledWith(
      IpcEvents.SHOW_LOCAL_VERSION_FOLDER_DIALOG,
    );
    expect(preventDefault).toHaveBeenCalled();
  });

  describe('setFolderPath()', () => {
    it('does something', async () => {
      // (getIsDownloaded as jest.Mock).mockReturnValue(true);
      const wrapper = shallow(<AddVersionDialog appState={store} />);
      (wrapper.instance() as any).isValidElectronPath = () => true;
      await (wrapper.instance() as any).setFolderPath('/test/');

      expect(wrapper.state('isValidElectron')).toBe(true);
      expect(wrapper.state('folderPath')).toBe('/test/');
    });
  });

  describe('onChangeVersion()', () => {
    it('handles valid input', () => {
      const wrapper = shallow(<AddVersionDialog appState={store} />);

      (wrapper.instance() as any).onChangeVersion({
        target: { value: '3.3.3' },
      });
      expect(wrapper.state('isValidVersion')).toBe(true);
      expect(wrapper.state('version')).toBe('3.3.3');
    });

    it('handles invalid input', () => {
      const wrapper = shallow(<AddVersionDialog appState={store} />);

      (wrapper.instance() as any).onChangeVersion({ target: { value: 'foo' } });
      expect(wrapper.state('isValidVersion')).toBe(false);
      expect(wrapper.state('version')).toBe('foo');

      (wrapper.instance() as any).onChangeVersion({ target: {} });
      expect(wrapper.state('isValidVersion')).toBe(false);
      expect(wrapper.state('version')).toBe('');
    });
  });

  describe('onSubmit', () => {
    it('does not do anything without a file', async () => {
      const wrapper = shallow(<AddVersionDialog appState={store} />);

      await (wrapper.instance() as any).onSubmit();

      expect(store.addLocalVersion as jest.Mock).toHaveBeenCalledTimes(0);
    });

    it('adds a local version using the given data', async () => {
      const wrapper = shallow(<AddVersionDialog appState={store} />);

      wrapper.setState({
        version: '3.3.3',
        folderPath: '/test/path',
      });

      await (wrapper.instance() as any).onSubmit();

      expect(store.addLocalVersion as jest.Mock).toHaveBeenCalledTimes(1);

      const result = (store.addLocalVersion as jest.Mock).mock.calls[0][0];

      expect(result.localPath).toBe('/test/path');
      expect(result.version).toBe('3.3.3');
    });

    it('shows dialog warning when adding duplicate local versions', async () => {
      const wrapper = shallow(<AddVersionDialog appState={store} />);

      wrapper.setState({
        isValidElectron: true,
        folderPath: '/test/path',
        version: '3.3.3',
        existingLocalVersion: {
          version: '2.2.2',
          localPath: '/test/path',
        },
      });

      expect(wrapper).toMatchSnapshot();
    });
  });
});

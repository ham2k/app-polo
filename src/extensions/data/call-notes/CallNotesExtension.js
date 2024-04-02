import React from 'react'
import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../../../package.json'
import { registerDataFile } from '../../../store/dataFiles'
import { loadDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectExtensionSettings } from '../../../store/settings'
import { List } from 'react-native-paper'
import ManageCallNotesScreen from './screens/ManageCallNotesScreen'

const Info = {
  key: 'call-notes',
  name: 'Callsign Notes',
  description: 'Adds notes to callsigns'
}

const BUILT_IN_NOTES = [
  { name: "Ham2K's Hams of Note", location: 'https://ham2k.com/data/hams-of-note.txt', builtin: true },
  { name: 'Test', location: 'https://www.dropbox.com/scl/fi/v59g43pnxpmenexnu6zs4/sd-dxlog-extra.txt?rlkey=q5s0d29n18um08py5hy6a8rae&raw=1' }
]

const CallNotes = {}
const CallNotesFiles = []

const Extension = {
  ...Info,
  category: 'data',
  alwaysEnabled: true,
  enabledByDefault: true,
  onActivationDispatch: ({ registerHook }) => async (dispatch, getState) => {
    const settings = selectExtensionSettings(getState(), Info.key)

    const files = BUILT_IN_NOTES
    settings.userFiles?.forEach(file => files.push({ ...file, builtin: false }))

    for (const file of files) {
      registerDataFile({
        key: `call-notes-${file.location}`,
        name: file.name,
        icon: 'file-account-outline',
        description: `${file.builtin ? 'Built-in' : "User's"} Callsign Notes`,
        fetch: createCallNotesFetcher(file),
        onLoad: createCallNotesLoader(file)
      })
      CallNotesFiles.push(file)
      await dispatch(loadDataFile(`call-notes-${file.location}`))
    }

    registerHook('setting', {
      hook: {
        key: 'call-notes-settings',
        category: 'data',
        SettingItem: ({ navigation, styles }) => (
          <List.Item
            title="Manage Callsign Notes"
            description={''}
            onPress={() => navigation.navigate('ExtensionScreen', { key: 'call-notes-settings' })}
            // eslint-disable-next-line react/no-unstable-nested-components
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="file-account-outline" />}
          />
        )
      }
    })

    registerHook('screen', {
      hook: {
        key: 'call-notes-settings',
        ScreenComponent: ManageCallNotesScreen
      }
    })
  }
}
export default Extension

const createCallNotesFetcher = (file) => async () => {
  const request = file.location
  const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', request, {
    'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
  })

  const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

  const data = {}
  body.split(/[\n\r]+/).forEach(line => {
    if (line.startsWith('#')) return
    const [call, ...noteWords] = line.split(' ')
    if (call.length > 2 && noteWords.length > 0) {
      data[call] = data[call] || []
      data[call].push({ source: file.name, note: noteWords.join(' ') })
    }
  })

  RNFetchBlob.fs.unlink(response.data)

  return data
}

const createCallNotesLoader = (file) => async (data) => {
  CallNotes[file.location] = data
}

export const findCallNotes = (call) => {
  for (const file of CallNotesFiles) {
    if (CallNotes[file.location]?.[call]) {
      return CallNotes[file.location][call]
    }
  }
}

export const findAllCallNotes = (call) => {
  let notes = []
  for (const file of CallNotesFiles) {
    if (CallNotes[file.location]?.[call]) {
      notes = notes.concat(CallNotes[file.location][call])
    }
  }
  return notes
}

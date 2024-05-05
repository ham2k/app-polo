/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../../../package.json'
import { registerDataFile, unRegisterDataFile } from '../../../store/dataFiles'
import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectExtensionSettings } from '../../../store/settings'
import { List } from 'react-native-paper'
import ManageCallNotesScreen from './screens/ManageCallNotesScreen'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'

export const Info = {
  key: 'call-notes',
  name: 'Callsign Notes',
  icon: 'file-account-outline',
  description: 'Adds notes to callsigns'
}

export const BUILT_IN_NOTES = [
  {
    name: "Ham2K's Hams of Note",
    location: 'https://ham2k.com/data/hams-of-note.txt',
    description: "A veritable sample of who's who and who isn't in the world of radio",
    builtin: true
  }
]

export const CallNotes = {}
export const ActiveCallNotesFiles = {}
export const CallNotesFiles = []

const Extension = {
  ...Info,
  category: 'other',
  enabledByDefault: true,
  onActivationDispatch: ({ registerHook }) => async (dispatch, getState) => {
    const settings = selectExtensionSettings(getState(), Info.key)

    const files = [...BUILT_IN_NOTES]
    settings.customFiles?.forEach(file => files.push({ ...file, builtin: false }))

    for (const file of files) {
      CallNotesFiles.push(file)
      registerDataFile(createDataFileDefinition(file))

      // Load Call Note files without `await`
      dispatch(loadDataFile(`call-notes-${file.location}`))

      if (settings.enabledLocations?.[file.location] !== false) {
        ActiveCallNotesFiles[file.location] = true
      }
    }

    registerHook('setting', {
      hook: {
        key: 'call-notes-settings',
        category: 'data',
        SettingItem: ({ navigation, styles }) => (
          <Ham2kListItem
            title="Callsign Notes"
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
  },
  onDeactivationDispatch: () => async (dispatch, getState) => {
    for (const file of CallNotesFiles) {
      unRegisterDataFile(`call-notes-${file.location}`)
      await dispatch(removeDataFile(`call-notes-${file.location}`))
      ActiveCallNotesFiles[file.location] = false
    }
    CallNotesFiles.length = 0 // empty the array
  }
}
export default Extension

export const createDataFileDefinition = (file) => ({
  key: `call-notes-${file.location}`,
  name: file.name,
  icon: 'file-account-outline',
  description: `${file.builtin ? 'Built-in' : "User's"} Callsign Notes`,
  fetch: createCallNotesFetcher(file),
  onLoad: createCallNotesLoader(file)
})

const createCallNotesFetcher = (file) => async () => {
  if (!file.location) return {}

  const url = await resolveDownloadUrl(file.location)
  console.log('resolved url', url)
  const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
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

  await RNFetchBlob.fs.unlink(response.data)

  return data
}

const createCallNotesLoader = (file) => async (data) => {
  CallNotes[file.location] = data
}

export const findCallNotes = (call, enabledLocations = ActiveCallNotesFiles) => {
  call = (call ?? '').replace(/\/$/, '') // Remove trailing /, until this gets fixed in lib-callsign
  for (const file of CallNotesFiles) {
    if (enabledLocations[file.location] !== false && CallNotes[file.location]?.[call]) {
      return CallNotes[file.location][call]
    }
  }
}

export const findAllCallNotes = (call, enabledLocations = ActiveCallNotesFiles) => {
  call = (call ?? '').replace(/\/$/, '') // Remove trailing /, until this gets fixed in lib-callsign
  let notes = []
  for (const file of CallNotesFiles) {
    if (enabledLocations[file.location] !== false && CallNotes[file.location]?.[call]) {
      notes = notes.concat(CallNotes[file.location][call])
    }
  }
  return notes
}

export const useOneCallNoteFinder = (call) => {
  return useMemo(() => {
    return findCallNotes(call)
  }, [call])
}

export const useAllCallNotesFinder = (call) => {
  return useMemo(() => {
    return findAllCallNotes(call)
  }, [call])
}

async function resolveDownloadUrl (url) {
  url = url.trim()

  if (url.match(/^https:\/\/(www\.)*dropbox\.com\//i)) {
    if (!url.match(/&dl=1/)) {
      return url.replaceAll(/&dl=0/g, '&dl=1')
    }
  } else if (url.match(/^https:\/\/(www\.)*icloud\.com\/iclouddrive/i)) {
    const parts = url.match(/iclouddrive\/([\w_]+)/)
    const response = await fetch('https://ckdatabasews.icloud.com/database/1/com.apple.cloudkit/production/public/records/resolve', {
      method: 'POST',
      headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
      body: JSON.stringify({
        shortGUIDs: [{ value: parts[1] }]
      })
    })
    if (response.status === 200) {
      const body = await response.text()
      const json = JSON.parse(body)
      return json?.results && json?.results[0] && json?.results[0].rootRecord?.fields?.fileContent?.value?.downloadURL
    }
  } else if (url.match(/^https:\/\/drive\.google\.com\//i)) {
    const parts = url.match(/file\/d\/([\w_-]+)/)
    return `https://drive.google.com/uc?id=${parts[1]}&export=download`
  } else if (url.match(/^https:\/\/docs\.google\.com\/document/i)) {
    const parts = url.match(/\/d\/([\w_-]+)/)
    return `https://docs.google.com/document/export?format=txt&=${parts[1]}`
  }
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { List } from 'react-native-paper'
import emojiRegex from 'emoji-regex'

import packageJson from '../../../../package.json'
import { registerDataFile, unRegisterDataFile } from '../../../store/dataFiles'
import { fetchAndProcessURL, loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { selectExtensionSettings } from '../../../store/settings'
import ManageCallNotesScreen from './screens/ManageCallNotesScreen'
import { Ham2kListItem } from '../../../screens/components/Ham2kListItem'

const EMOJI_REGEX = emojiRegex()

export const Info = {
  key: 'call-notes',
  name: 'Callsign Notes',
  icon: 'file-account-outline',
  description: 'Shows notes for callsigns when logging. Can add custom notes.'
}

export const BUILT_IN_NOTES = [
  {
    identifier: 'ham2k-hams-of-note',
    name: "Ham2K's Hams of Note",
    location: 'https://ham2k.com/data/hams-of-note.txt',
    description: "A veritable sample of who's who and who isn't in the world of radio",
    builtin: true
  }
]

export const CallNotesData = {
  notes: {},
  files: [],
  activeFiles: {}
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivationDispatch: ({ registerHook }) => async (dispatch, getState) => {
    const settings = selectExtensionSettings(getState(), Info.key)

    const files = [...BUILT_IN_NOTES]
    settings.customFiles?.forEach(file => files.unshift({ ...file, builtin: false }))

    CallNotesData.notes = {}
    CallNotesData.files = []
    CallNotesData.activeFiles = {}
    for (const file of files) {
      if (!file.location) continue
      if (CallNotesData.files.indexOf(file) >= 0) continue

      CallNotesData.activeFiles[file.identifier] = settings.enabledNotes?.[file.identifier] !== false

      CallNotesData.files.push(file)
      registerDataFile(createDataFileDefinition(file))
      // Load in the background, don't `await`
      dispatch(loadDataFile(`call-notes-${file.identifier}`))
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

    registerHook('lookup', { hook: LookupHook, priority: 100 })

    registerHook('command', { priority: 200, hook: NoteExpansionCommandHook })
  },
  onDeactivationDispatch: () => async (dispatch, getState) => {
    for (const file of CallNotesData.files) {
      try {
        await dispatch(removeDataFile(`call-notes-${file.identifier}`))
        unRegisterDataFile(`call-notes-${file.identifier}`)
      } catch (e) {
        console.error('Error removing call notes file', file, e)
      }
    }
    CallNotesData.notes = {}
    CallNotesData.files = []
    CallNotesData.activeFiles = {}
  }
}
export default Extension

const LookupHook = {
  ...Info,
  extension: Extension,
  lookupCallWithDispatch: (callInfo, { settings, operation, online }) => async (dispatch) => {
    const callNotes = findAllCallNotes(callInfo?.baseCall)
    return { notes: callNotes, call: callInfo?.baseCall, source: 'Call Notes' }
  }
}

const NoteExpansionCommandHook = {
  ...Info,
  extension: Extension,
  key: 'call-notes-expansion',
  match: /^(\.\.|\/\/)([\w\d]+)/i,
  describeCommand: (match) => {
    if (match[2].length < 3) return ''
    const callNotes = findAllCallNotes(match[2])
    if (callNotes && callNotes[0]?.note) {
      const matches = callNotes[0].note && callNotes[0].note.match(EMOJI_REGEX)
      const emoji = matches ? `${matches[0]} ` : ''

      return `${emoji}Expand to ${_cleanNote(callNotes[0].note)}?`
    }
  },
  invokeCommand: (match, { dispatch, operation, handleFieldChange }) => {
    if (match[2].length < 3) return ''
    const callNotes = findAllCallNotes(match[2])
    if (callNotes && callNotes[0]?.note) {
      handleFieldChange({ fieldId: 'theirCall', value: _cleanNote(callNotes[0].note) })
    }
  }
}

export const createDataFileDefinition = (file) => ({
  key: `call-notes-${file.identifier}`,
  name: `Notes: ${file.name}`,
  icon: 'file-account-outline',
  description: `${file.builtin ? 'Built-in' : "User's"} Callsign Notes`,
  buildDescription: ({ data }) => {
    console.log('descriptiondata', data)
    if (data?.data) {
      return `${Object.keys(data?.data || {}).length} ${file.builtin ? 'Built-in' : 'User'} callsign notes loaded.`
    } else {
      return 'Failed to load!'
    }
  },
  fetch: createCallNotesFetcher(file),
  onLoad: createCallNotesLoader(file),
  maxAgeInDays: 1
})

const createCallNotesFetcher = (file) => async () => {
  if (!file.location) return {}

  const url = await resolveDownloadUrl(file.location)

  return fetchAndProcessURL({
    url,
    process: async (body) => {
      const entries = {}

      body.split(/[\n\r]+/).forEach(line => {
        line = line.trim()
        if (!line) return
        if (line.startsWith('#')) return
        const [call, ...noteWords] = line.split(/\s+/)

        if (call.length > 2 && noteWords.length > 0) {
          entries[call] = entries[call] || []
          entries[call].push({ source: file.name, note: noteWords.join(' '), call })
        }
      })

      return entries
    }
  })
}

const createCallNotesLoader = (file) => async (data) => {
  CallNotesData.notes[file.identifier] = data
}

export const findCallNotes = (call, activeFiles = CallNotesData.activeFiles) => {
  if (!call) return []
  call = (call ?? '').replace(/\/$/, '') // TODO: Remove this line once the trailing / gets fixed in lib-callsign
  for (const file of CallNotesData.files) {
    if (activeFiles[file.identifier] !== false && CallNotesData.notes[file.identifier]?.[call]) {
      return CallNotesData.notes[file.identifier][call]
    }
  }
}

export const findAllCallNotes = (call, activeFiles = CallNotesData.activeFiles) => {
  if (!call) return []
  call = (call ?? '').replace(/\/$/, '') // TODO: Remove this line once the trailing / gets fixed in lib-callsign
  let notes = []
  for (const file of CallNotesData.files) {
    if (activeFiles[file.identifier] !== false && CallNotesData.notes[file.identifier]?.[call]) {
      notes = notes.concat(CallNotesData.notes[file.identifier][call])
    }
  }
  return notes
}

export const getAllCallsFromNotes = () => {
  const calls = new Set()
  for (const file of CallNotesData.files) {
    if (CallNotesData.activeFiles[file.identifier] !== false) {
      for (const call in CallNotesData.notes[file.identifier]) {
        calls.add(call)
      }
    }
  }
  return Array.from(calls)
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

  // Dropbox
  if (url.match(/^https:\/\/(www\.)*dropbox\.com\//i)) {
    url = url.replaceAll(/[&?]raw=\d/g, '').replaceAll(/[&?]dl=\d/g, '')
    if (url.match(/\?/)) {
      return `${url}&dl=1&raw=1`
    } else {
      return `${url}?dl=1&raw=1`
    }
  // Apple iCloud Drive
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
    } else {
      return url
    }
  // Google Drive
  } else if (url.match(/^https:\/\/drive\.google\.com\//i)) {
    const parts = url.match(/file\/d\/([\w_-]+)/)
    return `https://drive.google.com/uc?id=${parts[1]}&export=download`
  // Google Docs
  } else if (url.match(/^https:\/\/docs\.google\.com\/document/i)) {
    const parts = url.match(/\/d\/([\w_-]+)/)
    return `https://docs.google.com/document/export?format=txt&id=${parts[1]}`
  // GitHub Gist
  } else if (url.match(/^https:\/\/gist\.github\.com\//i)) {
    console.log('gist url', url)
    const response = await fetch(url, {
      headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` }
    })
    if (response.status === 200) {
      const body = await response.text()
      const parts = body.match(/<a href="([^"]+\/raw\/[^"]+)"/)
      console.log('parts', parts)
      if (parts) {
        return `https://gist.githubusercontent.com${parts[1]}`
      } else {
        return url
      }
    }
  } else {
    return url
  }
}

function _cleanNote (note) {
  return note.replaceAll(/[^A-Za-z0-9,-/]/g, '').trim().toUpperCase()
}

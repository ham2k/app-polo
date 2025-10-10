/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Platform } from 'react-native'
import Handlebars from 'handlebars'

import packageJson from '../../../package.json'

import { selectDismissedNotices, selectFeatureFlags, selectNotices } from './systemSlice'
import { selectOperatorCallInfo } from '../settings'
import { processNoticeTemplateDataForDistribution } from '../../distro'
import { CallNotesData, findAllCallNotes } from '../../extensions/data/call-notes/CallNotesExtension'

export function useNotices ({ dispatch, includeDismissed = false, includeTransient = false }) {
  const operatorCallInfo = useSelector(selectOperatorCallInfo)
  const systemNotices = useSelector(selectNotices)
  const featureFlags = useSelector(selectFeatureFlags)
  const serverNotices = useMemo(() => featureFlags?.notices ?? [], [featureFlags])
  const dismissedNotices = useSelector(selectDismissedNotices)

  const templateData = useMemo(() => {
    const data = {
      operator: operatorCallInfo,
      app: {
        version: packageJson.version,
        versionName: packageJson.versionName
      }
    }

    if (Platform.OS === 'ios') {
      data.app.platform = 'iOS'
    } else if (Platform.OS === 'android') {
      data.app.platform = 'Android'
    } else {
      data.app.platform = Platform.OS
    }

    processNoticeTemplateDataForDistribution(data)

    return data
  }, [operatorCallInfo])

  const notices = useMemo(() => {
    const now = Date.now()
    const uniqueNotices = {}
    const filteredNotices = [...systemNotices, ...serverNotices].filter(notice => {
      try {
        if (dismissedNotices[notice.key]) {
          if (!includeDismissed) return false
          else notice.dismissedOn = dismissedNotices[notice.key]
        }

        if (!includeTransient && notice.transient) return false

        if (notice.platforms && !notice.platforms.includes(Platform.OS)) return false
        if (notice.dateFrom && notice.dateFrom > now) return false
        if (notice.dateTo && notice.dateTo < now) return false
        if (notice.versions && notice.versions.length > 0 && !notice.versions.find(v => packageJson.version.startsWith(v))) return false
        if (notice.calls && notice.calls.length > 0 && !notice.calls.find(c => c.toUpperCase() === operatorCallInfo?.baseCall)) return false
        if (notice.notes && !_findInHam2KNotes(operatorCallInfo?.baseCall, notice.notes)) return false
        if (notice.entities && notice.entities.length > 0 && !notice.entities.find(d => d.toUpperCase() === operatorCallInfo?.entityPrefix)) return false
        if (notice.countries && notice.countries.length > 0 && !notice.countries.find(c => c.toLowerCase() === operatorCallInfo?.countryCode)) return false
        if (notice.continents && notice.continents.length > 0 && !notice.continents.find(c => c.toUpperCase() === operatorCallInfo?.continent)) return false
        if (notice.ituRegions && notice.ituRegions.length > 0 && !notice.ituRegions.find(r => r === operatorCallInfo?.ituRegion)) return false

        if (notice.unique) {
          if (uniqueNotices[notice.unique]) return false
          uniqueNotices[notice.unique] = true
        }

        return true
      } catch (e) {
        console.error('Error processing notice', notice, e)
        return false
      }
    })

    const adjustedNotices = filteredNotices.map(notice => _adjustNotice(notice, templateData))

    const sortedNotices = adjustedNotices.sort((a, b) => {
      if (a.priority && b.priority) return a.priority - b.priority
      if (a.priority) return -1
      if (b.priority) return 1
      return 0
    })
    return sortedNotices
  }, [systemNotices, serverNotices, dismissedNotices, includeTransient, includeDismissed, operatorCallInfo?.baseCall, operatorCallInfo?.entityPrefix, operatorCallInfo?.countryCode, operatorCallInfo?.continent, operatorCallInfo?.ituRegion, templateData])

  return notices
}

function _adjustNotice (object, templateData) {
  for (const key in object) {
    if (key.endsWith('.android') && Platform.OS === 'android') {
      object[key.slice(0, -7)] = object[key]
      delete object[key]
    } else if (key.endsWith('.ios') && Platform.OS === 'ios') {
      object[key.slice(0, -4)] = object[key]
      delete object[key]
    }
  }

  if (object.actionLabel && !object.actions) {
    object.actions = [{
      action: object.action,
      label: object.actionLabel,
      args: object.actionArgs
    }]
  }

  for (const key in object) {
    if (typeof object[key] === 'object') {
      object[key] = _adjustNotice(object[key], templateData)
    } else if (typeof object[key] === 'string') {
      const compiled = Handlebars.compile(object[key] ?? '', { noEscape: true })
      object[key] = compiled(templateData)
    }
  }
  return object
}

const _findInHam2KNotes = (call, rule) => {
  const notes = findAllCallNotes(call, { 'ham2k-hams-of-note': true })
  if (rule === true || rule === 'any') return notes.length > 0
  else if (rule === false || rule === 'none') return notes.length === 0
  else if (typeof rule === 'string') return notes.find(n => n.note.toLowerCase().includes(rule.toLowerCase()))
  else if (Array.isArray(rule)) return rule.some(r => notes.find(n => n.note.toLowerCase().includes(r.toLowerCase())))

  return false
}


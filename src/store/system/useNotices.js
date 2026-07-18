// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Platform } from 'react-native'
import Handlebars from 'handlebars'

import packageJson from '../../../package.json'

import { selectDismissedNotices, selectFeatureFlags, selectNotices } from './systemSlice'
import { selectOperatorCallInfo } from '../settings'
import { processNoticeTemplateDataForDistribution } from '../../distro'
import { findAllCallNotes } from '../../extensions/data/call-notes/CallNotesExtension'
import DeviceInfo from 'react-native-device-info'

export function useNotices ({ dispatch, includeDismissed = false, includeTransient = false }) {
  const operatorCallInfo = useSelector(selectOperatorCallInfo)
  const systemNotices = useSelector(selectNotices)
  const featureFlags = useSelector(selectFeatureFlags)
  // polo-notices are listed first so they take precedence over generic notices when several share a key
  const serverNotices = useMemo(() => [...featureFlags?.['polo-notices'] ?? [], ...featureFlags?.notices ?? []], [featureFlags])
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
    const seenKeys = {}
    // Order candidates by priority first (array order breaks ties, since the sort is stable) so the
    // dedup below keeps the highest-priority matching notice when several share a key or unique value.
    const candidateNotices = [...systemNotices, ...serverNotices].sort(_compareNoticesByPriority)
    const filteredNotices = candidateNotices.filter(notice => {
      try {
        const build = DeviceInfo.getVersion()

        if (dismissedNotices[notice.key]) {
          if (!includeDismissed) return false
          else notice.dismissedOn = dismissedNotices[notice.key]
        }

        if (!includeTransient && notice.transient) return false

        if (notice.platforms && !notice.platforms.includes(Platform.OS)) return false
        if (notice.dateFrom && !(now > Date.parse(notice.dateFrom))) return false
        if (notice.dateTo && !(now < Date.parse(notice.dateTo))) return false
        if (notice.versions && notice.versions.length > 0 && !notice.versions.find(v => packageJson.version.startsWith(v))) return false
        if (notice.builds && notice.builds.length > 0 && !notice.builds.find(v => build === v)) return false
        if (notice.exceptVersions && notice.exceptVersions.length > 0 && notice.exceptVersions.find(v => packageJson.version.startsWith(v))) return false
        if (notice.exceptBuilds && notice.exceptBuilds.length > 0 && notice.exceptBuilds.find(v => build === v)) return false
        if (notice.calls && notice.calls.length > 0 && !notice.calls.find(c => c.toUpperCase() === operatorCallInfo?.baseCall)) return false
        if (notice.testCalls && notice.testCalls.length > 0 && notice.testCalls.find(c => c.toUpperCase() === operatorCallInfo?.baseCall)) return true
        if (notice.segmentFrom && _calculateCallSegment(operatorCallInfo?.baseCall) < notice.segmentFrom) return false
        if (notice.segmentTo && _calculateCallSegment(operatorCallInfo?.baseCall) > notice.segmentTo) return false
        if (notice.notes && !_findInHam2KNotes(operatorCallInfo?.baseCall, notice.notes)) return false
        if (notice.entities && notice.entities.length > 0 && !notice.entities.find(d => d.toUpperCase() === operatorCallInfo?.entityPrefix)) return false
        if (notice.countries && notice.countries.length > 0 && !notice.countries.find(c => c.toLowerCase() === operatorCallInfo?.countryCode)) return false
        if (notice.continents && notice.continents.length > 0 && !notice.continents.find(c => c.toUpperCase() === operatorCallInfo?.continent)) return false
        if (notice.ituRegions && notice.ituRegions.length > 0 && !notice.ituRegions.find(r => r === operatorCallInfo?.ituRegion)) return false

        // These dedup checks come last, so a notice only reserves its unique/key once it has
        // matched every other filter. Because candidates are pre-sorted by priority, the highest
        // priority matching notice for a given key/unique is the one kept; the rest are suppressed.
        if (notice.unique && uniqueNotices[notice.unique]) return false
        if (notice.key && seenKeys[notice.key]) return false
        if (notice.unique) uniqueNotices[notice.unique] = true
        if (notice.key) seenKeys[notice.key] = true

        return true
      } catch (e) {
        console.error('Error processing notice', notice, e)
        return false
      }
    })

    const adjustedNotices = filteredNotices.map(notice => _adjustNotice(notice, templateData))

    return adjustedNotices.sort(_compareNoticesByPriority)
  }, [systemNotices, serverNotices, dismissedNotices, includeTransient, includeDismissed, operatorCallInfo?.baseCall, operatorCallInfo?.entityPrefix, operatorCallInfo?.countryCode, operatorCallInfo?.continent, operatorCallInfo?.ituRegion, templateData])

  return notices
}

// Sorts notices by priority (lower number = higher priority; a notice with a priority
// outranks one without). Returns 0 for equal/absent priorities so a stable sort keeps
// the original array order as the tiebreaker.
function _compareNoticesByPriority (a, b) {
  if (a.priority && b.priority) return a.priority - b.priority
  if (a.priority) return -1
  if (b.priority) return 1
  return 0
}

function _adjustNotice (object, templateData) {
  for (const key in object) {
    if (key.endsWith('-android') && Platform.OS === 'android') {
      object[key.slice(0, -7)] = object[key]
      delete object[key]
    } else if (key.endsWith('-ios') && Platform.OS === 'ios') {
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

// A pseudo-random number, consistently based on callsign, evenly distributed from 1 to 100
const _calculateCallSegment = (call) => {
  if (!call) return 0
  let hash = 0
  for (let i = 0; i < call.length; i++) {
    hash = (hash << 5) - hash + call.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  return (Math.abs(hash) % 100) + 1
}

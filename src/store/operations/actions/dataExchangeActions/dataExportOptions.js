/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*

# Explanation of how PoLo manages exports for one operation.

For each station callsign in the operation, we collect "export options" from:
- The handler for each reference in the operation, including references in separate "breaks".
- Any "export" handler.

Each of these handlers can suggest zero or more export options, for which they provide:
- A key (a unique identifier for the export option, which might group multiple references together)
- A format (ADIF, Cabrillo, etc.)
- A name template (e.g. "{{op.date}} {{op.call}} {{log.ref}}")
- A title template (e.g. "{{log.call}} at {{log.ref}} on {{op.date}}")
- A templateData object (a set of key-value pairs that are passed to the name and title templates)

PoLo provides a set of general name and title templates:
- RefActivityBaseNameNormal: `2025-01-01 N0CALL at XX-123`
- RefActivityBaseNameCompact: `N0CALL@XX-123-20250101`
- RefActivityBaseName: either of the two above, depending on the setting `useCompactFileNames`
- OtherActivityBaseNameNormal: `2025-01-01 N0CALL for WFD`
- OtherActivityBaseNameCompact: `N0CALL-WFD-20250101`
- OtherActivityBaseName: either of the two above, depending on the setting `useCompactFileNames`

Each activity provides default templates for their filename and title, which can reference
the general templates above.

And the user can override any of these templates with their own, including the general templates.

Templates are evaluated using [Handlebars.js](https://handlebarsjs.com/).

The general templates are provided as "handlebar partials", so they can be referenced as
`{{>RefActivityBaseNameNormal}}` or `{{>OtherActivityBaseName}}`.

Templates are evaluated with a "context" that includes the following:
- `log.station` -> the station callsign for this particular export (e.g. `N0CALL`)
- `log.ref` -> the reference for this particular export (e.g. `US-1234`)
- `log.refName` -> the name of the reference for this particular export (e.g. `Example National Park`)
- `log.refShortName` -> the name of the reference for this particular export (e.g. `Example NP`)
- `log.handlerType` -> the type of the reference handler for this particular export (e.g. `potaActivator`)
- `log.handlerName` -> the short name of the reference handler for this particular export (e.g. `Parks On The Air`)
- `log.handlerShortName` -> the short name of the reference handler for this particular export (e.g. `POTA`)
- `log.includeTime` -> A hint from the handler that the time should be included in the filename

- `op.allStations` -> all station callsigns for the operation
- `op.operator` -> the operator for the operation
- `op.date` -> the date of the operation in `YYYY-MM-DD` format
- `op.startTime` -> the starting time of the operation in `HH:MM` format
- `op.endDate` -> the ending date of the operation in `YYYY-MM-DD` format
- `op.endTime` -> the ending time of the operation in `HH:MM` format
- `op.uuid` -> the UUID of the operation
- `op.userTitle` -> the user-provided title for the operation
- `op.userNotes` -> the user-provided notes for the operation

- `qso.their.call` -> the callsign of the other station for this QSO
- `qso.their.name` -> the name of the other station for this QSO
- `qso.their.grid` -> the grid square of the other station for this QSO
- `qso.our.call` -> the callsign of the station for this QSO
- `qso.our.name` -> the name of the station for this QSO
- `qso.our.grid` -> the grid square of the station for this QSO
- `qso.notes` -> the user-provided notes for this QSO

Templates are also provided with the following helper functions:
- `compact` -> removes all spaces all dashes and other symbols
- `dashed` -> replaces all spaces and other symbols with dashes
- `underscore` -> replaces all spaces and other symbols with underscores
- `trim` -> removes leading and trailing spaces, as well as multiple spaces between words
- `downcase` -> converts the string to lowercase
- `upcase` -> converts the string to uppercase
- `titlecase` -> capitalizes the first letter of each word
- `first8` -> keeps only the first 8 characters
- `join` -> joins an array of strings with a separator (default is `, `, also accepts a `final` separator)
- `or` -> returns the first non-empty string in an array
- `and` -> returns the last string in an array

 */

import { fmtISODate, fmtTimeZulu } from '../../../../tools/timeFormats'
import { findBestHook, findHooks } from '../../../../extensions/registry'
import Handlebars from 'handlebars'
import { selectExportSettings } from '../../../settings'

export const DATA_EXTENSIONS = {
  adif: 'adi',
  cabrillo: 'log',
  qson: 'qson',
  json: 'json',
  txt: 'txt',
  text: 'txt',
  csv: 'csv',
  tsv: 'tsv',
  other: 'dat'
}

export const DATA_FORMAT_DESCRIPTIONS = {
  adif: 'ADIF',
  cabrillo: 'Cabrillo',
  qson: 'QSON',
  json: 'JSON',
  txt: 'Text',
  csv: 'Comma-Separated Values',
  tsv: 'Tab-Separated Values',
  other: 'Data'
}

export function baseNamePartsFor({ operation, ourInfo }) {
  return {
    call: ourInfo.call,
    baseCall: ourInfo.baseCall,
    date: fmtISODate(operation.startAtMillisMax || Date.now()),
    compactDate: fmtISODate(operation.startAtMillisMax || Date.now()).replace(/-/g, ''),
    title: operation.title,
    uuid: operation.uuid,
    shortUUID: operation.uuid.split('-')[0]
  }
}

function getAllRefsForOperation({ operation, qsos }) {
  const refs = qsos.filter(qso => !qso.deleted && (qso?.event?.event === 'start' || qso?.event?.event === 'break'))
    .map(qso => qso?.event?.operation?.refs ?? [])
    .flat().filter(ref => ref)

  if (refs.length === 0) {
    refs.push(...(operation?.refs || []))
  }
  return refs
}

const DEBUG = false

function getExportOptionsForOperation({ operation, qsos, settings }) {
  const refs = getAllRefsForOperation({ operation, qsos })
  const exportOptions = {}

  for (const ref of refs) {
    if (!ref.type) continue

    const handler = findBestHook(`ref:${ref.type}`, { withFunction: 'suggestExportOptions' })

    if (handler) {
      const options = (handler.suggestExportOptions({ operation, qsos, ref, settings }) ?? []).filter(x => x)

      for (const option of options) {
        const refKey = handler.keyForRef ? handler.keyForRef(ref) : `${ref.type}-${ref.ref}`
        const optionKey = `${handler.key}-${option.format}-${option.exportType ?? 'export'}`
        const combinedKey = `${optionKey}-${refKey}`
        exportOptions[combinedKey] = exportOptions[combinedKey] || { optionKey, refKey, handler, option, refs: [] }

        const existingRef = exportOptions[combinedKey]?.refs?.find(r => {
          const existingRefKey = handler.keyForRef ? handler.keyForRef(r) : `${r.type}-${r.ref}`
          return existingRefKey === refKey
        })
        if (!existingRef) {
          exportOptions[combinedKey].refs.push(ref)
        }
      }
    }
  }

  findHooks('export', { withFunction: 'suggestExportOptions' }).forEach(handler => {
    const options = (handler.suggestExportOptions({ operation, qsos, settings }) ?? []).filter(x => x)
    for (const option of options) {
      const optionKey = [handler.key, option.format, option.exportType ?? 'export'].filter(x => x).join('-')
      exportOptions[optionKey] = exportOptions[optionKey] || { optionKey, refKey: null, handler, option, refs: [{ type: handler.key }] }
    }
  })
  if (DEBUG) console.log('-- exportOptions', exportOptions)
  return Object.values(exportOptions)
}

export function dataExportOptions({ operation, qsos, settings, ourInfo }) {
  const exports = []

  const exportOptions = getExportOptionsForOperation({ operation, qsos, settings })

  const exportHandlersForRefs = (operation?.refs || [])

  for (const { optionKey, refKey, handler, refs, option } of exportOptions) {
    let exportSettings = selectExportSettings({ settings }, optionKey, (handler?.defaultExportSettings && handler?.defaultExportSettings()))
    if (exportSettings.customTemplates === false) {
      const { privateData } = exportSettings
      exportSettings = selectExportSettings({ settings }, 'default')
      exportSettings.private = privateData
    }
    const nameTemplate = compileTemplateForOperation(exportSettings?.nameTemplate || option.nameTemplate || '{{> DefaultName}}', { settings })
    const titleTemplate = compileTemplateForOperation(exportSettings?.titleTemplate || option.titleTemplate || '{{> DefaultTitle}}', { settings })
    const partials = basePartialTemplates({ settings })
    const data = extraDataForTemplates({ settings })

    for (const ref of refs) {
      const context = templateContextForOneExport({ option, settings, operation, ourInfo, handler, ref })

      let title
      try {
        title = titleTemplate(context, { data, partials }).replaceAll(/\s+/g, ' ').trim()
      } catch (e) {
        console.log('Error compiling title template', e)
        title = `ERROR: ${e.message}`
      }

      context.log.title = title

      let fileName
      try {
        fileName = nameTemplate(context, { data, partials }).replaceAll(/\s+/g, ' ').trim()
      } catch (e) {
        console.log('Error compiling name template', e)
        fileName = `ERROR: ${e.message}`
      }

      const extension = DATA_EXTENSIONS[option.format] || DATA_EXTENSIONS.other
      if (!fileName.endsWith(`.${extension}`)) {
        fileName = `${fileName}.${extension}`
      }
      fileName = fileName.replace(/[/\\:]/g, '-')

      const exportLabel = option.exportLabel || option.exportName || `${handler.shortName ?? handler.name} ${DATA_FORMAT_DESCRIPTIONS[option.format] || DATA_FORMAT_DESCRIPTIONS.other}`
      const exportType = option.exportType || handler.key

      // console.log('dataExportOptions', { exportSettings, option, title, fileName, exportLabel, exportType })
      exports.push({ ...option, handler, ref, fileName, title, exportLabel, exportType, operation, ourInfo })
    }
  }
  if (DEBUG) console.log('dataExportOptions', exports)
  return exports.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

export function compileTemplateForOperation(template, { settings }) {
  try {
    const compiled = Handlebars.compile(template ?? '', { noEscape: true })
    return compiled
  } catch (e) {
    console.log('Error compiling template', e)
    return Handlebars.compile(`ERROR IN TEMPLATE {{{{raw}}}}${template}{{{{/raw}}}}`)
  }
}

export function runTemplateForOperation(template, { settings, operation, ourInfo, handler, ref, qso }) {
  try {
    const compiled = Handlebars.compile(template ?? '', { noEscape: true })
    const context = templateContextForOneExport({ settings, operation, ourInfo, handler, ref, qso })
    const partials = basePartialTemplates({ settings })
    const data = extraDataForTemplates({ settings })

    return compiled(context, { data, partials })
  } catch (e) {
    console.log('Error running template', e)
    return `ERROR: ${template}`
  }
}

export function templateContextForOneExport({ option, settings, operation, ourInfo, handler, qso, ref, context }) {
  return {
    settings: {
      useCompactFileNames: settings.useCompactFileNames
    },
    log: {
      station: ourInfo?.call,
      callInfo: ourInfo,
      ref: ref?.ref,
      refName: ref?.name ?? ref?.label ?? ref?.subtitle,
      refLabel: ref?.label ?? ref?.name ?? ref?.subtitle,
      refShortName: ref ? (ref.shortName ?? ref.shortLabel ?? ref.shortSubtitle ?? ref.name ?? ref.label ?? ref.subtitle) : '',
      refShortLabel: ref ? (ref.shortLabel ?? ref.shortName ?? ref.shortSubtitle ?? ref.label ?? ref.name ?? ref.subtitle) : '',
      handlerType: handler?.type,
      handlerName: handler?.name,
      handlerShortName: handler?.shortName,
      exportFormat: option?.format,
      exportType: option?.exportType,
      exportName: option?.exportName,
      ...option?.templateData
    },
    op: {
      station: operation?.stationCall,
      operator: operation?.operator,
      allStations: [operation?.stationCall, ...(operation?.stationCallPlusArray || [])],
      otherStations: operation?.stationCallPlusArray || [],
      date: fmtISODate(operation?.startAtMillisMax),
      startDate: fmtISODate(operation?.startAtMillisMin),
      endDate: fmtISODate(operation?.endAtMillisMax),
      startTime: fmtTimeZulu(operation?.startAtMillisMin, { compact: true, showZ: false }),
      endTime: fmtTimeZulu(operation?.endAtMillisMax, { compact: true, showZ: false }),
      uuid: operation?.uuid,
      title: operation?.title, // " at K-TEST"
      userTitle: operation?.userTitle,
      userNotes: operation?.userNotes,
      refs: operation?.refs,
      grid: operation?.grid
    },
    qso,
    ...(context || {})
  }
}

export function basePartialTemplates({ settings }) {
  let partials = {
    RefActivityNameNormal: '{{op.date}}{{#if log.includeTime}} {{op.startTime}}{{/if}} {{log.station}} at {{#if log.refPrefix}}{{log.refPrefix}} {{/if}}{{log.ref}}',
    RefActivityNameCompact: '{{log.station}}@{{#if log.refPrefix}}{{dash (downcase log.refPrefix)}}-{{/if}}{{log.ref}}-{{compact op.date}}',
    OtherActivityNameNormal: '{{op.date}}{{#if log.includeTime}} {{op.startTime}}{{/if}} {{log.station}} for {{log.handlerShortName}}',
    OtherActivityNameCompact: '{{log.station}}-{{dash (downcase log.handlerShortName)}}{{#if log.includeTime}}-{{op.startTime}}{{/if}}-{{compact op.date}}',
    DefaultNameNormal: '{{op.date}}{{#if log.includeTime}} {{op.startTime}}{{/if}} {{log.station}} {{op.title}} {{log.modifier}}',
    DefaultNameCompact: '{{#dash}}{{log.station}}-{{compact op.date}}{{#if log.includeTime}}-{{op.startTime}}{{/if}}-{{downcase op.title}}-{{downcase log.modifier}}{{/dash}}',
    RefActivityTitle: '{{log.station}}: {{log.handlerShortName}} at {{#trim}}{{log.ref}} {{log.refName}}{{/trim}} on {{op.date}}',
    OtherActivityTitle: '{{log.station}}: {{log.handlerShortName}} on {{op.date}}',
    DefaultTitle: '{{log.station}}: {{#join op.refs separator=", " final=" & "}}{{or shortLabel label key}}{{/join}} on {{op.date}}',
    ADIFNotes: '{{qso.notes}}',
    ADIFComment: '{{qso.notes}}',
    ADIFQslMsg: '{{#join op.refs separator=", " final=" & "}}{{or shortLabel label key}}{{/join}}'
  }

  if (settings) {
    const defaults = selectExportSettings({ settings }, 'default')
    partials = { ...partials, ...defaults }
  }

  partials.RefActivityName = settings?.useCompactFileNames ? partials.RefActivityNameCompact : partials.RefActivityNameNormal
  partials.OtherActivityName = settings?.useCompactFileNames ? partials.OtherActivityNameCompact : partials.OtherActivityNameNormal
  partials.DefaultName = settings?.useCompactFileNames ? partials.DefaultNameCompact : partials.DefaultNameNormal

  Object.keys(partials).forEach(key => {
    partials[key] = partials[key] ?? ''
  })

  return partials
}

export function extraDataForTemplates({ settings }) {
  return {
    app: {
      name: 'Ham2K Portable Logger',
      shortName: 'Ham2K PoLo'
    }
  }
}

Handlebars.registerHelper('compact', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join('_')
  str = str.replace(/[^a-zA-Z0-9]/g, '')
  return str
})

Handlebars.registerHelper('trim', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.replace(/\s+/g, ' ')
  str = str.trim()
  return str
})

Handlebars.registerHelper('dash', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join('-')
  str = str.replace(/[^a-zA-Z0-9]/g, '-')
  str = str.replace(/-+/g, '-')
  str = str.replace(/^-|-$/g, '')
  return str
})

Handlebars.registerHelper('underscore', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join('_')
  str = str.replace(/[^a-zA-Z0-9]/g, '_')
  str = str.replace(/_+/g, '_')
  str = str.replace(/^_|_$/g, '')
  return str
})

const downcase = function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.toLowerCase()
  return str
}
Handlebars.registerHelper('downcase', downcase)
Handlebars.registerHelper('lowercase', downcase)

const upcase = function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.toUpperCase()
  return str
}
Handlebars.registerHelper('upcase', upcase)
Handlebars.registerHelper('uppercase', upcase)

Handlebars.registerHelper('titlecase', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.replace(/\b\w/g, char => char.toUpperCase())
  return str
})

Handlebars.registerHelper('first8', (x) => x.slice(0, 8))

Handlebars.registerHelper('join', function (...args) {
  const options = args.pop()
  const separator = options?.hash?.separator || ', '
  const final = options?.hash?.final || separator

  if (args.length === 0) args = [this]
  const parts = args.flat().map(x => options?.fn ? options.fn(x) : x).filter(x => x)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts.join(final)
  return parts.slice(0, -1).join(separator) + final + parts.slice(-1)
})

Handlebars.registerHelper('or', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  return args.find(x => !Handlebars.Utils.isEmpty(x)) || ''
})

Handlebars.registerHelper('and', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  if (args.every(x => !Handlebars.Utils.isEmpty(x))) {
    return args[args.length - 1]
  }
  return false
})

Handlebars.registerHelper('eq', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  // eslint-disable-next-line eqeqeq
  return args[0] == args[1]
})

Handlebars.registerHelper('ne', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  // eslint-disable-next-line eqeqeq
  return args[0] != args[1]
})

Handlebars.registerHelper('gt', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()

  return args[0] > args[1]
})

Handlebars.registerHelper('ge', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()

  return args[0] >= args[1]
})

Handlebars.registerHelper('lt', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()

  return args[0] < args[1]
})

Handlebars.registerHelper('le', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()

  return args[0] <= args[1]
})

Handlebars.registerHelper('includes', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  return args[0].includes(args[1])
})

Handlebars.registerHelper('startsWith', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  return args[0].startsWith(args[1])
})

Handlebars.registerHelper('endsWith', function (...args) {
  // eslint-disable-next-line no-unused-vars
  const options = args.pop()
  return args[0].endsWith(args[1])
})

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*

# Explanation of how PoLo manages exports for one operation.

For each station callsign in the operation, we collect "export options" from:
- The handler for each reference in the operation.
- Any "export" handler.

Each of these handlers can suggest zero or more export options, for which they provide:
- A format (ADIF, Cabrillo, etc.)
- A name template (e.g. "{date} {call} {ref}")
- A title template (e.g. "{call} {ref} {date}")
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
`{{> RefActivityBaseNameNormal}}` or `{{> OtherActivityBaseName}}`.

Templates are evaluated with a "context" that includes the following:
- `log.station` -> the station callsign for this particular export (e.g. `N0CALL`)
- `log.ref` -> the reference for this particular export (e.g. `US-1234`)
- `log.refName` -> the name of the reference for this particular export (e.g. `Example National Park`)
- `log.refShortName` -> the name of the reference for this particular export (e.g. `Example NP`)
- `log.handlerType` -> the type of the reference handler for this particular export (e.g. `potaActivator`)
- `log.handlerName` -> the short name of the reference handler for this particular export (e.g. `Parks On The Air`)
- `log.handlerShortName` -> the short name of the reference handler for this particular export (e.g. `POTA`)

- `op.allStations` -> all station callsigns for the operation
- `op.operator` -> the operator for the operation
- `op.date` -> the date of the operation in `YYYY-MM-DD` format
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
- `compact` -> removes all spaces all dashes and other symbols.
- `dashed` -> Replaces all spaces and other symbols with dashes.
- `lower` -> converts the string to lowercase.
- `upper` -> converts the string to uppercase.
- `title` -> capitalizes the first letter of each word.
- `first8` -> keeps only the first 8 characters.

 */

import { fmtISODate } from '../../../../tools/timeFormats'
import { findBestHook, findHooks } from '../../../../extensions/registry'
import Handlebars from 'handlebars'
import { joinAnd } from '../../../../tools/joinAnd'
import { selectExportSettings } from '../../../settings'

export const DATA_EXTENSIONS = {
  adif: 'adi',
  cabrillo: 'log',
  qson: 'qson',
  json: 'json',
  txt: 'txt',
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

export function baseNamePartsFor ({ operation, ourInfo }) {
  return {
    call: ourInfo.call,
    baseCall: ourInfo.baseCall,
    date: fmtISODate(operation.startAtMillisMax),
    compactDate: fmtISODate(operation.startAtMillisMax).replace(/-/g, ''),
    title: operation.title,
    uuid: operation.uuid,
    shortUUID: operation.uuid.split('-')[0]
  }
}

export function dataExportOptions ({ operation, qsos, settings, ourInfo }) {
  const exports = []

  const exportHandlersForRefs = (operation?.refs || [])
    .map(ref => ({ handler: findBestHook(`ref:${ref.type}`), ref }))
    .filter(x => x?.handler && x.handler.suggestExportOptions)
  const exportHandlersForExports = findHooks('export')
    .map(handler => ({ handler, ref: {} }))
    .flat().filter(x => x.handler && x.handler.suggestExportOptions)

  const handlersWithOptions = [...exportHandlersForRefs, ...exportHandlersForExports].map(({ handler, ref }) => (
    { handler, ref, options: handler.suggestExportOptions && handler.suggestExportOptions({ operation, qsos, ref, settings }) }
  )).flat().filter(({ options }) => options)

  handlersWithOptions.forEach(({ handler, ref, options }) => {
    options.forEach(option => {
      const key = `${handler.key}-${option.format}-${option.exportType ?? 'export'}`
      const exportSettings = selectExportSettings({ settings }, key)

      const nameTemplate = compileTemplateForOperation(exportSettings?.nameTemplate || option.nameTemplate || '{{> DefaultName}}', { settings })
      const titleTemplate = compileTemplateForOperation(exportSettings?.titleTemplate || option.titleTemplate || '{{> DefaultTitle}}', { settings })

      const context = templateContextForOneExport({ option, settings, operation, ourInfo, handler, ref })
      const partials = basePartialTemplates({ settings })
      const data = extraDataForTemplates({ settings })

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

      const exportLabel = option.exportLabel || `${handler.shortName ?? handler.name} ${DATA_FORMAT_DESCRIPTIONS[option.format] || DATA_FORMAT_DESCRIPTIONS.other}`
      const exportType = option.exportType || handler.key

      exports.push({ ...option, handler, ref, fileName, title, exportLabel, exportType, operation, ourInfo })
    })
  })

  return exports.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

export function compileTemplateForOperation (template, { settings }) {
  try {
    const compiled = Handlebars.compile(template ?? '', { noEscape: true })
    return compiled
  } catch (e) {
    console.log('Error compiling template', e)
    return Handlebars.compile(`ERROR IN TEMPLATE {{{{raw}}}}${template}{{{{/raw}}}}`)
  }
}

export function runTemplateForOperation (template, { settings, operation, ourInfo, handler, ref, qso }) {
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

export function templateContextForOneExport ({ option, settings, operation, ourInfo, handler, qso, ref }) {
  return {
    settings: {
      useCompactFileNames: settings.useCompactFileNames
    },
    log: {
      station: ourInfo?.call,
      callInfo: ourInfo,
      ref: ref?.ref,
      refName: ref?.name,
      refShortName: ref?.shortName,
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
      uuid: operation?.uuid,
      title: operation?.title, // " at K-TEST"
      userTitle: operation?.userTitle,
      userNotes: operation?.userNotes,
      refs: operation?.refs
    },
    qso
  }
}

export function basePartialTemplates ({ settings }) {
  const partials = {
    RefActivityNameNormal: '{{op.date}} {{log.station}} at {{#if log.refPrefix}}{{log.refPrefix}} {{/if}}{{log.ref}}',
    RefActivityNameCompact: '{{log.station}}@{{#if log.refPrefix}}{{dash (downcase log.refPrefix)}}-{{/if}}{{log.ref}}-{{compact op.date}}',
    OtherActivityNameNormal: '{{op.date}} {{log.station}} for {{log.handlerShortName}}',
    OtherActivityNameCompact: '{{log.station}}-{{dash (downcase log.handlerShortName)}}-{{compact op.date}}',
    DefaultNameNormal: '{{op.date}} {{log.station}} {{op.title}} {{log.modifier}}',
    DefaultNameCompact: '{{#dash}}{{log.station}}-{{compact op.date}}-{{downcase op.title}}-{{downcase log.modifier}}{{/dash}}',
    RefActivityTitle: '{{log.station}}: {{log.handlerShortName}} at {{log.ref}} on {{op.date}}',
    OtherActivityTitle: '{{log.station}}: {{log.handlerShortName}} on {{op.date}}',
    DefaultTitle: '{{log.station}}: {{log.handlerShortName}} on {{op.date}}',
    ADIFNotes: '{{qso.notes}}',
    ADIFComment: '{{qso.notes}}',
    ADIFQslMsg: '{{#joinAnd op.refs}}{{ref}}{{/joinAnd}}'
  }

  partials.RefActivityName = settings?.useCompactFileNames ? partials.RefActivityNameCompact : partials.RefActivityNameNormal
  partials.OtherActivityName = settings?.useCompactFileNames ? partials.OtherActivityNameCompact : partials.OtherActivityNameNormal
  partials.DefaultName = settings?.useCompactFileNames ? partials.DefaultNameCompact : partials.DefaultNameNormal

  return partials
}

export function extraDataForTemplates ({ settings }) {
  return {
    app: {
      name: 'Ham2K Portable Logger',
      shortName: 'Ham2K PoLo'
    }
  }
}

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
  str = str.replace(/^-|-$/g, '')
  return str
})
Handlebars.registerHelper('downcase', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.toLowerCase()
  return str
})
Handlebars.registerHelper('upcase', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.toUpperCase()
  return str
})

Handlebars.registerHelper('titlecase', function (...args) {
  const options = args.pop()
  if (args.length === 0) args = [this]
  let str = args.map(x => options?.fn ? options.fn(x) : x).filter(x => x).join(' ')
  str = str.replace(/\b\w/g, char => char.toUpperCase())
  return str
})

Handlebars.registerHelper('compact', (x) => x.replace(/[^a-zA-Z0-9]/g, ''))
Handlebars.registerHelper('first8', (x) => x.slice(0, 8))
Handlebars.registerHelper('join', (x) => Handlebars.Utils.isArray(x) ? x.filter(e => e).join(' ') : x)
Handlebars.registerHelper('joinComma', (x) => Handlebars.Utils.isArray(x) ? x.filter(e => e).join(', ') : x)
Handlebars.registerHelper('joinCommaCompact', (x) => Handlebars.Utils.isArray(x) ? x.filter(e => e).join(',') : x)

Handlebars.registerHelper('joinAnd', function (...args) {
  const options = args.pop()
  console.log('joinAnd', args)
  if (args.length === 0) args = [this]
  const parts = args.flat().map(x => options?.fn ? options.fn(x) : x).filter(x => x)
  return joinAnd(parts)
})

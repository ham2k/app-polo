/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtISODate } from '../../../../tools/timeFormats'
import { simpleTemplate } from '../../../../tools/stringTools'
import { findBestHook, findHooks } from '../../../../extensions/registry'

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

export function dataExportOptions ({ operation, qsos, settings, ourInfo }) {
  const exports = []

  const baseNameParts = {
    call: ourInfo.call,
    date: fmtISODate(operation.startOnMillisMax),
    compactDate: fmtISODate(operation.startOnMillisMax).replace(/-/g, ''),
    title: operation.title,
    uuid: operation.uuid,
    shortUUID: operation.uuid.split('-')[0]
  }

  const exportHandlersForRefs = (operation?.refs || [])
    .map(ref => ({ handler: findBestHook(`ref:${ref.type}`), ref }))
    .filter(x => x?.handler)
  const exportHandlersForActivities = findHooks('activity')
    .filter(hook => hook.referenceTypes)
    .map(hook => hook.referenceTypes.map(type => ({ handler: findBestHook(`ref:${type}`), ref: { type } })))
    .flat().filter(x => x.handler)

  const handlersWithOptions = [...exportHandlersForRefs, ...exportHandlersForActivities].map(({ handler, ref }) => (
    { handler, ref, options: handler.suggestExportOptions && handler.suggestExportOptions({ operation, qsos, ref, settings }) }
  )).flat().filter(({ options }) => options)

  handlersWithOptions.forEach(({ handler, ref, options }) => {
    options.forEach(option => {
      const nameParts = { ...baseNameParts, ref: ref.ref, ...option.templateData, ...(handler.suggestOperationTitle && handler.suggestOperationTitle(ref)) }
      nameParts.titleDashed = nameParts.title.replace(/[^a-zA-Z0-9]/g, '-')
      const baseName = simpleTemplate(option.nameTemplate || '{date} {call} {ref}', nameParts).replace(/[/\\:]/g, '-')

      const title = simpleTemplate(option.titleTemplate || '{call} {ref} {date}', nameParts)
      const fileName = `${baseName}.${DATA_EXTENSIONS[option.format] || DATA_EXTENSIONS.other}`
      const exportTitle = option.exportTitle || `${handler.shortName ?? handler.name} ${DATA_FORMAT_DESCRIPTIONS[option.format] || DATA_FORMAT_DESCRIPTIONS.other}`

      exports.push({ ...option, handler, ref, fileName, title, exportTitle })
    })
  })
  if (settings.devMode) {
    exports.push({
      handler: { key: 'devmode', icon: 'briefcase-upload' },
      format: 'qson',
      exportType: 'devmode-qson',
      ref: {},
      fileName: simpleTemplate('{shortUUID} {date} {call} {title}.qson', baseNameParts).replace(/[\\\\/\\:]/g, '-'),
      exportTitle: 'Developer Mode: QSON Export',
      devMode: true,
      selectedByDefault: false
    })
  }
  return exports
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtISODate } from '../../../../tools/timeFormats'
import { simpleTemplate } from '../../../../tools/stringTools'
import { findBestHook } from '../../../../extensions/registry'

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

export function dataExportOptions ({ operation, settings, ourInfo }) {
  const exports = []

  const baseNameParts = {
    call: ourInfo.call,
    date: fmtISODate(operation.startOnMillisMax),
    compactDate: fmtISODate(operation.startOnMillisMax).replace(/-/g, ''),
    title: operation.title,
    uuid: operation.uuid,
    shortUUID: operation.uuid.split('-')[0]
  }

  const exportHandlers = (operation?.refs || []).map(ref => ({ handler: findBestHook(`ref:${ref.type}`), ref }))?.filter(x => x?.handler)
  const handlersWithOptions = exportHandlers.map(({ handler, ref }) => (
    { handler, ref, options: handler.suggestExportOptions && handler.suggestExportOptions({ operation, ref, settings }) }
  )).flat().filter(({ options }) => options)
  handlersWithOptions.forEach(({ handler, ref, options }) => {
    options.forEach(option => {
      const nameParts = { ...baseNameParts, ref: ref.ref, ...(handler.suggestOperationTitle && handler.suggestOperationTitle(ref)) }
      const baseName = simpleTemplate(option.nameTemplate || '{date} {call} {ref}', nameParts).replace(/[/\\:]/g, '-')

      const title = simpleTemplate(option.titleTemplate || '{call} {ref} {date}', nameParts)
      const fileName = `${baseName}.${DATA_EXTENSIONS[option.format] || DATA_EXTENSIONS.other}`
      const description = `${handler.shortName ?? handler.name} ${DATA_FORMAT_DESCRIPTIONS[option.format] || DATA_FORMAT_DESCRIPTIONS.other}`

      exports.push({ handler, ref, option, fileName, title, description })
    })
  })
  if (settings.devMode) {
    exports.push({
      handler: { key: 'devmode', icon: 'briefcase-upload' },
      ref: {},
      name: simpleTemplate('{shortUUID} {date} {call} {title}.qson'.replace(/[/\\:]/g), baseNameParts),
      description: 'Developer Mode: QSON Export',
      devMode: true
    })
  }
  return exports
}

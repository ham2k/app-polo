/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const Info = {
  key: 'core-adif',
  name: 'Core ADIF Export',
  category: 'core',
  hidden: true,
  alwaysEnabled: true
}

export const Extension = {
  ...Info,
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('export', { hook: ExportHandler })
  }
}
export default Extension

const ExportHandler = {
  ...Info,

  suggestExportOptions: ({ operation, qsos, ref, settings }) => {
    return ([{
      priority: -1,
      icon: 'file-swap-outline',
      format: 'adif',
      exportType: 'full-adif',
      nameTemplate: settings.useCompactFileNames ? '{call}@{compactDate}-{title}-full' : '{date} {call} {title} - Full',
      titleTemplate: `{call}: ${Info.shortName} at ${[ref.ref, ref.name].filter(x => x).join(' - ')} on {date}`,
      exportTitle: 'Full ADIF Export',
      selectedByDefault: false
    }])
  }
}

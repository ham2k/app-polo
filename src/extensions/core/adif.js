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

  sampleOperations: ({ settings, callInfo }) => {
    return [
      { refs: [{ type: 'potaActivation', ref: 'XX-1234', name: 'Example National Park', shortName: 'Example NP', program: Info.shortName, label: `${Info.shortName} XX-1234: Example National Park`, shortLabel: `${Info.shortName} XX-1234` }] }
    ]
  },

  defaultExportSettings: () => ({ privateData: true }),

  suggestExportOptions: ({ operation, qsos, ref, settings }) => {
    return ([{
      priority: -1,
      icon: 'file-swap-outline',
      format: 'adif',
      exportType: 'full-adif',
      name: 'Full ADIF Export',
      templateData: { modifier: 'Full' },
      exportName: 'Full ADIF Export',
      selectedByDefault: false,
      privateDataDefault: true,
      combineSegmentRefs: true // This export should include ref changes from segments
    }])
  }
}

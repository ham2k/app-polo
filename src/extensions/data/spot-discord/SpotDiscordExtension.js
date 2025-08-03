/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// See https://discord.com/developers/docs/resources/webhook#execute-webhook

import packageJson from '../../../../package.json'
import GLOBAL from '../../../GLOBAL'

import { basePartialTemplates, compileTemplateForOperation, extraDataForTemplates, selectOperationCallInfo, templateContextForOneExport } from '../../../store/operations'

export const Info = {
  key: 'spot-discord',
  icon: 'chat-alert',
  name: 'Spot on Discord',
  description: 'Send spots to Discord'
}

const Extension = {
  ...Info,
  category: 'devmode',
  onActivation: ({ registerHook }) => {
    registerHook('spots', { hook: SpotsHook })
  }
}
export default Extension

const SpotsHook = {
  ...Info,
  postSelfSpot: ({ operation, vfo, comments, qCode, qRest }) => async (dispatch, getState) => {
    if (GLOBAL?.flags?.services?.discord === false) return true

    const settings = getState().settings
    const ourInfo = selectOperationCallInfo(getState(), operation.uuid)

    const webhooks = getState().settings?.extensions?.['spot-discord']?.hooks ?? []

    for (const webhook of webhooks) {
      const context = templateContextForOneExport({
        option: { exportType: 'spot', exportFormat: 'spot-discord', exportName: 'Spot on Discord' },
        settings,
        operation,
        ourInfo,
        handler: SpotsHook,
        context: {
          spot: {
            qCode,
            qRest,
            comments,
            freq: vfo.freq,
            mode: vfo.mode
          }
        }
      })

      const partials = basePartialTemplates({ settings })
      const data = extraDataForTemplates({ settings })

      const payload = {}
      for (const attr of ['content', 'username', 'avatar_url']) {
        if (webhook[attr]) {
          payload[attr] = compileTemplateForOperation(webhook[attr], { settings })(context, { data, partials })?.trim()
        }
      }

      await fetch(webhook.webhook, {
        method: 'POST',
        headers: {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    }

    return true
  }
}

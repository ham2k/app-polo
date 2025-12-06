/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const DEFAULT_MONTHS = {
  '1': 'January',
  '2': 'February',
  '3': 'March',
  '4': 'April',
  '5': 'May',
  '6': 'June',
  '7': 'July',
  '8': 'August',
  '9': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December'
}

export const translatedVersionName = ({ t, version }) => {
  const [major, minor, patch] = version.split('.')

  return {
    general: t('general.version.general', '{{month}} \'{{year}}', {
      month: t(`general.formatting.month.${minor}`, DEFAULT_MONTHS[minor]),
      year: major
    }),
    patch: t('general.version.patch', 'patch {{patch}}', { patch }),
    full: t('general.version.specific', '{{month}} \'{{year}} {{patch}}', {
      month: t(`general.formatting.month.${minor}`, DEFAULT_MONTHS[minor]),
      year: major,
      patch: t('general.version.patch', 'patch {{patch}}', { patch })
    }),
  }
}


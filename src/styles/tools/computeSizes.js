/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PixelRatio, Dimensions } from 'react-native'

export function computeSizes () {
  const { width, height } = Dimensions.get('window')
  const fontScale = PixelRatio.getFontScale()

  // If the screen is too small, and the font scale too large, nothing will fit, so we need to adjust our font sizes down
  let fontScaleAdjustment = 1
  if (width < 340) {
    fontScaleAdjustment = width / fontScale / 330
  }

  // For Tablets, lets bump the font size a bit
  if (width > 1000) {
    fontScaleAdjustment = fontScaleAdjustment * 1.07
  }

  let size
  if (width / (fontScale * fontScaleAdjustment) < 340) size = 'xs'
  else if (width / (fontScale * fontScaleAdjustment) < 500) size = 'sm'
  else if (width / (fontScale * fontScaleAdjustment) < 1000) size = 'md'
  else if (width / (fontScale * fontScaleAdjustment) < 1200) size = 'lg'
  else size = 'xl'

  const portrait = height > width
  const landscape = !portrait

  return {
    size,
    portrait,
    landscape,
    fontScale,
    fontScaleAdjustment,
    smOrGreater: size !== 'xs',
    mdOrGreater: size !== 'xs' && size !== 'sm',
    lgOrGreater: size !== 'xs' && size !== 'sm' && size !== 'md',
    lgOrSmaller: size !== 'xl',
    mdOrSmaller: size !== 'xl' && size !== 'lg',
    smOrSmaller: size !== 'xl' && size !== 'lg' && size !== 'md'
  }
}

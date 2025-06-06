/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react'
import { PixelRatio } from 'react-native'
import { useSafeAreaFrame } from 'react-native-safe-area-context'

/*
 * Compute the different screen size values and ratios needed to properly layout our screens
 *
 * `width` and `height` are the screen dimensions.
 * `portrait` and `landscape` are booleans indicating the screen orientation.
 *
 * `fontScale` is the ratio of the font size to the default font size, as determined by the OS settings.
 * `pixelRatio` is the ratio of "device pixels" to actual "screen pixels"
 * `fontScaleAdjustment` is a factor we add on top of `fontScale` or `lineHeight` to better fit things on our screens.
 * `pixelScaleAdjustment` is the ratio of pixels to the adjusted font size.
 *
 * `size` is a string representing the screen size category: 'xs', 'sm', 'md', 'lg', 'xl'.
 * `smOrLarger`, `mdOrLarger`, `lgOrLarger`, `lgOrSmaller`, `mdOrSmaller`, `smOrSmaller` are booleans shortcuts for `size` comparisons
 *
 */

/*
 * Effect of device settings on scales:
 *
 * iOS Accesibility:
 *   Normal Range:
 *     1 • 2 • 3 • 4 • 5 • 6 • 7 - Same font scales as Larger Sizes
 *   Larger Sizes:
 *     1: 0.823 • 2: 0.882 • 3: 0.941 • 4: 1.000 • 5: 1.118 • 6: 1.235 • 7: 1.353 • 8: 1.786 • 9: 2.143 • 10: 2.643 • 11: 3.143 • 12: 3.571  (fontScale)
 *
 * iOS Display Zoom:
 *   Default:
 *      iPhone SE - pixelRatio 2, width 375
 *      iPhone 15 Pro - pixelRatio 3, width 430
 *   Larger Text:
 *      iPhone SE - width: 320
 *      iPhone 15 Pro - width: 375
 *
 * Android Font Size:
 *    1: 0.85 • 2: 1.000 • 3: 1.149 • 4: 1.299 • 5: 1.5 • 6: 1.799 • 7: 2.000 (fontScale)
 *
 * Android Display Size:
 *    1: 2.337 • 2: 2.750 • 3: 3.0625 • 4: 3.375 (pixelRatio)
 *    1: 462 • 2: 392 • 3: 352 • 4: 320 (width) Pixel 3a
 */

export function computeSizes ({ width, height, fontScale, pixelRatio }) {
  // If the screen is too small, and the font scale too large, nothing will fit, so we need to adjust our font sizes down
  let fontScaleAdjustment = 1
  if ((width / fontScale) < 300) {
    fontScaleAdjustment = width / fontScale / 300
  }

  // For Tablets, lets bump the font size a bit
  if (width > 1000) {
    fontScaleAdjustment = fontScaleAdjustment * 1.07
  }

  const pixelScaleAdjustment = fontScale * fontScaleAdjustment

  let size
  if (width / pixelScaleAdjustment < 340) size = 'xs'
  else if (width / pixelScaleAdjustment < 500) size = 'sm'
  else if (width / pixelScaleAdjustment < 1000) size = 'md'
  else if (width / pixelScaleAdjustment < 1200) size = 'lg'
  else size = 'xl'

  const portrait = height > width
  const landscape = !portrait

  return {
    width,
    height,
    scaledWidth: width / pixelScaleAdjustment,
    scaledHeight: height / pixelScaleAdjustment,
    size,
    portrait,
    landscape,
    fontScale,
    pixelRatio,
    fontScaleAdjustment,
    pixelScaleAdjustment,

    smOrLarger: size !== 'xs',
    mdOrLarger: size !== 'xs' && size !== 'sm',
    lgOrLarger: size !== 'xs' && size !== 'sm' && size !== 'md',
    lgOrSmaller: size !== 'xl',
    mdOrSmaller: size !== 'xl' && size !== 'lg',
    smOrSmaller: size !== 'xl' && size !== 'lg' && size !== 'md'
  }
}

export function useComputeSizes () {
  const { width, height } = useSafeAreaFrame()
  // const { width, height } = useWindowDimensions() <-- broken on iOS, no rotation

  const pixelRatio = PixelRatio.get()
  const fontScale = PixelRatio.getFontScale()

  const sizes = useMemo(() => computeSizes({ width, height, fontScale, pixelRatio }), [width, height, fontScale, pixelRatio])
  return sizes
}

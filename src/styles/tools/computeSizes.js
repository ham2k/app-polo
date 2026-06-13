// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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

export const SCALE_ADJUSTMENTS = {
  xs: 0.85,
  sm: 0.92,
  md: 1.00,
  lg: 1.12,
  xl: 1.25
}

export function computeSizes ({ width, height, fontScale, pixelRatio, settingsScale }) {
  const smallestSize = Math.min(width, height)

  const settingsScaleAdjustment = SCALE_ADJUSTMENTS[settingsScale] ?? 1.0

  let fontScaleAdjustment = 1

  if (smallestSize < 320 * fontScale) {
    // If the screen is too small, and the font scale too large, nothing will fit, so we need to adjust our font sizes down
    fontScaleAdjustment = smallestSize / fontScale / 320
  }

  fontScaleAdjustment = fontScaleAdjustment * settingsScaleAdjustment

  const pixelScaleAdjustment = fontScale * fontScaleAdjustment // combined scale

  const size = (() => {
    if (width / pixelScaleAdjustment < 340) return 'xs' // Small phone
    else if (width / pixelScaleAdjustment < 480) return 'sm' // Regular phone
    else if (width / pixelScaleAdjustment < 720) return 'md' // Tablet
    else if (width / pixelScaleAdjustment < 1000) return 'lg' // Large Tablet
    else return 'xl' // Full desktop
  })()

  const sized = (options) => {
    if (size === 'xs') return options.xs // Small phone
    else if (size === 'sm') return options.sm ?? options.xs // Regular phone
    else if (size === 'md') return options.md ?? options.sm ?? options.xs // Tablet
    else if (size === 'lg') return options.lg ?? options.md ?? options.sm ?? options.xs // Large Tablet
    else if (size === 'xl') return options.xl ?? options.lg ?? options.md ?? options.sm ?? options.xs // Full desktop
  }

  const portrait = height > width
  const landscape = !portrait

  return {
    width,
    height,
    size,
    sized,
    portrait,
    landscape,
    fontScale,
    pixelRatio,
    settingsScale,
    settingsScaleAdjustment,
    fontScaleAdjustment,
    pixelScaleAdjustment,

    smOrLarger: sized({ xs: false, sm: true }),
    mdOrLarger: sized({ xs: false, md: true }),
    lgOrLarger: sized({ xs: false, lg: true }),
    lgOrSmaller: sized({ xs: true, xl: false }),
    mdOrSmaller: sized({ xs: true, lg: false, xl: false }),
    smOrSmaller: sized({ xs: true, lg: false, xl: false, md: false })
  }
}

export function useComputeSizes ({ settingsScale }) {
  const { width, height } = useSafeAreaFrame()
  // const { width, height } = useWindowDimensions() <-- broken on iOS, no rotation

  const pixelRatio = PixelRatio.get()
  const fontScale = PixelRatio.getFontScale()

  const sizes = useMemo(() => computeSizes({ width, height, fontScale, pixelRatio, settingsScale }), [width, height, fontScale, pixelRatio, settingsScale])
  return sizes
}

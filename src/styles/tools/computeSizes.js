import { PixelRatio, Dimensions } from 'react-native'

export function computeSizes () {
  const { width, height } = Dimensions.get('window')
  const fontScale = PixelRatio.getFontScale()

  let size
  if (width / fontScale < 340) size = 'xs'
  else if (width / fontScale < 400) size = 'sm'
  else if (width / fontScale < 1000) size = 'md'
  else if (width / fontScale < 1200) size = 'lg'
  else size = 'xl'

  const portrait = height > width
  const landscape = !portrait

  // If the screen is too small, and the font scale too large, nothing will fit, so we need to adjust our font sizes down
  let fontScaleAdjustment = 1
  if (size === 'xs') {
    fontScaleAdjustment = width / fontScale / 330
  }

  // For Tablets, lets bump the font size a bit
  if (size === 'md' || size === 'lg' || size === 'xl') {
    fontScaleAdjustment = fontScaleAdjustment * 1.1
  }

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

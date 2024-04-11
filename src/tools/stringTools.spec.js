import { countTemplate, simpleTemplate } from './stringTools'

describe('simpleTemplate', () => {
  it('should work', () => {
    expect(simpleTemplate('Hello, {name}!', { name: 'World' })).toEqual('Hello, World!')
    expect(simpleTemplate('Hello, {name}!', { name: (key, context) => key.toUpperCase() })).toEqual('Hello, NAME!')
    expect(simpleTemplate('Hello, {missing}!', { name: 'World' })).toEqual('Hello, {missing}!')
    expect(simpleTemplate('Hello, {missing}!', { _default: (key, context) => key.toUpperCase() })).toEqual('Hello, MISSING!')
  })
})

describe('countTemplate', () => {
  it('should work', () => {
    expect(countTemplate(0, { zero: 'No items', one: 'One item', more: '{count} items' })).toEqual('No items')
    expect(countTemplate(1, { zero: 'No items', one: 'One item', more: '{count} items' })).toEqual('One item')
    expect(countTemplate(2, { zero: 'No items', one: 'One item', more: '{count} items' })).toEqual('2 items')
  })
})

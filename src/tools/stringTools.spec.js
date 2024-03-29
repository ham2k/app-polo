import { simpleTemplate } from './stringTools'

describe('simpleTemplate', () => {
  it('should work', () => {
    expect(simpleTemplate('Hello, {name}!', { name: 'World' })).toEqual('Hello, World!')
    expect(simpleTemplate('Hello, {name}!', { name: (key, context) => key.toUpperCase() })).toEqual('Hello, NAME!')
    expect(simpleTemplate('Hello, {missing}!', { name: 'World' })).toEqual('Hello, {missing}!')
    expect(simpleTemplate('Hello, {missing}!', { _default: (key, context) => key.toUpperCase() })).toEqual('Hello, MISSING!')
  })
})

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { combineCallNotes } from './callNoteTools'

describe('combineCallNotes', () => {
  const theirInfo = { baseCall: 'W1AW', call: 'W1AW' }

  it('returns null when notes array is empty', () => {
    expect(combineCallNotes([], theirInfo)).toBeNull()
  })

  it('returns null when notes is null', () => {
    expect(combineCallNotes(null, theirInfo)).toBeNull()
  })

  it('returns null when no notes match the call', () => {
    const notes = [
      { call: 'K2ABC', note: '🎉 Different call' }
    ]
    expect(combineCallNotes(notes, theirInfo)).toBeNull()
  })

  describe('single note', () => {
    it('returns note with emoji', () => {
      const notes = [{ call: 'W1AW', note: '🍄 QRQ Crew #9' }]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄 QRQ Crew #9')
      expect(result.emoji).toBe('🍄')
    })

    it('returns note without emoji and default star emoji', () => {
      const notes = [{ call: 'W1AW', note: 'Just text' }]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('Just text')
      expect(result.emoji).toBe('⭐️')
    })

    it('matches notes with undefined call', () => {
      const notes = [{ note: '🎉 Matches any call' }]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🎉 Matches any call')
      expect(result.emoji).toBe('🎉')
    })

    it('matches baseCall', () => {
      const notes = [{ call: 'W1AW', note: '⚓ Base call match' }]
      const infoWithPrefix = { baseCall: 'W1AW', call: 'W1AW/P' }
      const result = combineCallNotes(notes, infoWithPrefix)
      expect(result.note).toBe('⚓ Base call match')
    })
  })

  describe('multiple notes', () => {
    it('combines emojis from multiple notes', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 DitDit Club' },
        { call: 'W1AW', note: '⚓ QRQ Crew #9' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄⚓ QRQ Crew #9')
      expect(result.emoji).toBe('🍄')
    })

    it('uses text from last note, stripped of its emoji', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 First note text' },
        { call: 'W1AW', note: '⚓ Last note text' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄⚓ Last note text')
    })

    it('deduplicates same emoji from multiple notes', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 Club A' },
        { call: 'W1AW', note: '🍄 Club B' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄 Club B')
    })

    it('handles mix of notes with and without emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 Has emoji' },
        { call: 'W1AW', note: 'No emoji here' },
        { call: 'W1AW', note: '⚓ Also has emoji' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄⚓ Also has emoji')
    })
  })

  describe('emoji cap and overflow', () => {
    it('displays up to 4 emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 One' },
        { call: 'W1AW', note: '⚓ Two' },
        { call: 'W1AW', note: '🎉 Three' },
        { call: 'W1AW', note: '🐧 Four' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄⚓🎉🐧 Four')
    })

    it('shows +N overflow indicator when more than 4 emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 One' },
        { call: 'W1AW', note: '⚓ Two' },
        { call: 'W1AW', note: '🎉 Three' },
        { call: 'W1AW', note: '🐧 Four' },
        { call: 'W1AW', note: '🌊 Five' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄⚓🎉🐧+1 Five')
    })

    it('shows correct overflow count for many emojis', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 One' },
        { call: 'W1AW', note: '⚓ Two' },
        { call: 'W1AW', note: '🎉 Three' },
        { call: 'W1AW', note: '🐧 Four' },
        { call: 'W1AW', note: '🌊 Five' },
        { call: 'W1AW', note: '❄️ Six' },
        { call: 'W1AW', note: '👑 Seven' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄⚓🎉🐧+3 Seven')
    })
  })

  describe('call matching', () => {
    it('filters out notes that do not match the call', () => {
      const notes = [
        { call: 'W1AW', note: '🍄 Matches' },
        { call: 'K2XYZ', note: '⚓ Does not match' },
        { call: 'W1AW', note: '🎉 Also matches' }
      ]
      const result = combineCallNotes(notes, theirInfo)
      expect(result.note).toBe('🍄🎉 Also matches')
    })
  })
})

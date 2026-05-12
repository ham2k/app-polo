import { liveQSOEnqueueInfoForSaveContext } from './liveQSOEnqueueInfo'

describe('liveQSOEnqueueInfoForSaveContext', () => {
  it('preserves explicit create actions even when a new QSO already has an original snapshot', () => {
    expect(liveQSOEnqueueInfoForSaveContext({
      saveContext: {
        origin: 'live-logging',
        action: 'create',
        previousQSO: { uuid: 'draft-qso' }
      },
      qsos: [{ uuid: 'new-qso', deleted: false }]
    })).toEqual({
      action: 'create',
      liveQSOContext: undefined
    })
  })

  it('keeps previousQSO context for updates and deletes', () => {
    const previousQSO = { uuid: 'old-qso' }

    expect(liveQSOEnqueueInfoForSaveContext({
      saveContext: {
        origin: 'live-logging',
        action: 'update',
        previousQSO
      },
      qsos: [{ uuid: 'edited-qso', deleted: false }]
    })).toEqual({
      action: 'update',
      liveQSOContext: { previousQSO }
    })

    expect(liveQSOEnqueueInfoForSaveContext({
      saveContext: {
        origin: 'live-logging',
        action: 'delete',
        previousQSO
      },
      qsos: [{ uuid: 'deleted-qso', deleted: true }]
    })).toEqual({
      action: 'delete',
      liveQSOContext: { previousQSO }
    })
  })
})

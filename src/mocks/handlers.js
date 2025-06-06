import { http, HttpResponse } from 'msw'

const logSpot = async (request) => {
  console.info('[SPOT]', await request.clone().text(), { request })
}

export const handlers = [
  http.post('https://api.pota.app/spot', ({ request }) => {
    logSpot(request)

    return new HttpResponse(null, { status: 200 })
  })
]

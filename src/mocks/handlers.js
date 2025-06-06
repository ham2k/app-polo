import { http, HttpResponse } from 'msw'

const logSpot = async (request) => {
  console.info('[SPOT]', request.url, await request.clone().text(), { request })
}

export const handlers = [
  'https://api.pota.app/spot',
  'https://www.cqgma.org/spotsmart2.php',
  'https://api-db2.sota.org.uk/api/spots'
].map((spotUrl) =>
  http.post(spotUrl, ({ request }) => {
    logSpot(request)

    return new HttpResponse(null, { status: 200 })
  })
)

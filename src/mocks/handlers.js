import { http, HttpResponse } from 'msw'

const logSpot = async (request) => {
  console.info('[SPOT]', request.method, request.url, await request.clone().text(), { request })
}

export const handlers = [
  'https://api.pota.app/spot',
  'https://www.cqgma.org/spotsmart2.php',
  'https://api-db2.sota.org.uk/api/spots',
  'https://api.wwbota.org/spots/*',
  'https://www.cqgma.org/wwff/spotwwff.php',
  'https://spots.wwff.co/*'
].map((spotUrl) =>
  ['post', 'put'].map((method) =>
    http[method](spotUrl, ({ request }) => {
      logSpot(request)

      return new HttpResponse(null, { status: 200 })
    })
  )
).flat()

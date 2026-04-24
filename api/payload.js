const REMOTE_PAYLOAD_URL = 'https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(REMOTE_PAYLOAD_URL)

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch remote payload: ${response.status} ${response.statusText}`,
      })
    }

    const payload = await response.json()

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(payload)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch remote payload',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

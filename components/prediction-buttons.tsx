import { NextResponse } from "next/server"

const API_TOKEN = "RKjICBWa7Jw1vKx"
const API_URL = "https://api.yourpredictionprovider.com/predict" // Replace with your real endpoint

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 })

  try {
    const res = await fetch(`${API_URL}?type=${type}`, {
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
      },
    })
    const data = await res.json()
    return NextResponse.json({
      probability: data.probability,
      entry: data.entry,
      summary: data.summary,
    })
  } catch (e) {
    return NextResponse.json({ error: "Prediction fetch failed" }, { status: 500 })
  }
}

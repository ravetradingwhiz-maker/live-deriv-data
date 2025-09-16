import { NextResponse } from "next/server";

const DERIV_API_URL = "https://api.deriv.com/prediction"; // Replace with actual endpoint as needed
const API_TOKEN = process.env.DERIV_API_TOKEN ?? "RKjICBWa7Jw1vKx"; // Use env var for production!

export async function POST(request: Request) {
  const requestBody = await request.json();

  const derivRes = await fetch(DERIV_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await derivRes.json();
  return NextResponse.json(data, { status: derivRes.status });
}

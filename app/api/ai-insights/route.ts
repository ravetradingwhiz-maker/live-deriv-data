import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { symbol, timeframe, context } = await request.json()

    const prompt = `You are a professional trading analyst. Analyze the following trading scenario and provide 3 specific, actionable AI-powered trading insights.

Symbol: ${symbol}
Timeframe: ${timeframe}
Context: ${context}

For each insight, provide:
1. A clear, concise title
2. A detailed analysis explaining the insight
3. Market confidence level (0.0 to 1.0)
4. Direction (bullish, bearish, or neutral)

Format your response as a JSON array with objects containing: title, description, type (bullish|bearish|neutral), confidence (number 0-1)

Respond ONLY with the JSON array, no additional text.`

    const result = await generateText({
      model: "openai/gpt-4o",
      prompt,
      temperature: 0.7,
      maxOutputTokens: 500,
    })

    // Parse the response
    let insights = []
    try {
      insights = JSON.parse(result.text)
    } catch {
      // Fallback if parsing fails
      insights = [
        {
          id: "1",
          title: "Market Analysis in Progress",
          description: "AI is processing real-time market data to generate insights",
          type: "neutral",
          confidence: 0.5,
        },
      ]
    }

    // Add IDs to insights if not present
    const enrichedInsights = insights.map((insight: any, index: number) => ({
      id: insight.id || `insight-${index}`,
      ...insight,
    }))

    return Response.json({
      success: true,
      insights: enrichedInsights,
      timestamp: new Date().toISOString(),
      model: "openai/gpt-4o",
    })
  } catch (error) {
    console.error("AI Insights API Error:", error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        insights: [],
      },
      { status: 500 }
    )
  }
}

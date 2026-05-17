import { NextRequest, NextResponse } from 'next/server';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

export async function POST(req: NextRequest) {
  const { year, provinceId } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not configured' },
      { status: 500 },
    );
  }

  // Build data context for the LLM
  const source = provinceId
    ? provinces.filter((p) => p.id === provinceId)
    : provinces;

  const totalForest = source.reduce((s, p) => s + interpolateYear(p.forestCover, year), 0);
  const totalLoss = source.reduce((s, p) => s + interpolateYear(p.forestLoss, year), 0);
  const avgRate = source.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / source.length;

  const topRisk = [...source]
    .sort((a, b) => interpolateYear(b.lossRate, year) - interpolateYear(a.lossRate, year))
    .slice(0, 10)
    .map((p) => ({
      name: p.name,
      region: p.region,
      crop: p.primaryCrop,
      forestCover: Math.round(interpolateYear(p.forestCover, year)),
      annualLoss: Math.round(interpolateYear(p.forestLoss, year)),
      lossRate: (interpolateYear(p.lossRate, year) * 100).toFixed(2) + '%',
      coverChange: (
        ((interpolateYear(p.forestCover, year) - interpolateYear(p.forestCover, 2000)) /
          interpolateYear(p.forestCover, 2000)) *
        100
      ).toFixed(1) + '%',
    }));

  const selectedInfo = provinceId
    ? (() => {
        const p = provinces.find((pr) => pr.id === provinceId);
        if (!p) return '';
        return `\nFocus province: ${p.name} (${p.nameVi}), Region: ${p.region}, Area: ${p.area} km², Primary crop: ${p.primaryCrop}
Forest cover: ${Math.round(interpolateYear(p.forestCover, year))} ha, Annual loss: ${Math.round(interpolateYear(p.forestLoss, year))} ha, Loss rate: ${(interpolateYear(p.lossRate, year) * 100).toFixed(2)}%
Cover in 2000: ${p.forestCover[2000]} ha, Cover now: ${Math.round(interpolateYear(p.forestCover, year))} ha (${(((interpolateYear(p.forestCover, year) - p.forestCover[2000]) / p.forestCover[2000]) * 100).toFixed(1)}% change)`;
      })()
    : '';

  const prompt = `You are an expert environmental analyst for ViMap, a Vietnam forest monitoring platform. Analyze the following data for year ${year} and provide actionable intelligence.

DATA SUMMARY:
- Total forest cover: ${(totalForest / 1e6).toFixed(2)}M hectares
- Total annual loss: ${(totalLoss / 1000).toFixed(1)}K hectares
- Average loss rate: ${(avgRate * 100).toFixed(2)}%
- Analysis scope: ${provinceId ? '1 province' : '63 provinces nationwide'}
${selectedInfo}

TOP 10 HIGHEST-RISK PROVINCES:
${topRisk.map((p) => `${p.name} (${p.region}) — ${p.crop} — Loss: ${p.lossRate}, Cover change since 2000: ${p.coverChange}`).join('\n')}

CONTEXT:
- EUDR (EU Deforestation Regulation) cutoff date: Dec 31, 2020. Any deforestation after this date triggers trade compliance requirements for coffee, rubber, timber, cocoa, soy, palm oil, and cattle products.
- Vietnam is the world's 2nd largest coffee exporter and a major rubber producer.
- Central Highlands (Dak Lak, Dak Nong, Gia Lai, Kon Tum, Lam Dong) is the epicenter of coffee-driven deforestation.
- Southeast (Binh Phuoc, Tay Ninh, Binh Duong, Dong Nai) is the rubber belt.

Provide your analysis as a JSON array of insight objects. Each insight must have:
- "type": one of "trend", "risk", "forecast", "recommendation"
- "severity": one of "critical", "warning", "info", "positive"
- "title": short title (max 8 words)
- "body": 2-3 sentence analysis with specific numbers

Return 5-7 insights covering: overall trend, worst hotspots, disaster risk (floods/landslides from deforestation), EUDR trade impact, and one actionable recommendation. Be specific with numbers from the data. ${year > 2020 ? 'Emphasize post-EUDR implications.' : ''}

Return ONLY the JSON array, no markdown, no code fences.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert environmental data analyst. Always respond with valid JSON arrays only. No markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', err);
      return NextResponse.json(
        { error: 'AI analysis failed', detail: err },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '[]';

    // Parse the JSON response
    let insights;
    try {
      // Strip any markdown code fences if present
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', content);
      insights = [];
    }

    return NextResponse.json({
      insights,
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    console.error('Groq request failed:', err);
    return NextResponse.json(
      { error: 'Failed to reach AI service' },
      { status: 503 },
    );
  }
}

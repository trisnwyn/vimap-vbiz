import { NextRequest, NextResponse } from 'next/server';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

interface FallbackParams {
  totalForest: number;
  totalLoss: number;
  avgRate: number;
  topRisk: Array<{ name: string; region: string; crop: string; lossRate: string; coverChange: string; annualLoss: number }>;
  year: number;
  provinceId: string | null;
}

function buildFallbackInsights({ totalForest, totalLoss, avgRate, topRisk, year, provinceId }: FallbackParams) {
  const forestMha = (totalForest / 1_000_000).toFixed(2);
  const lossKha = (totalLoss / 1_000).toFixed(1);
  const rateStr = (avgRate * 100).toFixed(2);
  const worst = topRisk[0];
  const postEudr = year > 2020;

  return [
    {
      type: 'trend',
      severity: avgRate > 0.005 ? 'warning' : 'info',
      title: `${year} Forest Cover Snapshot`,
      body: `Vietnam's ${provinceId ? `${topRisk[0]?.region ?? 'selected'} region` : '63-province'} forest cover stands at ${forestMha}M ha in ${year}, with an annual loss of ${lossKha}K ha — an average rate of ${rateStr}% per year. ${avgRate > 0.005 ? 'This exceeds sustainable thresholds.' : 'The rate is within manageable bounds.'}`,
    },
    {
      type: 'risk',
      severity: worst ? 'critical' : 'warning',
      title: 'Highest-Risk Province',
      body: worst
        ? `${worst.name} (${worst.region}) leads deforestation risk with a loss rate of ${worst.lossRate} and a total annual loss of ${worst.annualLoss.toLocaleString()} ha, driven primarily by ${worst.crop} cultivation. Forest cover has changed ${worst.coverChange} since 2000.`
        : 'Insufficient data to identify highest-risk province.',
    },
    {
      type: postEudr ? 'risk' : 'info',
      severity: postEudr ? 'critical' : 'info',
      title: postEudr ? 'EUDR Post-Cutoff Exposure' : 'Pre-EUDR Baseline Period',
      body: postEudr
        ? `Any deforestation recorded after 31 December 2020 in coffee, rubber, or timber areas triggers EU Regulation 2023/1115 due-diligence obligations. The ${lossKha}K ha lost in ${year} must be geographically audited before EU market access is granted to downstream operators.`
        : `This data predates the EUDR cutoff (31 December 2020). Forest cover in ${year} establishes the historical baseline used to evaluate post-2020 land-use change for EU trade compliance.`,
    },
    {
      type: 'forecast',
      severity: 'warning',
      title: 'Disaster Risk Correlation',
      body: `Provinces with the highest deforestation rates — ${topRisk.slice(0, 3).map(p => p.name).join(', ')} — face elevated landslide and flash-flood risk. Deforested hillsides lose 40–60% of their water retention capacity, amplifying downstream flood intensity during monsoon season (May–November).`,
    },
    {
      type: 'recommendation',
      severity: 'positive',
      title: 'Priority Action: Satellite Monitoring',
      body: `To meet EUDR and REDD+ reporting obligations, deploy near-real-time Sentinel-2 monitoring across the ${topRisk.slice(0, 5).map(p => p.name).join(', ')} corridor. Integrate with MARD's national forestry database to auto-flag plot-level changes exceeding 0.5 ha annually.`,
    },
  ];
}

export async function POST(req: NextRequest) {
  let body: { year?: unknown; provinceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const year = typeof body.year === 'number' && body.year >= 2000 && body.year <= 2030
    ? body.year
    : null;
  if (year === null) {
    return NextResponse.json({ error: 'Invalid year (must be 2000-2030)' }, { status: 400 });
  }

  const provinceId = typeof body.provinceId === 'string' && provinces.some(p => p.id === body.provinceId)
    ? body.provinceId
    : body.provinceId === null || body.provinceId === undefined
      ? null
      : undefined;
  if (provinceId === undefined) {
    return NextResponse.json({ error: 'Invalid provinceId' }, { status: 400 });
  }

  // Rate-limit: 10 AI requests per minute per IP
  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:analyze`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before running another analysis.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      },
    );
  }

  // Build data context (needed for both AI path and fallback)
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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Return rule-based fallback insights when no AI key is configured
    return NextResponse.json({
      insights: buildFallbackInsights({ totalForest, totalLoss, avgRate, topRisk, year, provinceId }),
      model: 'rule-based-fallback',
      usage: null,
    });
  }

  const selectedInfo = provinceId
    ? (() => {
        const p = provinces.find((pr) => pr.id === provinceId);
        if (!p) return '';
        return `\nFocus province: ${p.name} (${p.nameVi}), Region: ${p.region}, Area: ${p.area} km², Primary crop: ${p.primaryCrop}
Forest cover: ${Math.round(interpolateYear(p.forestCover, year))} ha, Annual loss: ${Math.round(interpolateYear(p.forestLoss, year))} ha, Loss rate: ${(interpolateYear(p.lossRate, year) * 100).toFixed(2)}%
Cover in 2000: ${p.forestCover[2000]} ha, Cover now: ${Math.round(interpolateYear(p.forestCover, year))} ha (${(((interpolateYear(p.forestCover, year) - p.forestCover[2000]) / p.forestCover[2000]) * 100).toFixed(1)}% change)`;
      })()
    : '';

  const prompt = `You are an expert environmental analyst for VinMap, a Vietnam forest monitoring platform. Analyze the following data for year ${year} and provide actionable intelligence.

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
    // Return rule-based fallback instead of hard error
    return NextResponse.json({
      insights: buildFallbackInsights({ totalForest, totalLoss, avgRate, topRisk, year, provinceId }),
      model: 'rule-based-fallback',
      usage: null,
    });
  }
}

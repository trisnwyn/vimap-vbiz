// GET /api/news
// Fetches multiple RSS feeds, filters for Vietnam/agri/forest relevance,
// returns structured articles. Cached in-memory for 10 minutes.

import { NextResponse } from 'next/server';
import type { NewsArticle } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RssFeed {
  url: string;
  sourceName: string;
  /** True = feed is already Vietnam-specific; only require domain keywords, not a Vietnam mention. */
  vietnamSpecific: boolean;
}

const FEEDS: RssFeed[] = [
  { url: 'https://news.mongabay.com/feed/',              sourceName: 'Mongabay',  vietnamSpecific: false },
  { url: 'https://e.vnexpress.net/rss/news.rss',         sourceName: 'VnExpress', vietnamSpecific: true  },
  { url: 'https://e.vnexpress.net/rss/environment.rss',  sourceName: 'VnExpress', vietnamSpecific: true  },
  { url: 'https://www.rfa.org/english/news/vietnam/rss',  sourceName: 'RFA',       vietnamSpecific: true  },
];

// Domain keywords — article must contain at least one to be relevant.
// Covers: forest/deforestation, agri/commodities, climate/environment, trade.
const DOMAIN_KW = [
  // Forest & deforestation
  'eudr', 'deforest', 'forest', 'timber', 'logging', 'tree cover',
  'forest loss', 'forest cover', 'reforest', 'mangrove',
  // Agriculture & commodities
  'coffee', 'rubber', 'plantation', 'agri', 'mekong', 'shrimp',
  'aquaculture', 'rice', 'harvest', 'farming', 'fishery', 'seafood',
  'crop', 'commodity', 'supply chain', 'cocoa', 'soy', 'palm oil',
  // Climate & environment
  'climate', 'heatwave', 'heat wave', 'typhoon', 'drought', 'flood',
  'flooding', 'inundation', 'biodiversity', 'conservation', 'pollution',
  'environment', 'sustainable', 'emission', 'carbon', 'greenhouse',
  'renewable', 'solar', 'wildfire', 'coral',
  // Trade context (paired with Vietnam context for non-VN feeds)
  'export', 'trade agreement', 'supply disruption',
];

// Vietnam context keywords — required for non-Vietnam-specific feeds (e.g. Mongabay).
const VIETNAM_KW = [
  'vietnam','viet nam','vietnamese','hanoi','ho chi minh','mekong delta',
  'central highlands','dak lak','gia lai',
];

function isRelevant(combined: string, vietnamSpecific: boolean): boolean {
  const hasDomain = DOMAIN_KW.some(k => combined.includes(k));
  if (!hasDomain) return false;
  if (vietnamSpecific) return true;
  return VIETNAM_KW.some(k => combined.includes(k));
}

// Province name → [lat, lng] centroids for coordinate assignment.
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'dak lak': [12.67, 108.05], 'dak nong': [12.00, 107.69],
  'gia lai': [13.80, 108.10], 'kon tum': [14.50, 107.80],
  'lam dong': [11.94, 108.44], 'binh phuoc': [11.75, 106.72],
  'tay ninh': [11.31, 106.10], 'dong nai': [11.07, 107.17],
  'ho chi minh': [10.77, 106.69], 'ha noi': [21.03, 105.85],
  'hai phong': [20.86, 106.72], 'ca mau': [9.18, 105.15],
  'kien giang': [10.00, 105.10], 'an giang': [10.52, 105.12],
  'quang nam': [15.57, 107.99], 'quang ngai': [15.12, 108.80],
  'binh dinh': [13.78, 109.22], 'son la': [21.33, 103.89],
  'dien bien': [21.39, 103.02], 'lai chau': [22.39, 103.47],
  'ha giang': [22.82, 104.98], 'cao bang': [22.67, 106.25],
  'nghe an': [19.23, 104.92], 'ha tinh': [18.36, 105.91],
  'quang binh': [17.47, 106.62], 'thua thien hue': [16.46, 107.60],
  'da nang': [16.07, 108.22],
};

const CATEGORY_MAP: { kw: string[]; cat: NewsArticle['category'] }[] = [
  { kw: ['eudr','due diligence','regulation 2023'], cat: 'eudr' },
  { kw: ['deforest','forest loss','logging','illegal timber','tree cover'], cat: 'deforestation' },
  { kw: ['policy','law','government','ministry','regulation','ban'], cat: 'policy' },
  { kw: ['climate','drought','flood','typhoon','rainfall','temperature'], cat: 'climate' },
];

function assignCategory(text: string): NewsArticle['category'] {
  const t = text.toLowerCase();
  for (const { kw, cat } of CATEGORY_MAP) {
    if (kw.some(k => t.includes(k))) return cat;
  }
  return 'agriculture';
}

function assignCoords(text: string): { lat: number; lng: number } {
  const t = text.toLowerCase();
  for (const [name, [lat, lng]] of Object.entries(PROVINCE_COORDS)) {
    if (t.includes(name)) return { lat, lng };
  }
  return { lat: 16.0, lng: 108.0 }; // Vietnam centroid fallback
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function extractField(xml: string, field: string): string {
  const cdata = xml.match(new RegExp(`<${field}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${field}>`, 'i'));
  // Strip HTML from CDATA content — image URLs (e.g. ?fit=crop) can trigger false keyword matches
  if (cdata) return stripHtml(cdata[1]);
  const plain = xml.match(new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, 'i'));
  return plain ? stripHtml(plain[1]) : '';
}

/** djb2-style hash → base-36 string. Unique enough for article IDs. */
function hashUrl(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = Math.imul((h << 5) + h, 1) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function parseItems(xml: string, sourceName: string, vietnamSpecific: boolean): NewsArticle[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const results: NewsArticle[] = [];
  for (const block of blocks) {
    const title = extractField(block, 'title');
    const description = extractField(block, 'description');
    const pubDate = extractField(block, 'pubDate');

    // Multi-fallback link extraction:
    // 1. <link> tag via extractField
    // 2. Bare <link>url</link> pattern
    // 3. First https:// href in block (catches VnExpress CDATA embeds)
    const link =
      extractField(block, 'link') ||
      block.match(/<link>\s*(https?:\/\/[^\s<]+)\s*<\/link>/i)?.[1] ||
      block.match(/href="(https?:\/\/[^"]+)"/i)?.[1] ||
      '';

    if (!title || !link) continue;

    const combined = `${title} ${description}`.toLowerCase();
    if (!isRelevant(combined, vietnamSpecific)) continue;

    const date = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const coords = assignCoords(combined);
    // Hash the full URL so every article gets a unique, stable ID
    const id = `live_${hashUrl(link)}`;

    results.push({
      id,
      title: title.slice(0, 200),
      source: sourceName,
      date,
      summary: description.slice(0, 400) || title,
      lat: coords.lat,
      lng: coords.lng,
      category: assignCategory(combined),
      url: link,
      isVerified: true,
    });
  }
  return results;
}

// Module-level cache
let _cache: { data: NewsArticle[]; ts: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

async function fetchFeed(feed: RssFeed): Promise<NewsArticle[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'VinMap/1.0 (news aggregator; research use)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseItems(xml, feed.sourceName, feed.vietnamSpecific);
  } catch {
    return [];
  }
}

export async function GET(): Promise<Response> {
  // Serve from cache if fresh
  if (_cache && Date.now() - _cache.ts < CACHE_MS) {
    return NextResponse.json({ articles: _cache.data, cached: true });
  }

  const results = await Promise.all(FEEDS.map(fetchFeed));
  const merged = results.flat();

  // Deduplicate by URL, sort newest first, cap at 40
  const seen = new Set<string>();
  const unique = merged.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40);

  // Only cache non-empty results — prevent stale empty cache locking out live data.
  if (unique.length > 0) {
    _cache = { data: unique, ts: Date.now() };
  }
  return NextResponse.json({ articles: unique, cached: false, count: unique.length });
}

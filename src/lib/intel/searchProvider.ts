// ─────────────────────────────────────────────────────────────────────────
// Pluggable web-search layer for VinMap Intelligence.
//
// The agent doesn't care *how* it gets the web — it just calls
// `getSearchProvider().search(query)`. Today that's free Google News RSS
// (no API key). Swap in Tavily/Brave/SerpAPI later by implementing the same
// interface and returning it from `getSearchProvider()`.
// ─────────────────────────────────────────────────────────────────────────

import { XMLParser } from 'fast-xml-parser';
import type { Language } from '@/types/intel';

export interface SearchResult {
  title: string;
  /** Article URL (Google News returns a redirect link that resolves to the source). */
  url: string;
  /** Publisher / outlet, e.g. "Reuters", "VnExpress". */
  source: string;
  /** Plain-text extract (HTML stripped) when available. */
  snippet?: string;
  /** ISO date string. */
  publishedAt?: string;
}

export interface SearchOptions {
  language?: Language;
  /** Max results to return (provider may fetch more then trim). */
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
}

// ── helpers ───────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Google News formats titles as "Headline - Publisher". Split that off. */
function splitTitleSource(rawTitle: string, fallbackSource: string): { title: string; source: string } {
  const idx = rawTitle.lastIndexOf(' - ');
  if (idx > 0 && idx > rawTitle.length - 60) {
    return { title: rawTitle.slice(0, idx).trim(), source: rawTitle.slice(idx + 3).trim() };
  }
  return { title: rawTitle.trim(), source: fallbackSource };
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// ── Google News RSS provider (default, key-free) ──────────────────────────

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { '#text'?: string; '@_url'?: string };
}

export class GoogleNewsRSSProvider implements SearchProvider {
  readonly name = 'google-news-rss';

  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  private locale(language: Language) {
    return language === 'vi'
      ? { hl: 'vi', gl: 'VN', ceid: 'VN:vi' }
      : { hl: 'en-US', gl: 'US', ceid: 'US:en' };
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
    const { language = 'en', limit = 10, signal } = opts;
    const { hl, gl, ceid } = this.locale(language);
    const url =
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
      `&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    // Own timeout, but respect an external abort signal if provided.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Google sometimes 403s default fetch UAs.
          'User-Agent':
            'Mozilla/5.0 (compatible; VinMapIntelligence/1.0; +https://vinmap.app)',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });
      if (!res.ok) {
        console.error('[searchProvider] Google News RSS error', res.status);
        return [];
      }
      const xml = await res.text();
      const doc = this.parser.parse(xml);
      const items = asArray<RssItem>(doc?.rss?.channel?.item);

      return items.slice(0, limit).map((item) => {
        const fallbackSource =
          typeof item.source === 'object' ? item.source?.['#text'] ?? 'Google News' : item.source ?? 'Google News';
        const { title, source } = splitTitleSource(item.title ?? '', fallbackSource);
        return {
          title,
          url: item.link ?? '',
          source,
          snippet: item.description ? stripHtml(item.description) : undefined,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
        } satisfies SearchResult;
      }).filter((r) => r.title && r.url);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        console.error('[searchProvider] Google News RSS timed out');
      } else {
        console.error('[searchProvider] Google News RSS failed', err);
      }
      return [];
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────

let cached: SearchProvider | null = null;

/**
 * Returns the active search provider. Currently Google News RSS (free).
 * To add a paid provider later, branch on its env key here and return the
 * new implementation — nothing else in the agent needs to change.
 */
export function getSearchProvider(): SearchProvider {
  if (cached) return cached;
  // Example future hook:
  //   if (process.env.TAVILY_API_KEY) cached = new TavilyProvider(process.env.TAVILY_API_KEY);
  cached = new GoogleNewsRSSProvider();
  return cached;
}

'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, MapPin, Calendar } from 'lucide-react';
import { newsArticles } from '@/data/news-articles';

interface NewsPanelProps {
  year: number;
  selectedNewsId: string | null;
  onNewsSelect: (id: string | null) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'eudr', label: 'EUDR' },
  { id: 'deforestation', label: 'Deforestation' },
  { id: 'policy', label: 'Policy' },
  { id: 'climate', label: 'Climate' },
  { id: 'agriculture', label: 'Agriculture' },
] as const;

export default function NewsPanel({ year, selectedNewsId, onNewsSelect }: NewsPanelProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return newsArticles
      .filter((a) => new Date(a.date).getFullYear() <= year)
      .filter((a) => filter === 'all' || a.category === filter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [year, filter]);

  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-hidden">
      <div>
        <h3 className="text-xs font-bold text-white mb-2">News Intelligence</h3>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                filter === cat.id
                  ? 'bg-accent/15 text-accent'
                  : 'text-gray-500 hover:text-gray-300 bg-white/[0.03]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-gray-500">
        {filtered.length} article{filtered.length !== 1 ? 's' : ''} through {year}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.map((article) => (
          <div
            key={article.id}
            onClick={() => onNewsSelect(article.id === selectedNewsId ? null : article.id)}
            className={`news-card ${
              article.id === selectedNewsId ? 'border-accent/40 bg-accent/[0.05]' : ''
            }`}
          >
            <div className="flex items-start gap-2 mb-1.5">
              <span
                className={`w-2 h-2 rounded-full mt-1 shrink-0 category-${article.category}`}
                style={{
                  backgroundColor:
                    article.category === 'eudr'
                      ? '#ff6b6b'
                      : article.category === 'deforestation'
                        ? '#ffa726'
                        : article.category === 'policy'
                          ? '#42a5f5'
                          : article.category === 'climate'
                            ? '#66bb6a'
                            : '#e8d44d',
                }}
              />
              <h4 className="text-xs text-white font-medium leading-snug line-clamp-2">
                {article.title}
              </h4>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1.5">
              <span className="font-medium text-gray-400">{article.source}</span>
              <span className="flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(article.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {article.id === selectedNewsId && (
              <div className="animate-fade-in">
                <p className="text-[11px] text-gray-300 leading-relaxed mb-2">
                  {article.summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[9px] text-gray-500">
                    <MapPin className="w-2.5 h-2.5" />
                    {article.lat.toFixed(2)}°N, {article.lng.toFixed(2)}°E
                  </span>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Read full <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

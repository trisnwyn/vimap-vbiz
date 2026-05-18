'use client';

import { useCallback } from 'react';
import { FileDown } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

interface ExportReportProps {
  year: number;
  selectedProvince: string | null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function ExportReport({ year, selectedProvince }: ExportReportProps) {
  const handleExport = useCallback(() => {
    const source = selectedProvince
      ? provinces.filter((p) => p.id === selectedProvince)
      : provinces;

    const totalForest = source.reduce((s, p) => s + interpolateYear(p.forestCover, year), 0);
    const totalLoss = source.reduce((s, p) => s + interpolateYear(p.forestLoss, year), 0);
    const avgRate = source.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / source.length;
    const highRisk = source.filter((p) => interpolateYear(p.lossRate, year) >= 0.015);

    const title = selectedProvince
      ? `${source[0]?.name} Province Report`
      : 'Vietnam National Forest Assessment';

    const now = new Date().toISOString().split('T')[0];

    const provinceRows = [...source]
      .sort((a, b) => interpolateYear(b.lossRate, year) - interpolateYear(a.lossRate, year))
      .map(
        (p) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px">${p.name}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px">${p.nameVi}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px">${p.region}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right">${formatNum(interpolateYear(p.forestCover, year))}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right">${formatNum(interpolateYear(p.forestLoss, year))}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;color:${interpolateYear(p.lossRate, year) >= 0.015 ? '#dc2626' : '#374151'}">${(interpolateYear(p.lossRate, year) * 100).toFixed(2)}%</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-transform:capitalize">${p.primaryCrop}</td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VinMap Report — ${title}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4 landscape; }
    }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #111827; max-width: 1100px; margin: 0 auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #00dc82; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: 800; color: #111827; }
    .logo span { color: #00dc82; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 11px; color: #6b7280; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 22px; font-weight: 700; margin-top: 4px; font-family: 'SF Mono', monospace; }
    .section-title { font-size: 14px; font-weight: 700; color: #111827; margin: 20px 0 10px; border-left: 3px solid #00dc82; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 8px 10px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    .risk-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .risk-critical { background: #fef2f2; color: #dc2626; }
    .risk-elevated { background: #fffbeb; color: #d97706; }
    .disclaimer { margin-top: 30px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 9px; color: #9ca3af; }
    .print-btn { position: fixed; bottom: 20px; right: 20px; background: #00dc82; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,220,130,0.3); }
    .print-btn:hover { background: #00c472; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <div class="logo">Vi<span>Map</span> Report</div>
      <div class="subtitle">${title} — Data Year: ${year}</div>
    </div>
    <div class="meta">
      <div>Generated: ${now}</div>
      <div>Vietnam Land Use & Cover Intelligence</div>
      <div>EUDR Compliance Assessment</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-label">Total Forest Cover</div>
      <div class="stat-value" style="color:#16a34a">${formatNum(totalForest)} ha</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Annual Forest Loss</div>
      <div class="stat-value" style="color:#ea580c">${formatNum(totalLoss)} ha</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Average Loss Rate</div>
      <div class="stat-value" style="color:#dc2626">${(avgRate * 100).toFixed(2)}%</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">High-Risk Provinces</div>
      <div class="stat-value" style="color:#dc2626">${highRisk.length}</div>
    </div>
  </div>

  ${
    highRisk.length > 0
      ? `
  <div class="section-title">High-Risk Provinces (Loss Rate > 1.5%)</div>
  <p style="font-size:11px;color:#6b7280;margin-bottom:12px">
    The following provinces exceed the 1.5% annual forest loss rate threshold and require enhanced monitoring
    for EUDR compliance. Commodity sourcing from these regions should include satellite-verified traceability.
  </p>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
    ${highRisk
      .map(
        (p) =>
          `<span class="risk-badge ${interpolateYear(p.lossRate, year) >= 0.02 ? 'risk-critical' : 'risk-elevated'}">${p.name} (${(interpolateYear(p.lossRate, year) * 100).toFixed(1)}%)</span>`,
      )
      .join('')}
  </div>`
      : ''
  }

  <div class="section-title">Province-Level Data</div>
  <table>
    <thead>
      <tr>
        <th>Province</th>
        <th>Vietnamese</th>
        <th>Region</th>
        <th style="text-align:right">Forest Cover (ha)</th>
        <th style="text-align:right">Annual Loss (ha)</th>
        <th style="text-align:right">Loss Rate</th>
        <th>Primary Commodity</th>
      </tr>
    </thead>
    <tbody>
      ${provinceRows}
    </tbody>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is generated by VinMap using modeled data derived from publicly available
    forestry statistics (Hansen GFC, MARD). Values are approximations and should not be used as sole evidence for
    regulatory compliance. For EUDR due diligence submissions, cross-reference with official government datasets and
    high-resolution satellite imagery. Report generated on ${now}.
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => URL.revokeObjectURL(url);
    }
  }, [year, selectedProvince]);

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
      title="Export PDF Report"
    >
      <FileDown className="w-3 h-3" />
      Export
    </button>
  );
}

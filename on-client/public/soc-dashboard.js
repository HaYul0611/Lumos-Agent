// ============================================================
// Lumos · SOC Dashboard & Telemetry Module (Refactored)
// Enterprise SOC Security Score, Time-Series Chart, Donut Chart
// Independent module for clean code separation and maintainability.
// ============================================================

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // 1. 시계열 위협 개요 차트 (SVG 기반 고성능 실시간 렌더러)
  function renderTimeSeriesChart() {
    const container = $('soc-trend-chart');
    if (!container) return;

    const timeLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const normalPoints = [2, 1, 0, 1, 3, 2, 4, 3, 2, 1, 2, 1]; // 무결성 정상 핑
    const threatPoints = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 탐지된 위협 0건 (안전)

    const w = 540;
    const h = 160;
    const padX = 35;
    const padY = 25;
    const stepX = (w - padX * 2) / (timeLabels.length - 1);
    const maxY = 5;

    function toY(val) {
      return (h - padY) - (val / maxY) * (h - padY * 2);
    }

    let normPath = '';
    let threatPath = '';
    let normArea = `M ${padX} ${h - padY} `;

    timeLabels.forEach((_, i) => {
      const x = padX + i * stepX;
      const yNorm = toY(normalPoints[i]);
      const yThreat = toY(threatPoints[i]);

      normPath += (i === 0 ? `M ${x} ${yNorm}` : ` L ${x} ${yNorm}`);
      threatPath += (i === 0 ? `M ${x} ${yThreat}` : ` L ${x} ${yThreat}`);
      normArea += `L ${x} ${yNorm} `;
    });
    normArea += `L ${padX + (timeLabels.length - 1) * stepX} ${h - padY} Z`;

    let gridLines = '';
    for (let i = 0; i <= maxY; i++) {
      const y = toY(i);
      gridLines += `<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="var(--border-subtle, rgba(255,255,255,0.06))" stroke-dasharray="3 3"/>`;
      gridLines += `<text x="${padX - 8}" y="${y + 3}" fill="var(--fg-tertiary)" font-size="9" text-anchor="end" font-family="var(--font-mono)">${i}</text>`;
    }

    let xLabels = '';
    timeLabels.forEach((label, i) => {
      if (i % 2 === 0) {
        const x = padX + i * stepX;
        xLabels += `<text x="${x}" y="${h - 6}" fill="var(--fg-tertiary)" font-size="9.5" text-anchor="middle" font-family="var(--font-mono)">${label}</text>`;
      }
    });

    container.innerHTML = `
      <svg class="soc-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="normGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${normArea}" fill="url(#normGrad)" />
        <path d="${normPath}" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
        <path d="${threatPath}" fill="none" stroke="#EF4444" stroke-width="2" stroke-dasharray="4 4"/>
        ${xLabels}
      </svg>
    `;
  }

  // 2. 심각도 도넛 차트 (Severity Donut Chart)
  function renderSeverityDonut() {
    const container = $('soc-donut-chart');
    if (!container) return;

    // 정상 100%, 위험/높음/보통/낮음 0%
    const size = 110;
    const strokeWidth = 14;
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;

    container.innerHTML = `
      <div class="donut-wrapper">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--surface-sunk, #1E293B)" stroke-width="${strokeWidth}" />
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#10B981" stroke-width="${strokeWidth}"
            stroke-dasharray="${circ}" stroke-dashoffset="0" stroke-linecap="round"
            transform="rotate(-90 ${size/2} ${size/2})" />
        </svg>
        <div class="donut-center-label">
          <span class="donut-center-val">0</span>
          <span class="donut-center-sub">위협 0건</span>
        </div>
      </div>
    `;
  }

  // 3. 보안 스코어 애니메이션 카운트업
  function initScoreCounter() {
    const scoreValEl = $('soc-score-val');
    if (!scoreValEl) return;
    let curr = 85;
    const target = 100;
    const timer = setInterval(() => {
      curr += 1;
      scoreValEl.textContent = curr;
      if (curr >= target) clearInterval(timer);
    }, 25);
  }

  function initSocDashboard() {
    renderTimeSeriesChart();
    renderSeverityDonut();
    initScoreCounter();
  }

  window.LumosSoc = {
    init: initSocDashboard,
    refreshCharts: () => {
      renderTimeSeriesChart();
      renderSeverityDonut();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocDashboard);
  } else {
    initSocDashboard();
  }
})();

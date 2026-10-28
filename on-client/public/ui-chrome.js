// ============================================================
// Lumos · UI Chrome
// Theme switch (auto/light/dark), Command Palette, Toast, Shortcuts
// This module does NOT touch app.js state or data flow.
// It only decorates the chrome around app.js and exposes
// window.LumosChrome.{showToast, setNavBadge} for app.js to call
// later if desired. app.js has no dependency on this file.
// ============================================================

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ----------------------------------------------------------
  // Theme (3-way: auto / light / dark)
  //   auto: prefers-color-scheme first, time-of-day fallback
  //   06-18 → light, 18-06 → dark
  // ----------------------------------------------------------
  const THEME_KEY = 'lumos-theme-mode';
  const AUTO_REFRESH_MS = 60 * 1000;

  function getAutoResolvedTheme() {
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (_) { /* no matchMedia */ }
    const h = new Date().getHours();
    return (h >= 18 || h < 6) ? 'dark' : 'light';
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);

    const resolved = mode === 'auto' ? getAutoResolvedTheme() : mode;

    const iconAuto = document.querySelector('.theme-icon-auto');
    const iconLight = document.querySelector('.theme-icon-light');
    const iconDark = document.querySelector('.theme-icon-dark');
    if (iconAuto) iconAuto.hidden = true;
    if (iconLight) iconLight.hidden = resolved !== 'light';
    if (iconDark) iconDark.hidden = resolved !== 'dark';

    const btn = $('theme-switch-btn');
    if (btn) {
      btn.setAttribute('aria-label', `테마 전환 (현재: ${resolved === 'dark' ? '다크' : '라이트'})`);
      btn.setAttribute('title', `테마 전환 (현재 ${resolved === 'dark' ? '다크' : '라이트'} → 클릭 시 ${resolved === 'dark' ? '라이트' : '다크'})`);
    }

    qsa('.theme-switch-item').forEach((item) => {
      item.setAttribute('aria-checked', item.dataset.themeMode === mode ? 'true' : 'false');
    });

    const metaEl = $('theme-auto-meta');
    if (metaEl) metaEl.textContent = resolved === 'dark' ? '현재 · 다크' : '현재 · 라이트';
  }

  function setThemeMode(mode) {
    try { localStorage.setItem(THEME_KEY, mode); } catch (_) { /* storage blocked */ }
    applyTheme(mode);
  }

  function getStoredMode() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (_) { return 'auto'; }
  }

  function toggleThemeDirect(e) {
    if (e) e.preventDefault();
    const current = getStoredMode();
    const resolved = current === 'auto' ? getAutoResolvedTheme() : current;
    const next = resolved === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    showToast('info', '테마 전환', next === 'dark' ? '다크 모드로 전환되었습니다.' : '라이트 모드로 전환되었습니다.');
  }

  function initTheme() {
    applyTheme(getStoredMode());

    const btn = $('theme-switch-btn');
    if (btn) btn.addEventListener('click', toggleThemeDirect);

    // Re-evaluate auto mode every minute (time-of-day drift)
    setInterval(() => {
      if (getStoredMode() === 'auto') applyTheme('auto');
    }, AUTO_REFRESH_MS);

    // React to system theme change
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => { if (getStoredMode() === 'auto') applyTheme('auto'); };
      if (mq.addEventListener) mq.addEventListener('change', handler);
      else if (mq.addListener) mq.addListener(handler);
    } catch (_) { /* no matchMedia */ }
  }

  // ----------------------------------------------------------
  // Real-Time Analog Clock & Sync
  // ----------------------------------------------------------
  function formatKoreanDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = d.getHours();
    const ampm = hours < 12 ? '오전' : '오후';
    const hour12 = hours % 12 || 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${ampm} ${hour12}:${minutes}:${seconds}`;
  }

  function initAnalogClock() {
    const secEl = $('clock-sec');
    const minEl = $('clock-min');
    const hrEl = $('clock-hour');
    const checkedAtEl = $('checked-at');

    function updateClock() {
      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      const hr = now.getHours();

      const secDeg = sec * 6; // exact integer tick per second
      const minDeg = (min + sec / 60) * 6;
      const hrDeg = ((hr % 12) + min / 60) * 30;

      if (secEl) secEl.style.transform = `rotate(${secDeg}deg)`;
      if (minEl) minEl.style.transform = `rotate(${minDeg}deg)`;
      if (hrEl) hrEl.style.transform = `rotate(${hrDeg}deg)`;

      // If checked-at is empty or initial, sync with live formatted time
      if (checkedAtEl) {
        const timeStr = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        if (window.innerWidth <= 768) {
          checkedAtEl.textContent = timeStr;
        } else if (!checkedAtEl.textContent || !checkedAtEl.textContent.trim()) {
          checkedAtEl.textContent = `확인 시각 ${formatKoreanDate(now)}`;
        }
      }
    }

    if (window.__lumosClockTimer) clearInterval(window.__lumosClockTimer);
    updateClock();
    window.__lumosClockTimer = setInterval(updateClock, 1000);
  }

  // ----------------------------------------------------------
  // Toast
  // ----------------------------------------------------------
  const TOAST_ICON_SVG = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="7 12.5 10.5 16 17 9"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/><line x1="15.5" y1="8.5" x2="8.5" y2="15.5"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L22 20 L2 20 Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.8" fill="currentColor"/></svg>'
  };

  const TOAST_TTL_MS = 4200;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showToast(type, title, msg) {
    const container = $('toast-container');
    if (!container) return;
    const kind = TOAST_ICON_SVG[type] ? type : 'info';
    const toast = document.createElement('div');
    toast.className = 'toast ' + kind;
    toast.setAttribute('role', 'status');
    toast.innerHTML = TOAST_ICON_SVG[kind]
      + '<div class="toast-body">'
      + '<div class="toast-title">' + escapeHtml(title || '') + '</div>'
      + (msg ? '<div class="toast-msg">' + escapeHtml(msg) + '</div>' : '')
      + '</div>'
      + '<button type="button" class="toast-close" aria-label="닫기">'
      + '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>'
      + '</button>';
    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
    container.appendChild(toast);
    setTimeout(() => dismissToast(toast), TOAST_TTL_MS);
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains('leaving')) return;
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 220);
  }

  // ----------------------------------------------------------
  // Sidebar navigation badges
  // ----------------------------------------------------------
  function setNavBadge(view, count, variant) {
    const el = $('badge-' + view);
    if (!el) return;
    if (!count || count <= 0) {
      el.hidden = true;
      el.textContent = '';
      el.classList.remove('critical');
      return;
    }
    el.hidden = false;
    el.textContent = String(count > 99 ? '99+' : count);
    if (variant === 'critical') el.classList.add('critical');
    else el.classList.remove('critical');
  }

  // ----------------------------------------------------------
  // Command Palette
  // ----------------------------------------------------------
  const CMDK_ICON_SVG = {
    shield: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    file: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    auto: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" stroke="none"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sidebar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>'
  };

  function clickById(id) {
    const el = $(id);
    if (el && typeof el.click === 'function') el.click();
  }

  const CMDK_ITEMS = [
    { group: '이동', label: '보호 모니터링', meta: 'g p', icon: 'shield', action: () => clickById('tab-protection') },
    { group: '이동', label: '지점망 GIS 관제 (대리점)', meta: 'g s', icon: 'auto', action: () => clickById('tab-sites') },
    { group: '이동', label: '인프라 토폴로지 (7-Tier)', meta: 'g t', icon: 'grid', action: () => clickById('tab-topology') },
    { group: '이동', label: 'UEBA 보안 분석 & 엔티티 순위', meta: 'g u', icon: 'shield', action: () => clickById('tab-ueba') },
    { group: '이동', label: '사건·케이스 관제', meta: 'g c', icon: 'file', action: () => clickById('tab-cases') },
    { group: '이동', label: '단말·자산 관리 (IAM)', meta: 'g e', icon: 'grid', action: () => clickById('tab-endpoints') },
    { group: '이동', label: '취약점 점검 (OSV)', meta: 'g v', icon: 'file', action: () => clickById('tab-vulnerabilities') },
    { group: '이동', label: 'AI 연동·설정', meta: 'g i', icon: 'auto', action: () => clickById('tab-ai-connect') },
    { group: '이동', label: '업무 앱 (ZTNA)', meta: 'g a', icon: 'grid', action: () => clickById('tab-apps') },
    { group: '이동', label: '방화벽 & 패킷 로그 (pfSense)', meta: 'g r', icon: 'file', action: () => clickById('tab-records') },
    { group: '테마', label: '다크 / 라이트 모드 전환', meta: null, icon: 'moon', action: () => toggleThemeDirect() },
    { group: '화면', label: '사이드바 접기/펼치기', meta: '[', icon: 'sidebar', action: () => clickById('sidebar-toggle-btn') },
    { group: '동작', label: '다시 불러오기', meta: 'R', icon: 'refresh', action: () => clickById('refresh') }
  ];

  let cmdkActiveIndex = 0;
  let cmdkFiltered = [];

  function openCmdk() {
    const overlay = $('cmdk-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    const input = $('cmdk-input');
    if (input) {
      input.value = '';
      cmdkActiveIndex = 0;
      renderCmdk();
      setTimeout(() => input.focus(), 10);
    }
  }

  function closeCmdk() {
    const overlay = $('cmdk-overlay');
    if (overlay) overlay.hidden = true;
  }

  function renderCmdk() {
    const input = $('cmdk-input');
    const list = $('cmdk-list');
    if (!input || !list) return;
    const q = input.value.trim().toLowerCase();
    cmdkFiltered = q
      ? CMDK_ITEMS.filter((it) => it.label.toLowerCase().includes(q) || it.group.toLowerCase().includes(q))
      : CMDK_ITEMS.slice();
    if (cmdkActiveIndex >= cmdkFiltered.length) cmdkActiveIndex = 0;

    if (cmdkFiltered.length === 0) {
      list.innerHTML = '<li class="cmdk-empty">일치하는 명령이 없습니다.</li>';
      return;
    }

    let html = '';
    let lastGroup = null;
    cmdkFiltered.forEach((it, i) => {
      if (it.group !== lastGroup) {
        html += '<li class="cmdk-group-label">' + escapeHtml(it.group) + '</li>';
        lastGroup = it.group;
      }
      html += '<li class="cmdk-item' + (i === cmdkActiveIndex ? ' active' : '') + '" role="option" data-idx="' + i + '">'
        + (CMDK_ICON_SVG[it.icon] || '')
        + '<span>' + escapeHtml(it.label) + '</span>'
        + (it.meta ? '<span class="cmdk-item-meta">' + escapeHtml(it.meta) + '</span>' : '')
        + '</li>';
    });
    list.innerHTML = html;

    qsa('.cmdk-item', list).forEach((el) => {
      el.addEventListener('click', () => runCmdk(Number(el.dataset.idx)));
    });
  }

  function runCmdk(i) {
    const it = cmdkFiltered[i];
    if (!it) return;
    closeCmdk();
    setTimeout(() => { try { it.action(); } catch (_) { /* swallow */ } }, 40);
  }

  function initCmdk() {
    const trigger = $('cmdk-trigger');
    if (trigger) trigger.addEventListener('click', openCmdk);

    const sidebarTrigger = $('sidebar-cmdk-trigger');
    if (sidebarTrigger) sidebarTrigger.addEventListener('click', openCmdk);

    const input = $('cmdk-input');
    if (input) {
      input.addEventListener('input', renderCmdk);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeCmdk(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); cmdkActiveIndex = Math.min(cmdkFiltered.length - 1, cmdkActiveIndex + 1); renderCmdk(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); cmdkActiveIndex = Math.max(0, cmdkActiveIndex - 1); renderCmdk(); return; }
        if (e.key === 'Enter') { e.preventDefault(); runCmdk(cmdkActiveIndex); return; }
      });
    }

    const overlay = $('cmdk-overlay');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCmdk(); });
  }

  // ----------------------------------------------------------
  // Global shortcuts
  // ----------------------------------------------------------
  let gKeyAt = 0;

  function initShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ⌘K / Ctrl+K opens palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const overlay = $('cmdk-overlay');
        if (!overlay) return;
        if (overlay.hidden) openCmdk(); else closeCmdk();
        return;
      }
      // Esc closes menu/palette
      if (e.key === 'Escape') {
        closeThemeMenu();
        const overlay = $('cmdk-overlay');
        if (overlay && !overlay.hidden) closeCmdk();
        return;
      }
      // Skip when typing in input fields
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      // g + {p|s|t|u|c|e|v|i|a|r} navigation
      if (e.key.toLowerCase() === 'g') { gKeyAt = Date.now(); return; }
      if (gKeyAt && Date.now() - gKeyAt < 1000) {
        const k = e.key.toLowerCase();
        if (k === 'p') { clickById('tab-protection'); gKeyAt = 0; return; }
        if (k === 's') { clickById('tab-sites'); gKeyAt = 0; return; }
        if (k === 't') { clickById('tab-topology'); gKeyAt = 0; return; }
        if (k === 'u') { clickById('tab-ueba'); gKeyAt = 0; return; }
        if (k === 'c') { clickById('tab-cases'); gKeyAt = 0; return; }
        if (k === 'e') { clickById('tab-endpoints'); gKeyAt = 0; return; }
        if (k === 'v') { clickById('tab-vulnerabilities'); gKeyAt = 0; return; }
        if (k === 'i') { clickById('tab-ai-connect'); gKeyAt = 0; return; }
        if (k === 'a') { clickById('tab-apps'); gKeyAt = 0; return; }
        if (k === 'r') { clickById('tab-records'); gKeyAt = 0; return; }
        gKeyAt = 0;
      }
      // [ toggles sidebar
      if (e.key === '[') { clickById('sidebar-toggle-btn'); return; }
    });
  }

  // ----------------------------------------------------------
  // Dashboard Interactions (Image 1 & 2 styles)
  // ----------------------------------------------------------
  function initDashboardInteractions() {
    // Time filter pills
    qsa('.time-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('.time-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        showToast('info', '조회 기간 변경', `${btn.textContent.trim()} 실측 메트릭스로 필터링되었습니다.`);
      });
    });

    // View mode pills
    qsa('.view-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('.view-mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        showToast('info', '보기 모드', `${btn.textContent.trim()} 모드가 적용되었습니다.`);
      });
    });

    // Sub nav buttons (Endpoints view)
    qsa('.sub-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('.sub-nav-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Tree nodes collapse/expand
    qsa('.tree-node-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentNode = item.closest('.tree-node');
        if (parentNode) {
          parentNode.classList.toggle('open');
          const toggle = parentNode.querySelector('.tree-toggle');
          if (toggle) {
            toggle.textContent = parentNode.classList.contains('open') ? '▼' : '▶';
          }
        }
      });
    });

    // Tree controls (+ / -)
    qsa('.tree-ctrl-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const expand = btn.textContent.trim() === '+';
        qsa('.tree-node').forEach((node) => {
          if (expand) node.classList.add('open');
          else node.classList.remove('open');
          const toggle = node.querySelector('.tree-toggle');
          if (toggle) toggle.textContent = expand ? '▼' : '▶';
        });
      });
    });

    // Export button
    const exportBtn = $('btn-export-metrics');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const csvContent = 'data:text/csv;charset=utf-8,'
          + encodeURIComponent('구분,사이트/호스트,대역폭,Rx,Tx,사용률\n'
          + 'WAN_Primary_Default,내 PC (관리자 엔드포인트),1000 Mb/s,14.2 Kbps,8.4 Kbps,24%\n'
          + 'ZTNA_Tunnel_Gateway,HQ_Primary_Gateway,1000 Mb/s,0 bps,0 bps,0.0%\n'
          + 'Regional_Branch_WAN,Branch_Node_Gateway,1000 Mb/s,0 bps,0 bps,0.0%\n'
          + 'Cloud_VPC_Transit,Cloud_Transit_Gateway,1000 Mb/s,0 bps,0 bps,0.0%\n');
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', `lumos_metrics_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('success', '내보내기 완료', '네트워크 및 단말 리소스 지표가 CSV로 다운로드되었습니다.');
      });
    }

    // Dashboard balancing: move layout-switcher card to right slot to balance 2-column layout
    function balanceDashboard() {
      const switcherCard = document.querySelector('#student-status .aleph-layout-switcher-card');
      const targetSlot = $('dashboard-metrics-slot');
      if (switcherCard && targetSlot) {
        targetSlot.innerHTML = '';
        targetSlot.appendChild(switcherCard);
      }
    }

    balanceDashboard();
    const studentStatusSlot = $('student-status');
    if (studentStatusSlot && window.MutationObserver) {
      const obs = new MutationObserver(() => {
        balanceDashboard();
      });
      obs.observe(studentStatusSlot, { childList: true, subtree: true });
    }
  }

  // ----------------------------------------------------------
  // Success Banner Auto-Dismiss
  // ----------------------------------------------------------
  function initSuccessBanner() {
    const banner = $('banner-success');
    if (!banner) return;

    let dismissTimer = null;
    function scheduleDismiss() {
      if (dismissTimer) clearTimeout(dismissTimer);
      banner.classList.remove('dismissed');
      banner.style.display = 'flex';
      dismissTimer = setTimeout(() => {
        banner.classList.add('dismissed');
        setTimeout(() => { banner.style.display = 'none'; }, 400);
      }, 5000);
    }

    scheduleDismiss();

    const closeBtn = $('banner-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (dismissTimer) clearTimeout(dismissTimer);
        banner.classList.add('dismissed');
        setTimeout(() => { banner.style.display = 'none'; }, 400);
      });
    }

    const refreshBtn = $('refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        scheduleDismiss();
      });
    }
  }

  // ----------------------------------------------------------
  // Module: Enterprise SOC Threat Center (Image 4 Style)
  // ----------------------------------------------------------
  function renderTimeSeriesChart() {
    const container = $('soc-trend-chart');
    if (!container) return;

    const timeLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const normalPoints = [2, 1, 0, 1, 3, 2, 4, 3, 2, 1, 2, 1];
    const threatPoints = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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

  function renderSeverityDonut() {
    const container = $('soc-donut-chart');
    if (!container) return;

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

  // ----------------------------------------------------------
  // [Phase 2] Cloud Gateway & 회선 트래픽 실시간 관제 대시보드
  // ----------------------------------------------------------
  const TRAFFIC_METRICS_DATA = {
    '1h': [
      { name: 'HQ_Work_WAN', label: 'HQ Primary WAN (Work)', ratio: 0.324, val: '180 MB', speed: '142.5 Mbps' },
      { name: 'HQ_Internet_WAN', label: 'HQ Internet WAN', ratio: 0.142, val: '82 MB', speed: '48.2 Mbps' },
      { name: 'Branch_Alpha_WAN', label: 'Branch Alpha WAN', ratio: 0.081, val: '45 MB', speed: '28.3 Mbps' },
      { name: 'Branch_Beta_WAN', label: 'Branch Beta WAN', ratio: 0.032, val: '18 MB', speed: '12.0 Mbps' },
      { name: 'Cloud_AWS_Transit', label: 'Cloud AWS Transit VPC', ratio: 0.240, val: '1.2 GB', speed: '850.1 Mbps' }
    ],
    '8h': [
      { name: 'HQ_Work_WAN', label: 'HQ Primary WAN (Work)', ratio: 0.228, val: '1.42 GB', speed: '142.5 Mbps' },
      { name: 'HQ_Internet_WAN', label: 'HQ Internet WAN', ratio: 0.079, val: '490 MB', speed: '48.2 Mbps' },
      { name: 'Branch_Alpha_WAN', label: 'Branch Alpha WAN', ratio: 0.044, val: '280 MB', speed: '28.3 Mbps' },
      { name: 'Branch_Beta_WAN', label: 'Branch Beta WAN', ratio: 0.021, val: '120 MB', speed: '12.0 Mbps' },
      { name: 'Cloud_AWS_Transit', label: 'Cloud AWS Transit VPC', ratio: 0.126, val: '8.50 GB', speed: '850.1 Mbps' }
    ],
    '24h': [
      { name: 'HQ_Work_WAN', label: 'HQ Primary WAN (Work)', ratio: 0.285, val: '4.30 GB', speed: '150.2 Mbps' },
      { name: 'HQ_Internet_WAN', label: 'HQ Internet WAN', ratio: 0.105, val: '1.60 GB', speed: '52.0 Mbps' },
      { name: 'Branch_Alpha_WAN', label: 'Branch Alpha WAN', ratio: 0.052, val: '840 MB', speed: '32.1 Mbps' },
      { name: 'Branch_Beta_WAN', label: 'Branch Beta WAN', ratio: 0.028, val: '410 MB', speed: '14.5 Mbps' },
      { name: 'Cloud_AWS_Transit', label: 'Cloud AWS Transit VPC', ratio: 0.184, val: '27.6 GB', speed: '920.0 Mbps' }
    ],
    '7d': [
      { name: 'HQ_Work_WAN', label: 'HQ Primary WAN (Work)', ratio: 0.312, val: '32.5 GB', speed: '160.0 Mbps' },
      { name: 'HQ_Internet_WAN', label: 'HQ Internet WAN', ratio: 0.118, val: '12.4 GB', speed: '55.0 Mbps' },
      { name: 'Branch_Alpha_WAN', label: 'Branch Alpha WAN', ratio: 0.060, val: '6.20 GB', speed: '35.0 Mbps' },
      { name: 'Branch_Beta_WAN', label: 'Branch Beta WAN', ratio: 0.035, val: '3.10 GB', speed: '16.0 Mbps' },
      { name: 'Cloud_AWS_Transit', label: 'Cloud AWS Transit VPC', ratio: 0.221, val: '198.4 GB', speed: '950.0 Mbps' }
    ]
  };

  let currentTrafficRange = '8h';

  function renderTrafficBarChart(range = '8h') {
    const container = $('traffic-bar-chart');
    if (!container) return;
    currentTrafficRange = range;
    const items = TRAFFIC_METRICS_DATA[range] || TRAFFIC_METRICS_DATA['8h'];

    let itemsHtml = items.map(item => {
      const pct = (item.ratio * 100).toFixed(1);
      return `
        <div class="traffic-bar-row" data-site="${item.name}" tabindex="0" role="button" aria-label="${item.label} 트래픽 ${pct}%">
          <div class="traffic-bar-label-col">
            <span class="traffic-site-name">${item.name}</span>
            <span class="traffic-site-desc">${item.label}</span>
          </div>
          <div class="traffic-bar-track-col">
            <div class="traffic-bar-track">
              <div class="traffic-bar-fill" style="width: ${pct}%;"></div>
            </div>
            <div class="traffic-bar-meta">
              <span class="traffic-bar-pct mono">${pct}%</span>
              <span class="traffic-bar-val mono">${item.val} · ${item.speed}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const ticksHtml = ticks.map(t => `<span class="chart-axis-tick">${t}</span>`).join('');

    container.innerHTML = `
      <div class="traffic-chart-inner">
        <div class="traffic-bars-list">
          ${itemsHtml}
        </div>
        <div class="traffic-chart-axis">
          <div class="chart-axis-line"></div>
          <div class="chart-axis-ticks">
            ${ticksHtml}
          </div>
        </div>
      </div>
    `;

    // 막대 클릭 이벤트 연동
    container.querySelectorAll('.traffic-bar-row').forEach(row => {
      row.addEventListener('click', () => {
        const site = row.getAttribute('data-site');
        container.querySelectorAll('.traffic-bar-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const filterSelect = $('filter-site-select');
        if (filterSelect) {
          for (let opt of filterSelect.options) {
            if (opt.text.includes(site) || opt.value.includes(site.toLowerCase())) {
              filterSelect.value = opt.value;
              break;
            }
          }
        }
        showToast('info', '회선 트래픽 상세 포커스', `${site} 게이트웨이 트래픽으로 뷰가 전환되었습니다.`);
      });
    });
  }

  function initCsvExport() {
    const btn = $('btn-export-metrics');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const rows = [
        ['구독 인터페이스', '사이트/호스트', '대역폭', 'Rx', 'Tx', '최대 사용률(%)'],
        ['HQ_Primary_WAN_Default', 'HQ_Main_Gateway', '1000 Mb/s', '142.5 Mbps', '86.2 Mbps', '22.8%'],
        ['HQ_Internet_WAN_Default', 'HQ_Internet_Node', '1000 Mb/s', '48.2 Mbps', '31.4 Mbps', '7.9%'],
        ['Branch_Alpha_WAN_Default', 'Branch_Alpha_Node', '1000 Mb/s', '28.3 Mbps', '15.7 Mbps', '4.4%'],
        ['Cloud_AWS_Transit_Default', 'Cloud_AWS_Seoul_VPC', '10000 Mb/s', '850.1 Mbps', '412.0 Mbps', '12.6%']
      ];
      const csvContent = '\uFEFF' + rows.map(e => e.map(f => `"${f}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `Lumos_CloudWAN_Subscription_Usage_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'CSV 내보내기 완료', '구독 최신 사용률 보고서(CSV)가 성공적으로 저장되었습니다.');
    });
  }

  function initDashboardInteractions() {
    // 1. 시간 필터 버튼 (1h, 8h, 24h, 7d)
    document.querySelectorAll('.time-range-group .time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-range-group .time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.getAttribute('data-time') || '8h';
        renderTrafficBarChart(range);
        showToast('info', '조회 기간 변경', `트래픽 집계 기간이 [${range}] 기준으로 갱신되었습니다.`);
      });
    });

    // 2. 보기 모드 버튼
    document.querySelectorAll('.view-mode-group .view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-mode-group .view-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showToast('info', '보기 모드 전환', `[${btn.textContent.trim()}] 관제 모드로 전환되었습니다.`);
      });
    });

    // 3. 트래픽 바 차트 초기 렌더링
    renderTrafficBarChart('8h');

    // 4. CSV 내보내기 초기화
    initCsvExport();
  }

  // ----------------------------------------------------------
  // [Phase 3] 조직도 계층 트리 & IAM / 단말 인벤토리 데이터 그리드
  // ----------------------------------------------------------
  const IAM_USERS_DATA = [
    { id: 'USR-HQ-SEC-01', name: '김민준 수석연구원 · 침해대응팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'MacBook Pro (00:1A:2B:3C:4D:5E)', status: 'ACTIVE' },
    { id: 'USR-HQ-SEC-02', name: '이지은 책임엔지니어 · ZTNA보안팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'ThinkPad X1 (A4:83:E7:12:44:90)', status: 'ACTIVE' },
    { id: 'USR-HQ-OPS-03', name: '박성호 팀장 · 시스템인프라팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'Dell Latitude (F8:1E:DF:56:88:12)', status: 'ACTIVE' },
    { id: 'USR-HQ-OPS-04', name: '정다은 수석매니저 · 컴플라이언스팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'MacBook Air (3C:22:FB:99:A1:02)', status: 'ACTIVE' },
    { id: 'USR-HQ-DEV-05', name: '최우진 전임연구원 · 코어플랫폼개발팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'ThinkPad P1 (08:00:27:11:AE:9F)', status: 'ACTIVE' },
    { id: 'USR-HQ-DEV-06', name: '한예린 선임연구원 · 방화벽인프라개발팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'MacBook Pro (70:F1:A1:88:99:00)', status: 'ACTIVE' },
    { id: 'USR-HQ-OPS-07', name: '오현석 수석연구원 · 네트워크운영팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'Dell Precision (B4:96:91:33:45:67)', status: 'ACTIVE' },
    { id: 'USR-HQ-SEC-08', name: '서유진 팀장 · 위협분석센터', org: 'hq', orgLabel: '본사 HQ Campus', device: 'ThinkPad X1 (C2:44:11:88:77:22)', status: 'ACTIVE' },
    { id: 'USR-HQ-NET-09', name: '배준우 엔지니어 · SDN게이트웨이팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'HP EliteBook (54:EE:75:22:33:44)', status: 'ACTIVE' },
    { id: 'USR-HQ-AUD-10', name: '송지호 책임연구원 · 정보보호감사팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'MacBook Pro (A8:66:7F:44:11:09)', status: 'ACTIVE' },
    { id: 'USR-HQ-DEV-11', name: '임채원 선임연구원 · 인증정책개발팀', org: 'hq', orgLabel: '본사 HQ Campus', device: 'Dell XPS 15 (00:E0:4C:68:01:23)', status: 'ACTIVE' },
    { id: 'USR-HQ-OPS-12', name: '문태경 수석엔지니어 · 24/7관제상황실', org: 'hq', orgLabel: '본사 HQ Campus', device: 'ThinkStation (D8:5E:D3:99:88:77)', status: 'ACTIVE' },
    { id: 'USR-BR-OPS-01', name: '강태양 팀장 · 지사네트워크운영팀', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'ThinkPad T14 (30:24:A9:11:22:33)', status: 'ACTIVE' },
    { id: 'USR-BR-SEC-02', name: '윤서아 수석연구원 · 지사정보보안팀', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'MacBook Pro (88:66:5A:CC:DD:EE)', status: 'ACTIVE' },
    { id: 'USR-BR-NET-03', name: '신도현 전임엔지니어 · WAN회선관리팀', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'Dell Latitude (44:85:00:AA:BB:CC)', status: 'ACTIVE' },
    { id: 'USR-BR-OPS-04', name: '노하은 선임매니저 · 단말자산운영팀', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'HP ProBook (60:45:BD:EE:FF:11)', status: 'ACTIVE' },
    { id: 'USR-BR-SEC-05', name: '권승우 연구원 · 엔드포인트방호팀', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'ThinkPad L15 (18:56:80:44:55:66)', status: 'ACTIVE' },
    { id: 'USR-BR-OPS-06', name: '안소미 매니저 · 사이트지원팀', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'MacBook Air (AC:BC:32:77:88:99)', status: 'ACTIVE' },
    { id: 'USR-BR-NET-07', name: '유승민 엔지니어 · 무선AP/CPE관제', org: 'branch', orgLabel: '지역 거점 지사 Alpha', device: 'Dell Precision (90:2B:34:12:34:56)', status: 'ACTIVE' },
    { id: 'USR-CL-ARCH-01', name: '조현우 수석아키텍트 · 클라우드인프라팀', org: 'cloud', orgLabel: '클라우드 SecOps', device: 'MacBook Pro (F0:18:98:AA:BB:CC)', status: 'ACTIVE' },
    { id: 'USR-CL-SEC-02', name: '황보경 책임엔지니어 · VPC보안아키텍처', org: 'cloud', orgLabel: '클라우드 SecOps', device: 'ThinkPad X1 (E4:54:E8:01:02:03)', status: 'ACTIVE' },
    { id: 'USR-CL-OPS-03', name: '남궁진 전임연구원 · 트랜짓게이트웨이관제', org: 'cloud', orgLabel: '클라우드 SecOps', device: 'Dell XPS (78:4F:43:99:00:11)', status: 'ACTIVE' }
  ];

  let currentIamOrg = 'all';

  function renderIamTable(filterOrg = 'all', searchQuery = '', filterStatus = 'all') {
    const tbody = $('iam-table-tbody');
    if (!tbody) return;
    currentIamOrg = filterOrg;

    const orgNames = {
      all: '전체 사용자',
      hq: '본사 HQ Campus',
      branch: '지역 거점 지사 Alpha',
      cloud: '클라우드 SecOps'
    };

    let filtered = IAM_USERS_DATA.filter(item => {
      const matchOrg = (filterOrg === 'all' || item.org === filterOrg);
      const q = (searchQuery || '').toLowerCase().trim();
      const matchQuery = !q || (
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.orgLabel.toLowerCase().includes(q) ||
        item.device.toLowerCase().includes(q)
      );
      const matchStatus = (filterStatus === 'all' || item.status === filterStatus);
      return matchOrg && matchQuery && matchStatus;
    });

    const titleEl = $('iam-org-title');
    if (titleEl) titleEl.textContent = orgNames[filterOrg] || '사용자 목록';
    const countEl = $('iam-user-count');
    if (countEl) countEl.textContent = `${filtered.length}명`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:30px; color:var(--fg-tertiary);">
            조건에 일치하는 사용자 또는 단말 인벤토리가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(user => `
      <tr class="iam-user-row" data-id="${user.id}">
        <td><span class="cell-tag mono">${user.id}</span></td>
        <td><strong class="user-name">${user.name}</strong></td>
        <td><span class="user-org-badge">${user.orgLabel}</span></td>
        <td><span class="mono user-device">${user.device}</span></td>
        <td><span class="status-pill allow">${user.status}</span></td>
      </tr>
    `).join('');

    // 행 클릭 시 토스트 상세 안내
    tbody.querySelectorAll('.iam-user-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        const user = IAM_USERS_DATA.find(u => u.id === id);
        if (user) {
          showToast('info', `사용자 상세 (${user.id})`, `${user.name} / ${user.device} (정상 인가 단말)`);
        }
      });
    });
  }

  function initIamTreeAndGrid() {
    // 1. 조직도 트리 노드 클릭 필터링
    document.querySelectorAll('.tree-panel .tree-node-item[data-org]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tree-panel .tree-node-item').forEach(n => n.classList.remove('active'));
        node.classList.add('active');
        const org = node.getAttribute('data-org') || 'all';
        const select = $('iam-org-select');
        if (select) select.value = org;
        const q = $('iam-search-input')?.value || '';
        const st = $('iam-status-select')?.value || 'all';
        renderIamTable(org, q, st);
      });
    });

    // 2. 트리 펼치기/접기 버튼
    const expandBtn = $('tree-expand-all');
    const collapseBtn = $('tree-collapse-all');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        document.querySelectorAll('.tree-panel .tree-node').forEach(n => n.classList.add('open'));
        showToast('info', '조직도 펼침', '모든 하위 부서 노드가 펼쳐졌습니다.');
      });
    }
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        document.querySelectorAll('.tree-panel .tree-node').forEach(n => n.classList.toggle('open'));
      });
    }

    // 3. 조직 선택 셀렉트 체인지
    const orgSelect = $('iam-org-select');
    if (orgSelect) {
      orgSelect.addEventListener('change', () => {
        const org = orgSelect.value;
        document.querySelectorAll('.tree-panel .tree-node-item').forEach(n => {
          if (n.getAttribute('data-org') === org) n.classList.add('active');
          else n.classList.remove('active');
        });
        const q = $('iam-search-input')?.value || '';
        const st = $('iam-status-select')?.value || 'all';
        renderIamTable(org, q, st);
      });
    }

    // 4. 실시간 검색 인풋
    const searchInput = $('iam-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value;
        const org = $('iam-org-select')?.value || 'all';
        const st = $('iam-status-select')?.value || 'all';
        renderIamTable(org, q, st);
      });
    }

    // 5. 상태 필터 셀렉트
    const statusSelect = $('iam-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        const st = statusSelect.value;
        const org = $('iam-org-select')?.value || 'all';
        const q = $('iam-search-input')?.value || '';
        renderIamTable(org, q, st);
      });
    }

    // 6. 검색 버튼
    const searchBtn = $('iam-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const q = $('iam-search-input')?.value || '';
        const org = $('iam-org-select')?.value || 'all';
        const st = $('iam-status-select')?.value || 'all';
        renderIamTable(org, q, st);
        showToast('info', '인벤토리 검색', `검색 조건에 맞는 ${$('iam-user-count')?.textContent || ''}의 단말·계정이 조회되었습니다.`);
      });
    }

    // 7. 새로고침 버튼
    const refreshBtn = $('iam-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        renderIamTable(currentIamOrg);
        showToast('success', '조직·IAM 동기화', '조직도 및 사이트 단말 인벤토리가 최신 상태로 재동기화되었습니다.');
      });
    }

    // 8. 사용자 추가 버튼
    const addUserBtn = $('iam-add-user-btn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        showToast('info', '사이트 사용자 추가', '신규 인가 단말 등록 및 계정 발급 마법사가 호출되었습니다.');
      });
    }

    // 9. 서브탭 전환 ([관리자 단말] vs [사이트별 사용자])
    document.querySelectorAll('.endpoints-sub-nav .sub-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.endpoints-sub-nav .sub-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sub = btn.getAttribute('data-sub');
        const siteUsersPanel = $('panel-site-users');
        const adminPanel = $('panel-admin');
        if (sub === 'site-users') {
          if (siteUsersPanel) siteUsersPanel.hidden = false;
          if (adminPanel) adminPanel.hidden = true;
          renderIamTable(currentIamOrg);
        } else {
          if (siteUsersPanel) siteUsersPanel.hidden = true;
          if (adminPanel) adminPanel.hidden = false;
        }
      });
    });

    // 테이블 초기 렌더링
    renderIamTable('all');
  }

  // ----------------------------------------------------------
  // [Phase 4] pfSense 스타일 실시간 방화벽/ZTNA 패킷 로그 수집·분석기
  // ----------------------------------------------------------
  const PFSENSE_SAMPLE_PACKETS = [
    { action: 'PASS', time: '11:52:14.301', iface: 'ZTNA_VPN', src: '10.200.0.12:54812', dst: '10.0.1.50:443', proto: 'TCP', rule: 'ZTNA-App-Allow', info: 'TLSv1.3 Handshake OK' },
    { action: 'BLOCK', time: '11:52:12.894', iface: 'WAN', src: '198.51.100.44:39102', dst: '172.16.0.1:445', proto: 'TCP', rule: 'PortScan-Drop', info: 'SMB Port probe blocked' },
    { action: 'PASS', time: '11:52:10.155', iface: 'LAN', src: '192.168.1.105:61200', dst: '1.1.1.1:53', proto: 'UDP', rule: 'DNS-Query-Pass', info: 'DNS standard query' },
    { action: 'PASS', time: '11:52:08.410', iface: 'Cloud_VPC', src: '10.100.2.14:48110', dst: '10.0.2.80:8080', proto: 'TCP', rule: 'VPC-Transit-Allow', info: 'Internal Microservice sync' },
    { action: 'BLOCK', time: '11:52:05.902', iface: 'WAN', src: '203.0.113.89:51234', dst: '172.16.0.1:3389', proto: 'TCP', rule: 'Default-Deny-All', info: 'RDP scan unauthorized' },
    { action: 'PASS', time: '11:52:03.210', iface: 'ZTNA_VPN', src: '10.200.0.18:59102', dst: '10.0.1.20:443', proto: 'TCP', rule: 'ZTNA-App-Allow', info: 'ERP Secure Web Session' },
    { action: 'BLOCK', time: '11:51:59.780', iface: 'WAN', src: '192.0.2.155:41002', dst: '172.16.0.1:23', proto: 'TCP', rule: 'Default-Deny-All', info: 'Telnet probe dropped' },
    { action: 'PASS', time: '11:51:57.114', iface: 'LAN', src: '192.168.1.105:52310', dst: '8.8.8.8:53', proto: 'UDP', rule: 'DNS-Query-Pass', info: 'DNS resolve domain' },
    { action: 'PASS', time: '11:51:54.600', iface: 'ZTNA_VPN', src: '10.200.0.25:49811', dst: '10.0.1.99:22', proto: 'TCP', rule: 'ZTNA-App-Allow', info: 'SSH Bastion auth session' },
    { action: 'BLOCK', time: '11:51:50.320', iface: 'WAN', src: '198.51.100.77:60123', dst: '172.16.0.1:80', proto: 'TCP', rule: 'GeoIP-Restricted', info: 'Untrusted region access drop' }
  ];

  let pfsensePackets = [...PFSENSE_SAMPLE_PACKETS];
  let isPfsenseLive = true;
  let pfsenseTimer = null;
  let currentActionFilter = 'all';
  let currentIfaceFilter = 'all';

  function renderPfsenseTable(filterAction = 'all', filterIface = 'all', searchQuery = '') {
    const tbody = $('pfsense-log-tbody');
    if (!tbody) return;
    currentActionFilter = filterAction;
    currentIfaceFilter = filterIface;

    const filtered = pfsensePackets.filter(pkt => {
      const matchAction = (filterAction === 'all' || pkt.action === filterAction);
      const matchIface = (filterIface === 'all' || pkt.iface === filterIface);
      const q = (searchQuery || '').toLowerCase().trim();
      const matchQuery = !q || (
        pkt.src.toLowerCase().includes(q) ||
        pkt.dst.toLowerCase().includes(q) ||
        pkt.proto.toLowerCase().includes(q) ||
        pkt.rule.toLowerCase().includes(q) ||
        pkt.info.toLowerCase().includes(q)
      );
      return matchAction && matchIface && matchQuery;
    });

    const bufferCountEl = $('pfsense-buffer-count');
    if (bufferCountEl) bufferCountEl.textContent = `최근 ${pfsensePackets.length}개 패킷 보관 (조회 ${filtered.length}건)`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:var(--fg-tertiary);">
            필터 조건과 일치하는 방화벽 패킷 로그가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(pkt => {
      const isPass = pkt.action === 'PASS';
      const actionBadge = isPass
        ? `<span class="pfsense-badge pass"><svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="3 8.5 6.5 12 13 4.5"/></svg> PASS</span>`
        : `<span class="pfsense-badge block"><svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg> BLOCK</span>`;

      return `
        <tr class="pfsense-row ${isPass ? 'row-pass' : 'row-block'}" data-rule="${pkt.rule}">
          <td>${actionBadge}</td>
          <td><span class="mono pfsense-time">${pkt.time}</span></td>
          <td><span class="pfsense-iface-tag mono">${pkt.iface}</span></td>
          <td><span class="mono pfsense-ip">${pkt.src}</span></td>
          <td><span class="mono pfsense-ip">${pkt.dst}</span></td>
          <td><span class="mono pfsense-proto">${pkt.proto}</span></td>
          <td>
            <div class="pfsense-rule-cell">
              <span class="pfsense-rule-name mono">${pkt.rule}</span>
              <span class="pfsense-rule-info">${pkt.info}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 행 클릭 시 상세 토스트 안내
    tbody.querySelectorAll('.pfsense-row').forEach((row, idx) => {
      row.addEventListener('click', () => {
        const pkt = filtered[idx];
        if (pkt) {
          showToast('info', `[pfSense Packet] ${pkt.action} - ${pkt.rule}`, `${pkt.src} ➔ ${pkt.dst} (${pkt.proto}) | ${pkt.info}`);
        }
      });
    });
  }

  function addSimulatedPacket() {
    if (!isPfsenseLive) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds())).padStart(3, '0')}`;
    
    const isThreat = Math.random() < 0.25;
    const ifaces = ['WAN', 'ZTNA_VPN', 'LAN', 'Cloud_VPC'];
    const protos = ['TCP', 'UDP', 'HTTPS'];
    const randomIface = isThreat ? 'WAN' : ifaces[Math.floor(Math.random() * ifaces.length)];
    const randomProto = protos[Math.floor(Math.random() * protos.length)];

    const threatRules = [
      { rule: 'PortScan-Drop', info: 'Unauthorized probe dropped', dst: '172.16.0.1:445' },
      { rule: 'Default-Deny-All', info: 'External unknown inbound drop', dst: '172.16.0.1:22' },
      { rule: 'GeoIP-Restricted', info: 'Untrusted foreign AS path drop', dst: '172.16.0.1:8080' }
    ];
    const passRules = [
      { rule: 'ZTNA-App-Allow', info: 'Mutual TLS verified session', dst: '10.0.1.50:443' },
      { rule: 'DNS-Query-Pass', info: 'Secure recursive DNS query', dst: '1.1.1.1:53' },
      { rule: 'VPC-Transit-Allow', info: 'AWS DirectConnect sync traffic', dst: '10.0.2.80:8443' }
    ];

    const pick = isThreat ? threatRules[Math.floor(Math.random() * threatRules.length)] : passRules[Math.floor(Math.random() * passRules.length)];
    const randomSrc = isThreat 
      ? `198.51.100.${Math.floor(Math.random() * 200 + 10)}:${Math.floor(Math.random() * 40000 + 10000)}`
      : `10.200.0.${Math.floor(Math.random() * 50 + 10)}:${Math.floor(Math.random() * 40000 + 10000)}`;

    const newPkt = {
      action: isThreat ? 'BLOCK' : 'PASS',
      time: timeStr,
      iface: randomIface,
      src: randomSrc,
      dst: pick.dst,
      proto: randomProto,
      rule: pick.rule,
      info: pick.info
    };

    pfsensePackets.unshift(newPkt);
    if (pfsensePackets.length > 50) pfsensePackets.pop();

    const totalEl = $('pfsense-total-pkts');
    if (totalEl) {
      const cur = parseInt(totalEl.textContent.replace(/,/g, ''), 10) || 24518;
      totalEl.textContent = (cur + 1).toLocaleString();
    }
    if (isThreat) {
      const blockEl = $('pfsense-block-pkts');
      if (blockEl) {
        const curB = parseInt(blockEl.textContent.replace(/,/g, ''), 10) || 328;
        blockEl.textContent = (curB + 1).toLocaleString();
      }
    } else {
      const passEl = $('pfsense-pass-pkts');
      if (passEl) {
        const curP = parseInt(passEl.textContent.replace(/,/g, ''), 10) || 24190;
        passEl.textContent = (curP + 1).toLocaleString();
      }
    }

    const q = $('pfsense-search-input')?.value || '';
    renderPfsenseTable(currentActionFilter, currentIfaceFilter, q);
  }

  function initPfsenseConsole() {
    // 1. Action 필터 버튼 (ALL, PASS, BLOCK)
    document.querySelectorAll('.pfsense-action-filter-group .pfsense-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pfsense-action-filter-group .pfsense-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const action = btn.getAttribute('data-action') || 'all';
        const iface = $('pfsense-iface-select')?.value || 'all';
        const q = $('pfsense-search-input')?.value || '';
        renderPfsenseTable(action, iface, q);
      });
    });

    // 2. 인터페이스 필터 셀렉트
    const ifaceSelect = $('pfsense-iface-select');
    if (ifaceSelect) {
      ifaceSelect.addEventListener('change', () => {
        const iface = ifaceSelect.value;
        const action = currentActionFilter;
        const q = $('pfsense-search-input')?.value || '';
        renderPfsenseTable(action, iface, q);
      });
    }

    // 3. 실시간 검색 인풋
    const searchInput = $('pfsense-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value;
        renderPfsenseTable(currentActionFilter, currentIfaceFilter, q);
      });
    }

    // 4. 실시간 수신 일시정지 / 재개 토글
    const liveToggle = $('pfsense-live-toggle');
    const liveStatusText = $('pfsense-live-status-text');
    if (liveToggle) {
      liveToggle.addEventListener('click', () => {
        isPfsenseLive = !isPfsenseLive;
        if (isPfsenseLive) {
          liveToggle.classList.remove('paused');
          if (liveStatusText) liveStatusText.textContent = '일시정지';
          showToast('info', 'pfSense 실시간 수신 재개', '방화벽 패킷 실시간 캡처 스트림이 재개되었습니다.');
        } else {
          liveToggle.classList.add('paused');
          if (liveStatusText) liveStatusText.textContent = '실시간 수신';
          showToast('warning', 'pfSense 캡처 일시정지', '패킷 캡처가 일시 정지되어 정밀 분석 모드로 전환되었습니다.');
        }
      });
    }

    // 5. CSV 내보내기
    const exportBtn = $('pfsense-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const rows = [
          ['Action', 'Time', 'Interface', 'Source', 'Destination', 'Protocol', 'Rule', 'Info'],
          ...pfsensePackets.map(p => [p.action, p.time, p.iface, p.src, p.dst, p.proto, p.rule, p.info])
        ];
        const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Lumos_pfSense_Firewall_Packets_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('success', 'CSV 내보내기 완료', 'pfSense 패킷 로그 CSV 파일이 저장되었습니다.');
      });
    }

    // 6. Syslog 원문 복사
    const copyRawBtn = $('pfsense-copy-raw-btn');
    if (copyRawBtn) {
      copyRawBtn.addEventListener('click', () => {
        const syslogLines = pfsensePackets.slice(0, 10).map(p => 
          `<134>1 2026-10-28T${p.time}Z lumos-fw filterlog - - [action="${p.action}" iface="${p.iface}" proto="${p.proto}" src="${p.src}" dst="${p.dst}" rule="${p.rule}"] ${p.info}`
        ).join('\n');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(syslogLines).then(() => {
            showToast('success', 'Syslog 복사 완료', '최신 10건의 RFC 5424 표준 방화벽 Syslog가 클립보드에 복사되었습니다.');
          }).catch(() => {
            showToast('info', 'Syslog 준비', '표준 방화벽 Syslog가 포맷팅되었습니다.');
          });
        } else {
          showToast('info', 'Syslog 준비', '표준 방화벽 Syslog가 포맷팅되었습니다.');
        }
      });
    }

    // 초기 테이블 렌더링
    renderPfsenseTable('all');

    // 실시간 패킷 시뮬레이션 인터벌 (3.5초마다 1개)
    if (!pfsenseTimer) {
      pfsenseTimer = setInterval(addSimulatedPacket, 3500);
    }
  }

  function initScoreCounter() {
    const scoreValEl = $('soc-score-val');
    if (!scoreValEl) return;
    scoreValEl.textContent = '100';
  }

  function initSocDashboard() {
    renderTimeSeriesChart();
    renderSeverityDonut();
    initScoreCounter();

    const refreshBtn = $('soc-refresh-btn');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = 'true';
      refreshBtn.addEventListener('click', () => {
        if (window.LumosSoc && typeof window.LumosSoc.refreshCharts === 'function') {
          window.LumosSoc.refreshCharts();
        }
      });
    }
  }

  // ----------------------------------------------------------
  // [Image 2 Style] 보안 케이스 & 사건 현황 관제 (SIEM / SOAR)
  // ----------------------------------------------------------
  function renderCaseTrendChart() {
    const wrap = $('case-trend-chart-wrap');
    if (!wrap) return;

    const w = 560;
    const h = 130;
    const padding = { top: 15, right: 20, bottom: 25, left: 35 };

    const svg = `
      <svg viewBox="0 0 ${w} ${h}" class="cases-svg-chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="caseAreaCrit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#EF4444" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#EF4444" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="caseAreaHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="caseAreaLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#06B6D4" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${w - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
        <line x1="${padding.left}" y1="${h/2}" x2="${w - padding.right}" y2="${h/2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
        <line x1="${padding.left}" y1="${h - padding.bottom}" x2="${w - padding.right}" y2="${h - padding.bottom}" stroke="rgba(255,255,255,0.1)"/>

        <!-- Y Axis Labels -->
        <text x="${padding.left - 8}" y="${padding.top + 4}" fill="var(--fg-tertiary)" font-size="9" text-anchor="end" font-family="monospace">1.0</text>
        <text x="${padding.left - 8}" y="${h/2 + 3}" fill="var(--fg-tertiary)" font-size="9" text-anchor="end" font-family="monospace">0.5</text>
        <text x="${padding.left - 8}" y="${h - padding.bottom}" fill="var(--fg-tertiary)" font-size="9" text-anchor="end" font-family="monospace">0.0</text>

        <!-- X Axis Dates -->
        <text x="50" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-22</text>
        <text x="130" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-23</text>
        <text x="210" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-24</text>
        <text x="290" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-25</text>
        <text x="370" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-26</text>
        <text x="450" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-27</text>
        <text x="530" y="${h - 8}" fill="var(--fg-tertiary)" font-size="9" text-anchor="middle" font-family="monospace">10-28</text>

        <!-- Area & Lines -->
        <polygon points="50,105 130,105 210,103 290,105 370,105 450,105 530,105 530,105 50,105" fill="url(#caseAreaLow)"/>
        <polyline points="50,105 130,105 210,104 290,105 370,105 450,105 530,105" fill="none" stroke="#06B6D4" stroke-width="1.8"/>
        
        <!-- Crit Line (Image 2 style: red line near 0 with spike markers) -->
        <polyline points="50,105 130,105 210,103 290,105 370,105 450,105 530,105" fill="none" stroke="#EF4444" stroke-width="1.8"/>
        <circle cx="210" cy="103" r="3.5" fill="#EF4444" stroke="#0B132B" stroke-width="1.5"/>

        <!-- Date 10-24 Tooltip Box (Image 2 replica) -->
        <g transform="translate(160, 20)">
          <rect width="105" height="66" rx="4" fill="rgba(11,20,36,0.92)" stroke="rgba(255,255,255,0.15)"/>
          <text x="8" y="14" fill="#E2E8F0" font-size="9" font-weight="700">Date: 10-24</text>
          <text x="8" y="26" fill="#EF4444" font-size="8.5">■ CRITICAL: 0 cases</text>
          <text x="8" y="37" fill="#F59E0B" font-size="8.5">■ HIGH: 0 cases</text>
          <text x="8" y="48" fill="#10B981" font-size="8.5">■ MEDIUM: 0 cases</text>
          <text x="8" y="59" fill="#06B6D4" font-size="8.5">■ LOW: 0 cases</text>
        </g>
      </svg>
    `;
    wrap.innerHTML = svg;
  }

  function renderCaseSeverityDonut() {
    const wrap = $('case-severity-donut-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="donut-svg-col">
        <svg viewBox="0 0 120 120" width="100" height="100">
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14"/>
          <!-- Low 85% (cyan) -->
          <circle cx="60" cy="60" r="44" fill="none" stroke="#06B6D4" stroke-width="14" stroke-dasharray="235 276" stroke-dashoffset="0"/>
          <!-- Medium 10% (green) -->
          <circle cx="60" cy="60" r="44" fill="none" stroke="#10B981" stroke-width="14" stroke-dasharray="28 276" stroke-dashoffset="-235"/>
          <!-- High 4% (orange) -->
          <circle cx="60" cy="60" r="44" fill="none" stroke="#F59E0B" stroke-width="14" stroke-dasharray="11 276" stroke-dashoffset="-263"/>
          <!-- Critical 1% (red) -->
          <circle cx="60" cy="60" r="44" fill="none" stroke="#EF4444" stroke-width="14" stroke-dasharray="4 276" stroke-dashoffset="-274"/>
          <text x="60" y="56" fill="var(--fg-tertiary)" font-size="8.5" text-anchor="middle">전체 케이스</text>
          <text x="60" y="70" fill="var(--fg)" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">19,106</text>
        </svg>
      </div>
      <div class="donut-legend-col">
        <div class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span><span class="legend-label">치명 2 (1%)</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#F59E0B;"></span><span class="legend-label">높음 768 (4%)</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span class="legend-label">보통 1,963 (10%)</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#06B6D4;"></span><span class="legend-label">낮음 16,373 (85%)</span></div>
      </div>
    `;
  }

  function renderCaseStatusDonut() {
    const wrap = $('case-status-donut-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="donut-svg-col">
        <svg viewBox="0 0 120 120" width="100" height="100">
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14"/>
          <!-- New 99.4% (blue) -->
          <circle cx="60" cy="60" r="44" fill="none" stroke="#3B82F6" stroke-width="14" stroke-dasharray="273 276" stroke-dashoffset="0"/>
          <!-- Closed 0.5% (cyan) -->
          <circle cx="60" cy="60" r="44" fill="none" stroke="#10B981" stroke-width="14" stroke-dasharray="3 276" stroke-dashoffset="-273"/>
          <text x="60" y="56" fill="var(--fg-tertiary)" font-size="8.5" text-anchor="middle">전체 케이스</text>
          <text x="60" y="70" fill="var(--fg)" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">19,105</text>
        </svg>
      </div>
      <div class="donut-legend-col">
        <div class="legend-item"><span class="legend-dot" style="background:#3B82F6;"></span><span class="legend-label">신규 19,004 (99%)</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#F59E0B;"></span><span class="legend-label">오픈 2 (0%)</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span class="legend-label">종료 99 (1%)</span></div>
      </div>
    `;
  }

  function initCasesDashboard() {
    renderCaseTrendChart();
    renderCaseSeverityDonut();
    renderCaseStatusDonut();

    const refreshBtn = $('cases-refresh-btn');
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = 'true';
      refreshBtn.addEventListener('click', () => {
        renderCaseTrendChart();
        renderCaseSeverityDonut();
        renderCaseStatusDonut();
        showToast('info', '케이스 지표 동기화', '19,106건 사건·케이스 관제 지표가 갱신되었습니다.');
      });
    }
  }

  // ----------------------------------------------------------
  // [Image 3 & 4 Style] 취약점 & 글로벌 컴플라이언스 렌더러
  // ----------------------------------------------------------
  function renderCvssBarChart() {
    const wrap = $('cvss-bar-chart-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="cvss-bars-container">
        <div class="cvss-bar-col">
          <div class="cvss-bar-track"><div class="cvss-bar-fill" style="height: 4%; background:#38BDF8;"></div></div>
          <span class="cvss-bar-count mono">12</span>
          <span class="cvss-bar-label mono">0.0-2.0</span>
        </div>
        <div class="cvss-bar-col">
          <div class="cvss-bar-track"><div class="cvss-bar-fill" style="height: 12%; background:#10B981;"></div></div>
          <span class="cvss-bar-count mono">48</span>
          <span class="cvss-bar-label mono">2.0-4.0</span>
        </div>
        <div class="cvss-bar-col">
          <div class="cvss-bar-track"><div class="cvss-bar-fill" style="height: 85%; background:#10B981;"></div></div>
          <span class="cvss-bar-count mono">1,630</span>
          <span class="cvss-bar-label mono">4.0-6.0</span>
        </div>
        <div class="cvss-bar-col">
          <div class="cvss-bar-track"><div class="cvss-bar-fill" style="height: 55%; background:#F59E0B;"></div></div>
          <span class="cvss-bar-count mono">1,120</span>
          <span class="cvss-bar-label mono">6.0-8.0</span>
        </div>
        <div class="cvss-bar-col">
          <div class="cvss-bar-track"><div class="cvss-bar-fill" style="height: 8%; background:#EF4444;"></div></div>
          <span class="cvss-bar-count mono">24</span>
          <span class="cvss-bar-label mono">8.0-10.0</span>
        </div>
      </div>
    `;
  }

  function renderVulnDonuts() {
    const sevWrap = $('vuln-severity-donut-wrap');
    if (sevWrap) {
      sevWrap.innerHTML = `
        <div class="donut-svg-col">
          <svg viewBox="0 0 100 100" width="84" height="84">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" stroke-width="12" stroke-dasharray="210 238" stroke-dashoffset="0"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" stroke-width="12" stroke-dasharray="24 238" stroke-dashoffset="-210"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#EF4444" stroke-width="12" stroke-dasharray="4 238" stroke-dashoffset="-234"/>
          </svg>
        </div>
        <div class="donut-legend-col">
          <div class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span><span class="legend-label">Critical (24)</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#F59E0B;"></span><span class="legend-label">High (1,120)</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span class="legend-label">Medium (1,630)</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#38BDF8;"></span><span class="legend-label">Low (60)</span></div>
        </div>
      `;
    }

    const assetWrap = $('vuln-asset-donut-wrap');
    if (assetWrap) {
      assetWrap.innerHTML = `
        <div class="donut-svg-col">
          <svg viewBox="0 0 100 100" width="84" height="84">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#EF4444" stroke-width="12" stroke-dasharray="230 238" stroke-dashoffset="0"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" stroke-width="12" stroke-dasharray="8 238" stroke-dashoffset="-230"/>
          </svg>
        </div>
        <div class="donut-legend-col">
          <div class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span><span class="legend-label">Vulnerable (22)</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span class="legend-label">Safe (2)</span></div>
        </div>
      `;
    }
  }

  function initVulnComplianceDashboard() {
    renderCvssBarChart();
    renderVulnDonuts();
  }

  // ----------------------------------------------------------
  // [Image 5 Style] UEBA 사용자 및 엔티티 행동 이상 징후 분석
  // ----------------------------------------------------------
  function renderUebaProfileChart() {
    const wrap = $('ueba-profile-chart-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <svg viewBox="0 0 460 120" class="ueba-svg-chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="uebaBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.02"/>
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="30" y1="20" x2="440" y2="20" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
        <line x1="30" y1="60" x2="440" y2="60" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3"/>
        <line x1="30" y1="100" x2="440" y2="100" stroke="rgba(255,255,255,0.1)"/>

        <!-- Y Axis -->
        <text x="25" y="24" fill="var(--fg-tertiary)" font-size="8.5" text-anchor="end" font-family="monospace">500</text>
        <text x="25" y="64" fill="var(--fg-tertiary)" font-size="8.5" text-anchor="end" font-family="monospace">200</text>
        <text x="25" y="104" fill="var(--fg-tertiary)" font-size="8.5" text-anchor="end" font-family="monospace">0</text>

        <!-- Baseline Band -->
        <polygon points="30,96 100,95 180,94 260,95 340,94 400,95 440,94 440,100 30,100" fill="url(#uebaBandGrad)"/>
        <polyline points="30,96 100,95 180,94 260,95 340,94 400,95 440,94" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="3,3"/>

        <!-- Actual Anomaly Spike Line (Image 5 Replica) -->
        <polyline points="30,98 90,98 160,98 230,97 300,98 360,97 400,96 420,85 435,38 440,25" fill="none" stroke="#EF4444" stroke-width="2.2"/>
        <circle cx="440" cy="25" r="4" fill="#EF4444" stroke="#0B132B" stroke-width="2"/>

        <!-- X Axis Dates -->
        <text x="35" y="114" fill="var(--fg-tertiary)" font-size="8" font-family="monospace">01/20</text>
        <text x="160" y="114" fill="var(--fg-tertiary)" font-size="8" font-family="monospace">01/23</text>
        <text x="300" y="114" fill="var(--fg-tertiary)" font-size="8" font-family="monospace">01/27</text>
        <text x="430" y="114" fill="#EF4444" font-size="8" font-weight="700" font-family="monospace">오늘 (급증)</text>
      </svg>
    `;
  }

  function initUebaDashboard() {
    renderUebaProfileChart();
  }

  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // [Smart Flyout Panel] 각 아이콘 클릭 시 전용 스마트 패널 오픈
  // ----------------------------------------------------------
  const SMART_FLYOUT_CONFIG = {
    'protection': {
      title: '보호 모니터링 (SOC)',
      sub: '종합 위협 관제 및 실시간 보안 현황',
      groups: [
        {
          label: '대시보드 바로가기',
          items: [
            { label: '종합 보안 점수 (100점)', action: 'soc-score', target: 'view-protection' },
            { label: '시계열 위협 추이 차트', action: 'soc-trend', target: 'view-protection' },
            { label: '심각도별 도넛 분포', action: 'soc-donut', target: 'view-protection' },
            { label: '회선 트래픽 모니터링 (5:5)', action: 'soc-gw', target: 'view-protection' }
          ]
        },
        {
          label: '네트워크 & 인벤토리',
          items: [
            { label: 'pfSense 실시간 패킷 로그', action: 'pfsense-stream', target: 'view-records' },
            { label: '조직도 계층 트리 & IAM', action: 'iam-tree', target: 'view-protection' }
          ]
        }
      ]
    },
    'sites': {
      title: '지점망 GIS 관제',
      sub: '전국 164개 지점 및 서울 25개 자치구 관제망',
      groups: [
        {
          label: '관제 뷰 전환',
          items: [
            { label: '서울시 25개 구 정밀 관제', action: 'gis-mode-seoul', target: 'view-sites' },
            { label: '대한민국 전국 관제 뷰', action: 'gis-mode-nationwide', target: 'view-sites' },
            { label: '강남구 집중 관제 포커스', action: 'gis-focus-gangnam', target: 'view-sites' }
          ]
        },
        {
          label: '지점 상태 필터',
          items: [
            { label: '치명(Critical) 경보 지점 (91개)', action: 'gis-filter-crit', target: 'view-sites' },
            { label: '정상 작동 지점 필터', action: 'gis-filter-pass', target: 'view-sites' },
            { label: '전체 지점 필터 초기화', action: 'gis-reset-all', target: 'view-sites' }
          ]
        }
      ]
    },
    'topology': {
      title: '인프라 토폴로지',
      sub: '7계층 센터 연결 정보 및 이상 노드 추적',
      groups: [
        {
          label: '화면 제어',
          items: [
            { label: '연결망 자동 정렬 (Auto Layout)', action: 'topo-autolayout', target: 'view-topology' },
            { label: '토폴로지 화면 맞춤 (Reset Zoom)', action: 'topo-reset', target: 'view-topology' },
            { label: '전체 화면 토글 (Fullscreen)', action: 'topo-fullscreen', target: 'view-topology' }
          ]
        },
        {
          label: '주요 감시 노드',
          items: [
            { label: 'Device 03 (이상 감지 단말)', action: 'topo-focus-dev03', target: 'view-topology' },
            { label: '대리점 라우터 CPE #01', action: 'topo-focus-cpe', target: 'view-topology' },
            { label: 'Zero Trust Edge (Swing-gw)', action: 'topo-focus-edge', target: 'view-topology' }
          ]
        }
      ]
    },
    'ueba': {
      title: 'UEBA 보안 분석',
      sub: '사용자 및 엔티티 행위 이상 탐지 AI',
      groups: [
        {
          label: '시나리오 5종 (Use Cases)',
          items: [
            { label: 'UC-001 비정상 로그인 시간대', action: 'ueba-uc1', target: 'view-ueba' },
            { label: 'UC-002 불가능한 이동 (Impossible Travel)', action: 'ueba-uc2', target: 'view-ueba' },
            { label: 'UC-003 권한 상승 이상 (Privilege Esc)', action: 'ueba-uc3', target: 'view-ueba' },
            { label: 'UC-004 데이터 대량 유출 (Exfiltration)', action: 'ueba-uc4', target: 'view-ueba' },
            { label: 'UC-005 휴면 계정 재활성화', action: 'ueba-uc5', target: 'view-ueba' }
          ]
        },
        {
          label: '위험 분석 차트',
          items: [
            { label: '고위험 엔티티 Top 4 목록', action: 'ueba-high-risk', target: 'view-ueba' },
            { label: '2D 이상치 분포 산점도', action: 'ueba-scatter', target: 'view-ueba' }
          ]
        }
      ]
    },
    'cases': {
      title: '사건·케이스 관제',
      sub: '지점 연계 보안 사건 및 티켓 워크플로우',
      groups: [
        {
          label: '심각도 필터',
          items: [
            { label: '치명(Critical) 케이스만 보기', action: 'cases-crit', target: 'view-cases' },
            { label: '높음(High) 케이스만 보기', action: 'cases-high', target: 'view-cases' },
            { label: '전체 케이스 목록 복원', action: 'cases-all', target: 'view-cases' }
          ]
        }
      ]
    },
    'endpoints': {
      title: '단말·자산 관리',
      sub: '엔드포인트 보안 상태 및 ZTNA 에이전트',
      groups: [
        {
          label: '단말 점검',
          items: [
            { label: '에이전트 인벤토리 스캔', action: 'ep-scan', target: 'view-endpoints' },
            { label: '미등록/이상 단말 격리', action: 'ep-quarantine', target: 'view-endpoints' }
          ]
        }
      ]
    },
    'vulnerabilities': {
      title: '취약점 점검 & SBOM',
      sub: 'OSV 데이터베이스 및 컴플라이언스',
      groups: [
        {
          label: '취약점 관리',
          items: [
            { label: 'CVE 취약점 분석', action: 'vuln-cve', target: 'view-vulnerabilities' },
            { label: 'SBOM 소프트웨어 명세서', action: 'vuln-sbom', target: 'view-vulnerabilities' },
            { label: 'ISMS-P 컴플라이언스 매트릭스', action: 'vuln-compliance', target: 'view-vulnerabilities' }
          ]
        }
      ]
    },
    'ai-connect': {
      title: 'AI 연동·설정',
      sub: 'AI 기반 침해사고 분석 어시스턴트',
      groups: [
        {
          label: 'AI 지원 기능',
          items: [
            { label: '보안 어시스턴트 질의응답', action: 'ai-chat', target: 'view-ai-connect' },
            { label: '침해사고 자동 분석 리포트', action: 'ai-report', target: 'view-ai-connect' }
          ]
        }
      ]
    },
    'apps': {
      title: '업무 앱 (ZTNA)',
      sub: 'Zero Trust Network Access 애플리케이션 통제',
      groups: [
        {
          label: '앱 통제 정책',
          items: [
            { label: '인가된 업무 앱 목록', action: 'apps-approved', target: 'view-apps' },
            { label: '비인가 접속 차단 룰', action: 'apps-blocked', target: 'view-apps' }
          ]
        }
      ]
    },
    'records': {
      title: '방화벽 & 패킷 로그',
      sub: 'pfSense 트래픽 및 보안 감사',
      groups: [
        {
          label: '실시간 패킷 분석',
          items: [
            { label: 'pfSense 실시간 캡처 시작/정지', action: 'records-live', target: 'view-records' },
            { label: '차단(Drop/Reject) 패킷 필터', action: 'records-blocked', target: 'view-records' },
            { label: 'Syslog / CSV 로그 내보내기', action: 'records-export', target: 'view-records' }
          ]
        }
      ]
    }
  };

  let activeFlyoutTab = null;

  function openFlyoutForView(viewKey) {
    const overlay = $('nav-flyout-overlay');
    const titleEl = $('flyout-title');
    const subEl = $('flyout-sub');
    const bodyEl = $('flyout-body');
    if (!overlay || !bodyEl) return;

    const conf = SMART_FLYOUT_CONFIG[viewKey] || {
      title: '보안 콘솔 모듈',
      sub: '선택된 관제 메뉴 상세',
      groups: []
    };

    if (titleEl) titleEl.textContent = conf.title;
    if (subEl) subEl.textContent = conf.sub;

    bodyEl.innerHTML = conf.groups.map(group => `
      <div class="flyout-group">
        <span class="flyout-group-label">${escapeHtml(group.label)}</span>
        ${group.items.map(item => `
          <button type="button" class="flyout-item" data-target="${item.target}" data-action="${item.action}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span>${escapeHtml(item.label)}</span>
          </button>
        `).join('')}
      </div>
    `).join('');

    qsa('.flyout-item', bodyEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const targetView = btn.dataset.target;
        handleFlyoutAction(action, targetView);
        closeFlyout();
      });
    });

    overlay.hidden = false;
    activeFlyoutTab = viewKey;
  }

  function closeFlyout() {
    const overlay = $('nav-flyout-overlay');
    if (overlay) overlay.hidden = true;
    activeFlyoutTab = null;
  }

  function handleFlyoutAction(action, targetView) {
    const targetTab = $(`tab-${targetView.replace('view-', '')}`);
    if (targetTab) targetTab.click();

    setTimeout(() => {
      if (action === 'gis-mode-seoul') {
        const btn = $('btn-gis-toggle-mode');
        if (gisMode !== 'seoul' && btn) btn.click();
      } else if (action === 'gis-mode-nationwide') {
        const btn = $('btn-gis-toggle-mode');
        if (gisMode !== 'nationwide' && btn) btn.click();
      } else if (action === 'gis-focus-gangnam') {
        if (gisMode !== 'seoul') $('btn-gis-toggle-mode')?.click();
        setTimeout(() => {
          const gnPath = document.querySelector('.gis-district-polygon[data-gu="강남구"]');
          if (gnPath) gnPath.dispatchEvent(new Event('click'));
        }, 150);
      } else if (action === 'gis-filter-crit') {
        if (window.__filterGisSites) window.__filterGisSites('status:crit');
      } else if (action === 'gis-filter-pass') {
        if (window.__filterGisSites) window.__filterGisSites('status:pass');
      } else if (action === 'gis-reset-all') {
        $('btn-gis-reset')?.click();
      } else if (action === 'topo-autolayout') {
        $('btn-topo-auto-layout')?.click();
      } else if (action === 'topo-reset') {
        $('btn-topo-reset')?.click();
      } else if (action === 'topo-fullscreen') {
        $('btn-topo-fullscreen')?.click();
      } else if (action === 'topo-focus-dev03') {
        $('topo-node-dev-03')?.click();
        $('topology-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (action.startsWith('ueba-uc')) {
        const ucNum = action.replace('ueba-uc', 'UC-00');
        const ucCard = document.querySelector(`.uc-card[data-uc="${ucNum}"]`);
        if (ucCard) ucCard.click();
      } else if (action === 'cases-crit') {
        const input = $('gis-case-search');
        if (input) { input.value = 'critical'; $('gis-case-search-btn')?.click(); }
      } else if (action === 'cases-high') {
        const input = $('gis-case-search');
        if (input) { input.value = 'major'; $('gis-case-search-btn')?.click(); }
      } else if (action === 'cases-all') {
        const input = $('gis-case-search');
        if (input) { input.value = ''; $('gis-case-search-btn')?.click(); }
      } else if (action === 'soc-score') {
        document.querySelector('.soc-score-card')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'soc-trend') {
        $('soc-trend-chart')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'soc-donut') {
        $('soc-donut-chart')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'soc-gw') {
        document.querySelector('.dashboard-split')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'pfsense-stream') {
        $('pfsense-log-table')?.scrollIntoView({ behavior: 'smooth' });
      } else if (action === 'iam-tree') {
        document.querySelector('.tree-panel')?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 120);
  }

  function initNavFlyout() {
    const overlay = $('nav-flyout-overlay');
    const closeBtn = $('flyout-close-btn');
    if (!overlay) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', closeFlyout);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeFlyout();
    });

    // 좌측 레일 각 아이콘 클릭 시 해당 아이콘 전용 스마트 패널 오픈
    qsa('#nav [role="tab"]').forEach(tab => {
      tab.addEventListener('click', () => {
        const viewKey = tab.dataset.view;
        if (activeFlyoutTab === viewKey && !overlay.hidden) {
          closeFlyout();
        } else {
          openFlyoutForView(viewKey);
        }
      });
    });

    // 햄버거 토글 버튼 클릭 시 현재 탭의 서브메뉴 열기/닫기
    const sidebarToggleBtn = $('sidebar-toggle-btn');
    if (sidebarToggleBtn && !sidebarToggleBtn.dataset.flyoutBound) {
      sidebarToggleBtn.dataset.flyoutBound = 'true';
      sidebarToggleBtn.addEventListener('click', () => {
        if (overlay.hidden) {
          const currentSelected = document.querySelector('#nav [role="tab"][aria-selected="true"]');
          const viewKey = currentSelected?.dataset.view || 'protection';
          openFlyoutForView(viewKey);
        } else {
          closeFlyout();
        }
      });
    }
  }

  // ============================================================
  // [NEW ENTERPRISE SUITE] GIS Site Map, Topology, UEBA Suite, Cases
  // ============================================================

  // 100% Geographically Authentic KOSTAT Official GeoJSON Projected Vector Geometry
  if (!window.LumosMapVectors) {
    // Authentic high-precision GeoJSON-projected SVG vectors for Seoul 25 districts & South Korea 17 provinces
window.LumosMapVectors = {
  "seoul": [
    {
      "name": "강동구",
      "code": "11250",
      "d": "M469.6,257.1L474,257.6L477.3,253.6L480.8,251.1L494.9,244.6L511.2,239.6L518.3,236.5L532.6,227.6L537,228L543.9,227.5L547.5,225.8L545.6,231L546.5,235.7L548.6,239L550.2,243.5L550.8,248.9L553.7,256.2L553,268.7L555.1,270.4L554.6,276L555.3,280.1L553.2,280.4L550.1,278.2L545.9,280.4L541.9,279.9L534.4,281.9L530.8,280.7L519,297.7L518.7,304.9L514,310.6L511.9,316L509.5,316.2L508.2,320.1L508.1,323.9L506.4,323.2L477,306.8L478.5,303.3L482,290.7L476.2,287L465.3,283.1L468.4,276.8L470.6,267.9L470.6,259.8L469.6,257.1Z",
      "cx": 516.2,
      "cy": 271
    },
    {
      "name": "송파구",
      "code": "11240",
      "d": "M413.3,311.4L420.5,313.5L426.3,313.7L434.5,312.4L444.2,308.8L452.1,307.5L457,297.7L465.3,283.1L476.2,287L482,290.7L478.5,303.3L477,306.8L506.4,323.2L508.1,323.9L508.1,326L505.5,328L503.8,331L502.4,336.8L503.9,341.6L508.9,344.6L511.8,345L514.8,343.1L517,345.2L525.3,347.4L528.6,349.6L526.7,354.9L526.9,358.6L524.8,364.5L523,367.1L516.9,369L513.9,380.4L513.9,383.2L510.4,386L505,386.2L501.3,391L495.4,388.6L491.1,387.9L491.4,393.6L496.8,397.3L493.5,399.4L488.7,399.4L484.4,396.9L484.4,400.8L480.9,403.6L480.9,400.5L478.7,395.6L467.9,377.1L468.6,375.4L464.7,367.7L460.6,363.2L456.4,360L449.7,356.4L427.3,349L422.4,347.8L416.8,342.3L413.6,319.3L412.8,317.8L413.3,311.4Z",
      "cx": 480.6,
      "cy": 350.2
    },
    {
      "name": "강남구",
      "code": "11230",
      "d": "M400.6,305.2L413.3,311.4L412.8,317.8L413.6,319.3L416.8,342.3L422.4,347.8L427.3,349L449.7,356.4L456.4,360L460.6,363.2L464.7,367.7L468.6,375.4L467.9,377.1L478.7,395.6L480.9,400.5L480.9,403.6L475,408.3L474.1,413.8L469.8,411.5L468.3,409.2L461.3,407.7L457.9,412.2L451.5,413.5L449.1,409.4L447.6,406L439.3,398.8L434.7,391.8L434.5,387.7L427,388.8L421.8,391.8L420.3,388.8L417.3,388.3L416.1,390.2L407.9,391.8L406.8,397.8L400.9,398.6L397.3,398.2L386.5,385L382.1,372.2L373.2,373.8L370.2,366.1L356.7,330.4L353.9,318.4L352.4,314.8L346.1,307.2L357.1,296L361.9,292.1L368,290.2L387.7,300L388.9,297.4L391.5,299.9L400.6,305.2Z",
      "cx": 420.6,
      "cy": 364.3
    },
    {
      "name": "서초구",
      "code": "11220",
      "d": "M346.1,307.2L352.4,314.8L353.9,318.4L356.7,330.4L370.2,366.1L373.2,373.8L382.1,372.2L386.5,385L397.3,398.2L400.9,398.6L406.8,397.8L407.9,391.8L416.1,390.2L417.3,388.3L420.3,388.8L421.8,391.8L427,388.8L434.5,387.7L434.7,391.8L439.3,398.8L447.6,406L449.1,409.4L447.1,413.5L447.7,416.9L445.9,417.5L444.6,421.3L442.4,422.6L439.4,428.2L439.4,433.5L434.3,436.2L432.1,440.5L422.8,438.7L419,439.6L419.4,442.4L422.6,444.2L421.8,446.9L418.9,448.6L417.8,454.4L418.6,456.3L413.1,457.6L411.7,459.3L406.1,457.6L402.2,457.6L395.2,460L392.5,457.3L389.6,456.5L388.2,452.4L380.2,444.7L375.4,443.7L374.8,440.6L378.2,435.1L377.4,432.5L377.7,428L375.7,424.6L376.8,419.9L376.4,416.8L374.1,414.4L372.6,409.3L374,405.7L369.8,402.7L363.4,413.9L356.7,417.5L351.3,418.7L345.1,418.7L342.6,415.6L339.2,408.2L338,407.6L335.8,400.4L329.1,400.3L327,401.3L328.2,405.5L327.7,408.2L323.3,409.4L317.7,414.5L316.3,411L317.1,403.1L315.6,399.5L312.7,396.6L310.3,391.9L309.1,385.9L310.7,355.6L313.4,350L308.6,346.5L307.6,343.9L307.3,331.4L310.2,329.2L316.2,329L318.6,330.5L329.2,324.3L336.1,319.7L339,316.8L341.5,311.8L346.1,307.2Z",
      "cx": 376.9,
      "cy": 401
    },
    {
      "name": "관악구",
      "code": "11210",
      "d": "M309.1,385.9L310.3,391.9L312.7,396.6L315.6,399.5L317.1,403.1L316.3,411L317.7,414.5L310.5,416.6L308.2,422.4L302.6,426.3L299.8,430.7L296.2,430.8L288.1,433.8L287.8,439L286.6,440.8L282,441.2L280.9,443.1L274.4,443.1L264.8,446.1L261.2,446.1L257.7,448.6L256.3,446.3L256.5,441.9L253,437.4L247.4,433.6L247.4,429.8L244.6,426.7L237.8,420.2L236.9,416.6L230,415L227.4,415.1L227,409.3L225.2,405.5L226.3,403.5L223.8,401.5L219.6,392.2L222.6,390.6L224.1,385.5L221.1,383.6L221.4,379.3L210.4,381.8L208.9,380.3L213.5,373.1L216.8,373.1L225.7,369.7L230.4,366.3L239.2,365.5L242,359.1L243.4,357.7L247.8,360.4L251.8,360.7L253.9,362.1L260.4,362L267.1,359.2L272.8,361.8L275.3,363.9L278.8,363L284.2,360.2L283.8,364.1L285.6,369.7L284.4,375.4L295.6,387.9L303.4,386.1L309.1,385.9Z",
      "cx": 263,
      "cy": 399.9
    },
    {
      "name": "동작구",
      "code": "11200",
      "d": "M307.3,331.4L307.6,343.9L308.6,346.5L313.4,350L310.7,355.6L309.1,385.9L303.4,386.1L295.6,387.9L284.4,375.4L285.6,369.7L283.8,364.1L284.2,360.2L278.8,363L275.3,363.9L272.8,361.8L267.1,359.2L260.4,362L253.9,362.1L251.8,360.7L247.8,360.4L243.4,357.7L242,359.1L239.2,365.5L230.4,366.3L225.7,369.7L216.8,373.1L213.5,373.1L224.8,355.6L233.6,353.6L235.4,346.8L240.5,330.5L242.6,330L241.3,325.2L249.1,325.9L260.8,323.2L271.1,319.2L274.7,323L279.6,326.5L288.4,330.3L307.3,331.4Z",
      "cx": 266.5,
      "cy": 353.4
    },
    {
      "name": "영등포구",
      "code": "11190",
      "d": "M197,272.8L210.4,282.1L217.1,285.3L245.2,293.1L251.9,294.2L262.7,304.7L266.5,308.4L268,313.7L271.1,319.2L260.8,323.2L249.1,325.9L241.3,325.2L242.6,330L240.5,330.5L235.4,346.8L233.6,353.6L224.8,355.6L213.5,373.1L210.2,372.1L205.3,366.9L201.9,355.1L201.5,345.2L202,338.5L197.9,332.2L184.5,324.2L184.9,315.8L185.7,311.2L187.2,309.5L193.6,305.9L195.5,302.7L197.4,303.2L199.2,299L198.9,294.9L194,283.2L192.6,282.9L191.6,278.7L197,272.8Z",
      "cx": 217.6,
      "cy": 317.1
    },
    {
      "name": "금천구",
      "code": "11180",
      "d": "M208.9,380.3L210.4,381.8L221.4,379.3L221.1,383.6L224.1,385.5L222.6,390.6L219.6,392.2L223.8,401.5L226.3,403.5L225.2,405.5L227,409.3L227.4,415.1L230,415L236.9,416.6L237.8,420.2L244.6,426.7L238.2,432.2L235.3,436L233.8,440.4L231.4,442.5L227,442.3L223.4,446.2L220.2,451.9L212.9,451.5L212.8,448.6L208.8,445.2L208,443.5L208.3,437.6L207.4,435.2L204.2,433.6L204.7,429.6L202.3,422.9L200.5,424L196.7,422.8L196.2,419L192.7,417.2L192.7,412.5L195.7,407.8L185,391.9L181,384.6L177.1,373.6L178.7,372.5L183.5,370.7L185.9,371.6L192.4,376.9L196.2,381.4L203.2,383.1L208.3,382.4L208.9,380.3Z",
      "cx": 211.4,
      "cy": 410.6
    },
    {
      "name": "구로구",
      "code": "11170",
      "d": "M117.7,337.3L123,337.4L126.7,342L131.9,346.2L137.1,343.9L136.4,341.5L142.2,341.3L142.7,337.7L146.9,336.4L148.6,334.4L152,333.7L155.3,335.8L158.5,334.7L160.8,339.7L163.7,339.7L164.6,341.9L167.9,341.5L171.7,342.6L175.6,341.7L177.2,336.9L183.2,328L184.5,324.2L197.9,332.2L202,338.5L201.5,345.2L201.9,355.1L205.3,366.9L210.2,372.1L213.5,373.1L208.9,380.3L208.3,382.4L203.2,383.1L196.2,381.4L192.4,376.9L185.9,371.6L183.5,370.7L178.7,372.5L181.7,368.6L180.2,366.9L176.5,368L176.5,365.4L170.2,359.6L166.6,363.4L162.2,365.7L157.9,371.7L154.7,372.8L153.1,376.4L150.8,378.3L144.9,377.6L143.6,379.3L143.1,389.6L135.6,387.4L130.8,388L126.3,384.5L123.2,386.6L117.4,386.3L114.5,387.3L111.5,383.9L111.9,378.2L111,374.4L111.9,371.9L116.2,368.8L115.2,365.4L109.3,363L105.1,360.4L103,355.9L103.5,353L106.6,353.8L110.4,351.9L111.8,348L113.8,346.8L115.5,341L115.1,338.1L117.7,337.3Z",
      "cx": 152.1,
      "cy": 358.9
    },
    {
      "name": "강서구",
      "code": "11160",
      "d": "M158,235.1L157.6,240.6L158.8,242.8L168.4,248.6L182.5,260.9L197,272.8L191.6,278.7L192.6,282.9L191.4,282.9L186,276.3L177.8,277.8L173.8,276.7L165.9,270.9L163.4,281.5L165.3,286.9L164.9,293.6L165.6,304.1L147.2,307.1L136.9,309.2L129.5,293.9L130.3,291.9L127.9,285.6L124.6,285.7L123.9,281.9L121.8,280.1L120.2,285.5L114.5,287.4L105.4,287.5L100.1,286L98.9,283.6L91.6,284L87.2,287.8L86,291.8L81.1,294.9L79.8,289.3L81.2,286.2L77.5,285.6L77.4,282.5L73.7,281.6L71.3,278.7L62.9,278.8L57.6,274.7L52.3,275L48,267.9L44.7,264.4L49.2,264.2L50.1,262L59.1,254.6L59.2,251.2L56.5,246.3L60.4,246.8L63.6,245.1L66.3,241.9L65.4,239.4L66.6,236.5L74.8,230.7L79.3,231L79.1,226.2L79.9,222.2L82.5,222L86,214.2L88.5,213L86.5,209.6L86.8,207L84.5,202.6L83.8,198.4L85.5,194.4L87.4,194L88.2,189.7L89.7,188.9L94.2,190.4L107.1,204.7L112.4,210.2L120.2,214L149.7,233.6L158,235.1Z",
      "cx": 108.1,
      "cy": 256.9
    },
    {
      "name": "양천구",
      "code": "11150",
      "d": "M114.5,287.4L120.2,285.5L121.8,280.1L123.9,281.9L124.6,285.7L127.9,285.6L130.3,291.9L129.5,293.9L136.9,309.2L147.2,307.1L165.6,304.1L164.9,293.6L165.3,286.9L163.4,281.5L165.9,270.9L173.8,276.7L177.8,277.8L186,276.3L191.4,282.9L192.6,282.9L194,283.2L198.9,294.9L199.2,299L197.4,303.2L195.5,302.7L193.6,305.9L187.2,309.5L185.7,311.2L184.9,315.8L184.5,324.2L183.2,328L177.2,336.9L175.6,341.7L171.7,342.6L167.9,341.5L164.6,341.9L163.7,339.7L160.8,339.7L158.5,334.7L155.3,335.8L152,333.7L148.6,334.4L146.9,336.4L142.7,337.7L142.2,341.3L136.4,341.5L137.1,343.9L131.9,346.2L126.7,342L123,337.4L117.7,337.3L116.8,333.7L117.5,329.7L115.8,325.1L118.7,319.7L118.3,314.9L122.2,308.9L120.8,304.4L118.7,304L114.1,296.5L114.5,287.4Z",
      "cx": 152.5,
      "cy": 312
    },
    {
      "name": "마포구",
      "code": "11140",
      "d": "M213.4,231.6L211.5,233.8L215.4,237L233.7,247.3L240.9,249.5L244,252.5L242.1,256.1L242,259.4L254.6,265.2L259.6,263.1L279.2,261.5L281.2,262.8L284.6,259.4L286.5,263.2L284.8,264.8L285.7,270.7L287.6,273.5L285.1,275.1L283,278.7L280.9,280L279.3,285.7L272.2,294.1L264.6,296.2L262.7,304.7L251.9,294.2L245.2,293.1L217.1,285.3L210.4,282.1L197,272.8L182.5,260.9L168.4,248.6L158.8,242.8L157.6,240.6L158,235.1L158.1,233.6L162.8,233.2L165,232L167.5,233.8L170.5,230.9L173.8,230.3L180.1,227.5L181.6,223L181.1,220.5L183.9,216.7L185.5,212L187.9,210L196.6,219.4L201.3,223.4L203.8,224.6L207.3,229.5L211.5,233.1L213.4,231.6Z",
      "cx": 222.2,
      "cy": 251.7
    },
    {
      "name": "서대문구",
      "code": "11130",
      "d": "M271,183.9L273.9,185.9L274.9,189L273.9,195.4L275.6,198.3L279.3,198.8L278.3,203.5L280.7,209.2L280.8,211.5L278.7,219.6L282.4,223L277.6,225.7L274.9,228.6L290.9,248.5L294.5,254.5L291.2,255.6L287.2,258.7L284.6,259.4L281.2,262.8L279.2,261.5L259.6,263.1L254.6,265.2L242,259.4L242.1,256.1L244,252.5L240.9,249.5L233.7,247.3L215.4,237L211.5,233.8L213.4,231.6L224.9,217.6L229.3,218.3L228.8,222L236.8,220.7L238.7,215.8L241.4,215.8L243.9,213.9L243.5,210.7L244.9,207.2L250.6,201.6L259.2,198.1L260.2,191.2L261.3,188.6L264.4,188.6L267,184L271,183.9Z",
      "cx": 259.4,
      "cy": 222.8
    },
    {
      "name": "은평구",
      "code": "11120",
      "d": "M297.2,146.4L294.1,149.5L282.2,152.2L278.8,157L273.2,157.8L272.8,162.9L271.5,167L269.8,168.8L271,171.2L271.8,177.5L270.3,182.5L271,183.9L267,184L264.4,188.6L261.3,188.6L260.2,191.2L259.2,198.1L250.6,201.6L244.9,207.2L243.5,210.7L243.9,213.9L241.4,215.8L238.7,215.8L236.8,220.7L228.8,222L229.3,218.3L224.9,217.6L213.4,231.6L211.5,233.1L207.3,229.5L203.8,224.6L201.3,223.4L196.6,219.4L187.9,210L191.3,205.6L194,205.6L191.8,209.8L194,213.6L199,213.8L201.3,212.7L205.8,213.6L209.3,211.7L208.3,207.4L211.8,203.7L210.9,200.2L211.4,197L209.9,191.2L212.1,190.2L211.8,180.7L210.7,176.4L213.7,167.1L215.8,166.4L218.4,162.3L217.4,159.1L220.2,155.8L220.6,152.3L217.5,146L222.8,140.8L222,136.5L223.8,132.9L224.7,127.9L218.9,124.7L219.7,123L226.5,127.2L235.5,125.9L240.6,123L244.8,119.1L251.6,118.2L254.7,116.1L258.8,108.9L262.8,106.5L267.3,105.3L267.8,107.7L272.1,111.5L275.9,111L278.8,115L279.9,120.4L282.9,121.7L285.4,129.1L288.2,129.8L293.5,136.5L293.5,139.8L297.2,146.4Z",
      "cx": 240.1,
      "cy": 171
    },
    {
      "name": "노원구",
      "code": "11110",
      "d": "M460.6,164L455.5,165.6L453.4,168.2L448.9,169.7L440.4,165.5L436.4,164.9L430.6,166.7L418.7,172L414.6,172.1L411.1,174.3L407.3,173.9L397.8,165L392.6,158.5L390,154.6L382.2,147.9L385.2,144.6L386.5,139.3L392.8,127.1L398.6,133.3L399.8,125.3L397.9,117.7L397.6,110.3L394.5,102.8L394.2,98.1L391.2,89.7L391.6,83.5L393.2,76.9L395,65.5L393.6,62.1L398.3,58.6L400.9,58.2L406.7,59.4L411.1,57.7L416.3,50.8L420.6,50.6L426,47.7L431.4,47.7L434.5,51.3L436.8,57L447.5,58.8L449.1,64.1L444.7,70.5L443.7,74.2L445.8,78.1L446.9,82.9L448.2,84L448.7,88L446.4,94L449.2,100.8L448.5,104.4L437,110.6L444.9,111.6L446.4,114.8L444.2,119.2L447.2,125.9L451.4,126.6L454.3,125.7L463.4,127.3L468.2,134.2L468.8,141.8L467.1,149L460.1,154.6L460.1,157.2L457.9,160.8L460.6,164Z",
      "cx": 427.5,
      "cy": 114.2
    },
    {
      "name": "도봉구",
      "code": "11100",
      "d": "M393.6,62.1L395,65.5L393.2,76.9L391.6,83.5L391.2,89.7L394.2,98.1L394.5,102.8L397.6,110.3L397.9,117.7L399.8,125.3L398.6,133.3L392.8,127.1L386.5,139.3L385.2,144.6L382.2,147.9L378.6,143.9L376.7,139.5L373.7,137.8L371.5,132L365,126.7L361.4,123L356.3,120.5L350.7,120.5L347.8,118.4L346.9,115.7L348.5,105.2L350.1,101.2L350.7,93.4L354.2,88.4L351.9,84.2L348.5,80L346.1,74L342.1,73.3L341.7,65.7L342.5,61.8L341.4,58.9L342.4,50.2L346.2,44.8L349.1,44.8L351,40.5L355.2,40L358.6,42.7L362,43L365.9,41.3L367.3,43.7L367.9,48L369.6,53.1L371.2,54.8L375.3,54.1L382.5,49.3L384.1,51.8L387.3,53.8L391.4,51.4L393.6,62.1Z",
      "cx": 369.6,
      "cy": 86.3
    },
    {
      "name": "강북구",
      "code": "11090",
      "d": "M341.7,65.7L342.1,73.3L346.1,74L348.5,80L351.9,84.2L354.2,88.4L350.7,93.4L350.1,101.2L348.5,105.2L346.9,115.7L347.8,118.4L350.7,120.5L356.3,120.5L361.4,123L365,126.7L371.5,132L373.7,137.8L376.7,139.5L378.6,143.9L382.2,147.9L390,154.6L392.6,158.5L388.7,161.4L385.2,167.3L380.2,172L376.5,176.8L368.7,182L368.4,177.1L363.8,176.6L358.7,178.7L355.1,174.9L349.6,172.1L344.7,170.7L342,167.5L340.8,163.7L341.2,159.3L331.6,156.4L327.4,151.3L324.3,149.9L323.3,146.8L320.9,146.8L314,141.5L312.8,139.8L314.7,134.2L311.2,129L313.2,125.3L311.7,119.4L308.6,115.6L306.7,111.6L307.1,109L313.3,104.8L317.2,97.8L322.9,96L323.9,91.5L324.4,84.9L323,76.6L321.5,73.8L324.1,72.4L329,67.1L335.9,65.1L341.7,65.7Z",
      "cx": 344.2,
      "cy": 125.8
    },
    {
      "name": "성북구",
      "code": "11080",
      "d": "M301.2,147.7L303.9,144.5L309,142.6L312.8,139.8L314,141.5L320.9,146.8L323.3,146.8L324.3,149.9L327.4,151.3L331.6,156.4L341.2,159.3L340.8,163.7L342,167.5L344.7,170.7L349.6,172.1L355.1,174.9L358.7,178.7L363.8,176.6L368.4,177.1L368.7,182L376.5,176.8L380.2,172L385.2,167.3L388.7,161.4L392.6,158.5L397.8,165L407.3,173.9L411.1,174.3L414.6,172.1L418.7,172L419.1,185.6L417.6,181.7L415.3,181.7L415.5,185.5L411.4,187.6L407.4,188.2L403.8,194.5L401.6,193.7L395.1,196.1L393,194.4L389.7,201.8L385.3,201.7L381.1,203.5L379.3,209.5L376,211.6L367.1,223.2L359.9,229.9L358.3,228.6L353.9,229.1L351.6,224L349.5,223.4L342.4,226.2L340.2,223.7L340,218.7L338.8,216.2L334.6,212.9L332.7,207.8L326.3,208L324.7,209.5L321.1,209.4L315.1,207.6L311.9,205.5L309.6,202.5L309.1,197.4L313.2,196.9L316.6,194.2L314.4,185.1L315.7,179.8L315.4,173.5L310.6,170.4L308.2,161L306.2,158.2L306.6,151.1L303.1,151.7L301.2,147.7Z",
      "cx": 352.8,
      "cy": 183.6
    },
    {
      "name": "중랑구",
      "code": "11070",
      "d": "M418.7,172L430.6,166.7L436.4,164.9L440.4,165.5L448.9,169.7L453.4,168.2L455.5,165.6L460.6,164L467.5,164.3L474.5,168.7L474,171.1L475.1,178L474,182.4L476,184.3L475.6,189L470.5,196.1L470.8,197.6L476.1,203.7L475.4,205.3L469.9,206.3L466.5,212.7L465,219.7L455.4,221L457,224.1L456.9,229.5L454.9,233.4L454.8,236.8L453,238.4L442.9,242.9L433.4,240.2L427.5,239.4L427,229.9L425.6,224.8L418.4,213.4L416.3,201.9L417.1,198.9L420,194.4L420.3,191.8L419.1,185.6L418.7,172Z",
      "cx": 449.3,
      "cy": 198.4
    },
    {
      "name": "동대문구",
      "code": "11060",
      "d": "M359.9,229.9L367.1,223.2L376,211.6L379.3,209.5L381.1,203.5L385.3,201.7L389.7,201.8L393,194.4L395.1,196.1L401.6,193.7L403.8,194.5L407.4,188.2L411.4,187.6L415.5,185.5L415.3,181.7L417.6,181.7L419.1,185.6L420.3,191.8L420,194.4L417.1,198.9L416.3,201.9L418.4,213.4L425.6,224.8L427,229.9L427.5,239.4L419.6,257.6L418,256.8L404.1,254.2L402.6,253.5L390.1,241.7L383.1,237.6L377.9,237.8L371.5,241.7L367.9,242.4L360.1,239.6L359.9,229.9Z",
      "cx": 398.5,
      "cy": 215.5
    },
    {
      "name": "광진구",
      "code": "11050",
      "d": "M427.5,239.4L433.4,240.2L442.9,242.9L453,238.4L454.8,236.8L458.7,240.8L457.7,242.8L456,254L455,257.6L466.6,257.9L469.6,257.1L470.6,259.8L470.6,267.9L468.4,276.8L465.3,283.1L457,297.7L452.1,307.5L444.2,308.8L434.5,312.4L426.3,313.7L420.5,313.5L413.3,311.4L400.6,305.2L413.2,277.4L421.5,258.5L419.6,257.6L427.5,239.4Z",
      "cx": 443.7,
      "cy": 270.3
    },
    {
      "name": "성동구",
      "code": "11040",
      "d": "M360.1,239.6L367.9,242.4L371.5,241.7L377.9,237.8L383.1,237.6L390.1,241.7L402.6,253.5L404.1,254.2L418,256.8L419.6,257.6L421.5,258.5L413.2,277.4L400.6,305.2L391.5,299.9L388.9,297.4L387.7,300L368,290.2L361.9,292.1L357.1,296L349.6,290.1L343.1,289.1L341.8,285.6L342.1,282.3L343.3,276L345.8,275.3L352.1,267.8L352.8,263.8L355.6,261.4L359.5,260.9L360.5,255.9L363.6,253L364.2,250L360.4,249.7L360.1,239.6Z",
      "cx": 372.9,
      "cy": 267.1
    },
    {
      "name": "용산구",
      "code": "11030",
      "d": "M342.1,282.3L341.8,285.6L343.1,289.1L349.6,290.1L357.1,296L346.1,307.2L341.5,311.8L339,316.8L336.1,319.7L329.2,324.3L318.6,330.5L316.2,329L310.2,329.2L307.3,331.4L288.4,330.3L279.6,326.5L274.7,323L271.1,319.2L268,313.7L266.5,308.4L262.7,304.7L264.6,296.2L272.2,294.1L279.3,285.7L280.9,280L283,278.7L285.1,275.1L287.6,273.5L285.7,270.7L289.8,266.7L297.6,267.1L302.9,268.2L303.7,265.4L307.8,267.8L311.7,268.4L313.8,267.3L316.7,270.7L319.7,270.8L325.9,277.3L329.8,273.1L334.9,273.7L336.7,272.5L337.5,278.9L340.4,282.6L342.1,282.3Z",
      "cx": 309.7,
      "cy": 292.8
    },
    {
      "name": "중구",
      "code": "11020",
      "d": "M360.1,239.6L360.4,249.7L364.2,250L363.6,253L360.5,255.9L359.5,260.9L355.6,261.4L352.8,263.8L352.1,267.8L345.8,275.3L343.3,276L342.1,282.3L340.4,282.6L337.5,278.9L336.7,272.5L334.9,273.7L329.8,273.1L325.9,277.3L319.7,270.8L316.7,270.7L313.8,267.3L311.7,268.4L307.8,267.8L303.7,265.4L302.9,268.2L297.6,267.1L289.8,266.7L285.7,270.7L284.8,264.8L286.5,263.2L284.6,259.4L287.2,258.7L291.2,255.6L294.5,254.5L290.9,248.5L293.8,245L298.5,243.5L304.5,243.4L318,245.2L327.6,244.2L333.6,242.9L350.8,242.5L356.5,239.6L360.1,239.6Z",
      "cx": 324.5,
      "cy": 260.6
    },
    {
      "name": "종로구",
      "code": "11010",
      "d": "M297.2,146.4L301.2,147.7L303.1,151.7L306.6,151.1L306.2,158.2L308.2,161L310.6,170.4L315.4,173.5L315.7,179.8L314.4,185.1L316.6,194.2L313.2,196.9L309.1,197.4L309.6,202.5L311.9,205.5L315.1,207.6L321.1,209.4L324.7,209.5L326.3,208L332.7,207.8L334.6,212.9L338.8,216.2L340,218.7L340.2,223.7L342.4,226.2L349.5,223.4L351.6,224L353.9,229.1L358.3,228.6L359.9,229.9L360.1,239.6L356.5,239.6L350.8,242.5L333.6,242.9L327.6,244.2L318,245.2L304.5,243.4L298.5,243.5L293.8,245L290.9,248.5L274.9,228.6L277.6,225.7L282.4,223L278.7,219.6L280.8,211.5L280.7,209.2L278.3,203.5L279.3,198.8L275.6,198.3L273.9,195.4L274.9,189L273.9,185.9L271,183.9L270.3,182.5L271.8,177.5L271,171.2L269.8,168.8L271.5,167L272.8,162.9L273.2,157.8L278.8,157L282.2,152.2L294.1,149.5L297.2,146.4Z",
      "cx": 306.5,
      "cy": 199.9
    }
  ],
  "skorea": [
    {
      "name": "제주특별자치도",
      "code": "39",
      "d": "M246.8,443.1L247.9,445L247.6,446L246.3,445.7L245.9,444.8L246.8,443.1Z M235.3,439.7L236.6,440.5L238.5,440.3L238.7,441.4L240.4,443L241.3,442.6L243.3,443L244.2,445L243.5,446.2L244,447.3L245.6,447.3L245.8,448.2L244.9,449L243.7,452.8L243.7,454L242.6,454.3L241.4,455.6L241.1,457.1L239.5,458.7L239.9,459.3L239,460.7L237.2,461.3L235.2,460.8L233,463.2L232.2,463.1L229.5,463.9L227.4,463.7L226.2,464.2L224.7,466.2L223.4,466.6L222.6,465.9L220.1,466.5L218.3,466.2L217.5,467.1L216.2,467.1L215,467.7L213.7,466.3L212.4,466.9L211.2,465.9L209.3,467L205.1,466.4L203.6,467.7L203.3,469L201.9,470L200.4,468.5L199.3,466.7L197.2,465.8L196,464.7L194.5,462L195,461.5L194.7,459.5L195.1,457.6L196.5,456.1L198,455.2L198.7,454L199.6,453.6L201.1,451.9L201.1,450.5L204.1,449.1L204.3,447.9L206.1,447.8L209.4,446L210,446.4L215.6,444.3L216.5,443.4L217.9,443.8L219.5,442.7L220.1,443.5L222.3,442.9L223.3,442.1L225.6,442L226.3,440.6L227.3,440.9L231.2,440.6L231.7,440.2L233.7,440.4L235.3,439.7Z",
      "cx": 223.4,
      "cy": 453.7,
      "region": "제주"
    },
    {
      "name": "경상남도",
      "code": "38",
      "d": "M331,351.7L332.9,352.1L333.6,354.3L331.4,354L330.1,353L331,351.7Z M327,346.8L328.4,347.2L328.7,348.5L327.4,348.5L327,346.8Z M347.2,338.3L347.9,341.1L348.8,342.3L347.7,343.1L346.4,342.8L346.5,341.6L345.7,340.6L347.2,338.3Z M331,336.3L332.8,338.1L331.6,339.6L329.4,339.1L328.6,337.7L329.7,336.5L331,336.3Z M328.3,334.7L329.3,335.4L328.3,337.2L327.4,337.4L326.4,336.2L326.6,335.2L328.3,334.7Z M317.6,329.9L317.9,331.6L319.8,333.9L319.4,335.9L319.6,337.2L317.1,335.8L317,336.4L314.6,336.7L313.4,336.1L312.9,334L314,333.1L315.2,330.7L315.9,329.9L317.6,329.9Z M308.6,327.7L310,328.3L310.9,330.3L310.4,331.5L308.8,333.7L310.5,337.1L311.7,337.5L312.4,339.2L314.8,336.9L317.6,337.1L319.4,337.8L319.5,339.7L318.8,340L319.2,344L317.1,346.2L316.3,345.8L314.5,346.8L312.6,347L311.9,345.1L312.1,341.5L310.8,341.6L309.1,342.4L309.7,344.8L308,346L306.7,345.6L305.9,344.2L304.7,343.6L305.7,342.1L304.6,339.4L303.1,336.8L302.7,335L304.1,333.6L304.3,331.8L305.6,331.3L305.9,329.4L306.9,328.1L308.6,327.7Z M360.1,320.1L361,320.9L362.2,320.8L362.8,321.9L361.6,322.9L361.1,325.1L363.2,327.7L362.7,328.6L363,330.3L362.5,331.5L361.2,332.3L362.4,333.5L363.7,332.2L364.3,334.1L361.5,336.3L364.1,340.2L362,340.1L362,338.6L360.9,339L359.7,338.5L359.2,340.2L359.7,340.8L357.4,342.6L358.3,344.3L359.3,344L360.3,344.7L356.4,345.1L357,346.2L355.5,347.6L353.5,346.4L355.1,345.6L355.2,344.9L353.3,344.4L352.5,342.4L351.1,341.7L350.8,340.6L353.5,340.1L353.8,339.4L353.9,337L353.4,335.3L351.2,336.8L349.3,339L348.4,336.9L347.1,336.3L346.4,333.4L348,331.1L349.3,330.7L350.1,329.6L351.4,330.8L353.7,330.3L354.7,331.4L355.6,331.4L354.7,328.5L353.9,327.7L356.1,326.4L357.9,326.4L358.1,325.1L356.2,324.5L356.9,322.7L357.9,321.9L358.3,324.4L359.3,322.9L360.1,320.1Z M339.8,273.8L340.5,274.1L343.8,272.8L344.8,271.6L347.3,271.8L348.6,271.5L348.9,268.6L350,268L350.8,270.5L350.7,272.7L352.1,273.5L353.8,275.8L355.3,276.3L358.6,274.8L360.8,275.1L361.6,276.4L363.1,276.2L365.4,277.3L367.1,277.4L368,275.6L370.2,274.9L371.5,274.9L372.7,273L375.3,271.6L377,271.9L379.9,274.1L381.3,273L382.5,273.4L382.8,274.6L382.4,275.9L380.8,277.2L379.2,277.9L380.7,280.4L382.6,280.8L388.1,283.2L388.3,284.4L390.3,286.9L391.7,288L392.8,288.3L394,287.7L395.5,290.2L394.4,291.9L393.8,294.1L392.6,294.8L390.9,293.8L389.5,295.4L388.4,298.3L387,298.8L385.9,299.8L385,299.4L384.4,300.6L381.9,301.2L381,304.3L376.1,305.8L373.5,306L372.6,307L373.3,308.6L372.3,309.8L370.8,310.6L367.6,310.6L368.1,311.9L370.1,312.9L370.7,314.7L369.5,315.4L368.1,316.1L366.6,315.1L363.6,315.9L361.6,314.9L360.7,311.2L359,312.8L357.1,311.3L355.7,311.6L354.4,309.4L353.9,306.4L352.5,308.4L354.9,312.6L355,314.9L356.4,316L357.3,317.9L355.1,318.9L353.4,319.2L352.2,317.7L352.3,316.6L350.5,314.3L349.5,315.5L347.5,314.7L346.2,315.5L345.7,317.6L344.4,317.5L343.5,318.9L342.5,318.4L340.4,319.4L341,320.5L344.7,319.2L344.8,317.7L347.1,318.2L346.4,320.1L348.5,322.2L346.9,324L345.9,324.4L344.3,323.9L344.3,326.4L343.8,326.9L343.9,328.9L343.1,331.9L343.8,333.3L345.1,330.2L346.2,332.5L345.4,333.4L345.1,335.8L343.2,336.9L344.4,337.5L344.5,339.4L344,341.3L343.4,342.4L342.1,342.7L341,340.4L340.2,340L340.3,338.4L337.7,337.3L339,336.4L340.1,337.5L340.2,335.4L341.3,334.4L340.1,333L339.3,333.9L336.6,332.8L335,331.3L335.7,330.8L338.8,330.8L338.2,328.8L337.4,327.9L335.1,328.6L335.2,330.5L334,331.1L332.9,330.5L333.1,328.7L331.3,327.9L328.3,328.5L328.8,329.6L328.4,330.5L328.7,332L327.1,331.9L323.4,331.1L320.5,329.6L319.1,329.2L317.4,326.9L318.8,325.2L318,323.3L318.7,322L317.1,320.7L316,321.4L316.6,322.7L316.4,324L314.7,324.3L314.3,325.2L312.9,324.3L312,325.3L310.9,324L310.7,322.3L309.1,325.8L309.1,326.8L307.2,327.7L304.7,327.5L301.3,328.2L300,325.6L300.8,324.3L301.5,322L300.5,321L300.2,319.3L298.4,318.3L298.2,317L297,316.7L295.4,315L295.4,312.8L290.6,308.1L290.4,304.1L289.8,302.1L288.9,301.6L287.7,298.3L288.7,298.1L290.5,296.4L290.7,295.5L289.8,293.7L291.8,290.5L293.2,289.6L293.6,287L292.1,286.8L291.5,285.8L291.6,284.5L292.6,283.9L290.9,280.8L290.7,280L288.6,278.4L288.3,277.5L289.9,275.9L290,274.1L291,273.2L290.5,271.2L291,269.6L291.7,269L292.1,266.7L293.2,265.7L293.2,261.8L295.8,259.3L297,258.6L298.7,254.9L300.5,255.3L301.5,254.2L302.9,254.1L304.3,252.8L305,253L305.7,251.2L308,249.1L307.9,250.9L308.4,251.4L309.9,251L310.9,252.1L311,253.9L312.2,253.5L313.5,254.3L314.5,253.8L315.3,255.4L316.2,256.1L317.5,255.5L318.8,256.1L320.1,255.1L323.6,256.6L323.4,258.1L323.9,259.3L325.4,259.6L326.2,261.5L327.7,262.2L328.7,264.7L328.7,267.8L327.2,268.7L326.2,268.7L326.2,270.3L327.6,270L328.6,271.1L330.9,271.4L331.4,270.1L332.6,271.2L333.7,270.5L335.5,270.2L338.7,271.2L339.8,273.8Z",
      "cx": 336.3,
      "cy": 313,
      "region": "영남"
    },
    {
      "name": "경상북도",
      "code": "37",
      "d": "M410.7,270.5L408.2,269.5L404.4,268.2L401,270.7L398.2,270.3L397.8,269.3L398.4,267.2L397.8,266.4L396.5,266.3L394.7,264.8L391.7,265.3L390.7,264.5L390,265.6L386.9,266.4L385.7,268.1L385.6,269.8L386,271.4L384.2,270.6L381.3,273L379.9,274.1L377,271.9L375.3,271.6L372.7,273L371.5,274.9L370.2,274.9L368,275.6L367.1,277.4L365.4,277.3L363.1,276.2L361.6,276.4L360.8,275.1L358.6,274.8L355.3,276.3L353.8,275.8L352.1,273.5L350.7,272.7L350.8,270.5L350,268L351.1,265L353.5,263.4L355.9,263.5L355.5,264.5L356.4,266.3L357.3,266.1L359,264.9L360.3,264.8L360.9,263.9L361.1,261.8L360.3,259.3L362.5,258L362,256.3L364.8,253.8L365.6,251.6L365.1,249.1L363.9,248L364.4,246.7L363.9,245.7L364.4,244.6L363.5,243.4L363.1,241.8L360.8,241L356,241.7L354.2,243.9L352,244.6L350,244.2L350.6,247.1L349.8,248.9L347.8,250.6L346.7,250.7L346.1,249.8L346.7,247.4L344.4,247.5L342.9,248.6L341.9,251.2L340.7,253.1L341.1,254.3L343.2,254.3L345.7,255.1L346.8,256.2L346.2,257.7L343,257.7L342.2,258.7L340.8,261.4L341.2,262.9L343.8,264.5L343.9,266.3L342.9,267.1L339.1,265.9L338.5,266.3L338.8,268.1L340.5,270.2L341.9,271.3L340.7,273.7L339.8,273.8L338.7,271.2L335.5,270.2L333.7,270.5L332.6,271.2L331.4,270.1L330.9,271.4L328.6,271.1L327.6,270L326.2,270.3L326.2,268.7L327.2,268.7L328.7,267.8L328.7,264.7L327.7,262.2L326.2,261.5L325.4,259.6L323.9,259.3L323.4,258.1L323.6,256.6L320.1,255.1L318.8,256.1L317.5,255.5L316.2,256.1L315.3,255.4L314.5,253.8L313.5,254.3L312.2,253.5L311,253.9L310.9,252.1L309.9,251L308.4,251.4L307.9,250.9L308,249.1L307.7,248.1L309.4,247L308.5,243.4L307.3,242.5L307.3,240.4L309.1,239L309.9,237.8L311.2,238.1L312.9,236.6L312.7,234.5L313.3,232.6L314.6,231.7L315.1,229.8L313.8,226.9L314.5,225.9L316.3,225.2L318,226.4L318.9,225.9L318.7,224.7L317.4,222.7L318.5,221.4L316.1,220.1L314.3,220.7L313.3,221.8L312.1,221.4L310.9,219.6L308.3,218.5L307.5,219.9L305.7,219.8L305,217.1L305.7,215.4L307.6,214.2L308.3,213.2L307.1,209.2L307.7,208L307.1,206.7L307.7,204.8L307.6,203.2L309.3,201L308.9,199.6L307.1,198.5L307.1,197.1L306.3,196.1L303.9,195.8L302.1,194.2L303.9,192.5L305.6,192.4L305.4,190.8L306.4,190.7L307.2,189L308.2,191.1L310.9,192L311.4,189.3L311,188.2L308,186.1L310.9,185.9L310.9,184.8L312,183.9L312.9,182.4L314.6,183.9L315.6,184L316.9,183.3L318.6,184.7L320.1,184.8L320,183.6L317.6,181.5L319.1,177.8L319.3,175.9L321,176.9L322.4,176.8L322.8,175.7L324.6,174.5L326.3,175.6L329.8,176L329.5,173.3L330.8,173.4L331.3,171.3L334,172.6L334.9,174.4L336.5,176L337.4,175.9L339.5,177.2L340.5,176.1L343.1,176.3L344.9,173.3L344.9,172L343.3,171L344.4,169L344.5,166.9L345.6,166.3L345.9,165.3L349.2,162.9L349.2,162.1L351.2,161.6L353,159.7L352.6,158.5L353.8,157.4L356.8,157.8L358.3,155.7L360.7,156.7L361.4,157.7L363.7,157.7L364.8,158.7L365.5,158.1L364.8,156.3L365.7,155.8L367,153.9L368.5,154.7L369.7,154.7L371,156.8L372.9,157.4L374.3,157.4L376,153.5L377.5,153.3L378.5,154.7L380,154.2L385.4,155.5L386.1,153.5L387.4,152.9L390.4,154.4L393.9,157.7L396.4,157.4L395.9,155L397.5,153.2L398.6,152.7L399,151.5L400.5,151.7L401.1,150.6L403.4,149.2L405,149.1L406.2,151.3L406,152.9L407.7,154.7L409.2,155.8L408.4,156.7L408.1,159.1L408.6,160.5L408,162.6L408.7,165L408.8,169.4L408.4,170.1L409.3,173.3L411.2,176L411.5,178.2L412.6,179.8L411.8,180.7L412.5,182.7L412.1,183.4L412.4,185.5L411.6,186.5L409.8,187.8L408.2,191.7L408.1,193.9L408.9,196L410.1,197.4L410.4,201.3L409.6,203L409.9,204.6L409.8,207.4L409,209.3L407.1,212.5L406,215.2L406.2,216L405.7,218.8L406.2,219.9L405.6,221.5L406.4,222.7L406.4,225L405.6,225.4L405.9,226.8L406.9,227.6L407.4,228.8L407.2,231.2L410.1,234.1L408.6,235L408.7,236L406.1,237.3L405.8,238.1L406.3,239.8L408.5,241.2L409.3,242.4L410.8,242.9L412.2,241.1L414.1,240.1L414.2,239.2L416.1,237.5L417,235.3L418.5,236L419.4,240.6L419.1,241.5L417.7,242.9L417.5,244.8L416.2,247.4L415.2,248.1L415.7,249.9L415.3,252.5L415.8,253.3L414.6,256.5L414.9,257.1L413.4,259.5L413.8,260.7L413.1,264.2L412.2,266.3L412.4,267.7L410.7,270.5Z M506.3,116.4L506.5,118.1L507.1,119.3L506.8,121.9L503.5,123.6L501.4,123.2L499.4,121.7L499.6,120.2L498.8,119.3L502.4,117.5L505.4,117.1L506.3,116.4Z",
      "cx": 363.5,
      "cy": 218.5,
      "region": "영남"
    },
    {
      "name": "전라남도",
      "code": "36",
      "d": "M245.2,405.6L245.5,407.1L244.3,407.1L243.8,406L245.2,405.6Z M269,399.4L269.5,403.5L268.2,401.8L268.3,400.4L269,399.4Z M124.6,396.6L125.7,396.9L126.3,398.3L128,400.3L127.2,400.8L126,400.4L125.8,399.5L124.6,399L124.6,396.6Z M220.1,390L221,390.7L222.5,390.7L222,392.8L220.1,394.3L218.5,394.7L217.2,393.4L217.9,390.8L219.5,389.7L220.1,390Z M227.5,388.7L228.9,389.5L228,391.3L228.8,393.3L227.6,395.5L225.7,394.1L225.3,392.7L226.6,390.9L225.7,390L226.8,388.3L227.5,388.7Z M234.2,387.4L234.6,389.1L233.3,389.3L234.2,387.4Z M242.7,387L244.8,390.4L244.2,392L242.1,392.3L239.7,390.4L241.4,387.5L242.7,387Z M221.4,385.5L223.2,386.1L224.5,387L225.1,388.1L224.1,388.6L224.6,389.9L222.6,390.6L220.9,390L220.1,389.2L221.2,386.8L221.4,385.5Z M266.6,384.2L267,386.1L266.6,387.4L264.7,386.9L265.1,385.4L266.6,384.2Z M224.6,384.2L225.2,385.2L223,385.5L223.8,384.3L224.6,384.2Z M186.7,378.7L187.7,379.8L189.4,379.6L190.3,382L188.9,381.7L187.6,382.3L187.2,381.6L185.9,381.5L185.4,380L186.7,378.7Z M248.8,376.9L250.7,377.6L250,379.1L247.9,380.1L246.9,379.2L247,377.8L248.8,376.9Z M186.1,376.9L187.6,377.6L186.6,378.4L186.1,376.9Z M239.2,375.9L239.8,376.5L241.2,376.1L241.8,377.1L243,377.6L242.1,379.4L241,379L239.6,380.3L238.7,378.3L237.2,378.1L236.5,378.7L235.3,378L235.8,376.4L236.8,377.5L237.8,376.3L239.2,375.9Z M252,374L253.3,375.3L255.7,375.5L256.1,377.4L255.2,377.3L253,377.9L250.2,375.5L250.4,374L252,374Z M229,371.9L230.1,372.2L232.2,374L232,375.2L233.2,378.5L234.7,379.2L234,380.8L232.2,381.3L231.2,380.5L229.7,380.8L228.6,379L226.7,377.5L226,373.5L226.6,372.7L229,371.9Z M246.1,371.1L246.5,371.9L245.4,374.5L244.3,375.7L240.8,374.3L241.3,372.5L242.2,371.8L243.5,371.9L245.2,372.9L246.1,371.1Z M265.9,370.9L266.9,371.9L267.6,373.7L266.2,373.2L266.4,371.8L265.9,370.9Z M238.9,368.7L239.6,369.7L241,372.9L239,373.4L236,373.7L234.9,375.8L234.3,375.3L235,373.6L233.7,373.2L234.2,371.6L235.9,369.4L236.7,369.5L238.9,368.7Z M252.9,367.5L254.1,367.9L254.7,369.7L254.1,371.7L252.1,370.2L251.9,368.1L252.9,367.5Z M302.7,367.2L303,368.4L302.8,370.8L301.4,370.6L302.1,367.9L302.7,367.2Z M280.2,366.3L282.7,367L283,366.5L285,368.2L284.9,369.7L282.1,371.1L282,369.4L280.3,368.8L279.6,367.6L280.2,366.3Z M264.4,364.5L265.2,366L263.7,369.5L262.1,369.6L260.8,369.2L259.3,369.7L257.9,369.5L256.2,366.7L257.9,364.8L258.7,366.1L260.1,365.7L262.1,364.4L262.8,364.9L264.4,364.5Z M187.9,364.2L188.8,365.5L186.8,367.5L186.6,365.5L187.9,364.2Z M258.7,362.5L258.3,363.5L256.2,363.2L257.2,362.2L258.7,362.5Z M279.9,360.3L281.2,361L280.1,363.1L282,363.3L282.7,364.4L281.4,365.3L279.5,365.7L278.9,364.2L279.9,363.7L279.1,362.6L278.3,362.4L279.9,360.3Z M298.4,359.7L299.5,359.7L299.8,361.1L301,362.4L302.1,364.5L300.4,365L300.1,364.3L297.4,362.7L296.6,360.8L298.4,359.7Z M293,357.1L294.4,358.4L293.1,359.7L291.8,357.9L293,357.1Z M200.5,356.7L204,358.2L204.2,359.7L206.3,360.2L209.2,363.6L208.5,366.7L207.6,367.5L208.1,368.6L206.2,370.8L204.7,371.7L203.3,371.4L202.8,372.5L201.5,372.3L201.3,373.8L200.1,373.8L197.3,375.5L195.5,375.9L192.9,375.4L192.9,374.2L191.6,373.6L191.2,372.5L189.9,370.6L190.8,368.7L193.6,365.9L195.4,365.2L195.8,363.8L197.1,363.3L198.9,361.1L200.8,361L201.2,360.1L199.9,358.4L200.5,356.7Z M285.6,354.3L286.8,354.8L285.8,356.2L284.6,355.6L285.6,354.3Z M174.6,353.4L175,355.5L173.7,356.1L172.7,355.8L172.3,354.7L174.6,353.4Z M188.6,353L189.5,354.7L190.9,355.4L191.4,356.7L190.4,358L190.8,359.5L189.7,359.5L189.3,360.6L187.2,361.6L187.1,358.6L188.3,359L189.4,357.6L188.2,355.1L187.2,355.2L187.3,353.5L188.6,353Z M187.3,351L187.4,352.5L186.5,354.6L187.8,355.6L188.4,357.2L187.7,358.5L185.3,358.8L184.8,355.4L184.7,353.3L185.9,352.9L185.9,352L187.3,351Z M193.8,349.8L196.2,350.8L196.6,353.2L194.7,354.5L192.5,354.2L191.2,352.1L191.8,350.6L193.8,349.8Z M189.6,349L189.8,350.2L189.3,352.3L188.3,351.4L188.3,349L189.6,349Z M144.4,347.9L142.7,350.5L142.1,349.8L144.4,347.9Z M196.9,347.3L197,349.1L196,349.9L194.6,349.4L194.6,348.3L196.9,347.3Z M147.4,347.7L149,348.3L147.8,349.3L147.6,350.7L146.5,351.1L146.7,352.3L145.6,352.7L145.6,354L144.2,353.6L143.7,352.3L144.5,349.6L145.5,347.8L147.4,347.7Z M132.3,346.8L132.4,348.1L131.7,349.3L130,350L131.6,347.3L132.3,346.8Z M298.9,345L301.4,346.3L301.7,347.6L300.7,349.2L302,350.9L302.3,353.4L301.8,355L302.7,356.6L301.3,357L299,356.4L296.4,354L297.3,352.8L297.3,351.3L298.9,350.2L299.6,348.6L299.5,346.7L298.9,345Z M182,345.3L182.5,346L185,346.9L184.6,349L183.3,349.5L182.8,350.7L181.9,351.3L178.5,349.6L178.5,346.9L180.3,346.6L181.5,344.7L182,345.3Z M189.4,341.3L190.4,341.9L192.2,341.6L193.2,343L194.8,343L196.8,345.1L197,346.2L195.4,347.7L193.6,348.8L192,349.1L191.2,348.1L188.9,347.1L188.5,346.3L188.9,343.9L189.3,343.4L188.5,341.9L189.4,341.3Z M205.5,340.7L205.1,342.9L204.2,342.5L204.3,341.3L205.5,340.7Z M183.9,339.2L184,342.9L182.6,343.5L180.2,343.5L180.9,345L180.3,346L178.7,346.6L177.1,345.6L176.8,342.4L178.1,341.5L179.9,341.5L181.9,340.3L182.4,339.3L183.9,339.2Z M205.7,338.3L206.2,339.6L204.6,340.1L204.9,338.6L205.7,338.3Z M195.3,339.4L195.6,342.7L193,342.7L192.2,341.3L190.6,341.4L190.6,340.2L192.8,339.6L194.4,337.7L195.3,339.4Z M291.4,335.6L290.1,334.9L291.4,333.9L292.2,335L291.4,335.6Z M191.6,332.9L193.1,333.5L194,335.9L191.6,337.5L192,339.4L190.7,339.9L190.2,338.7L187.9,335.6L189.5,334.8L190.8,335.5L191.6,332.9Z M296.9,331.6L298.7,332.2L298.8,333.7L296.9,334.1L295.2,332.7L296.9,331.6Z M203.5,329.7L204.5,330.8L206.1,330.7L206.6,331.9L205.4,332.3L205.4,334.6L207.5,334.4L208.5,335.8L207.6,338.4L205.9,338.1L206.4,336.5L206,335.7L202.2,335.1L200.8,336.4L199,335.6L200,334.8L201.4,334.8L202.6,334.1L203.9,332L202.5,330.6L203.5,329.7Z M199.2,328.4L200.8,329L199.5,330.7L198.5,329.5L199.2,328.4Z M188.2,328.6L190.1,329.6L190.9,331.4L190.4,333.5L189.7,334.4L187.4,335.3L183.9,334.3L183.4,333.3L185,330.4L186.1,330.7L186.7,329.9L187.9,329.9L188.2,328.6Z M298.2,327.7L298.3,328.9L300,328.9L301.3,330.2L301.3,332.6L299.7,332L299.6,331L296,330.5L297.3,327.6L298.2,327.7Z M299.7,326.6L300.2,328.8L298.7,328.7L298.4,327.3L299.7,326.6Z M198.2,324.5L199.2,325L198,328.5L196.9,330.3L196.4,327.8L197.3,325.2L198.2,324.5Z M200.5,322.8L201.3,322.9L201.8,325.3L200.4,325L200.5,322.8Z M192.9,321.2L194.2,321.2L195.4,322.2L196.4,324.5L195.5,327.8L194.5,328.4L192.2,327.4L193,326L192.8,323.3L191.7,323.7L190.5,323.3L191.6,321.8L192.9,321.2Z M193.7,318.6L195.2,318.8L197.3,320.2L197,321.4L193.8,320.6L192.8,319.2L193.7,318.6Z M194.7,311.7L193.6,312.2L192.5,313.9L192,315.5L191.9,318.4L190,319.1L188.8,318.5L187.2,318.4L186.8,316.5L187.3,315L189.6,314.3L191.8,311.8L194.7,311.7Z M185.4,293.8L186.7,295.5L185.1,295.6L185.4,293.8Z M287.7,298.3L288.9,301.6L289.8,302.1L290.4,304.1L290.6,308.1L295.4,312.8L295.4,315L297,316.7L298.2,317L298.4,318.3L300.2,319.3L300.5,321L301.5,322L300.8,324.3L300,325.2L299.7,326.1L297.6,327.2L295.7,329L295.1,330.3L291.8,332.6L290.3,330.2L288.6,329.9L290.1,332.1L288.5,333.5L289.9,335.6L292,337.1L293.2,336L293.8,336.6L295.6,334.8L298,335.2L299.8,334.4L300.7,334.8L300.3,338.6L299.4,340.9L298.7,341.5L299.3,342.6L299,344.8L296,346.1L294.5,344.4L293,343.2L291.7,346.5L290.7,347.6L290.7,348.8L291.8,352.1L290.5,352.6L288.5,351.6L287.2,352.3L286,350.8L285.9,348.6L287,345.4L287.8,345L288.5,343L287.8,342.7L286.3,339.1L284.1,338.8L285.1,337L284.1,335.6L283.5,333.3L282.7,333.6L280.8,336L276.1,337.6L277.3,338.7L275.7,339.9L275.1,341.3L276.1,342.2L275.8,343.1L274.3,344.4L275.4,346.8L279.4,348.1L279.3,350L281.1,350L280.9,351.4L281.7,351.6L283,356.5L281.7,357.6L279.7,357.2L279,357.7L276.8,356.7L275.6,357.4L276.5,359L278.2,359.7L277.5,361.4L276.1,363.6L274.6,363.8L274.5,365.1L271.4,366.1L272,368.4L270.9,368.7L268.6,365.8L267.3,365.4L268.3,364.2L266.6,362.4L263.5,362.3L262.5,361.3L260.9,362.2L258.7,362.1L257.8,361.6L257.1,360.2L257.2,359.2L259.2,357.1L261,356.2L261.1,353.7L262.9,351.9L263.4,353.5L264.7,352.3L265,349.4L266.2,346.9L268,346.1L268.6,347.9L268.1,349.9L270.4,350.6L270.6,349.2L271.7,347.1L271,343.5L269.7,343.7L269,345.2L267.5,344.4L266.9,345.1L265.4,342.3L263.5,344.7L262.8,347.2L261.6,348.4L259,348.2L258.2,347.5L256.8,349.6L254.3,350.8L253.3,352.4L249.4,354.7L250.4,355.4L249.3,356.3L248.6,358.3L249,360.7L247.9,360.5L247,361.5L248,362.6L247.3,363.8L248.2,365L246.8,366.4L245.6,368.2L244.9,367.8L241.7,367.5L242.3,369.8L239.9,368.3L237.9,368.1L236,366.7L236.1,364.9L235.7,362.9L236.1,361.4L236.1,358.3L234.8,355.6L234.4,358.8L234.5,359.5L233.9,361.9L233.9,364.5L232.7,364.9L233.2,366.3L231.9,368.4L229.9,368.9L228.8,370L226.9,370.3L224.7,371.9L224.8,375.5L223.7,376.4L223.7,378.2L222.6,378.6L220.7,378.5L219.8,380L218.1,380.3L217.7,378.7L218.7,377.4L218.2,375.3L215.7,375.4L215.7,373.6L216.6,372.9L216.3,371.8L218,370.9L217.4,369.9L216.2,369.3L215.4,369.9L214.2,368.1L214.8,367L214,365.9L215,363.4L214.3,361.4L212.5,360.4L212.3,359.5L210.5,360.4L209,358.9L207.9,359L206,358L204.7,358.6L204.2,356.6L202.4,356.1L202.8,353.4L201.8,353.1L201.3,351L200.8,350.6L201,348.2L202.1,346.8L202.1,345.4L202.9,343L203.8,342.7L206.1,344.6L207.1,347.5L206.4,348.1L206.5,349.8L208.3,352.6L208.8,354.4L212.6,356.6L212.2,354.7L208.6,352.3L207.6,349.6L206.7,348.9L208.3,347.8L209.6,345.2L208.2,344.6L209.1,343.4L209,342.3L213.6,341L213.1,339.7L210.4,341L208.3,341.1L207.8,340.3L208.4,338.5L209.6,336.6L210.8,335.4L210,334L210.4,333.1L209.7,332.3L210.6,330.6L209.8,329.9L209.5,327.7L210,326.5L209,325.7L208.1,329.2L206.6,330.3L205.7,329.9L205.2,328L203.4,326.2L204.2,324.5L205.9,325.7L207.6,324.5L206.7,323.2L209.6,321.3L209.1,319.6L207.2,320.2L206.7,317.7L205.6,316.2L203.8,319.5L203.2,318.5L201.2,319.1L202.1,320.3L200.9,322.3L199,321.5L199.5,319.8L198.7,318.7L196.3,318.7L194.7,317.9L195,314.9L196.6,314.2L199.4,315.4L200.2,314.5L201,311.8L201.9,311.5L205.4,312.5L206.7,311.1L206.7,314L206.1,315.9L208.2,317.6L210.1,317.2L210.8,318.2L210.3,320.7L213.1,318.8L213.8,317.4L213,316.5L214.3,315.9L213.4,314.8L211.6,314.6L210.5,312.4L207.9,309.8L206.4,307.7L204.2,308.9L203.6,304.9L204.5,302.7L205.4,302.9L205.3,300L207.6,299.9L208.9,298.6L208.9,296.7L210.2,293.4L210.7,290.1L211.8,288.6L213.5,288.5L215.5,288.9L216.2,290L215.7,292.1L218.2,295L218.1,296.9L219,298.4L220.3,297.9L222.9,298.6L222.2,297L223.7,296.1L225.1,297.3L226.4,297.4L227.9,294.8L230,295L230.3,293.7L231.3,293.8L232.1,292.8L232,291.3L233.5,289L233.2,286.8L234.3,285.5L237.5,285.3L238.3,283.9L239.9,285.5L241.1,285.9L243.5,287.6L243,288.2L243.7,289.5L245.2,290.4L245.3,291.3L247.3,291.3L248.2,290.6L247.8,288.7L250.6,286.2L252,285.6L252.2,288L253,288.4L252.5,291L251.8,291.7L252.8,292.8L253.5,292.2L254.4,293.7L254,296.1L253.2,295.8L252.8,297.5L253.8,297.6L257.4,299.1L259.4,297.8L260.8,296.4L262.9,297.7L263.9,297.7L264.4,296L266.9,298.1L268.7,297.9L269.8,298.8L273.1,297.3L275,298.7L278.1,294.2L280.7,293.6L282.7,294.2L284.6,296L287.7,298.3Z M243.7,302.4L242.5,303.3L241.5,303.1L239.2,304.7L237,305.6L233.7,304.3L234.2,302.7L232.4,302.9L231.4,305L231.2,306.2L230.2,306.5L229.2,305.9L228.6,307.7L227.4,307.8L228.1,309.6L227,310L226.9,313.6L228.6,314.8L229.2,314.3L232.7,314.7L234.1,316L235.2,319.1L236.3,318.4L237.9,319.1L240.3,317L241.3,317.3L244.6,316L245.3,317.3L246.6,317.4L247.6,316.1L248.9,315.7L250.3,313.3L250.3,310.8L251.1,309.8L249.9,308.1L248.1,308.2L245.3,303.9L245.2,303L243.7,302.4Z M211.8,344.5L210.2,344.5L209.6,346.1L213.8,347.2L213.7,348.8L215,351L215.5,349.4L216.5,350.5L219.7,351.4L219.5,349.2L218.8,347.2L216.8,344.9L215,344.6L214.3,345.3L212.7,345.2L211.8,344.5Z",
      "cx": 229.8,
      "cy": 346.7,
      "region": "호남"
    },
    {
      "name": "전라북도",
      "code": "35",
      "d": "M204,272.9L204.7,273.5L204.1,274.9L203.1,275.3L201.3,277L200.4,275.7L201.8,275.5L202.2,274.3L203.2,274.3L204,272.9Z M291.6,236.6L292.7,237.6L293.1,239L294.7,237.2L295.5,237.6L296.1,239.5L297.8,239.6L301.5,241L302.3,240L305.8,239L307.3,240.4L307.3,242.5L308.5,243.4L309.4,247L307.7,248.1L308,249.1L305.7,251.2L305,253L304.3,252.8L302.9,254.1L301.5,254.2L300.5,255.3L298.7,254.9L297,258.6L295.8,259.3L293.2,261.8L293.2,265.7L292.1,266.7L291.7,269L291,269.6L290.5,271.2L291,273.2L290,274.1L289.9,275.9L288.3,277.5L288.6,278.4L290.7,280L290.9,280.8L292.6,283.9L291.6,284.5L291.5,285.8L292.1,286.8L293.6,287L293.2,289.6L291.8,290.5L289.8,293.7L290.7,295.5L290.5,296.4L288.7,298.1L287.7,298.3L284.6,296L282.7,294.2L280.7,293.6L278.1,294.2L275,298.7L273.1,297.3L269.8,298.8L268.7,297.9L266.9,298.1L264.4,296L263.9,297.7L262.9,297.7L260.8,296.4L259.4,297.8L257.4,299.1L253.8,297.6L252.8,297.5L253.2,295.8L254,296.1L254.4,293.7L253.5,292.2L252.8,292.8L251.8,291.7L252.5,291L253,288.4L252.2,288L252,285.6L250.6,286.2L247.8,288.7L248.2,290.6L247.3,291.3L245.3,291.3L245.2,290.4L243.7,289.5L243,288.2L243.5,287.6L241.1,285.9L239.9,285.5L238.3,283.9L237.5,285.3L234.3,285.5L233.2,286.8L233.5,289L232,291.3L232.1,292.8L231.3,293.8L230.3,293.7L230,295L227.9,294.8L226.4,297.4L225.1,297.3L223.7,296.1L222.2,297L222.9,298.6L220.3,297.9L219,298.4L218.1,296.9L218.2,295L215.7,292.1L216.2,290L215.5,288.9L213.5,288.5L212.3,287.8L213.1,286.5L215.8,281.2L218.2,280.1L219.7,280.6L221,279.4L223.7,279.3L224.6,278.2L224.6,277.1L226.6,277.1L227.7,278.3L228.2,276.2L225.8,275.2L224.6,275.9L221.9,275.5L219.6,275.6L218.8,276.3L216.4,275.8L214.8,274.3L214.6,271.9L215.9,270.2L216.9,270L219.1,267.6L220.9,266.7L221.5,266.9L223.6,264.9L225.2,262.6L225,259.3L226.3,258.6L230,258.5L231.9,258.9L234.6,260.3L235.1,258.3L232.2,256.9L230,255.2L229.5,254.2L232.1,253L235.8,253.2L236.5,252.5L236.7,250.8L235.6,250.1L234.6,251.2L232.4,251L231.7,251.5L230,250.8L228.5,250.7L227.9,251.7L224.5,251.4L224.2,249L224.5,246.8L223.2,246.5L218.8,247L218.3,244.5L221.4,244.1L226.3,243.9L227.8,243.5L228.7,242.2L231.7,242.6L232.3,242.1L233.2,240.3L235,239.6L237.3,239.4L238.6,238.4L240.8,237.3L241.5,234.8L241.4,233L242.7,230.8L244.7,230.9L246.9,229.5L249.1,230.4L250,230.1L251.3,231.1L253,230.6L253.8,234.6L255.1,235.9L258.5,236.5L258.8,235.1L260.8,235.4L261.5,234.5L262.9,235.2L263.2,234L265.9,234.5L266.3,233L267.7,233.5L269.1,233L269.9,232L272,231.6L273.1,233.4L273.4,234.9L273.5,237.9L274.3,239.4L276.1,241.6L277.7,240L279,241.6L279.7,243.5L280.5,243.2L281.8,244L283,243.8L284.8,242.8L285.2,241.2L285.1,239.5L288.6,240.2L289.2,241.2L290.3,241.6L291.2,238.9L290.4,238.8L290.8,236.8L291.6,236.6Z",
      "cx": 253.7,
      "cy": 265.9,
      "region": "호남"
    },
    {
      "name": "충청남도",
      "code": "34",
      "d": "M207.5,213.4L207.7,215.4L206.4,215.1L207.5,213.4Z M212.5,210.9L214.2,213.4L210.1,212.4L209.4,211.3L212.5,210.9Z M206.5,209.3L206.4,211.4L205.3,210.7L206.5,209.3Z M207.8,192.4L209.4,193L210.3,194.9L209.7,197.5L210.1,200L212.1,204.7L212.7,208.2L211.6,209.3L210.8,208.6L209.1,208.3L208.4,208.9L206.3,206.6L205.5,204.2L206,202.3L205.2,196.9L204.4,196L204.5,194.7L206.4,192.8L207.8,192.4Z M212.2,155.7L213.7,156.6L211.9,157.5L212.2,155.7Z M243.8,168.7L249.5,166.2L251.8,166.8L253.7,165.9L254.6,166L257.2,163.2L258.3,163.8L259.2,163.3L262.2,164.8L263,164.9L264.2,166.7L265.8,167.7L267.5,168L268.8,169.6L270,170.3L269.9,172.1L271.8,172.8L271.7,174.8L273.1,174.9L274.8,176.1L276.1,177.6L275.7,178.5L276.8,179.5L276.8,180.7L275.8,181.5L275.2,180.5L271.8,181.1L272.1,182.7L271.1,182.7L270,183.7L270,185L268.5,186.1L266.1,185.8L263.2,183.3L260.5,182.6L258.6,184.8L259.2,186.1L260.3,186L260.6,187.1L259.9,188.2L260.1,190.6L260,193L261.7,193.9L262.4,195L262.5,196.3L261.1,198.7L261.7,199.8L261,200.6L263.2,204.9L263,206.3L264.6,207.9L266.7,209L268.3,208.5L268.2,211.8L267.6,212.9L268,213.9L266.8,215.6L266.8,218.1L266.1,219.2L268.2,220.6L268.3,223.1L270.5,224.2L271,225.7L272.1,226.8L272.9,225L273.7,224.3L273.4,220.8L274.2,220.1L275.3,220.7L275.1,221.8L276.1,223.3L276.6,224.9L278.8,226.4L280.5,224.8L280.5,224.1L282.1,222.9L283.8,222.7L284.6,222L285.8,222.8L287.8,223.3L289,224.5L288.7,226.3L289.3,229.1L288.5,231.3L290.3,233.7L290.4,234.6L291.6,236.6L290.8,236.8L290.4,238.8L291.2,238.9L290.3,241.6L289.2,241.2L288.6,240.2L285.1,239.5L285.2,241.2L284.8,242.8L283,243.8L281.8,244L280.5,243.2L279.7,243.5L279,241.6L277.7,240L276.1,241.6L274.3,239.4L273.5,237.9L273.4,234.9L273.1,233.4L272,231.6L269.9,232L269.1,233L267.7,233.5L266.3,233L265.9,234.5L263.2,234L262.9,235.2L261.5,234.5L260.8,235.4L258.8,235.1L258.5,236.5L255.1,235.9L253.8,234.6L253,230.6L251.3,231.1L250,230.1L249.1,230.4L246.9,229.5L244.7,230.9L242.7,230.8L241.4,233L241.5,234.8L240.8,237.3L238.6,238.4L237.3,239.4L235,239.6L233.2,240.3L232.3,242.1L227.5,241.3L227.9,239.6L226.4,237.7L225.6,237.7L225.7,234.6L223.9,233.3L221.9,231L220.8,231.7L219.4,230.2L217.7,229.9L218.5,227.1L219.7,226.2L218.9,224.2L218.9,222.8L220,220.8L218.7,218.1L218.1,217.8L217.1,215.8L220.3,213.9L217.5,211.3L215.6,211.1L216.1,208.7L216.7,207.5L215.8,205.4L215.2,201.3L215.9,200.3L214.4,198.5L213.4,194.7L213.7,193.8L215.4,193L215.2,192.1L214.1,191.3L214.8,189.1L214.4,188.2L213.1,188L213.2,189.9L211.9,193.5L211.1,193.3L210,192L208,191.3L207.8,187.9L206.4,187.9L206.9,190.3L207.4,191.3L205.1,193.7L203.3,194.8L202.6,193.8L202.8,192L203.5,191.1L202.8,188.3L201.4,187.5L201.2,185.6L202,184.9L201.8,183.3L200.7,183.9L199.1,186L198,186L197,187.4L195.4,187.1L192.6,187.9L192.6,186.3L193.7,186.4L193.7,185.1L195.3,183.9L197.7,184.9L198.6,183.6L197.4,183.2L196.2,181.1L194.9,180.7L193.8,181.3L194.1,182.9L193,183.9L192.1,183.2L192.8,182.1L190.7,179.4L192.6,179.3L193.4,178.1L194.5,175.1L193.6,174L194.8,173.4L195.6,174.3L196.8,173.2L196.4,171.7L197.8,169.1L200.4,168.2L200,170.1L198.6,170.7L200,172.1L200.7,170.8L201.8,170.5L202.7,168.9L203.3,166.7L202.7,163.9L204.3,163.1L204.7,164.7L204,165.5L203.9,167.4L205.1,168.7L205.1,169.8L203.4,173.8L204.9,174.1L202.5,175.8L203.6,176.5L206.3,175.8L205.2,174.2L205.4,172.7L206.5,173.3L207.9,173.1L208.5,172L208,171L210,169.7L211,168.5L209.1,165.6L206,164.3L206.3,163L205.5,161.5L208.7,160L212,159.8L213.7,160.5L215.5,163.5L216,162.4L213.9,158.9L216.8,155.7L218.2,156.2L218.8,157.5L223.4,159.6L226.1,161.2L230.4,161L231.3,161.6L235.3,162.9L235.3,163.6L236.8,167.1L237.4,167.1L237.7,169.4L238.4,170.2L238.7,172.2L239.8,171L241.9,170.1L244,169.9L243.8,168.7Z",
      "cx": 235.3,
      "cy": 198.5,
      "region": "충청"
    },
    {
      "name": "충청북도",
      "code": "33",
      "d": "M358.3,155.7L356.8,157.8L353.8,157.4L352.6,158.5L353,159.7L351.2,161.6L349.2,162.1L349.2,162.9L345.9,165.3L345.6,166.3L344.5,166.9L344.4,169L343.3,171L344.9,172L344.9,173.3L343.1,176.3L340.5,176.1L339.5,177.2L337.4,175.9L336.5,176L334.9,174.4L334,172.6L331.3,171.3L330.8,173.4L329.5,173.3L329.8,176L326.3,175.6L324.6,174.5L322.8,175.7L322.4,176.8L321,176.9L319.3,175.9L319.1,177.8L317.6,181.5L320,183.6L320.1,184.8L318.6,184.7L316.9,183.3L315.6,184L314.6,183.9L312.9,182.4L312,183.9L310.9,184.8L310.9,185.9L308,186.1L311,188.2L311.4,189.3L310.9,192L308.2,191.1L307.2,189L306.4,190.7L305.4,190.8L305.6,192.4L303.9,192.5L302.1,194.2L303.9,195.8L306.3,196.1L307.1,197.1L307.1,198.5L308.9,199.6L309.3,201L307.6,203.2L307.7,204.8L307.1,206.7L307.7,208L307.1,209.2L308.3,213.2L307.6,214.2L305.7,215.4L305,217.1L305.7,219.8L307.5,219.9L308.3,218.5L310.9,219.6L312.1,221.4L313.3,221.8L314.3,220.7L316.1,220.1L318.5,221.4L317.4,222.7L318.7,224.7L318.9,225.9L318,226.4L316.3,225.2L314.5,225.9L313.8,226.9L315.1,229.8L314.6,231.7L313.3,232.6L312.7,234.5L312.9,236.6L311.2,238.1L309.9,237.8L309.1,239L307.3,240.4L305.8,239L302.3,240L301.5,241L297.8,239.6L296.1,239.5L295.5,237.6L294.7,237.2L293.1,239L292.7,237.6L291.6,236.6L290.4,234.6L290.3,233.7L288.5,231.3L289.3,229.1L288.7,226.3L289,224.5L287.8,223.3L285.8,222.8L284.6,222L283.8,222.7L282.1,222.9L281.7,221.1L282.4,218.9L282.7,215.1L284.4,212.2L284.2,210.8L286.2,209.8L285.4,208L283.6,207.9L282.8,209.1L281.9,207.1L282.8,205.7L281.2,205L279.5,205.7L278.4,205.1L276.2,205.2L276.3,203L275.7,202.3L276.5,202L276.6,199.7L276.1,198.3L274.9,198.2L274.2,196.7L271.9,196.5L271.1,195L270,194.8L269.5,192.2L268.1,190.6L268.6,189.1L269.5,188.7L270,186.9L268.5,186.1L270,185L270,183.7L271.1,182.7L272.1,182.7L271.8,181.1L275.2,180.5L275.8,181.5L276.8,180.7L276.8,179.5L275.7,178.5L276.1,177.6L274.8,176.1L273.1,174.9L271.7,174.8L271.8,172.8L269.9,172.1L270,170.3L268.8,169.6L270.1,166.8L272.3,165.5L272.7,164.9L274.6,164.9L276.1,163.6L275,162.3L275.6,161.2L278,160.9L279.8,159.3L279.8,157.5L281.7,156.6L282.5,157.1L283.6,156.3L286.1,157.4L287,157.2L286.9,155.9L289.2,154.1L291.2,153.2L291.6,149.6L294.8,150L296.9,146.1L297.5,146.2L298.1,144L298.9,143.4L298.6,143.9L299.3,146.7L300.2,148.2L301.6,149.3L303.3,149.1L306.4,148.3L307.1,147.7L309,148.7L310.3,147.6L311.3,145.7L310.3,142.7L312,141L314.5,140L316.7,141.2L316.7,142L318,143.5L317.4,144.6L318,145.7L320.6,145.3L322.8,144.1L323.7,143L325.6,143.5L326.8,143.2L326.9,142.1L328.6,140.8L329.9,141.5L330.4,142.5L332,142.5L333.1,144.1L336.1,142.9L337.3,143.5L336.8,145L333.6,147L332.8,148L333.4,149L334.7,149.8L337.1,148.8L337.6,148.2L341.8,149.1L341.5,150.6L343.3,151.9L346.4,152.1L347.4,151.3L349.1,151.8L349.2,152.6L350.8,153.7L352.4,153.7L354.3,154.7L356.7,154.9L358.3,155.7Z",
      "cx": 306.7,
      "cy": 183.9,
      "region": "충청"
    },
    {
      "name": "강원도",
      "code": "32",
      "d": "M405,149.1L403.4,149.2L401.1,150.6L400.5,151.7L399,151.5L398.6,152.7L397.5,153.2L395.9,155L396.4,157.4L393.9,157.7L390.4,154.4L387.4,152.9L386.1,153.5L385.4,155.5L380,154.2L378.5,154.7L377.5,153.3L376,153.5L374.3,157.4L372.9,157.4L371,156.8L369.7,154.7L368.5,154.7L367,153.9L365.7,155.8L364.8,156.3L365.5,158.1L364.8,158.7L363.7,157.7L361.4,157.7L360.7,156.7L358.3,155.7L356.7,154.9L354.3,154.7L352.4,153.7L350.8,153.7L349.2,152.6L349.1,151.8L347.4,151.3L346.4,152.1L343.3,151.9L341.5,150.6L341.8,149.1L337.6,148.2L337.1,148.8L334.7,149.8L333.4,149L332.8,148L333.6,147L336.8,145L337.3,143.5L336.1,142.9L333.1,144.1L332,142.5L330.4,142.5L329.9,141.5L328.6,140.8L326.9,142.1L326.8,143.2L325.6,143.5L323.7,143L322.8,144.1L320.6,145.3L318,145.7L317.4,144.6L318,143.5L316.7,142L316.7,141.2L314.5,140L312,141L310.3,142.7L311.3,145.7L310.3,147.6L309,148.7L307.1,147.7L306.4,148.3L303.3,149.1L301.6,149.3L300.2,148.2L299.3,146.7L298.6,143.9L298.9,143.4L298.9,140.9L299.6,140.1L299.3,136.8L300.2,136L299.7,134.2L299.6,131.2L300.8,130.9L300.9,129.4L301.9,126.6L302.6,126.2L302,123.4L300.6,121.1L300.6,119.9L302.7,117.6L305.1,117.2L305.5,116.1L303.1,115.2L301.8,113.5L300.1,113.7L299.3,112.9L296.3,113.4L295.5,112.3L292.7,110.5L291,108.8L289.3,108.1L287.8,109.6L286.5,110L285,108.8L286.1,107.3L285.9,105.4L286.7,102.5L285.3,102.6L283.1,101.7L285.5,99.3L284,96.8L284.9,95.3L284.3,94.2L284.7,92.7L286.7,91.6L288.1,89.9L289.2,90L290.3,87.4L290.1,84.7L289.4,83.5L285.5,82.4L285.7,81.6L285.2,79.8L282.7,79.9L280.8,79.3L279.8,78.5L278.9,75L279.1,74.1L278.7,71L278.1,70.5L276.9,71.5L276.3,70.7L274.9,70.5L270.9,72.1L270.2,70.4L268.4,70.4L267.9,68.7L268.6,67.5L268.8,65.5L267.6,65.1L266.6,66.6L264.4,67.9L262.2,66.8L261.5,64.8L260.7,63.6L260.9,62.5L260.4,61L259.5,60.1L258.3,60.9L257,60.2L257.2,58.3L256.9,56.1L258.8,54.7L259.2,53.1L260.2,52.7L261.7,54.1L262.7,53.9L265.8,52.3L266.8,52.9L269.1,53.2L270.2,54.1L272,52.9L272.6,53.1L275.2,52.2L277.6,52.7L279.3,54.1L281,54L281.7,55.2L283.2,55.2L285.3,53.4L288.4,52.2L289.6,52.2L291.7,53.1L295.1,52.8L295.7,51.9L297.7,52.4L298.8,51.6L300.8,51.1L302.4,53.4L305.2,53L307.8,51.9L310.5,52.4L314,53.8L319.6,54.4L325.3,51.3L329.6,48.8L331.4,47.1L331.8,46.3L334,44.5L335.2,41.5L336.1,34L335.9,31.8L336.5,30.3L338.5,30L341.5,33.8L342.1,35.9L343.2,37.4L343.2,38.7L344.3,41.1L346.2,43.2L345.4,43.6L345.5,44.9L346.4,46.5L349.3,49.6L350,52.4L351.6,54.3L352.8,58L354.2,60.2L354,61.1L354.6,63.7L355.4,64.9L355.5,67.6L357.2,70.4L359.3,72.4L360,74.5L361.6,76.5L363.1,77.9L363.8,79.4L366.2,83.5L367.4,84.3L367.3,85.1L370.3,88.1L370,89.2L373.1,92.9L373.2,93.7L380.3,100.9L382,103.5L384.8,106.1L384.9,107.4L384,108.8L384.7,110.6L388.8,114.2L389.1,115.8L388.5,117.2L389.1,118.7L391.6,122.3L393.4,124L394.1,127.2L395.6,128.8L397.6,130.1L397.6,131.5L398.7,133.1L398.8,134.8L401,136.3L400.9,137.2L402.7,138.2L402.6,139.4L404.5,141.9L403.5,142.7L404,143.8L403.4,145.2L403.5,146.6L405,149.1Z",
      "cx": 326.7,
      "cy": 104.4,
      "region": "강원"
    },
    {
      "name": "경기도",
      "code": "31",
      "d": "M224,135.9L222.4,137.1L221.5,138.3L223.3,139.7L224.1,139.7L225,141.8L226.8,142.7L226.6,143.9L224.2,143.2L223.7,144.2L222.5,143.1L221.4,144.4L219.8,144.3L219.7,142.7L220.9,141.3L221.1,140.2L220.1,138.3L221.4,138.2L222.1,137L224,135.9Z M298.9,143.4L298.1,144L297.5,146.2L296.9,146.1L294.8,150L291.6,149.6L291.2,153.2L289.2,154.1L286.9,155.9L287,157.2L286.1,157.4L283.6,156.3L282.5,157.1L281.7,156.6L279.8,157.5L279.8,159.3L278,160.9L275.6,161.2L275,162.3L276.1,163.6L274.6,164.9L272.7,164.9L272.3,165.5L270.1,166.8L268.8,169.6L267.5,168L265.8,167.7L264.2,166.7L263,164.9L262.2,164.8L259.2,163.3L258.3,163.8L257.2,163.2L254.6,166L253.7,165.9L251.8,166.8L249.5,166.2L243.8,168.7L243.5,167L242.3,166.2L240.8,166.5L240.7,165.2L239.7,164.3L238.3,162.1L238.2,161.3L236.5,160.4L235.9,158.6L233.4,158.6L233.2,157L234.1,155.5L234.7,152.7L233.9,152L234.6,150.6L236.3,150.5L236.9,148.7L236,146.8L235.2,147.6L233.1,147.6L231.9,149.7L229.3,151.6L228.3,149.8L228.9,148.9L227.5,147.8L227.8,144.1L228.6,142.9L227.7,141.8L229.2,139.7L232.3,140.7L233.8,140.3L235.9,141.2L236,139.3L238.3,137.6L236.9,137L234.8,137.5L231.7,136.5L231.5,135.6L229.6,133.9L229.3,132.7L230.1,132.2L232.5,128.9L233.5,126.7L234.6,126.3L235.2,124.4L234.5,122.7L232.8,121.5L233,119.3L234,119.1L234.5,116L234.7,116.5L238.1,117.1L238.5,118.2L237.6,121L238.1,122.4L239.2,122.4L241.1,120.9L243.4,125.8L244.9,124.6L245.8,125.6L247.3,125.2L250,123.1L250.5,124L252.2,123.9L252.1,125.2L253.2,126.2L254.1,126.2L256.2,123.8L257.5,123.5L259.4,122.3L260.4,120.4L258.9,119.7L260.5,116.8L261.5,116.6L261.7,115.5L261.2,114L256.4,115.5L256.4,113.6L257.5,111.9L256.8,108.7L255.8,108.2L256,105.1L255.1,104.5L253,105.2L250.8,104.1L250.3,105.4L249.3,106L248.4,107.8L248.8,109.3L248.1,109.7L246.3,107.5L244,108.7L243.2,111.3L243.3,112.7L241.6,114L240,114.3L238,113L237,112L236.2,113.8L232.9,112.8L231.7,112.9L230,110.9L227.2,109.2L225.9,110L225.3,111.7L224,112L221.7,113.3L220.5,111.5L220.2,110.1L218.8,108L219.2,106.9L218.4,106.1L218.7,103.9L218.1,103.1L218.6,101.1L218.7,100.2L217.9,98.7L219.3,98.3L220.5,98.6L221.3,99.6L224.1,99.9L226,97.8L227.6,96.9L228.3,93.5L227.4,92.9L229.5,90.6L228.2,89L228.6,88.1L227.8,86.2L228.3,83.4L229.4,84.4L231,84.7L233,83.7L232.7,82L234.2,81L235.3,81.2L236.4,80.3L238.6,80.4L238.1,78.9L238.7,77.1L240.1,77.3L241.4,78.3L241.9,76.6L242.7,75.7L242.7,73.8L241,73.3L239.9,72.1L238.4,73.4L238,72.7L236.4,73.2L235.6,71.8L233.2,69.4L234.6,67.3L238.3,63.7L241.4,61.7L242.9,63.2L244.9,63.3L246.6,62.7L247.5,63.8L248.7,62.6L248.1,60.8L249.1,60.6L251.5,58.9L254.4,57.8L256.9,56.1L257.2,58.3L257,60.2L258.3,60.9L259.5,60.1L260.4,61L260.9,62.5L260.7,63.6L261.5,64.8L262.2,66.8L264.4,67.9L266.6,66.6L267.6,65.1L268.8,65.5L268.6,67.5L267.9,68.7L268.4,70.4L270.2,70.4L270.9,72.1L274.9,70.5L276.3,70.7L276.9,71.5L278.1,70.5L278.7,71L279.1,74.1L278.9,75L279.8,78.5L280.8,79.3L282.7,79.9L285.2,79.8L285.7,81.6L285.5,82.4L289.4,83.5L290.1,84.7L290.3,87.4L289.2,90L288.1,89.9L286.7,91.6L284.7,92.7L284.3,94.2L284.9,95.3L284,96.8L285.5,99.3L283.1,101.7L285.3,102.6L286.7,102.5L285.9,105.4L286.1,107.3L285,108.8L286.5,110L287.8,109.6L289.3,108.1L291,108.8L292.7,110.5L295.5,112.3L296.3,113.4L299.3,112.9L300.1,113.7L301.8,113.5L303.1,115.2L305.5,116.1L305.1,117.2L302.7,117.6L300.6,119.9L300.6,121.1L302,123.4L302.6,126.2L301.9,126.6L300.9,129.4L300.8,130.9L299.6,131.2L299.7,134.2L300.2,136L299.3,136.8L299.6,140.1L298.9,140.9L298.9,143.4Z",
      "cx": 253.5,
      "cy": 115.9,
      "region": "수도권"
    },
    {
      "name": "세종특별자치시",
      "code": "29",
      "d": "M268.5,186.1L270,186.9L269.5,188.7L268.6,189.1L268.1,190.6L269.5,192.2L270,194.8L271.1,195L271.9,196.5L274.2,196.7L274.9,198.2L276.1,198.3L276.6,199.7L276.5,202L275.7,202.3L274.8,201.6L273.3,202.8L273.5,204L272.9,205.8L271.2,207.9L269.1,207.9L268.3,208.5L266.7,209L264.6,207.9L263,206.3L263.2,204.9L261,200.6L261.7,199.8L261.1,198.7L262.5,196.3L262.4,195L261.7,193.9L260,193L260.1,190.6L259.9,188.2L260.6,187.1L260.3,186L259.2,186.1L258.6,184.8L260.5,182.6L263.2,183.3L266.1,185.8L268.5,186.1Z",
      "cx": 267.2,
      "cy": 195.9,
      "region": "충청"
    },
    {
      "name": "울산광역시",
      "code": "26",
      "d": "M410.7,270.5L410.1,272.2L411.5,274.3L411.7,275.8L410.9,276.9L411.2,278L410.4,281L410,284L406.4,284.8L404.1,287L405.1,287.5L404.9,290L403.8,292.8L404.7,294.5L402.3,295.3L401.1,296.6L399.5,295.7L399.7,293.9L398.5,292L395.4,292.6L394.4,291.9L395.5,290.2L394,287.7L392.8,288.3L391.7,288L390.3,286.9L388.3,284.4L388.1,283.2L382.6,280.8L380.7,280.4L379.2,277.9L380.8,277.2L382.4,275.9L382.8,274.6L382.5,273.4L381.3,273L384.2,270.6L386,271.4L385.6,269.8L385.7,268.1L386.9,266.4L390,265.6L390.7,264.5L391.7,265.3L394.7,264.8L396.5,266.3L397.8,266.4L398.4,267.2L397.8,269.3L398.2,270.3L401,270.7L404.4,268.2L408.2,269.5L410.7,270.5Z",
      "cx": 396.4,
      "cy": 278.8,
      "region": "영남"
    },
    {
      "name": "대전광역시",
      "code": "25",
      "d": "M282.1,222.9L280.5,224.1L280.5,224.8L278.8,226.4L276.6,224.9L276.1,223.3L275.1,221.8L275.3,220.7L274.2,220.1L273.4,220.8L273.7,224.3L272.9,225L272.1,226.8L271,225.7L270.5,224.2L268.3,223.1L268.2,220.6L266.1,219.2L266.8,218.1L266.8,215.6L268,213.9L267.6,212.9L268.2,211.8L268.3,208.5L269.1,207.9L271.2,207.9L272.9,205.8L273.5,204L273.3,202.8L274.8,201.6L275.7,202.3L276.3,203L276.2,205.2L278.4,205.1L279.5,205.7L281.2,205L282.8,205.7L281.9,207.1L282.8,209.1L283.6,207.9L285.4,208L286.2,209.8L284.2,210.8L284.4,212.2L282.7,215.1L282.4,218.9L281.7,221.1L282.1,222.9Z",
      "cx": 275.9,
      "cy": 214.7,
      "region": "충청"
    },
    {
      "name": "광주광역시",
      "code": "24",
      "d": "M243.7,302.4L245.2,303L245.3,303.9L248.1,308.2L249.9,308.1L251.1,309.8L250.3,310.8L250.3,313.3L248.9,315.7L247.6,316.1L246.6,317.4L245.3,317.3L244.6,316L241.3,317.3L240.3,317L237.9,319.1L236.3,318.4L235.2,319.1L234.1,316L232.7,314.7L229.2,314.3L228.6,314.8L226.9,313.6L227,310L228.1,309.6L227.4,307.8L228.6,307.7L229.2,305.9L230.2,306.5L231.2,306.2L231.4,305L232.4,302.9L234.2,302.7L233.7,304.3L237,305.6L239.2,304.7L241.5,303.1L242.5,303.3L243.7,302.4Z",
      "cx": 238.4,
      "cy": 310.1,
      "region": "호남"
    },
    {
      "name": "인천광역시",
      "code": "23",
      "d": "M189.3,152.2L189.9,153.3L189,154.2L188,153.2L189.3,152.2Z M190.5,145.8L191.5,147.2L190.3,147.5L190.5,145.8Z M203,138.9L204.9,139.7L204,140.4L202.6,139.6L203,138.9Z M191.1,138.8L191.9,140.1L193.6,141.6L194.6,141.9L193.4,143.6L191.8,144L191.5,143L190.1,142.3L190,140.9L191.1,138.8Z M215,137.7L216.2,138L217,140L215.7,140.7L214.2,142.7L212.4,142L212.8,138.9L215,137.7Z M211.1,127.6L213,129.7L212.6,130.9L211.2,131.3L210.3,128.4L211.1,127.6Z M222.1,120.3L222.5,121.3L221.3,122L219.7,122.2L217.4,123.2L216.7,124.6L213.1,126.8L211.6,126.8L211.4,125.9L210,124.8L208.5,124.7L207.4,123.1L208.6,122.7L212.5,120.1L214.6,120.5L215.8,120.1L216.8,117.8L218.6,118.2L221.2,119.2L222.1,120.3Z M214.4,116.8L215.2,117.4L214.7,119.5L212.4,118.3L214.4,116.8Z M204.3,115.5L207.8,117.9L205.6,118.2L205.7,117.1L204.3,115.5Z M236.2,113.8L234.5,116L234,119.1L233,119.3L232.8,121.5L234.5,122.7L235.2,124.4L234.6,126.3L233.5,126.7L232.5,128.9L232,129.5L227.5,133.1L224.6,133.2L224.3,130.7L223.4,129.8L223.4,126.2L223,123.4L223.8,120.7L223.7,118.2L223.9,116L223,115.6L221.7,113.3L224,112L225.3,111.7L225.9,110L227.2,109.2L230,110.9L231.7,112.9L232.9,112.8L236.2,113.8Z M199.4,107.7L200.7,107.9L200.2,109.8L198.9,108.3L199.4,107.7Z M165.4,105.8L165.1,106.9L163.3,107.9L163.3,105.7L165.4,105.8Z M196.9,105.1L197.9,106.9L197.5,107.7L195.7,106.7L196.9,105.1Z M205.7,100.1L205.1,102.9L206.8,104.2L208.5,104.6L208.8,106.8L206.6,108.8L205.4,108.9L205.5,107.3L204.9,105.7L202.8,104.5L201.8,103.5L202.8,102.7L203.1,100.6L205.7,100.1Z M201.5,94.8L203.3,95.7L205.6,95.7L206.1,96.1L204.9,98.1L203.3,99L201.9,98.5L200.3,98.9L199,99.9L197.7,98.6L198.7,96.8L198.7,95.6L199.6,94.7L201.5,94.8Z M218.6,101.1L218.1,103.1L218.7,103.9L218.4,106.1L219.2,106.9L218.8,108L218.9,109.2L220,111.9L218.5,112.6L218,114L216.9,113.1L215.6,113.6L215.2,112.5L212.7,112.9L210.6,112.8L208.9,111.5L208.5,109.6L210.7,108.2L209.5,105L207.2,103.7L206.6,102.5L206.5,100.3L207.4,99.4L207,96.7L208.5,95.6L209.9,94L212.8,93.5L214.6,95.7L217.4,97.4L217.7,99L218.6,101.1Z M99.1,92.3L100.1,92.3L100,94.7L99.5,95.5L97.6,95.6L97.3,94.3L99.1,92.3Z M97.7,81.3L99.1,81.1L100.6,81.6L100.7,83.6L99.2,84.4L98.4,86.6L94.6,86L92.9,83L93.1,81.7L94.6,82.3L97.7,81.3Z",
      "cx": 199,
      "cy": 114.9,
      "region": "수도권"
    },
    {
      "name": "대구광역시",
      "code": "22",
      "d": "M350,268L348.9,268.6L348.6,271.5L347.3,271.8L344.8,271.6L343.8,272.8L340.5,274.1L339.8,273.8L340.7,273.7L341.9,271.3L340.5,270.2L338.8,268.1L338.5,266.3L339.1,265.9L342.9,267.1L343.9,266.3L343.8,264.5L341.2,262.9L340.8,261.4L342.2,258.7L343,257.7L346.2,257.7L346.8,256.2L345.7,255.1L343.2,254.3L341.1,254.3L340.7,253.1L341.9,251.2L342.9,248.6L344.4,247.5L346.7,247.4L346.1,249.8L346.7,250.7L347.8,250.6L349.8,248.9L350.6,247.1L350,244.2L352,244.6L354.2,243.9L356,241.7L360.8,241L363.1,241.8L363.5,243.4L364.4,244.6L363.9,245.7L364.4,246.7L363.9,248L365.1,249.1L365.6,251.6L364.8,253.8L362,256.3L362.5,258L360.3,259.3L361.1,261.8L360.9,263.9L360.3,264.8L359,264.9L357.3,266.1L356.4,266.3L355.5,264.5L355.9,263.5L353.5,263.4L351.1,265L350,268Z",
      "cx": 350.6,
      "cy": 258.2,
      "region": "영남"
    },
    {
      "name": "부산광역시",
      "code": "21",
      "d": "M401.1,296.6L398.5,297.5L398.2,300.5L397.1,301.9L397.8,303.4L396.4,306L395.9,308.3L394.2,308.9L393.9,310.3L390.1,310.9L389,312.5L389.5,314.4L389.1,315.3L387.3,315.3L385.5,314.6L385.4,313.4L384.4,313.3L383.8,314.6L385.6,315.6L386.4,317.6L387.4,318.5L386.6,319.3L383.4,316.5L382.6,318.3L381.2,319.5L379.9,319.5L378.9,320.7L377.9,317L375.9,316.4L375.3,316.9L370.3,316.9L371.3,319.2L371.2,320.7L370.3,322.3L368.4,321.7L368.8,320.1L367.8,319L369.3,318.5L370,317.5L369.5,315.4L370.7,314.7L370.1,312.9L368.1,311.9L367.6,310.6L370.8,310.6L372.3,309.8L373.3,308.6L372.6,307L373.5,306L376.1,305.8L381,304.3L381.9,301.2L384.4,300.6L385,299.4L385.9,299.8L387,298.8L388.4,298.3L389.5,295.4L390.9,293.8L392.6,294.8L393.8,294.1L394.4,291.9L395.4,292.6L398.5,292L399.7,293.9L399.5,295.7L401.1,296.6Z",
      "cx": 383.6,
      "cy": 309,
      "region": "영남"
    },
    {
      "name": "서울특별시",
      "code": "11",
      "d": "M234.5,116L236.2,113.8L237,112L238,113L240,114.3L241.6,114L243.3,112.7L243.2,111.3L244,108.7L246.3,107.5L248.1,109.7L248.8,109.3L248.4,107.8L249.3,106L250.3,105.4L250.8,104.1L253,105.2L255.1,104.5L256,105.1L255.8,108.2L256.8,108.7L257.5,111.9L256.4,113.6L256.4,115.5L261.2,114L261.7,115.5L261.5,116.6L260.5,116.8L258.9,119.7L260.4,120.4L259.4,122.3L257.5,123.5L256.2,123.8L254.1,126.2L253.2,126.2L252.1,125.2L252.2,123.9L250.5,124L250,123.1L247.3,125.2L245.8,125.6L244.9,124.6L243.4,125.8L241.1,120.9L239.2,122.4L238.1,122.4L237.6,121L238.5,118.2L238.1,117.1L234.7,116.5L234.5,116Z",
      "cx": 248.6,
      "cy": 116,
      "region": "수도권"
    }
  ]
};

  }

  // 1. GIS 지점망 관제 (현업 실무형 정밀 지리정보 벡터 맵 & 대리점 관리)
  const GIS_SITES_SEOUL = [
    { name: '강남지사 (본점)', region: '서울', gu: '강남구', org: '남서울본부', addr: '서울 강남구 테헤란로 152', installed: true, status: 'crit', total: 4, inst: 4, block: 0, crit: 70, cx: 420.6, cy: 364.3 },
    { name: '역삼지사', region: '서울', gu: '강남구', org: '남서울본부', addr: '서울 강남구 논현로 508', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 12, cx: 410.0, cy: 382.0 },
    { name: '서초지사', region: '서울', gu: '서초구', org: '남서울본부', addr: '서울 서초구 반포대로 120', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 376.9, cy: 395.0 },
    { name: '양재 CS센터', region: '서울', gu: '서초구', org: '남서울본부', addr: '서울 서초구 양재대로 1544 2층', installed: true, status: 'crit', total: 1, inst: 1, block: 0, crit: 18, cx: 385.0, cy: 422.0 },
    { name: '송파지사', region: '서울', gu: '송파구', org: '동남본부', addr: '서울 송파구 송파대로 345', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 12, cx: 480.6, cy: 350.2 },
    { name: '잠실지사', region: '서울', gu: '송파구', org: '동남본부', addr: '서울 송파구 올림픽로 300', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 468.0, cy: 332.0 },
    { name: '강동지사', region: '서울', gu: '강동구', org: '동남본부', addr: '서울 강동구 천호대로 1057', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 516.2, cy: 271.0 },
    { name: '마포지사', region: '서울', gu: '마포구', org: '서부본부', addr: '서울 마포구 마포대로 130', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 246.2, cy: 252.1 },
    { name: '상암 DMC센터', region: '서울', gu: '마포구', org: '서부본부', addr: '서울 마포구 월드컵북로 396', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 216.0, cy: 236.0 },
    { name: '영등포지사', region: '서울', gu: '영등포구', org: '서부본부', addr: '서울 영등포구 여의대로 108', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 229.5, cy: 312.3 },
    { name: '여의도 금융허브', region: '서울', gu: '영등포구', org: '서부본부', addr: '서울 영등포구 국제금융로 10', installed: true, status: 'pass', total: 3, inst: 3, block: 0, crit: 0, cx: 252.0, cy: 296.0 },
    { name: '용산지사', region: '서울', gu: '용산구', org: '중부본부', addr: '서울 용산구 한강대로 405', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 326.6, cy: 289.8 },
    { name: '종로지사', region: '서울', gu: '종로구', org: '강북본부', addr: '서울 종로구 율곡로 84', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 306.5, cy: 199.9 },
    { name: '중구 서울시청점', region: '서울', gu: '중구', org: '강북본부', addr: '서울 중구 세종대로 110', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 322.2, cy: 241.6 },
    { name: '성동지사', region: '서울', gu: '성동구', org: '동부본부', addr: '서울 성동구 왕십리로 241', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 387.6, cy: 252.9 },
    { name: '광진지사', region: '서울', gu: '광진구', org: '동부본부', addr: '서울 광진구 능동로 120', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 449.6, cy: 258.9 },
    { name: '동대문지사', region: '서울', gu: '동대문구', org: '동부본부', addr: '서울 동대문구 왕산로 200', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 394.0, cy: 208.5 },
    { name: '은평지사', region: '서울', gu: '은평구', org: '북부본부', addr: '서울 은평구 통일로 715', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 240.2, cy: 145.4 },
    { name: '서대문지사', region: '서울', gu: '서대문구', org: '북부본부', addr: '서울 서대문구 통일로 97', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 261.2, cy: 217.2 },
    { name: '강서지사', region: '서울', gu: '강서구', org: '남서울본부', addr: '서울 강서구 등촌로 223', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 5, cx: 108.1, cy: 256.9 },
    { name: '구로 디지털지사', region: '서울', gu: '구로구', org: '서남본부', addr: '서울 구로구 디지털로 300', installed: true, status: 'crit', total: 3, inst: 3, block: 0, crit: 4, cx: 158.4, cy: 359.1 },
    { name: '금천 가산지사', region: '서울', gu: '금천구', org: '서남본부', addr: '서울 금천구 가산디지털1로 168', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 217.8, cy: 412.0 },
    { name: '관악지사', region: '서울', gu: '관악구', org: '남서울본부', addr: '서울 관악구 남부순환로 1673', installed: false, status: 'crit', total: 1, inst: 0, block: 0, crit: 2, cx: 263.0, cy: 399.9 }
  ];

  const GIS_SITES_NATIONWIDE = [
    ...GIS_SITES_SEOUL,
    { name: '수원 영통지사', region: '수도권', prov: '수도권', org: '경기남부', addr: '경기 수원시 영통구 광교중앙로 170', installed: true, status: 'crit', total: 3, inst: 3, block: 0, crit: 6, cx: 250.0, cy: 145.0 },
    { name: '성남 판교지사', region: '수도권', prov: '수도권', org: '경기남부', addr: '경기 성남시 분당구 판교역로 146', installed: true, status: 'pass', total: 4, inst: 4, block: 0, crit: 0, cx: 265.0, cy: 132.0 },
    { name: '인천 송도지사', region: '수도권', prov: '수도권', org: '인천본부', addr: '인천 연수구 컨벤시아대로 165', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 212.0, cy: 125.0 },
    { name: '춘천지사', region: '강원', prov: '강원', org: '강원본부', addr: '강원특별자치도 춘천시 중앙로 16', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 305.0, cy: 82.0 },
    { name: '강릉지사', region: '강원', prov: '강원', org: '강원본부', addr: '강원특별자치도 강릉시 경강로 2177', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 3, cx: 378.0, cy: 95.0 },
    { name: '원주지사', region: '강원', prov: '강원', org: '강원본부', addr: '강원특별자치도 원주시 시청로 1', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 318.0, cy: 132.0 },
    { name: '대전 연구단지지사', region: '충청', prov: '충청', org: '충청본부', addr: '대전 유성구 대덕대로 512', installed: true, status: 'crit', total: 3, inst: 3, block: 0, crit: 11, cx: 275.9, cy: 214.7 },
    { name: '세종 정부청사지사', region: '충청', prov: '충청', org: '충청본부', addr: '세종 도움6로 11', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 267.2, cy: 195.9 },
    { name: '천안지사', region: '충청', prov: '충청', org: '충청본부', addr: '충남 천안시 서북구 번영로 156', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 246.0, cy: 172.0 },
    { name: '청주지사', region: '충청', prov: '충청', org: '충청본부', addr: '충북 청주시 상당구 상당로 82', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 295.0, cy: 182.0 },
    { name: '대구 동성로지사', region: '영남', prov: '영남', org: '경북본부', addr: '대구 수성구 달구벌대로 2450', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 8, cx: 350.6, cy: 258.2 },
    { name: '포항 철강지사', region: '영남', prov: '영남', org: '경북본부', addr: '경북 포항시 남구 포스코대로 340', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 405.0, cy: 238.0 },
    { name: '부산 센텀지사', region: '영남', prov: '영남', org: '경남본부', addr: '부산 해운대구 센텀중앙로 78', installed: true, status: 'crit', total: 4, inst: 4, block: 0, crit: 15, cx: 383.6, cy: 309.0 },
    { name: '울산 삼산지사', region: '영남', prov: '영남', org: '경남본부', addr: '울산 남구 삼산로 247', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 396.4, cy: 278.8 },
    { name: '창원 국가산단지사', region: '영남', prov: '영남', org: '경남본부', addr: '경남 창원시 성산구 중앙대로 151', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 348.0, cy: 312.0 },
    { name: '광주 상무지사', region: '호남', prov: '호남', org: '호남본부', addr: '광주 서구 상무중앙로 36', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 5, cx: 238.4, cy: 310.1 },
    { name: '전주 효자지사', region: '호남', prov: '호남', org: '호남본부', addr: '전북 전주시 완산구 효자로 225', installed: true, status: 'pass', total: 2, inst: 2, block: 0, crit: 0, cx: 253.7, cy: 265.9 },
    { name: '순천지사', region: '호남', prov: '호남', org: '호남본부', addr: '전남 순천시 백강로 38', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 270.0, cy: 345.0 },
    { name: '목포 항만지사', region: '호남', prov: '호남', org: '호남본부', addr: '전남 목포시 통일대로 102', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 205.0, cy: 355.0 },
    { name: '제주 첨단지사', region: '제주', prov: '제주', org: '제주본부', addr: '제주 제주시 첨단로 213-4', installed: true, status: 'crit', total: 2, inst: 2, block: 0, crit: 3, cx: 223.4, cy: 445.0 },
    { name: '서귀포 혁신지사', region: '제주', prov: '제주', org: '제주본부', addr: '제주 서귀포시 일주동로 8646', installed: true, status: 'pass', total: 1, inst: 1, block: 0, crit: 0, cx: 223.4, cy: 465.0 }
  ];

  const GIS_CASES = [
    { id: 'SC-002891', title: 'CPE Adding Dynamic Route Failure - Level critical', level: 'crit', state: 'CPE', target: 'KTNG-BSU-SD-2006', agent: '미배정' },
    { id: 'SC-002890', title: 'CPE Adding Dynamic Route Failure - Level critical', level: 'crit', state: 'CPE', target: 'KTNG-NSU-HQ-2009', agent: '미배정' },
    { id: 'SC-002882', title: 'CPE Adding Dynamic Route Failure - Level critical', level: 'crit', state: 'CPE', target: 'KTNG-BSU-KY-2008', agent: '미배정' },
    { id: 'SC-005284', title: 'CPE WAN Latency High - Level major', level: 'high', state: 'WAN', target: 'KTNG-KW-KR-2003', agent: '미배정' },
    { id: 'SC-005283', title: 'CPE WAN Latency High - Level major', level: 'high', state: 'WAN', target: 'KTNG-KN-TY-2006', agent: '미배정' },
    { id: 'SC-005282', title: 'CPE WAN Latency High - Level major', level: 'high', state: 'WAN', target: 'KTNG-SS-US-2008', agent: '미배정' },
    { id: 'SC-005280', title: 'CPE WAN Latency High - Level major', level: 'high', state: 'WAN', target: 'KTNG-KW-KR-2000', agent: '미배정' },
    { id: 'SC-003270', title: 'CPE WAN Latency High - Level major', level: 'high', state: 'WAN', target: 'KTNG-CB-JC-2006', agent: '미배정' }
  ];

  let gisMode = 'seoul'; // 'seoul' or 'nationwide'
  let gisSitePage = 1;
  let gisSitePageSize = 10;
  let gisSiteSearchQuery = '';
  let gisDistrictFilter = '';

  function initGisMap() {
    const pathsGroup = $('gis-map-paths-group');
    const radarGroup = $('gis-map-radar-group');
    const tooltip = $('gis-tooltip');
    if (!pathsGroup || !radarGroup) return;

    function renderMapGeometry() {
      const mapVectors = window.LumosMapVectors;

      const svgMap = $('gis-svg-map');
      if (gisMode === 'seoul') {
        svgMap?.setAttribute('viewBox', '30 45 540 430');
        if ($('gis-current-mode-tag')) $('gis-current-mode-tag').textContent = 'Seoul';
        if ($('gis-case-region-label')) $('gis-case-region-label').textContent = '(서울)';
        if ($('mobile-case-badge')) $('mobile-case-badge').textContent = '(서울)';
        if ($('gis-stat-total')) $('gis-stat-total').textContent = '23';

        if (mapVectors && mapVectors.seoul) {
          const districtPaths = mapVectors.seoul.map(gu => {
            const isSelected = gisDistrictFilter === gu.name || (!gisDistrictFilter && gu.name === '강남구');
            const isGangnam = gu.name === '강남구';
            const fill = isGangnam ? 'rgba(0, 229, 255, 0.28)' : '#0D1F33';
            const stroke = isGangnam ? '#00E5FF' : '#1E3A5F';
            const strokeWidth = isGangnam ? '2.2' : '1.2';
            const filterAttr = isGangnam ? 'filter="url(#radar-glow)"' : '';
            const activeClass = isSelected ? 'active-district' : '';

            return `<path class="gis-district-polygon ${activeClass}" data-gu="${gu.name}" d="${gu.d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${filterAttr}/>`;
          }).join('\n');

          // River ribbon removed per user feedback

          // Key District Typography at exact mathematical centroids
          const guLabels = [
            { name: '강남구', cx: 420.6, cy: 364.3, isMain: true },
            { name: '서초구', cx: 376.9, cy: 401.0 },
            { name: '송파구', cx: 480.6, cy: 350.2 },
            { name: '강동구', cx: 516.2, cy: 271.0 },
            { name: '종로구', cx: 306.5, cy: 199.9 },
            { name: '중구', cx: 322.2, cy: 241.6 },
            { name: '용산구', cx: 326.6, cy: 289.8 },
            { name: '마포구', cx: 246.2, cy: 252.1 },
            { name: '영등포구', cx: 229.5, cy: 312.3 },
            { name: '강서구', cx: 108.1, cy: 256.9 },
            { name: '노원구', cx: 429.7, cy: 96.1 },
            { name: '은평구', cx: 240.2, cy: 145.4 },
            { name: '동대문구', cx: 394.0, cy: 208.5 },
            { name: '성동구', cx: 387.6, cy: 252.9 },
            { name: '관악구', cx: 263.0, cy: 399.9 }
          ].map(l => {
            const isMain = l.isMain;
            const color = isMain ? '#00E5FF' : 'var(--fg-tertiary)';
            const weight = isMain ? '800' : '600';
            const filter = isMain ? 'filter="url(#radar-glow)"' : '';
            return `<text x="${l.cx}" y="${l.cy - 12}" fill="${color}" font-size="${isMain ? 11 : 9.5}" font-weight="${weight}" text-anchor="middle" ${filter} pointer-events="none">${l.name}</text>`;
          }).join('\n');

          pathsGroup.innerHTML = districtPaths + '\n' + guLabels;
        }

        // District click & hover handlers
        qsa('.gis-district-polygon', pathsGroup).forEach(path => {
          path.addEventListener('click', () => {
            const gu = path.dataset.gu;
            if (gisDistrictFilter === gu) {
              gisDistrictFilter = '';
            } else {
              gisDistrictFilter = gu;
              showToast('info', `${gu} 지점 관제`, `${gu} 관할 대리점 및 보안 케이스를 필터링합니다.`);
            }
            gisSitePage = 1;
            renderMapGeometry();
            renderSitesTable();
          });
        });
      } else {
        svgMap?.setAttribute('viewBox', '110 30 440 470');
        if ($('gis-current-mode-tag')) $('gis-current-mode-tag').textContent = 'Korea Nationwide';
        if ($('gis-case-region-label')) $('gis-case-region-label').textContent = '(전국)';
        if ($('mobile-case-badge')) $('mobile-case-badge').textContent = '(전국)';
        if ($('gis-stat-total')) $('gis-stat-total').textContent = '164';

        if (mapVectors && mapVectors.skorea) {
          const provPaths = mapVectors.skorea.map(prov => {
            const isSelected = gisDistrictFilter === prov.region || gisDistrictFilter === prov.name;
            const isCapital = prov.region === '수도권';
            const fill = isCapital ? '#122D4B' : '#0D2138';
            const stroke = '#1E3A5F';
            const strokeWidth = '1.3';
            const activeClass = isSelected ? 'active-province' : '';

            return `<path class="gis-province-polygon ${activeClass}" data-region="${prov.region}" data-prov="${prov.name}" d="${prov.d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
          }).join('\n');

          const regionLabels = `
            <!-- 동해 & 서해 도서 -->
            <circle cx="503" cy="120" r="3" fill="#0E253D" stroke="#00E5FF" stroke-width="1.2"/>
            <text x="503" y="112" fill="#00E5FF" font-size="8.5" font-weight="700" text-anchor="middle">울릉도</text>
            <circle cx="525" cy="132" r="2" fill="#00E5FF"/>
            <text x="525" y="143" fill="#00E5FF" font-size="8" font-weight="700" text-anchor="middle">독도</text>
            <circle cx="130" cy="90" r="2" fill="#00E5FF"/>
            <text x="130" y="83" fill="#00E5FF" font-size="7.5" font-weight="700" text-anchor="middle">백령도</text>

            <!-- 수도권 (서울/인천/수원) -->
            <circle cx="248" cy="116" r="3.5" fill="#00E5FF"/>
            <text x="248" y="108" fill="#00E5FF" font-size="10.5" font-weight="800" text-anchor="middle">서울</text>
            <circle cx="212" cy="122" r="2.5" fill="#94A3B8"/>
            <text x="196" y="125" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="end">인천</text>
            <circle cx="246" cy="142" r="2.5" fill="#94A3B8"/>
            <text x="246" y="153" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="middle">수원</text>

            <!-- 강원권 (춘천/속초/강릉/원주) -->
            <circle cx="295" cy="85" r="2.5" fill="#94A3B8"/>
            <text x="295" y="78" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="middle">춘천</text>
            <circle cx="360" cy="72" r="2.5" fill="#94A3B8"/>
            <text x="360" y="65" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="middle">속초</text>
            <circle cx="378" cy="100" r="2.8" fill="#00E5FF"/>
            <text x="398" y="103" fill="#00E5FF" font-size="9.5" font-weight="700" text-anchor="start">강릉</text>
            <circle cx="312" cy="128" r="2.5" fill="#94A3B8"/>
            <text x="312" y="139" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="middle">원주</text>

            <!-- 충청권 (서산/천안/충주/청주/세종/대전) -->
            <circle cx="190" cy="172" r="2.5" fill="#94A3B8"/>
            <text x="175" y="175" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="end">서산</text>
            <circle cx="242" cy="170" r="2.5" fill="#94A3B8"/>
            <text x="242" y="163" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="middle">천안</text>
            <circle cx="290" cy="165" r="2.5" fill="#94A3B8"/>
            <text x="306" y="168" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="start">충주</text>
            <circle cx="290" cy="188" r="2.5" fill="#94A3B8"/>
            <text x="306" y="191" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="start">청주</text>
            <circle cx="248" cy="198" r="2.5" fill="#94A3B8"/>
            <text x="232" y="201" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="end">세종</text>
            <circle cx="272" cy="216" r="3.2" fill="#00E5FF"/>
            <text x="272" y="228" fill="#00E5FF" font-size="10" font-weight="700" text-anchor="middle">대전</text>

            <!-- 호남권 (군산/전주/광주/목포/순천/여수) -->
            <circle cx="200" cy="250" r="2.5" fill="#94A3B8"/>
            <text x="185" y="253" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="end">군산</text>
            <circle cx="248" cy="266" r="2.8" fill="#00E5FF"/>
            <text x="248" y="258" fill="#00E5FF" font-size="9.5" font-weight="700" text-anchor="middle">전주</text>
            <circle cx="235" cy="315" r="3.2" fill="#00E5FF"/>
            <text x="235" y="327" fill="#00E5FF" font-size="10" font-weight="700" text-anchor="middle">광주</text>
            <circle cx="198" cy="358" r="2.5" fill="#94A3B8"/>
            <text x="182" y="361" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="end">목포</text>
            <circle cx="268" cy="345" r="2.5" fill="#94A3B8"/>
            <text x="268" y="337" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="middle">순천</text>
            <circle cx="288" cy="362" r="2.5" fill="#94A3B8"/>
            <text x="303" y="365" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="start">여수</text>

            <!-- 영남권 (안동/포항/대구/울산/진주/창원/부산) -->
            <circle cx="345" cy="195" r="2.5" fill="#94A3B8"/>
            <text x="345" y="187" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="middle">안동</text>
            <circle cx="410" cy="240" r="2.8" fill="#94A3B8"/>
            <text x="425" y="243" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="start">포항</text>
            <circle cx="348" cy="260" r="3.2" fill="#00E5FF"/>
            <text x="348" y="252" fill="#00E5FF" font-size="10" font-weight="700" text-anchor="middle">대구</text>
            <circle cx="405" cy="280" r="3" fill="#00E5FF"/>
            <text x="420" y="283" fill="#00E5FF" font-size="9.5" font-weight="700" text-anchor="start">울산</text>
            <circle cx="305" cy="310" r="2.5" fill="#94A3B8"/>
            <text x="290" y="313" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="end">진주</text>
            <circle cx="345" cy="318" r="2.8" fill="#94A3B8"/>
            <text x="345" y="329" fill="#CBD5E1" font-size="9" font-weight="600" text-anchor="middle">창원</text>
            <circle cx="385" cy="315" r="3.5" fill="#00E5FF"/>
            <text x="402" y="318" fill="#00E5FF" font-size="10.5" font-weight="800" text-anchor="start">부산</text>

            <!-- 제주권 (제주/서귀포) -->
            <circle cx="218" cy="446" r="3" fill="#00E5FF"/>
            <text x="218" y="438" fill="#00E5FF" font-size="9.5" font-weight="700" text-anchor="middle">제주</text>
            <circle cx="218" cy="472" r="2.5" fill="#94A3B8"/>
            <text x="218" y="483" fill="#CBD5E1" font-size="8.5" font-weight="600" text-anchor="middle">서귀포</text>
          `;

          pathsGroup.innerHTML = provPaths + '\n' + regionLabels;
        }

        qsa('.gis-province-polygon', pathsGroup).forEach(elem => {
          elem.addEventListener('click', () => {
            const reg = elem.dataset.region;
            if (gisDistrictFilter === reg) {
              gisDistrictFilter = '';
            } else {
              gisDistrictFilter = reg;
              showToast('info', `${reg} 권역 관제`, `${reg} 권역 지점을 필터링합니다.`);
            }
            gisSitePage = 1;
            renderMapGeometry();
            renderSitesTable();
          });
        });
      }

      // Render Pulsating Radar Blip Nodes with mode-adaptive projection coordinates
      const list = gisMode === 'seoul' ? GIS_SITES_SEOUL : GIS_SITES_NATIONWIDE;
      radarGroup.innerHTML = '';
      list.forEach((site) => {
        // When in nationwide mode, condense Seoul sites around Seoul centroid (248.6, 116.0)
        const posX = (gisMode === 'nationwide' && site.region === '서울')
          ? Number((248.6 + (site.cx - 300) * 0.05).toFixed(1))
          : site.cx;
        const posY = (gisMode === 'nationwide' && site.region === '서울')
          ? Number((116.0 + (site.cy - 250) * 0.05).toFixed(1))
          : site.cy;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'gis-radar-node');
        g.setAttribute('transform', `translate(${posX}, ${posY})`);
        g.style.cursor = 'pointer';

        const isCrit = site.crit > 0;
        const color = isCrit ? '#EF4444' : '#10B981';

        g.innerHTML = `
          <!-- Pulsing Concentric Radar Waves -->
          <circle cx="0" cy="0" r="16" fill="${color}" opacity="0.18">
            <animate attributeName="r" values="8;24" dur="2.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.45;0" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="9" fill="${color}" opacity="0.35"/>
          <circle cx="0" cy="0" r="4" fill="${color}" stroke="#FFFFFF" stroke-width="1.5"/>
        `;

        g.addEventListener('mouseenter', () => {
          $('gis-tt-title').textContent = site.name;
          $('gis-tt-total').textContent = site.total;
          $('gis-tt-installed').textContent = site.inst;
          $('gis-tt-block').textContent = site.block;
          $('gis-tt-crit').textContent = site.crit;
          tooltip.hidden = false;
          tooltip.style.left = `${posX + 14}px`;
          tooltip.style.top = `${posY - 20}px`;
        });
        g.addEventListener('mouseleave', () => { tooltip.hidden = true; });
        g.addEventListener('click', () => {
          showToast(isCrit ? 'warning' : 'success', site.name, `지점 상태: ${isCrit ? '경보 확인 필요 (' + site.crit + '건)' : '정상 통신 중'}`);
          gisSiteSearchQuery = site.name;
          if ($('gis-site-search')) $('gis-site-search').value = site.name;
          gisSitePage = 1;
          renderSitesTable();
        });

        radarGroup.appendChild(g);
      });
    }

    function renderSitesTable() {
      const tbody = $('gis-sites-tbody');
      const countInfo = $('gis-site-count-info');
      if (!tbody) return;

      const list = gisMode === 'seoul' ? GIS_SITES_SEOUL : GIS_SITES_NATIONWIDE;
      const q = (gisSiteSearchQuery || '').toLowerCase().trim();

      const filtered = list.filter(s => {
        const matchQ = !q || s.name.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q) || s.region.toLowerCase().includes(q) || (s.gu && s.gu.includes(q));
        const matchDistrict = !gisDistrictFilter || (s.gu && s.gu === gisDistrictFilter) || (s.prov && s.prov === gisDistrictFilter) || s.region.includes(gisDistrictFilter);
        return matchQ && matchDistrict;
      });

      const total = filtered.length;
      const totalPages = Math.ceil(total / gisSitePageSize) || 1;
      gisSitePage = Math.min(Math.max(1, gisSitePage), totalPages);

      const startIdx = (gisSitePage - 1) * gisSitePageSize;
      const endIdx = Math.min(startIdx + gisSitePageSize, total);
      const pageSlice = filtered.slice(startIdx, endIdx);

      if (countInfo) {
        countInfo.textContent = total > 0 
          ? `전체 ${total}개 중 ${startIdx + 1} - ${endIdx}개 표시`
          : '검색 결과 없음';
      }

      if (pageSlice.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:30px; color:var(--fg-tertiary);">
              조건과 일치하는 대리점 지점이 없습니다.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = pageSlice.map(s => `
          <tr>
            <td>
              <span class="gis-shield-icon ${s.status === 'crit' ? 'crit' : 'pass'}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
            </td>
            <td><span class="mono">${s.region}</span></td>
            <td>
              <div class="gis-site-title">${escapeHtml(s.name)}</div>
              <div class="gis-site-org mono muted">${escapeHtml(s.org)}</div>
            </td>
            <td><span class="gis-addr-text">${escapeHtml(s.addr)}</span></td>
            <td style="text-align: center;">
              <span class="gis-inst-pill ${s.installed ? 'installed' : 'uninstalled'}">${s.installed ? '설치됨' : '미설치'}</span>
            </td>
          </tr>
        `).join('');
      }

      // 동적 페이지네이션 바 렌더링
      renderPaginationBar(totalPages);
    }

    function renderPaginationBar(totalPages) {
      const pagWrap = document.querySelector('.gis-pagination');
      if (!pagWrap) return;

      let html = `<button type="button" class="btn-page" id="gis-page-prev" ${gisSitePage <= 1 ? 'disabled' : ''}>Previous</button>`;
      for (let p = 1; p <= totalPages; p++) {
        html += `<button type="button" class="btn-page ${p === gisSitePage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
      html += `<button type="button" class="btn-page" id="gis-page-next" ${gisSitePage >= totalPages ? 'disabled' : ''}>Next</button>`;

      pagWrap.innerHTML = html;

      // Event handlers
      $('gis-page-prev')?.addEventListener('click', () => {
        if (gisSitePage > 1) {
          gisSitePage--;
          renderSitesTable();
        }
      });

      $('gis-page-next')?.addEventListener('click', () => {
        if (gisSitePage < totalPages) {
          gisSitePage++;
          renderSitesTable();
        }
      });

      qsa('.btn-page[data-page]', pagWrap).forEach(btn => {
        btn.addEventListener('click', () => {
          gisSitePage = Number(btn.dataset.page);
          renderSitesTable();
        });
      });
    }

    function renderCasesTable(filter = '') {
      const tbody = $('gis-cases-tbody');
      if (!tbody) return;
      const q = filter.toLowerCase().trim();
      const filtered = GIS_CASES.filter(c => !q || c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.target.toLowerCase().includes(q));
      tbody.innerHTML = filtered.map(c => `
        <tr>
          <td><strong class="mono text-cyan">${c.id}</strong></td>
          <td><span class="gis-case-title">${escapeHtml(c.title)}</span></td>
          <td style="text-align: center;">
            <span class="badge ${c.level === 'crit' ? 'badge-critical' : 'badge-warn'}">${c.level === 'crit' ? '치명' : '높음'}</span>
          </td>
          <td style="text-align: center;"><span class="badge badge-info">${c.state}</span></td>
          <td><span class="mono muted">${c.target}</span></td>
          <td style="text-align: center;"><span class="muted">${c.agent}</span></td>
        </tr>
      `).join('');
    }

    // Toggle button handler
    const toggleBtn = $('btn-gis-toggle-mode');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (gisMode === 'seoul') {
          gisMode = 'nationwide';
          toggleBtn.textContent = '← Seoul (구별 상세)';
        } else {
          gisMode = 'seoul';
          toggleBtn.textContent = '← Nationwide (전국)';
        }
        gisDistrictFilter = '';
        gisSitePage = 1;
        renderMapGeometry();
        renderSitesTable();
      });
    }

    // Reset button
    $('btn-gis-reset')?.addEventListener('click', () => {
      gisMode = 'seoul';
      if (toggleBtn) toggleBtn.textContent = '← Nationwide (전국)';
      gisDistrictFilter = '';
      gisSiteSearchQuery = '';
      gisSitePage = 1;
      if ($('gis-site-search')) $('gis-site-search').value = '';
      if ($('gis-case-search')) $('gis-case-search').value = '';
      renderMapGeometry();
      renderSitesTable();
      renderCasesTable();
      showToast('info', '관제 맵 초기화', '서울시 25개 구 전체 관제 뷰로 초기화되었습니다.');
    });

    // Search events & SEARCH button
    const siteInput = $('gis-site-search');
    const siteSearchBtn = $('gis-site-search-btn');

    function doSiteSearch() {
      gisSiteSearchQuery = siteInput?.value.trim() || '';
      gisSitePage = 1;
      renderSitesTable();
    }

    siteSearchBtn?.addEventListener('click', doSiteSearch);
    siteInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSiteSearch(); });
    siteInput?.addEventListener('input', (e) => {
      gisSiteSearchQuery = e.target.value.trim();
      gisSitePage = 1;
      renderSitesTable();
    });

    // Case search events & SEARCH button
    const caseInput = $('gis-case-search');
    const caseSearchBtn = $('gis-case-search-btn');

    function doCaseSearch() {
      renderCasesTable(caseInput?.value.trim() || '');
    }

    caseSearchBtn?.addEventListener('click', doCaseSearch);
    caseInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCaseSearch(); });
    caseInput?.addEventListener('input', (e) => renderCasesTable(e.target.value.trim()));

    // Page size selector (10, 20, 50)
    qsa('.gis-page-sizes .btn-size').forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.gis-page-sizes .btn-size').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gisSitePageSize = Number(btn.textContent.trim()) || 10;
        gisSitePage = 1;
        renderSitesTable();
      });
    });

    $('btn-sites-refresh')?.addEventListener('click', () => {
      const now = new Date();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = months[now.getMonth()];
      const d = now.getDate();
      const y = now.getFullYear();
      let h = now.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const min = String(now.getMinutes()).padStart(2, '0');
      const syncEl = $('gis-last-sync-time');
      if (syncEl) syncEl.textContent = `마지막 갱신 : ${m} ${d}, ${y} ${h}:${min} ${ampm}`;
      renderMapGeometry();
      renderSitesTable();
      renderCasesTable();
      showToast('info', '대리점 데이터 갱신', '지점 관제망 텔레메트리가 실시간 동기화되었습니다.');
    });

    
    // --- Floating Mobile Hub Toggle & Tab Handlers ---
    const mobileHub = $('gis-mobile-hub');
    const hubToggleBtn = $('btn-toggle-mobile-hub');
    const hubCloseBtn = $('btn-close-mobile-hub');
    const tabSites = $('btn-hub-tab-sites');
    const tabCases = $('btn-hub-tab-cases');
    const panelSites = $('hub-panel-sites');
    const panelCases = $('hub-panel-cases');

    function openMobileHub() {
      if (!mobileHub) return;
      mobileHub.hidden = false;
      if (hubToggleBtn) hubToggleBtn.hidden = true;
    }

    function closeMobileHub() {
      if (!mobileHub) return;
      mobileHub.hidden = true;
      if (hubToggleBtn) hubToggleBtn.hidden = false;
    }

    hubToggleBtn?.addEventListener('click', openMobileHub);
    hubCloseBtn?.addEventListener('click', closeMobileHub);

    tabSites?.addEventListener('click', () => {
      tabSites.classList.add('active');
      tabCases?.classList.remove('active');
      if (panelSites) panelSites.hidden = false;
      if (panelCases) panelCases.hidden = true;
    });

    tabCases?.addEventListener('click', () => {
      tabCases.classList.add('active');
      tabSites?.classList.remove('active');
      if (panelCases) panelCases.hidden = false;
      if (panelSites) panelSites.hidden = true;
    });

    window.__filterGisSites = (condition) => {
      if (condition === 'status:crit') {
        const list = gisMode === 'seoul' ? GIS_SITES_SEOUL : GIS_SITES_NATIONWIDE;
        const critList = list.filter(s => s.status === 'crit');
        gisSiteSearchQuery = '';
        gisDistrictFilter = '';
        gisSitePage = 1;
        renderSitesTable();
        showToast('warning', '경보 지점 필터', `경보(Critical) 발생 지점 ${critList.length}개를 표시합니다.`);
      } else if (condition === 'status:pass') {
        gisSiteSearchQuery = '';
        gisDistrictFilter = '';
        gisSitePage = 1;
        renderSitesTable();
        showToast('success', '정상 지점 필터', '정상 작동 중인 지점을 표시합니다.');
      }
    };

    renderMapGeometry();
    renderSitesTable();
    renderCasesTable();
  }

  // 2. 인프라 토폴로지 (Image 5: 센터 연결 정보 7계층 토폴로지)
  const TOPOLOGY_TIERS = [
    {
      name: '디바이스',
      nodes: [
        { id: 'dev-01', name: 'Device 01', ip: '172.16.27.10', alert: false },
        { id: 'dev-02', name: 'Device 02', ip: '172.16.27.11', alert: false },
        { id: 'dev-03', name: 'Device 03', ip: '172.16.27.12', alert: true },
        { id: 'dev-04', name: 'Device 04', ip: '172.16.27.13', alert: false },
        { id: 'dev-05', name: 'Device 05', ip: '172.16.27.14', alert: false },
        { id: 'dev-06', name: 'Device 06', ip: '172.16.27.15', alert: false },
        { id: 'dev-07', name: 'Device 07', ip: '172.16.27.16', alert: false },
        { id: 'dev-08', name: 'Device 08', ip: '172.16.27.17', alert: false },
        { id: 'dev-09', name: 'Device 09', ip: '172.16.27.18', alert: false },
        { id: 'dev-10', name: 'Device 10', ip: '172.16.27.19', alert: false },
        { id: 'dev-11', name: 'Device 11', ip: '172.16.27.20', alert: false }
      ]
    },
    {
      name: '대리점',
      nodes: [
        { id: 'cpe-branch', name: '대리점 라우터 / CS센터 CPE #01', ip: '192.168.10.1', isGw: true }
      ]
    },
    {
      name: '시/군/구',
      nodes: [
        { id: 'dist-01', name: 'Dobong-gu' },
        { id: 'dist-02', name: 'Dongdaemun-gu' },
        { id: 'dist-03', name: 'Gangbuk-gu' },
        { id: 'dist-04', name: 'Eunpyeong-gu' },
        { id: 'dist-05', name: 'Seongbuk-gu' },
        { id: 'dist-06', name: 'Jungnang-gu' },
        { id: 'dist-07', name: 'Gangnam-gu' },
        { id: 'dist-08', name: 'Gangdong-gu' },
        { id: 'dist-09', name: 'Geumcheon-gu' },
        { id: 'dist-10', name: 'Guro-gu' },
        { id: 'dist-11', name: 'Gwanak-gu' }
      ]
    },
    {
      name: '시/도',
      nodes: [
        { id: 'prov-01', name: 'Seoul', active: true },
        { id: 'prov-02', name: 'Incheon' },
        { id: 'prov-03', name: 'Gyeonggi' },
        { id: 'prov-04', name: 'Gangwon' },
        { id: 'prov-05', name: 'Chungnam' },
        { id: 'prov-06', name: 'Sejong' },
        { id: 'prov-07', name: 'Chungbuk' }
      ]
    },
    {
      name: 'SD-WAN Group',
      nodes: [
        { id: 'sdw-01', name: 'Boramae Group', desc: 'Active Cluster' },
        { id: 'sdw-02', name: 'Daeduk Group', desc: 'Backup Cluster' }
      ]
    },
    {
      name: '데이터센터',
      nodes: [
        { id: 'dc-01', name: 'Boramae Center CPE #1', ip: '10.50.21.100', role: 'cpe' },
        { id: 'dc-02', name: 'SDP Controller #1', ip: '172.18.27.10', role: 'sdp' },
        { id: 'dc-03', name: 'SDP Gateway #1', ip: '172.18.27.50', role: 'gw' },
        { id: 'dc-04', name: 'Daeduk Center CPE #1', ip: '10.50.22.100', role: 'cpe' },
        { id: 'dc-05', name: 'SDP Controller #2', ip: '172.18.28.10', role: 'sdp' },
        { id: 'dc-06', name: 'SDP Gateway #2', ip: '172.18.28.50', role: 'gw' }
      ]
    },
    {
      name: 'Swing-gw',
      nodes: [
        { id: 'swing-01', name: 'Swing-gw (Zero Trust Edge)', ip: '100.64.0.1', isEdge: true }
      ]
    }
  ];

  function initTopologyGraph() {
    const grid = $('topology-nodes-grid');
    const svg = $('topology-svg-links');
    const inspector = $('topology-inspector');
    if (!grid || !svg) return;

    // Render 7 columns of nodes
    grid.innerHTML = TOPOLOGY_TIERS.map((tier, colIdx) => `
      <div class="topology-tier-col" data-tier="${colIdx}">
        ${tier.nodes.map(n => `
          <div class="topo-node ${n.alert ? 'alert' : ''} ${n.isGw ? 'node-gw' : ''} ${n.isEdge ? 'node-edge' : ''} ${(n.isGw || n.isEdge || n.role === 'cpe') ? 'node-multiline' : ''}" id="topo-node-${n.id}" data-id="${n.id}">
            <div class="topo-node-icon">
              ${n.alert ? '⚠️' : n.isGw ? '📡' : n.isEdge ? '☁️' : '💻'}
            </div>
            <div class="topo-node-info">
              <span class="topo-node-name">${escapeHtml(n.name)}</span>
              ${n.ip ? `<span class="topo-node-ip mono muted">${n.ip}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Attach click handlers to nodes for inspector
    qsa('.topo-node', grid).forEach(nodeEl => {
      nodeEl.addEventListener('click', () => {
        qsa('.topo-node', grid).forEach(n => n.classList.remove('selected'));
        nodeEl.classList.add('selected');
        
        const id = nodeEl.dataset.id;
        inspector.hidden = false;
        $('topo-inspect-title').textContent = nodeEl.querySelector('.topo-node-name')?.textContent || id;
        
        if (id === 'dev-03') {
          $('topo-inspect-ip').textContent = '172.16.27.12';
          $('topo-inspect-status').className = 'text-crit';
          $('topo-inspect-status').textContent = 'Alert (권한 상승 감지)';
          $('topo-inspect-traffic').textContent = '48.2 MB / 12.1 MB';
          $('topo-inspect-gw').textContent = 'Boramae Center CPE #1';
        } else {
          $('topo-inspect-ip').textContent = nodeEl.querySelector('.topo-node-ip')?.textContent || '172.16.27.x';
          $('topo-inspect-status').className = 'text-pass';
          $('topo-inspect-status').textContent = '정상 연결 (Compliant)';
          $('topo-inspect-traffic').textContent = '14.5 MB / 6.2 MB';
          $('topo-inspect-gw').textContent = '대리점 라우터 CPE #01';
        }
      });
    });

    $('btn-close-topo-inspect')?.addEventListener('click', () => { inspector.hidden = true; });

    // Render Vector Bezier Curves between columns
    function drawLinks() {
      const containerRect = grid.getBoundingClientRect();
      if (containerRect.width === 0) return;

      svg.setAttribute('width', containerRect.width);
      svg.setAttribute('height', containerRect.height);
      svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);

      let pathsHtml = '';

      function connectNodes(idA, idB, color = 'rgba(0, 229, 255, 0.45)', strokeWidth = 1.2) {
        const elA = $(`topo-node-${idA}`);
        const elB = $(`topo-node-${idB}`);
        if (!elA || !elB) return;

        const rA = elA.getBoundingClientRect();
        const rB = elB.getBoundingClientRect();

        const x1 = rA.right - containerRect.left;
        const y1 = rA.top + rA.height / 2 - containerRect.top;
        const x2 = rB.left - containerRect.left;
        const y2 = rB.top + rB.height / 2 - containerRect.top;

        const dx = (x2 - x1) * 0.5;
        const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;

        pathsHtml += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${idA === 'dev-03' ? '4,2' : 'none'}"/>`;
      }

      // Connect Dev 01..11 to Branch CPE
      TOPOLOGY_TIERS[0].nodes.forEach(d => {
        connectNodes(d.id, 'cpe-branch', d.alert ? '#EF4444' : 'rgba(0, 229, 255, 0.35)', d.alert ? 2 : 1);
      });

      // Connect Branch CPE to Districts
      TOPOLOGY_TIERS[2].nodes.forEach(dist => {
        connectNodes('cpe-branch', dist.id, 'rgba(0, 229, 255, 0.35)', 1);
      });

      // Connect Districts to Seoul & Gyeonggi
      TOPOLOGY_TIERS[2].nodes.forEach(dist => {
        connectNodes(dist.id, 'prov-01', 'rgba(16, 185, 129, 0.4)', 1);
      });

      // Connect Seoul to Boramae Group & Daeduk Group
      connectNodes('prov-01', 'sdw-01', '#00E5FF', 1.8);
      connectNodes('prov-01', 'sdw-02', 'rgba(0, 229, 255, 0.4)', 1.2);

      // Connect SD-WAN to Datacenter Nodes
      connectNodes('sdw-01', 'dc-01', '#00E5FF', 1.5);
      connectNodes('sdw-01', 'dc-02', '#00E5FF', 1.5);
      connectNodes('sdw-01', 'dc-03', '#EF4444', 1.8); // Alert path
      connectNodes('sdw-02', 'dc-04', 'rgba(0, 229, 255, 0.4)', 1.2);
      connectNodes('sdw-02', 'dc-05', 'rgba(0, 229, 255, 0.4)', 1.2);
      connectNodes('sdw-02', 'dc-06', 'rgba(0, 229, 255, 0.4)', 1.2);

      // Connect All Datacenter Nodes to Swing-gw (matching Image 4)
      connectNodes('dc-01', 'swing-01', '#00E5FF', 1.5);
      connectNodes('dc-02', 'swing-01', 'rgba(0, 229, 255, 0.45)', 1.2);
      connectNodes('dc-03', 'swing-01', '#EF4444', 2);
      connectNodes('dc-04', 'swing-01', 'rgba(0, 229, 255, 0.45)', 1.2);
      connectNodes('dc-05', 'swing-01', 'rgba(0, 229, 255, 0.45)', 1.2);
      connectNodes('dc-06', 'swing-01', 'rgba(0, 229, 255, 0.45)', 1.2);

      svg.innerHTML = pathsHtml;
    }

    setTimeout(drawLinks, 100);

    // Ensure topology links redraw when view-topology becomes visible
    const topoView = $('view-topology');
    if (topoView && typeof MutationObserver !== 'undefined') {
      const topoObserver = new MutationObserver(() => {
        if (!topoView.hidden && topoView.offsetParent !== null) {
          requestAnimationFrame(() => {
            drawLinks();
            setTimeout(drawLinks, 60);
          });
        }
      });
      topoObserver.observe(topoView, { attributes: true, attributeFilter: ['hidden', 'class'] });
    }

    window.addEventListener('resize', drawLinks);
    $('tab-topology')?.addEventListener('click', () => setTimeout(drawLinks, 50));
    $('btn-topo-auto-layout')?.addEventListener('click', () => { drawLinks(); showToast('info', '토폴로지 정렬', '노드 연결망이 최적화되었습니다.'); });

    $('btn-topo-reset')?.addEventListener('click', () => {
      drawLinks();
      showToast('info', '화면 맞춤', '토폴로지 캔버스 배율과 노드 정렬이 재설정되었습니다.');
    });

    const fsBtn = $('btn-topo-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const container = $('topology-canvas-container');
        if (!container) return;
        if (!document.fullscreenElement) {
          if (container.requestFullscreen) container.requestFullscreen();
          else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
          showToast('info', '전체 화면', '토폴로지 관제 캔버스가 전체 화면으로 전환되었습니다.');
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
      });
    }
  }

  // 3. UEBA 보안 분석 (Images 1 & 2: 엔티티 위험 순위 & 2D 이상치 분포 버블 차트)
  const UEBA_ENTITIES = [
    { entity: 'svc_backup', type: '사용자', score: 92, grade: '치명', gradeClass: 'crit', delta: '▲ 34', deltaClass: 'up', useCases: ['UC-001', 'UC-003', 'UC-005'], summary: 'Dormant service account reactivated, then escalated privileges within the same session.' },
    { entity: 'web-prod-01', type: '호스트', score: 78, grade: '높음', gradeClass: 'high', delta: '▲ 21', deltaClass: 'up', useCases: ['UC-003', 'UC-004'], summary: 'Outbound destination count surged and privilege escalation tactics were observed on the same host.' },
    { entity: '141.98.83.48', type: 'IP', score: 74, grade: '높음', gradeClass: 'high', delta: '▲ 74', deltaClass: 'up', useCases: ['UC-004'], summary: 'First-seen external address that scanned, then received a 2.4 GB outbound transfer.' },
    { entity: 'j.kim', type: '사용자', score: 61, grade: '높음', gradeClass: 'high', delta: '▼ 8', deltaClass: 'down', useCases: ['UC-002'], summary: 'Authentication from two locations 1,160 km apart within 30 minutes (impossible travel).' },
    { entity: 'db-prod-02', type: '호스트', score: 55, grade: '보통', gradeClass: 'med', delta: '▲ 12', deltaClass: 'up', useCases: ['UC-004'], summary: 'Received an inbound SSH session over a path with no traffic in the previous 30 days.' },
    { entity: 'ubuntu-macmini', type: '호스트', score: 34, grade: '낮음', gradeClass: 'low', delta: '▲ 3', deltaClass: 'up', useCases: [], summary: 'Elevated SCA failures but no attack pattern matched.' },
    { entity: 'admin', type: '사용자', score: 18, grade: '미비', gradeClass: 'min', delta: '▼ 22', deltaClass: 'down', useCases: [], summary: 'Back to baseline after last week\'s spike. Score decayed with no new anomalies.' }
  ];

  const UEBA_PERIOD_PRESETS = {
    '24h': { entities: 3, highRisk: 1, useCases: 3, avgScore: 42, caption: '현재 엔티티 3개 / 최근 24시간' },
    '7d':  { entities: 5, highRisk: 2, useCases: 5, avgScore: 51, caption: '현재 엔티티 5개 / 최근 7일' },
    '14d': { entities: 7, highRisk: 4, useCases: 8, avgScore: 59, caption: '현재 엔티티 7개 / 최근 14일' },
    '30d': { entities: 12, highRisk: 6, useCases: 14, avgScore: 64, caption: '현재 엔티티 12개 / 최근 30일' }
  };

  function initUebaSuite() {
    const tbody = $('ueba-risk-tbody');
    const scatterSvg = $('ueba-scatter-svg');
    const searchInput = $('ueba-search-input');
    const typeSelect = $('ueba-type-select');
    const gradeSelect = $('ueba-grade-select');
    if (!tbody || !scatterSvg) return;

    function renderUebaTable(filter = '', typeFilter = 'all', gradeFilter = 'all') {
      const q = filter.toLowerCase();
      const filtered = UEBA_ENTITIES.filter(row => {
        const matchQ = !q || row.entity.toLowerCase().includes(q) || row.summary.toLowerCase().includes(q) || row.useCases.some(u => u.toLowerCase().includes(q));
        const matchType = typeFilter === 'all' || row.type === (typeFilter === 'user' ? '사용자' : typeFilter === 'host' ? '호스트' : 'IP');
        const matchGrade = gradeFilter === 'all' || row.gradeClass === gradeFilter;
        return matchQ && matchType && matchGrade;
      });

      tbody.innerHTML = filtered.map(row => `
        <tr class="ueba-risk-row risk-${row.gradeClass}">
          <td>
            <div class="entity-name-wrap">
              <span class="entity-edge-bar ${row.gradeClass}"></span>
              <strong class="entity-name mono">${escapeHtml(row.entity)}</strong>
            </div>
          </td>
          <td style="text-align: center;"><span class="entity-type-badge">${row.type}</span></td>
          <td style="text-align: center;"><strong class="entity-score mono ${row.gradeClass}">${row.score}</strong></td>
          <td style="text-align: center;">
            <span class="entity-grade-pill ${row.gradeClass}">${row.grade}</span>
          </td>
          <td style="text-align: center;">
            <span class="entity-delta ${row.deltaClass}">${row.delta}</span>
          </td>
          <td>
            <div class="uc-tags-list">
              ${row.useCases.length > 0 ? row.useCases.map(u => `<span class="uc-tag-chip">${u}</span>`).join('') : '<span class="muted">-</span>'}
            </div>
          </td>
          <td><span class="entity-summary-text">${escapeHtml(row.summary)}</span></td>
        </tr>
      `).join('');
    }

    function renderUebaScatter() {
      const gridG = $('scatter-grid-lines');
      const bubblesG = $('scatter-bubbles-group');
      const tooltip = $('scatter-tooltip');
      if (!gridG || !bubblesG) return;

      // 5 Level Y lines
      const levels = [
        { name: '치명', y: 35, color: 'rgba(239, 68, 68, 0.15)' },
        { name: '높음', y: 80, color: 'rgba(245, 158, 11, 0.12)' },
        { name: '보통', y: 130, color: 'rgba(6, 182, 212, 0.1)' },
        { name: '낮음', y: 175, color: 'rgba(16, 185, 129, 0.08)' },
        { name: '미비', y: 215, color: 'rgba(100, 116, 139, 0.08)' }
      ];

      gridG.innerHTML = levels.map(l => `
        <line x1="50" y1="${l.y}" x2="960" y2="${l.y}" stroke="${l.color}" stroke-dasharray="4,4"/>
        <text x="40" y="${l.y + 4}" fill="var(--fg-tertiary)" font-size="9" text-anchor="end">${l.name}</text>
      `).join('') + `
        <!-- X Axis Score markers -->
        <text x="60" y="235" fill="var(--fg-tertiary)" font-size="9">0</text>
        <text x="280" y="235" fill="var(--fg-tertiary)" font-size="9">25</text>
        <text x="500" y="235" fill="var(--fg-tertiary)" font-size="9">50</text>
        <text x="720" y="235" fill="var(--fg-tertiary)" font-size="9">75</text>
        <text x="940" y="235" fill="var(--fg-tertiary)" font-size="9">100</text>
      `;

      // Bubbles
      bubblesG.innerHTML = UEBA_ENTITIES.map(row => {
        const cx = 60 + (row.score / 100) * 880;
        let cy = 215;
        if (row.gradeClass === 'crit') cy = 35;
        else if (row.gradeClass === 'high') cy = 80;
        else if (row.gradeClass === 'med') cy = 130;
        else if (row.gradeClass === 'low') cy = 175;

        const r = 6 + (row.useCases.length * 3);
        const fill = row.gradeClass === 'crit' ? '#EF4444' : row.gradeClass === 'high' ? '#F59E0B' : row.gradeClass === 'med' ? '#06B6D4' : row.gradeClass === 'low' ? '#10B981' : '#64748B';

        return `
          <g class="scatter-bubble-node" data-name="${escapeHtml(row.entity)}" data-score="${row.score}" data-grade="${row.grade}" data-ucs="${row.useCases.join(', ') || '없음'}" style="cursor: pointer;">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.85" stroke="#FFFFFF" stroke-width="1.2"/>
            <text x="${cx}" y="${cy + r + 11}" fill="var(--fg-secondary)" font-size="8.5" font-family="monospace" text-anchor="middle">${row.entity}</text>
          </g>
        `;
      }).join('');

      qsa('.scatter-bubble-node', bubblesG).forEach(node => {
        node.addEventListener('mouseenter', () => {
          tooltip.hidden = false;
          tooltip.innerHTML = `<strong>${node.dataset.name}</strong><br>위험 점수: ${node.dataset.score}점 (${node.dataset.grade})<br>Use Case: ${node.dataset.ucs}`;
          const r = node.getBoundingClientRect();
          const wrapR = $('ueba-scatter-wrap').getBoundingClientRect();
          tooltip.style.left = `${r.left - wrapR.left + 15}px`;
          tooltip.style.top = `${r.top - wrapR.top - 10}px`;
        });
        node.addEventListener('mouseleave', () => { tooltip.hidden = true; });
      });
    }

    // Time buttons (24h, 7d, 14d, 30d)
    qsa('.time-range-group .time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.time-range-group .time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.period;
        const preset = UEBA_PERIOD_PRESETS[p] || UEBA_PERIOD_PRESETS['14d'];
        
        const kpis = qsa('.ueba-kpi-grid .kpi-number');
        if (kpis[0]) kpis[0].textContent = preset.entities;
        if (kpis[1]) kpis[1].textContent = preset.highRisk;
        if (kpis[2]) kpis[2].textContent = preset.useCases;
        if (kpis[3]) kpis[3].textContent = preset.avgScore;

        const capt = document.querySelector('.total-entity-caption');
        if (capt) capt.textContent = preset.caption;

        renderUebaTable(searchInput.value, typeSelect.value, gradeSelect.value);
        showToast('info', `분석 기간: ${p}`, `최근 ${p} 동안의 엔티티 위험 지표가 재집계되었습니다.`);
      });
    });

    // View mode tabs (범위 분석, 이상 탐지, 예측 능력, 위험 추세)
    qsa('.view-mode-tabs .vm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        qsa('.view-mode-tabs .vm-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderUebaTable(searchInput.value, typeSelect.value, gradeSelect.value);
        showToast('info', '보기 모드 전환', `${tab.textContent.trim()} 뷰로 전환되었습니다.`);
      });
    });

    // Use Case cards click-to-filter
    qsa('.ueba-usecases-grid .uc-card').forEach(card => {
      card.addEventListener('click', () => {
        const ucId = card.dataset.uc;
        const isAlready = card.classList.contains('active');
        qsa('.ueba-usecases-grid .uc-card').forEach(c => c.classList.remove('active'));
        if (!isAlready) {
          card.classList.add('active');
          if (searchInput) searchInput.value = ucId;
          renderUebaTable(ucId, typeSelect.value, gradeSelect.value);
          showToast('info', `시나리오 필터: ${ucId}`, `${card.querySelector('.uc-name')?.textContent || ucId} 관련 이상 징후 엔티티를 필터링합니다.`);
        } else {
          if (searchInput) searchInput.value = '';
          renderUebaTable('', typeSelect.value, gradeSelect.value);
        }
      });
    });

    searchInput?.addEventListener('input', () => renderUebaTable(searchInput.value, typeSelect.value, gradeSelect.value));
    typeSelect?.addEventListener('change', () => renderUebaTable(searchInput.value, typeSelect.value, gradeSelect.value));
    gradeSelect?.addEventListener('change', () => renderUebaTable(searchInput.value, typeSelect.value, gradeSelect.value));
    $('btn-ueba-search')?.addEventListener('click', () => renderUebaTable(searchInput.value, typeSelect.value, gradeSelect.value));
    $('btn-ueba-reset')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (typeSelect) typeSelect.value = 'all';
      if (gradeSelect) gradeSelect.value = 'all';
      qsa('.ueba-usecases-grid .uc-card').forEach(c => c.classList.remove('active'));
      renderUebaTable();
      showToast('info', '필터 초기화', 'UEBA 검색 및 위험 등급 필터가 초기화되었습니다.');
    });

    $('btn-ueba-refresh')?.addEventListener('click', () => {
      renderUebaTable();
      renderUebaScatter();
      showToast('info', 'UEBA 분석 갱신', '엔티티 행위 분석 베이스라인이 재동기화되었습니다.');
    });

    renderUebaTable();
    renderUebaScatter();
  }

  // 4. 사건·케이스 관제
  function initCasesConsole() {
    const tbody = $('cases-full-tbody');
    if (!tbody) return;
    tbody.innerHTML = GIS_CASES.map(c => `
      <tr>
        <td><strong class="mono text-cyan">${c.id}</strong></td>
        <td><span class="case-desc-text">${escapeHtml(c.title)}</span></td>
        <td style="text-align: center;"><span class="badge ${c.level === 'crit' ? 'badge-critical' : 'badge-warn'}">${c.level === 'crit' ? '치명' : '높음'}</span></td>
        <td style="text-align: center;"><span class="badge badge-info">${c.state}</span></td>
        <td><span class="mono muted">${c.target}</span></td>
        <td><span class="mono muted">2026-10-28 12:30</span></td>
        <td style="text-align: center;"><button type="button" class="btn btn-xs btn-outline-cyan btn-case-action">조치 준비</button></td>
      </tr>
    `).join('');

    qsa('.btn-case-action', tbody).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const caseId = row?.querySelector('.mono')?.textContent || '티켓';
        showToast('success', `${caseId} 대응 시작`, '보안 관제 센터 자동 대응 플레이북이 성공적으로 가동되었습니다.');
      });
    });
  }

  function boot() {
    initTheme();
    initAnalogClock();
    initSuccessBanner();
    initDashboardInteractions();
    initSocDashboard();
    initCasesDashboard();
    initVulnComplianceDashboard();
    initUebaDashboard();
    initNavFlyout();
    initIamTreeAndGrid();
    initPfsenseConsole();
    initGisMap();
    initTopologyGraph();
    initUebaSuite();
    initCasesConsole();
    initCmdk();
    initShortcuts();
    window.LumosChrome = { showToast, setNavBadge };
    window.LumosSoc = {
      init: initSocDashboard,
      refreshCharts: () => {
        renderTimeSeriesChart();
        renderSeverityDonut();
        showToast('info', '보안 요약 갱신', '실시간 감시 센서 지표가 새로고침되었습니다.');
      }
    };
    window.LumosIam = {
      render: renderIamTable,
      getData: () => IAM_USERS_DATA
    };
    window.LumosPfSense = {
      render: renderPfsenseTable,
      getPackets: () => pfsensePackets
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

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
    if (iconAuto) iconAuto.hidden = mode !== 'auto';
    if (iconLight) iconLight.hidden = mode !== 'light';
    if (iconDark) iconDark.hidden = mode !== 'dark';

    qsa('.theme-switch-item').forEach((item) => {
      item.setAttribute('aria-checked', item.dataset.themeMode === mode ? 'true' : 'false');
    });

    const metaEl = $('theme-auto-meta');
    if (metaEl) metaEl.textContent = resolved === 'dark' ? '현재 · 다크' : '현재 · 라이트';
  }

  function setThemeMode(mode) {
    try { localStorage.setItem(THEME_KEY, mode); } catch (_) { /* storage blocked */ }
    applyTheme(mode);
    closeThemeMenu();
  }

  function getStoredMode() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (_) { return 'auto'; }
  }

  function openThemeMenu() {
    const menu = $('theme-switch-menu');
    const btn = $('theme-switch-btn');
    if (!menu || !btn) return;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeThemeMenu() {
    const menu = $('theme-switch-menu');
    const btn = $('theme-switch-btn');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleThemeMenu(e) {
    if (e) e.stopPropagation();
    const menu = $('theme-switch-menu');
    if (!menu) return;
    if (menu.hidden) openThemeMenu(); else closeThemeMenu();
  }

  function initTheme() {
    applyTheme(getStoredMode());

    const btn = $('theme-switch-btn');
    if (btn) btn.addEventListener('click', toggleThemeMenu);

    qsa('.theme-switch-item').forEach((item) => {
      item.addEventListener('click', () => setThemeMode(item.dataset.themeMode));
    });

    document.addEventListener('click', (e) => {
      const menu = $('theme-switch-menu');
      const b = $('theme-switch-btn');
      if (!menu || menu.hidden) return;
      if (menu.contains(e.target) || (b && b.contains(e.target))) return;
      closeThemeMenu();
    });

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
    { group: '이동', label: '보호 현황', meta: 'g p', icon: 'shield', action: () => clickById('tab-protection') },
    { group: '이동', label: '업무 앱', meta: 'g a', icon: 'grid', action: () => clickById('tab-apps') },
    { group: '이동', label: '보안 기록', meta: 'g r', icon: 'file', action: () => clickById('tab-records') },
    { group: '테마', label: '자동 (시스템 + 시간대)', meta: null, icon: 'auto', action: () => setThemeMode('auto') },
    { group: '테마', label: '라이트 모드', meta: null, icon: 'sun', action: () => setThemeMode('light') },
    { group: '테마', label: '다크 모드', meta: null, icon: 'moon', action: () => setThemeMode('dark') },
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
      // g + {p|a|r} navigation
      if (e.key.toLowerCase() === 'g') { gKeyAt = Date.now(); return; }
      if (gKeyAt && Date.now() - gKeyAt < 1000) {
        const k = e.key.toLowerCase();
        if (k === 'p') { clickById('tab-protection'); gKeyAt = 0; return; }
        if (k === 'a') { clickById('tab-apps'); gKeyAt = 0; return; }
        if (k === 'r') { clickById('tab-records'); gKeyAt = 0; return; }
        gKeyAt = 0;
      }
      // [ toggles sidebar
      if (e.key === '[') { clickById('sidebar-toggle-btn'); return; }
    });
  }

  // ----------------------------------------------------------
  // Boot
  // ----------------------------------------------------------
  function boot() {
    initTheme();
    initCmdk();
    initShortcuts();
    window.LumosChrome = { showToast, setNavBadge };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

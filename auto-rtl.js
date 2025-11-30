// Auto RTL for TypingMind - generic extension/userscript

(function () {
  'use strict';

  // Settings
  const RTL_CHAR_RANGES = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const MIN_CHAR_RATIO = 0.30;

  // === Selectors to EXCLUDE from RTL/LTR processing ===
  const EXCLUDED_SELECTORS = [
    '[data-element-id="workspace-bar"]',
    '[data-element-id="workspace-bar"] *',  // همه فرزندان workspace-bar
    'nav',
    'header',
    'footer',
    '[role="navigation"]',
    '[role="menu"]',
    '[role="menubar"]',
    '[role="toolbar"]'
  ].join(', ');

  // Add stylesheet (RTL helpers only)
  const style = document.createElement('style');
  style.textContent = `
    .tm-rtl { direction: rtl !important; text-align: right !important; }
    .tm-ltr { direction: ltr !important; text-align: left !important; }
  `;
  document.head.appendChild(style);

  // ---- Helper: Check if element should be excluded ----
  function shouldExclude(el) {
    if (!el || !el.matches) return true;
    try {
      return el.matches(EXCLUDED_SELECTORS) || el.closest('[data-element-id="workspace-bar"]');
    } catch (e) {
      return false;
    }
  }

  // ---- Center only the bottom workspace bar (tabs) ----
  function centerWorkspaceBarOnce() {
    const bar = document.querySelector('[data-element-id="workspace-bar"] .fade-right-edge');
    if (!bar) return;

    // === پاک کردن کلاس‌های tm-rtl/tm-ltr که اشتباهی اضافه شده ===
    const workspaceRoot = document.querySelector('[data-element-id="workspace-bar"]');
    if (workspaceRoot) {
      workspaceRoot.querySelectorAll('.tm-rtl, .tm-ltr').forEach(el => {
        el.classList.remove('tm-rtl', 'tm-ltr');
        el.removeAttribute('dir');
        el.style.removeProperty('direction');
        el.style.removeProperty('text-align');
      });
      // خود workspace-bar را هم پاک کن
      workspaceRoot.classList.remove('tm-rtl', 'tm-ltr');
      workspaceRoot.removeAttribute('dir');
      workspaceRoot.style.removeProperty('direction');
      workspaceRoot.style.removeProperty('text-align');
    }

    // Main container: force flex center via inline style
    bar.style.display = 'flex';
    bar.style.justifyContent = 'center';
    bar.style.alignItems = 'center';
    bar.style.textAlign = 'center';
    bar.style.paddingLeft = '0px';
    bar.style.paddingRight = '0px';

    // Remove Tailwind "start" alignment classes if they exist
    bar.classList.remove('justify-start', 'items-start');

    // Inner wrapper that holds all buttons
    const inner = bar.querySelector('.min-w-max');
    if (inner) {
      inner.style.display = 'flex';
      inner.style.alignItems = 'center';
      inner.style.justifyContent = 'center';
      inner.style.textAlign = 'center';
      inner.style.gap = '0.5rem';

      inner.style.flexDirection = window.innerWidth >= 768 ? 'column' : 'row';

      inner.classList.remove('justify-start', 'items-start');
    }

    // Center each button's span content
    bar.querySelectorAll('button > span').forEach(span => {
      span.style.display = 'flex';
      span.style.justifyContent = 'center';
      span.style.alignItems = 'center';
      span.style.textAlign = 'center';
    });

    console.log('[Auto-RTL] centerWorkspaceBarOnce applied');
  }

  function setupWorkspaceBarCentering() {
    centerWorkspaceBarOnce();

    const root = document.querySelector('[data-element-id="workspace-bar"]');
    if (!root) return;

    const observer = new MutationObserver(() => {
      setTimeout(centerWorkspaceBarOnce, 0);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener('resize', () => {
      const bar = document.querySelector('[data-element-id="workspace-bar"] .fade-right-edge .min-w-max');
      if (!bar) return;
      bar.style.flexDirection = window.innerWidth >= 768 ? 'column' : 'row';
    });
  }

  // ---- RTL logic for editors & messages ----
  function isMostlyRTL(text) {
    if (!text) return false;
    let totalLetters = 0, rtlLetters = 0;
    for (const ch of text) {
      if (/\S/.test(ch)) {
        if (/\p{Letter}/u.test(ch)) totalLetters++;
        if (RTL_CHAR_RANGES.test(ch)) rtlLetters++;
      }
    }
    if (totalLetters === 0) return false;
    return (rtlLetters / totalLetters) >= MIN_CHAR_RATIO;
  }

  function applyDirection(el, rtl) {
    if (!el) return;
    // === چک کن که المنت جزو استثناها نباشد ===
    if (shouldExclude(el)) return;
    
    el.classList.toggle('tm-rtl', rtl);
    el.classList.toggle('tm-ltr', !rtl);
    try {
      el.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      el.style.direction = rtl ? 'rtl' : 'ltr';
      el.style.textAlign = rtl ? 'right' : 'left';
    } catch (e) { /* Some elements might be readonly */ }
  }

  function watchEditors() {
    const editorSelectorCandidates = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '[role="textbox"]'
    ];

    function handleEditor(el) {
      // === چک کن که المنت جزو استثناها نباشد ===
      if (shouldExclude(el)) return;
      if (el._tm_rtl_attached) return;
      el._tm_rtl_attached = true;

      const checkAndApply = () => {
        const text = (el.value !== undefined) ? el.value : el.innerText || el.textContent || '';
        applyDirection(el, isMostlyRTL(text));
      };

      el.addEventListener('input', checkAndApply, { passive: true });
      el.addEventListener('keyup', checkAndApply, { passive: true });
      el.addEventListener('paste', () => setTimeout(checkAndApply, 50), { passive: true });
      el.addEventListener('compositionend', checkAndApply, { passive: true });
      setTimeout(checkAndApply, 100);
    }

    function scanEditors() {
      for (const sel of editorSelectorCandidates) {
        document.querySelectorAll(sel).forEach(handleEditor);
      }
    }

    scanEditors();
    const obs = new MutationObserver(scanEditors);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function watchMessages() {
    const nodeObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          processNodeRecursively(node);
        }
        if (m.type === 'characterData') {
          processNodeRecursively(m.target);
        }
      }
    });

    function processNodeRecursively(node) {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && parent.isConnected) {
          evaluateAndApplyToMessage(parent);
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      
      // === چک کن که المنت جزو استثناها نباشد ===
      if (shouldExclude(node)) return;
      
      const tag = node.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'input' || node.getAttribute('contenteditable') === 'true') return;
      evaluateAndApplyToMessage(node);
      if (node.children && node.children.length) {
        for (const ch of node.children) processNodeRecursively(ch);
      }
    }

    function evaluateAndApplyToMessage(el) {
      // === چک کن که المنت جزو استثناها نباشد ===
      if (shouldExclude(el)) return;
      
      const text = el.innerText || el.textContent || '';
      if (!text.trim()) return;
      const rtl = isMostlyRTL(text);
      applyDirection(el, rtl);
    }

    nodeObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    setTimeout(() => {
      document.querySelectorAll('div, p, span').forEach(el => {
        // === چک کن که المنت جزو استثناها نباشد ===
        if (!shouldExclude(el)) {
          evaluateAndApplyToMessage(el);
        }
      });
    }, 500);
  }

  function init() {
    watchEditors();
    watchMessages();
    setupWorkspaceBarCentering();
    console.log('[Auto-RTL] initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

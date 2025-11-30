// Auto RTL for TypingMind - generic extension/userscript
(function () {
  'use strict';

  // Settings
  const RTL_CHAR_RANGES = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const MIN_CHAR_RATIO = 0.30; // Minimum ratio of RTL characters to consider the text as RTL

  // Add stylesheet
  const style = document.createElement('style');
  style.textContent = `
    .tm-rtl { direction: rtl !important; text-align: right !important; }
    .tm-ltr { direction: ltr !important; text-align: left !important; }

    /* Force center alignment for the bottom workspace bar tabs */
    .fade-right-edge.flex-1.overflow-x-auto.scrollbar-hide.flex {
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .fade-right-edge .min-w-max {
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      gap: 0.5rem !important;
    }

    .fade-right-edge button > span {
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
    }

    .fade-right-edge button span[style] {
      text-align: center !important;
    }
  `;
  document.head.appendChild(style);

  // Additionally, clean up Tailwind utility classes that force "start" alignment
  function centerWorkspaceBar() {
    try {
      const bar = document.querySelector('[data-element-id="workspace-bar"] .fade-right-edge');
      if (!bar) return;

      // Remove Tailwind alignment classes that conflict
      bar.classList.remove('justify-start');
      bar.classList.remove('items-start');
      // Ensure flex center
      bar.classList.add('flex');
      bar.style.justifyContent = 'center';
      bar.style.alignItems = 'center';

      const inner = bar.querySelector('.min-w-max');
      if (inner) {
        inner.classList.remove('justify-start');
        inner.classList.remove('items-start');
        inner.style.justifyContent = 'center';
        inner.style.alignItems = 'center';
      }
    } catch (e) {
      console.warn('Error while centering workspace bar:', e);
    }
  }

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
    el.classList.toggle('tm-rtl', rtl);
    el.classList.toggle('tm-ltr', !rtl);
    try {
      el.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      el.style.direction = rtl ? 'rtl' : 'ltr';
      el.style.textAlign = rtl ? 'right' : 'left';
    } catch (e) { /* Some elements might be readonly */ }
  }

  // Detect and apply on editors (input / textarea / contenteditable)
  function watchEditors() {
    const editorSelectorCandidates = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '[role="textbox"]'
    ];

    function handleEditor(el) {
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

  // Detect and apply on new messages (bubbles)
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
      const tag = node.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'input' || node.getAttribute('contenteditable') === 'true') return;
      evaluateAndApplyToMessage(node);
      if (node.children && node.children.length) {
        for (const ch of node.children) processNodeRecursively(ch);
      }
    }

    function evaluateAndApplyToMessage(el) {
      const text = el.innerText || el.textContent || '';
      if (!text.trim()) return;
      const rtl = isMostlyRTL(text);
      applyDirection(el, rtl);
    }

    nodeObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    setTimeout(() => {
      document.querySelectorAll('div, p, span').forEach(el => evaluateAndApplyToMessage(el));
    }, 500);
  }

  // Start
  function init() {
    watchEditors();
    watchMessages();

    // Center the bar now and also whenever DOM changes
    centerWorkspaceBar();
    const barObserver = new MutationObserver(centerWorkspaceBar);
    const workspaceBarRoot = document.querySelector('[data-element-id="workspace-bar"]');
    if (workspaceBarRoot) {
      barObserver.observe(workspaceBarRoot, { childList: true, subtree: true, attributes: true });
    }

    console.log('TypingMind Auto-RTL extension initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

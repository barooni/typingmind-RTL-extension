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

    /* --- Center workspace bottom bar items --- */

    /* Main container that currently has justify-start/items-center */
    [data-element-id="workspace-bar"] .fade-right-edge {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    /* Inner wrapper .min-w-max: center its children */
    [data-element-id="workspace-bar"] .fade-right-edge .min-w-max {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      flex-direction: row !important; /* row on small screens */
    }

    /* On md and above keep column layout but centered */
    @media (min-width: 768px) {
      [data-element-id="workspace-bar"] .fade-right-edge .min-w-max {
        flex-direction: column !important;
        gap: 0.5rem !important;
      }
    }

    /* Make each nav button span center its content */
    [data-element-id="workspace-bar"] .fade-right-edge button > span {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
    }

    /* Ensure labels (the text) are centered */
    [data-element-id="workspace-bar"] .fade-right-edge button span[style] {
      text-align: center !important;
    }
  `;
  document.head.appendChild(style);

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

      // Common events
      el.addEventListener('input', checkAndApply, { passive: true });
      el.addEventListener('keyup', checkAndApply, { passive: true });
      el.addEventListener('paste', () => setTimeout(checkAndApply, 50), { passive: true });
      el.addEventListener('compositionend', checkAndApply, { passive: true });
      // Initial
      setTimeout(checkAndApply, 100);
    }

    function scanEditors() {
      for (const sel of editorSelectorCandidates) {
        document.querySelectorAll(sel).forEach(handleEditor);
      }
    }

    // Initial scan and on DOM changes
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
        if (m.type === 'characterData') { // Text changed
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
      // Probably a message element; filter out input/controls/ui elements
      const tag = node.tagName.toLowerCase();
      if (tag === 'textarea' || tag === 'input' || node.getAttribute('contenteditable') === 'true') return;
      // If this element appears to contain text
      evaluateAndApplyToMessage(node);
      if (node.children && node.children.length) {
        for (const ch of node.children) processNodeRecursively(ch);
      }
    }

    function evaluateAndApplyToMessage(el) {
      // Find visible text inside the element
      const text = el.innerText || el.textContent || '';
      if (!text.trim()) return;
      const rtl = isMostlyRTL(text);
      applyDirection(el, rtl);
    }

    nodeObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Initial scan: major content elements
    setTimeout(() => {
      document.querySelectorAll('div, p, span').forEach(el => evaluateAndApplyToMessage(el));
    }, 500);
  }

  // Start
  function init() {
    watchEditors();
    watchMessages();
    console.log('TypingMind Auto-RTL extension initialized');
  }

  // If DOM isn't ready wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

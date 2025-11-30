// Auto RTL for TypingMind - Fast (First Word Detection)
(function(){'use strict';
const RTL=/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
EXCLUDE='[data-element-id="workspace-bar"],button,nav,header,footer,[role=navigation],[role=menu],[role=menubar],[role=toolbar]';

// استایل‌ها
const s=document.createElement('style');
s.textContent=`
.tm-rtl{direction:rtl!important;text-align:right!important}
.tm-ltr{direction:ltr!important;text-align:left!important}
[data-element-id="workspace-bar"] *,
[data-element-id="workspace-bar"] .tm-ltr,
[data-element-id="workspace-bar"] .tm-rtl,
button span,
button span.tm-ltr,
button span.tm-rtl,
button>span>span,
button>span>span.tm-ltr,
button>span>span.tm-rtl{
  text-align:center!important;
  direction:unset!important;
}
[data-element-id="workspace-bar"] .fade-right-edge{
  display:flex!important;justify-content:center!important;align-items:center!important;
}
[data-element-id="workspace-bar"] .min-w-max{
  display:flex!important;justify-content:center!important;align-items:center!important;
}
`;
document.head.appendChild(s);

// چک exclude
const excl=e=>!e||!e.matches||e.matches(EXCLUDE)||e.closest(EXCLUDE);

// ✅ الگوریتم جدید: فقط کلمه اول رو چک کن
const isRTL=t=>{
  if(!t)return false;
  // پیدا کردن اولین کلمه (رشته‌ای از کاراکترهای غیر فاصله)
  const match = t.match(/\S+/);
  if(!match)return false;
  const firstWord = match[0];
  // اگه کلمه اول حداقل یک کاراکتر RTL داشت، کل بلوک RTL بشه
  return RTL.test(firstWord);
};

// اعمال جهت
const apply=(e,rtl)=>{
  if(!e||excl(e))return;
  e.classList.toggle('tm-rtl',rtl);
  e.classList.toggle('tm-ltr',!rtl);
  e.dir=rtl?'rtl':'ltr';
};

// watch editors
const watchEd=()=>{
  const handle=e=>{
    if(excl(e)||e._rtl)return;
    e._rtl=1;
    const chk=()=>apply(e,isRTL(e.value??e.innerText??''));
    ['input','keyup','compositionend'].forEach(v=>e.addEventListener(v,chk,{passive:1}));
    e.addEventListener('paste',()=>setTimeout(chk,50),{passive:1});
    setTimeout(chk,100);
  };
  const scan=()=>'textarea,input[type=text],[contenteditable=true],[role=textbox]'.split(',').forEach(s=>document.querySelectorAll(s).forEach(handle));
  scan();
  new MutationObserver(scan).observe(document.body,{childList:1,subtree:1});
};

// watch messages
const watchMsg=()=>{
  const proc=n=>{
    if(!n)return;
    if(n.nodeType===3){const p=n.parentElement;if(p?.isConnected)evalMsg(p);return}
    if(n.nodeType!==1||excl(n))return;
    const t=n.tagName.toLowerCase();
    if(t==='textarea'||t==='input'||n.contentEditable==='true')return;
    evalMsg(n);
    [...(n.children||[])].forEach(proc);
  };
  const evalMsg=e=>{
    if(excl(e))return;
    const t=e.innerText||e.textContent||'';
    if(t.trim())apply(e,isRTL(t));
  };
  new MutationObserver(m=>m.forEach(x=>{
    x.addedNodes.forEach(proc);
    if(x.type==='characterData')proc(x.target);
  })).observe(document.body,{childList:1,subtree:1,characterData:1});
  setTimeout(()=>document.querySelectorAll('div,p,span').forEach(e=>!excl(e)&&evalMsg(e)),500);
};

// init
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{watchEd();watchMsg()});
else{watchEd();watchMsg()}
})();

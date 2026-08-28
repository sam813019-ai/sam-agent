/* ASCRS Barrett Toric Calculator - DOM probe (read-only, ASCII-safe).
   Usage: open the calculator, switch to the Toric IOL tab, F12 -> Console,
   type "allow pasting" + Enter once, then paste this whole block + Enter. */
(function () {
  var o = { url: location.href, title: document.title, fw: {}, iframes: 0, fields: [], buttons: [] };

  var probe = document.querySelector('input,select,div');
  var keys = probe ? Object.keys(probe).join(',') : '';
  var ngEl = document.querySelector('[ng-version]');

  o.fw.react = keys.indexOf('__react') >= 0 || !!document.querySelector('[data-reactroot]');
  o.fw.angular = !!ngEl || !!window.ng || !!window.angular;
  o.fw.angularVersion = ngEl ? ngEl.getAttribute('ng-version') : null;
  o.fw.vue = !!window.__VUE__ || !!document.querySelector('[data-v-app]');
  o.fw.jquery = !!window.jQuery;
  o.fw.knockout = !!window.ko;
  o.fw.webForms = !!document.querySelector('#__VIEWSTATE');
  o.iframes = document.querySelectorAll('iframe').length;

  function labelOf(el) {
    var l = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
    if (l) return l.innerText.trim();
    var w = el.closest('label');
    if (w) return w.innerText.trim();
    var n = el.previousElementSibling, h = 0;
    while (n && h++ < 3) {
      var t = (n.innerText || '').trim();
      if (t && t.length < 60) return t;
      n = n.previousElementSibling;
    }
    var p = el.parentElement;
    return p ? (p.innerText || '').trim().slice(0, 60) : '';
  }

  var els = document.querySelectorAll('input,select,textarea');
  for (var i = 0; i < els.length; i++) {
    var el = els[i], r = el.getBoundingClientRect();
    o.fields.push({
      i: i,
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      id: el.id || null,
      name: el.name || null,
      cls: (el.className || '').toString() || null,
      label: labelOf(el),
      aria: el.getAttribute('aria-label') || null,
      ph: el.placeholder || null,
      val: (el.type === 'radio' || el.type === 'checkbox') ? el.checked : el.value,
      vis: r.width > 0 && r.height > 0,
      ro: el.readOnly || false,
      dis: el.disabled || false,
      reactCtl: Object.keys(el).join(',').indexOf('__reactProps') >= 0,
      opts: el.tagName === 'SELECT'
        ? Array.prototype.map.call(el.options, function (x) { return x.value + '|' + x.text.trim(); })
        : undefined
    });
  }

  var btns = document.querySelectorAll('button,input[type=submit],input[type=button]');
  for (var j = 0; j < btns.length; j++) {
    var bt = (btns[j].innerText || btns[j].value || '').trim();
    if (bt) o.buttons.push({ text: bt.slice(0, 40), id: btns[j].id || null });
  }

  o.summary = {
    totalFields: o.fields.length,
    visibleFields: o.fields.filter(function (f) { return f.vis; }).length,
    reactControlled: o.fields.filter(function (f) { return f.reactCtl; }).length,
    iframes: o.iframes
  };

  var json = JSON.stringify(o, null, 2);
  console.log('=== ASCRS PROBE ===');
  console.log(o.summary);
  console.log(json);
  try { copy(json); console.log('OK - copied to clipboard'); }
  catch (e) { console.log('copy() failed - select the JSON above manually'); }
  return o.summary;
})();

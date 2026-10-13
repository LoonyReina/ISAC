'use strict';
// First-party lightweight event/DOM harness adapted from the 802.11ad lesson tests.
// This is not a layout engine or a real-browser accessibility audit.
const assert=require('node:assert/strict');
function lightDocument(html, { canvas = true } = {}) {
  const byId = new Map(), canvasCalls = [], downloads = [], windowEvents = {};
  const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.events = {}; this._value = ''; this._text = ''; this._html = ''; this.hidden = false; this.checked = false; this.disabled = false; this.style = {}; this.width = 880; this.height = 330; this.files = []; this.classes = new Set(); this.classList = { toggle: (name, force) => { const on = force === undefined ? !this.classes.has(name) : force; if (on) this.classes.add(name); else this.classes.delete(name); return on; }, contains: name => this.classes.has(name), add: name => this.classes.add(name), remove: name => this.classes.delete(name) }; }
    setAttribute(name, value) { value = String(value); this.attrs[name] = value; if (name === 'id') { this.id = value; byId.set(value, this); } if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value; if (name === 'value') this._value = value; if (['checked', 'hidden', 'disabled', 'selected'].includes(name)) this[name] = true; if (['width', 'height'].includes(name)) this[name] = Number(value); }
    getAttribute(name) { return this.attrs[name] ?? null; }
    hasAttribute(name) { return name in this.attrs; }
    removeAttribute(name) { delete this.attrs[name]; }
    set value(value) { this._value = String(value); }
    get value() { return this.tagName === 'OPTION' && !('value' in this.attrs) ? this.textContent : this._value; }
    set textContent(value) { this._text = String(value); this._html = ''; this.children = []; }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; parse(this._html, this); if (this.tagName === 'SELECT') this._value = (this.options.find(o => o.selected) || this.options[0])?.value || ''; }
    get innerHTML() { return this._html; }
    get options() { return this.children.filter(node => node.tagName === 'OPTION'); }
    append(...nodes) { for (const node of nodes) { if (typeof node === 'string') { this._text += node; continue; } node.parentElement = this; this.children.push(node); if(this.tagName==='SELECT'&&this.children.length===1)this._value=node.value; } }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this._html = ''; this.append(...nodes); }
    get name() { return this.attrs.name; }
    get selectedOptions() { return this.options.filter(x=>x.value===this.value); }
    get elements() { return {namedItem: name=>this.querySelectorAll('input').find(x=>x.name===name)}; }
    reportValidity() { return true; }
    matches(selector) { if(selector==='input[name]')return this.tagName==='INPUT'&&this.hasAttribute('name'); const attr = selector.match(/^\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]$/); if (attr) return this.hasAttribute(attr[1]) && (attr[2] === undefined || this.getAttribute(attr[1]) === attr[2]); return selector.startsWith('#') ? this.id === selector.slice(1) : this.tagName === selector.toUpperCase(); }
    closest(selector) { for (let el = this; el; el = el.parentElement) if (el.matches(selector)) return el; return null; }
    querySelectorAll(selector) { const selectors = selector.split(',').map(s => s.trim()), found = []; for (const node of this.children) { if (selectors.some(s => node.matches(s))) found.push(node); found.push(...node.querySelectorAll(selector)); } return found; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, listener) { (this.events[type] ||= []).push(listener); }
    removeEventListener(type, listener) { this.events[type] = (this.events[type] || []).filter(fn => fn !== listener); }
    async fire(type, extra = {}) { const event = { type, target: this, preventDefault() {}, ...extra }; const returned = []; for (let el = this; el; el = el.parentElement) for (const fn of el.events[type] || []) returned.push(fn(event)); await Promise.all(returned); }
    click() { if (this.tagName === 'A') downloads.push({ href: this.href, download: this.download }); else return this.fire('click'); }
    focus() { this.focused = true; }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); }
    getContext() { if (!canvas) return null; return new Proxy({}, { get(_target, name) { return (...args) => { for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `canvas ${String(name)} received ${arg}`); if(canvasCalls.length<2000)canvasCalls.push([name, ...args]); }; }, set(target, name, value) { target[name] = value; return true; } }); }
    getBoundingClientRect() { return { width: 880, height: 330, left: 0, top: 0 }; }
  }
  function parse(markup, parent) {
    const stack = [parent], tokens = markup.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) || [];
    for (const token of tokens) {
      if (token.startsWith('<!')) continue;
      if (token.startsWith('</')) { const tag = token.match(/^<\/\s*([^\s>]+)/)?.[1].toUpperCase(); for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag) { stack.length = i; break; } continue; }
      if (token.startsWith('<')) {
        const match = token.match(/^<([a-z][\w:-]*)([\s\S]*?)\/?\s*>$/i); if (!match) continue;
        const node = new Element(match[1]);
        for (const attr of match[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) node.setAttribute(attr[1], decode(attr[2] ?? attr[3] ?? attr[4] ?? ''));
        stack.at(-1).append(node);
        if (!/^(INPUT|BR|HR|META|LINK|IMG|AREA|BASE|SOURCE|WBR)$/.test(node.tagName) && !token.endsWith('/>')) stack.push(node);
      } else stack.at(-1)._text += decode(token);
    }
    for (const select of parent.querySelectorAll('select')) select._value = (select.options.find(o => o.selected) || select.options[0])?.value || '';
  }
  const document = new Element('document');
  document.getElementById = id => byId.get(id) || null;
  document.createElement = tag => new Element(tag);
  document.createElementNS = (_namespace, tag) => new Element(tag);
  document.defaultView = { addEventListener(type, fn) { windowEvents[type] = fn; }, removeEventListener(type) { delete windowEvents[type]; } };
  document.visibilityState = 'visible';
  parse(html, document); document.body = document.querySelector('body');
  return { document, get(id) { const el = byId.get(id); assert.ok(el, `missing harness element ${id}`); return el; }, canvasCalls, downloads, windowEvents,
    async fireWindow(type, extra = {}) { return windowEvents[type]?.({ type, ...extra }); },
    async visibility(state) { document.visibilityState = state; document.hidden = state === 'hidden'; await document.fire('visibilitychange'); }
  };
}

module.exports=lightDocument;

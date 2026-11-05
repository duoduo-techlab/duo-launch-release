/* Duo Launch · 发布页脚本（零依赖）
 *
 * 页面本身是静态的，只有「版本号 / 体积 / SHA256 / 版本列表」来自 data/releases.json。
 * 那个文件由私有仓库的 tools/release/publish-pages.sh 在每次发版时重写，
 * 所以这里只读不写，规则也只有一条：读不到就优雅降级，不能白屏。
 *
 * 要换仓库 / 下载地址，只改下面 CONFIG 一处。
 */
(function () {
  'use strict';

  var CONFIG = {
    repo: 'duoduo-techlab/duo-launch-release',
    manifest: 'data/releases.json',
    // GitHub 的 stable 链接：始终指向最新的非 prerelease 的同名资源
    latestApk: function () {
      return 'https://github.com/' + CONFIG.repo + '/releases/latest/download/duo-launcher.apk';
    },
    releasesPage: function () {
      return 'https://github.com/' + CONFIG.repo + '/releases';
    },
    // 有真车截图就放进 assets/shots/，页面自动出现（没有就整块隐藏）
    shot: 'assets/shots/dashboard.png'
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ───────────────────────── 静态链接 ───────────────────────── */

  function wireStaticLinks() {
    $$('[data-latest-apk]').forEach(function (a) {
      a.href = CONFIG.latestApk();
      a.setAttribute('rel', 'noopener');
    });
    $$('[data-releases-page]').forEach(function (a) {
      a.href = CONFIG.releasesPage();
    });
    $$('[data-gh-link]').forEach(function (a) {
      a.href = 'https://github.com/' + CONFIG.repo;
    });
  }

  /* ───────────────────────── 格式化 ───────────────────────── */

  function fmtSize(bytes) {
    if (!bytes || bytes < 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function shortHash(h) {
    if (!h) return '—';
    return h.length > 20 ? h.slice(0, 8) + '…' + h.slice(-4) : h;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** 更新说明只取第一条非空行，其余交给 GitHub Release 页面。 */
  function summarize(notes) {
    if (!notes) return '';
    var lines = String(notes).split(/\r?\n/).map(function (l) { return l.trim(); });
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      if (/^#{1,6}\s/.test(lines[i])) continue;      // 跳过 Markdown 标题
      return plain(lines[i].replace(/^[-*+]\s*/, ''));
    }
    return '';
  }

  /** 去掉粗体 / 行内代码 / 链接这些 Markdown 标记（release notes 是给人看的，摘要不必带符号）。 */
  function plain(s) {
    return String(s)
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [文字](链接)
      .replace(/\*\*([^*]+)\*\*/g, '$1')           // **粗体**
      .replace(/__([^_]+)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')                  // `代码`
      .trim();
  }

  /* ───────────────────────── 渲染 ───────────────────────── */

  function setField(name, value) {
    $$('[data-field="' + name + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  function pickLatest(list) {
    return list.slice().sort(function (a, b) {
      return (b.versionCode || 0) - (a.versionCode || 0);
    })[0];
  }

  function renderLatest(latest) {
    if (!latest) {
      setField('version', '待发布');
      setField('version-short', '最新版');
      return;
    }
    setField('version', 'v' + latest.versionName);
    setField('version-short', 'v' + latest.versionName);
    setField('size', fmtSize(latest.size));
    setField('updated', fmtDate(latest.publishedAt));
    setField('sha256', latest.sha256 || '—');

    var copyBtn = $('[data-copy="sha256"]');
    if (copyBtn && !latest.sha256) copyBtn.hidden = true;
  }

  function renderList(list) {
    var ul = $('[data-release-list]');
    if (!ul) return;

    if (!list.length) {
      ul.innerHTML =
        '<li class="rel-empty">还没有发布记录。正式包会在私有仓库打 tag、CI 出包后自动出现在这里，' +
        '也可以先到 <a href="' + CONFIG.releasesPage() + '" rel="noopener">GitHub Releases</a> 看看。</li>';
      return;
    }

    var maxCode = pickLatest(list).versionCode;
    ul.innerHTML = list.map(function (r) {
      var isLatest = r.versionCode === maxCode;
      var sum = summarize(r.notes);
      var url = r.url || ('https://github.com/' + CONFIG.repo + '/releases/download/' +
        encodeURIComponent(r.tag || ('v' + r.versionName)) + '/duo-launcher.apk');
      return '' +
        '<li class="rel">' +
          '<span class="rel-v' + (isLatest ? ' is-latest' : '') + '">v' + escapeHtml(r.versionName) +
            '<em>' + escapeHtml(r.versionCode || '') + '</em></span>' +
          '<span class="rel-d">' + escapeHtml(fmtDate(r.publishedAt)) + '</span>' +
          '<span class="rel-s">' + escapeHtml(fmtSize(r.size)) + '</span>' +
          '<span class="rel-n">' +
            (sum ? escapeHtml(sum) : '<span class="sum">无更新说明</span>') +
          '</span>' +
          '<span class="rel-a"><a class="btn btn-ghost btn-xs" rel="noopener" ' +
            'href="' + escapeHtml(url) + '" title="SHA256 ' + escapeHtml(r.sha256 || '未知') + '">下载</a></span>' +
        '</li>';
    }).join('');
  }

  function loadManifest() {
    var url = CONFIG.manifest + '?t=' + Date.now();   // 破 GitHub Pages 的 10 分钟缓存
    if (!window.fetch) return done([]);

    fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.releases) || [];
        list = list.filter(function (r) { return r && r.versionName; });
        renderLatest(pickLatest(list));
        renderList(list);
      })
      .catch(function (e) {
        // file:// 直接打开、或发布仓库还没有第一次发版，都会走到这里
        renderLatest(null);
        renderList([]);
        if (window.console) console.info('[duo] 读不到版本清单：', e && e.message);
      });
  }

  /* ───────────────────── 截图位（可选） ───────────────────── */

  function wireShot() {
    var fig = $('[data-shot-slot]');
    if (!fig) return;
    var img = $('[data-shot-img]', fig);
    img.addEventListener('load', function () { fig.hidden = false; });
    img.addEventListener('error', function () { fig.hidden = true; });
    var cap = $('[data-shot-cap]', fig);
    if (cap) {
      var now = new Date();
      cap.textContent = '真车界面 · 哈弗 B16 · 1920×1080';
    }
    img.src = CONFIG.shot;
  }

  /* ───────────────────────── 复制 ───────────────────────── */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }

  function wireCopy() {
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = $('[data-field="' + btn.getAttribute('data-copy') + '"]');
        if (!source) return;
        var text = source.textContent.trim();
        copyText(text).then(function () {
          var old = btn.textContent;
          btn.textContent = '已复制';
          btn.classList.add('is-done');
          setTimeout(function () {
            btn.textContent = old;
            btn.classList.remove('is-done');
          }, 1400);
        }).catch(function () { btn.textContent = '复制失败'; });
      });
    });
  }

  /* ───────────────────────── 标签页 ───────────────────────── */

  function wireTabs() {
    $$('[data-tabs]').forEach(function (root) {
      var tabs = $$('[role="tab"]', root);
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var key = tab.getAttribute('data-tab');
          tabs.forEach(function (t) {
            t.setAttribute('aria-selected', String(t === tab));
          });
          $$('[data-panel]', root).forEach(function (p) {
            p.hidden = p.getAttribute('data-panel') !== key;
          });
        });
      });
    });
  }

  /* ─────────────────── 导航状态 + 进场动画 ─────────────────── */

  function wireScroll() {
    var nav = $('#nav');
    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var links = $$('.nav-links a');
    var sections = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  function wireReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.body.classList.add('anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.card, .step, .callout').forEach(function (el) { io.observe(el); });
  }

  /* ───────────────────────── 启动 ───────────────────────── */

  function boot() {
    wireStaticLinks();
    wireCopy();
    wireTabs();
    wireShot();
    wireScroll();
    wireReveal();
    loadManifest();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

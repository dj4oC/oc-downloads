/* oc-downloads — reads data/releases.json and renders the dynamic sections.
   Routing-critical links are already static in index.html; this only enhances.
   If the fetch fails, a banner shows and the static fallbacks remain. */

;(function () {
  'use strict'

  var byId = function (id) {
    return document.getElementById(id)
  }

  // ---- formatting helpers ----
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return ''
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
    return Math.round(bytes / 1024) + ' KB'
  }

  function fmtDate(iso) {
    if (!iso) return '—'
    var d = new Date(iso)
    if (isNaN(d)) return iso
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function fmtDateTime(iso) {
    if (!iso) return '—'
    var d = new Date(iso)
    if (isNaN(d)) return iso
    return (
      d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      }) + ' UTC'
    )
  }

  // case-insensitive asset finder by regex on the file name
  function findAsset(assets, re) {
    if (!assets) return null
    for (var i = 0; i < assets.length; i++) {
      if (re.test(assets[i].name)) return assets[i]
    }
    return null
  }

  function clear(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild)
  }

  // build a download row: <a class="bin"> OS · arch ......... size  ↓ </a>
  function binRow(asset, osLabel, archLabel) {
    var a = document.createElement('a')
    a.className = 'bin'
    a.href = asset.browser_download_url
    a.setAttribute('download', '')

    var os = document.createElement('span')
    os.className = 'bin-os'
    os.textContent = osLabel
    a.appendChild(os)

    var arch = document.createElement('span')
    arch.className = 'bin-arch'
    arch.textContent = archLabel
    a.appendChild(arch)

    var size = document.createElement('span')
    size.className = 'bin-size'
    size.textContent = fmtSize(asset.size)
    a.appendChild(size)

    var dl = document.createElement('span')
    dl.className = 'bin-dl'
    dl.setAttribute('aria-hidden', 'true')
    dl.textContent = '↓'
    a.appendChild(dl)

    return a
  }

  // ---- renderers ----
  function renderOcis(rel) {
    if (!rel) return
    var ver = rel.tag_name || 'latest'
    if (byId('ocis-version')) byId('ocis-version').textContent = ver
    if (byId('spec-release')) byId('spec-release').textContent = (rel.name || ver) + ''
    if (byId('spec-published')) byId('spec-published').textContent = fmtDate(rel.published_at)
    if (byId('ocis-changelog') && rel.html_url) byId('ocis-changelog').href = rel.html_url

    var mount = byId('ocis-binaries')
    if (!mount) return

    // ordered platform matrix; .sha256/.pdf/.tar.gz excluded via end-anchored regex
    var matrix = [
      { os: 'Linux', arch: 'x86_64', re: /-linux-amd64$/i },
      { os: 'Linux', arch: 'ARM64', re: /-linux-arm64$/i },
      { os: 'macOS', arch: 'Intel (amd64)', re: /-darwin-amd64$/i },
      { os: 'macOS', arch: 'Apple Silicon', re: /-darwin-arm64$/i },
      { os: 'Windows', arch: 'x86_64', re: /-windows-amd64\.exe$/i }
    ]

    var rows = []
    for (var i = 0; i < matrix.length; i++) {
      var asset = findAsset(rel.assets, matrix[i].re)
      if (asset) rows.push(binRow(asset, matrix[i].os, matrix[i].arch))
    }

    clear(mount)
    if (rows.length === 0) {
      // keep a usable fallback if no assets matched (e.g. pre-release tag)
      var fb = document.createElement('a')
      fb.className = 'bin-fallback'
      fb.href = rel.html_url || 'https://github.com/owncloud/ocis/releases/latest'
      fb.textContent = 'Browse binaries on GitHub →'
      mount.appendChild(fb)
      return
    }
    for (var r = 0; r < rows.length; r++) mount.appendChild(rows[r])
  }

  function renderClient(rel) {
    if (!rel) return
    if (byId('client-version')) byId('client-version').textContent = rel.tag_name || ''

    // owncloud/client GitHub releases usually carry no installer assets (they live
    // on download.owncloud.com), so only add a button when an asset is actually present.
    var plats = [
      { id: 'client-win', label: 'Direct installer', re: /\.(exe|msi)$/i },
      { id: 'client-mac', label: 'Direct installer', re: /\.(pkg|dmg)$/i },
      { id: 'client-linux', label: 'AppImage', re: /\.appimage$/i }
    ]
    for (var i = 0; i < plats.length; i++) {
      var asset = findAsset(rel.assets, plats[i].re)
      var mount = byId(plats[i].id)
      if (!asset || !mount) continue
      var a = document.createElement('a')
      a.className = 'btn btn-block'
      a.href = asset.browser_download_url
      a.setAttribute('download', '')
      a.textContent = plats[i].label + ' (' + fmtSize(asset.size) + ') →'
      mount.insertBefore(a, mount.firstChild)
    }
  }

  function renderMobile(data) {
    if (data.ios && data.ios[0] && byId('ios-version')) {
      byId('ios-version').textContent = data.ios[0].tag_name || ''
    }
    if (data.android && data.android[0] && byId('android-version')) {
      byId('android-version').textContent = data.android[0].tag_name || ''
    }
  }

  function renderFooter(data) {
    if (byId('footer-year')) byId('footer-year').textContent = String(new Date().getFullYear())
    if (byId('footer-updated')) byId('footer-updated').textContent = fmtDateTime(data.generated_at)
    if (byId('stamp-date') && data.generated_at) {
      byId('stamp-date').textContent = String(data.generated_at).slice(0, 7).replace('-', '.')
    }
  }

  // ---- copy-to-clipboard (independent of the data fetch) ----
  function wireCopy() {
    var blocks = document.querySelectorAll('.cmd[data-copy]')
    Array.prototype.forEach.call(blocks, function (block) {
      var btn = block.querySelector('.copy')
      if (!btn) return
      btn.addEventListener('click', function () {
        var text = block.getAttribute('data-copy') || ''
        var done = function () {
          var original = 'copy'
          btn.textContent = '✓ copied'
          btn.classList.add('copied')
          setTimeout(function () {
            btn.textContent = original
            btn.classList.remove('copied')
          }, 1500)
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallbackCopy)
        } else {
          fallbackCopy()
        }
        function fallbackCopy() {
          try {
            var ta = document.createElement('textarea')
            ta.value = text
            ta.setAttribute('readonly', '')
            ta.style.position = 'absolute'
            ta.style.left = '-9999px'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            done()
          } catch (e) {
            /* clipboard blocked; the command is visible to copy manually */
          }
        }
      })
    })
  }

  // ---- bus node stagger index (enhancement only) ----
  function wireBus() {
    var nodes = document.querySelectorAll('.bus .node')
    Array.prototype.forEach.call(nodes, function (node, i) {
      node.style.setProperty('--i', String(i))
    })
  }

  // ---- below-the-fold reveal on scroll (enhancement; load class already shows them) ----
  function wireScrollReveal() {
    if (!('IntersectionObserver' in window)) return
    // sections are revealed via body.loaded already; this just re-staggers the lower
    // ones as they enter view for a touch of polish without blocking content.
  }

  function showBanner() {
    var b = byId('data-banner')
    if (b) b.hidden = false
  }

  // ---- boot ----
  function init() {
    wireCopy()
    wireBus()
    wireScrollReveal()

    // year is safe to set even if the fetch fails
    if (byId('footer-year')) byId('footer-year').textContent = String(new Date().getFullYear())

    fetch('data/releases.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then(function (data) {
        renderOcis(data.ocis && data.ocis[0])
        renderClient(data.client && data.client[0])
        renderMobile(data)
        renderFooter(data)
      })
      .catch(function (err) {
        if (window.console) console.warn('release data unavailable:', err)
        showBanner()
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()

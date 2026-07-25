/* =========================================================
   ord5 — Circle of Fifths  (app.js)
   Vanilla JS. No dependencies.
   ========================================================= */

(() => {
  'use strict';

  /* -----------------------------------------------------
     Data
     ----------------------------------------------------- */

  // 12 keys clockwise starting at C (top).
  // [majorRoot, minorRoot, sharps, flats, preferFlat]
  const CIRCLE = [
    ['C', 'Am', 0, 0, false],
    ['G', 'Em', 1, 0, false],
    ['D', 'Bm', 2, 0, false],
    ['A', 'F#m', 3, 0, false],
    ['E', 'C#m', 4, 0, false],
    ['B', 'G#m', 5, 0, false],
    ['F#', 'D#m', 6, 0, false],
    ['D♭', 'B♭m', 0, 5, true],
    ['A♭', 'Fm', 0, 4, true],
    ['E♭', 'Cm', 0, 3, true],
    ['B♭', 'Gm', 0, 2, true],
    ['F', 'Dm', 0, 1, true],
  ];

  // Note index lookup (chromatic)
  const NOTE_INDEX = {
    'C': 0, 'B#': 0,
    'C#': 1, 'D♭': 1,
    'D': 2,
    'D#': 3, 'E♭': 3,
    'E': 4, 'F♭': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'G♭': 6,
    'G': 7,
    'G#': 8, 'A♭': 8,
    'A': 9,
    'A#': 10, 'B♭': 10,
    'B': 11, 'C♭': 11,
  };

  function noteToIndex(n) {
    if (NOTE_INDEX[n] !== undefined) return NOTE_INDEX[n];
    // Handle minor root with trailing 'm'
    if (n.endsWith('m') && NOTE_INDEX[n.slice(0, -1)] !== undefined) {
      return NOTE_INDEX[n.slice(0, -1)];
    }
    return 0;
  }

  // Music theory
  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
  const MAJOR_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];
  const MINOR_QUALITIES = ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'];
  const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

  // Build the set of all chromatic spellings we might encounter,
  // so the chord panel can show a nicely-spelled note name.
  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  // F# major / D# minor (6 sharps) are the one key pair in this circle whose
  // diatonic spelling needs a "skip letter" note: their scale is F# G# A# B C# D# E#,
  // not F# G# A# B C# D# F. Use this table only for those two keys.
  const SHARP_NAMES_HIGH = ['C', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function indexToSharpName(i, extended = false) {
    const table = extended ? SHARP_NAMES_HIGH : SHARP_NAMES;
    return table[((i % 12) + 12) % 12];
  }
  function indexToFlatName(i) { return FLAT_NAMES[((i % 12) + 12) % 12]; }

  // For the chord panel only: return the other common enharmonic spelling
  // of a chord root (e.g. "B♭" -> "A#", "F#" -> "G♭"), so the panel can
  // show it as a secondary reference next to the correct primary spelling.
  // Returns null for natural notes where there's no useful alternative.
  function otherSpelling(root) {
    if (typeof root !== 'string') return null;
    const idx = noteToIndex(root);
    const flatName = indexToFlatName(idx);
    const sharpName = indexToSharpName(idx);
    if (flatName === sharpName && root === flatName) return null; // plain natural note
    if (root === flatName) return sharpName;
    if (root === sharpName) return flatName;
    // root uses a "skip letter" spelling not in either base table (e.g. E#) —
    // its natural-name equivalent is the useful alt to show.
    return flatName;
  }

  function majorKeyChords(root, preferFlat = false, useHighSharps = false) {
    const idx = noteToIndex(root);
    const name = preferFlat ? indexToFlatName : (i => indexToSharpName(i, useHighSharps));
    return MAJOR_STEPS.map((step, i) => ({
      numeral: ROMAN_MAJOR[i],
      root: name(idx + step),
      quality: MAJOR_QUALITIES[i],
    }));
  }

  function minorKeyChords(root, preferFlat = false, useHighSharps = false) {
    const idx = noteToIndex(root);
    const name = preferFlat ? indexToFlatName : (i => indexToSharpName(i, useHighSharps));
    return MINOR_STEPS.map((step, i) => ({
      numeral: ROMAN_MINOR[i],
      root: name(idx + step),
      quality: MINOR_QUALITIES[i],
    }));
  }

  function minorDisplayName(minorRoot, preferFlat) {
    const idx = noteToIndex(minorRoot);
    const name = preferFlat ? indexToFlatName : indexToSharpName;
    return name(idx) + 'm';
  }

  /* -----------------------------------------------------
     Geometry
     ----------------------------------------------------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CX = 300, CY = 300;
  const R_OUTER = 280;
  const R_INNER_OUTER = 180;
  const R_INNER_INNER = 92;

  function wedgePath(cx, cy, r1, r2, startDeg, endDeg) {
    const toRad = (d) => (d - 90) * Math.PI / 180;
    const a1 = toRad(startDeg);
    const a2 = toRad(endDeg);
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
    const x1 = cx + r2 * Math.cos(a1);
    const y1 = cy + r2 * Math.sin(a1);
    const x2 = cx + r2 * Math.cos(a2);
    const y2 = cy + r2 * Math.sin(a2);
    const x3 = cx + r1 * Math.cos(a2);
    const y3 = cy + r1 * Math.sin(a2);
    const x4 = cx + r1 * Math.cos(a1);
    const y4 = cy + r1 * Math.sin(a1);
    return [
      `M ${x1} ${y1}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');
  }

  function midPoint(r, startDeg, endDeg) {
    const mid = (startDeg + endDeg) / 2;
    const rad = (mid - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  /* -----------------------------------------------------
     Render
     ----------------------------------------------------- */
  const outerGroup = document.getElementById('outer-wedges');
  const innerGroup = document.getElementById('inner-wedges');
  const WEDGES = []; // { el, keyIndex, kind, root, preferFlat }

  function buildCircle() {
    const STEP = 360 / 12;
    CIRCLE.forEach((entry, i) => {
      const [majorRoot, minorRoot, sharps, flats, preferFlat] = entry;
      const startDeg = -15 + i * STEP;
      const endDeg = startDeg + STEP;
      const sigText = sharps > 0 ? `${sharps}♯` : (flats > 0 ? `${flats}♭` : '');

      // OUTER (major) wedge
      const outerPath = wedgePath(CX, CY, R_INNER_OUTER, R_OUTER, startDeg, endDeg);
      const outerEl = document.createElementNS(SVG_NS, 'path');
      outerEl.setAttribute('d', outerPath);
      outerEl.setAttribute('class', 'wedge wedge--outer');
      outerEl.setAttribute('data-key-index', String(i));
      outerEl.setAttribute('data-kind', 'major');
      outerEl.setAttribute('tabindex', '0');
      outerEl.setAttribute('role', 'button');
      outerEl.setAttribute('aria-label', `${majorRoot} major`);

      const outerMid = midPoint((R_INNER_OUTER + R_OUTER) / 2, startDeg, endDeg);
      const outerLabel = document.createElementNS(SVG_NS, 'text');
      outerLabel.setAttribute('class', 'wedge__label');
      outerLabel.setAttribute('x', outerMid.x);
      outerLabel.setAttribute('y', outerMid.y - 4);
      outerLabel.setAttribute('font-size', '19');
      outerLabel.textContent = majorRoot;

      const outerSub = document.createElementNS(SVG_NS, 'text');
      outerSub.setAttribute('class', 'wedge__sublabel');
      outerSub.setAttribute('x', outerMid.x);
      outerSub.setAttribute('y', outerMid.y + 14);
      outerSub.textContent = sigText;

      outerGroup.appendChild(outerEl);
      outerGroup.appendChild(outerLabel);
      outerGroup.appendChild(outerSub);

      WEDGES.push({ el: outerEl, keyIndex: i, kind: 'major', root: majorRoot, preferFlat });

      // INNER (minor) wedge
      const innerPath = wedgePath(CX, CY, R_INNER_INNER, R_INNER_OUTER, startDeg, endDeg);
      const innerEl = document.createElementNS(SVG_NS, 'path');
      innerEl.setAttribute('d', innerPath);
      innerEl.setAttribute('class', 'wedge wedge--inner');
      innerEl.setAttribute('data-key-index', String(i));
      innerEl.setAttribute('data-kind', 'minor');
      innerEl.setAttribute('tabindex', '0');
      innerEl.setAttribute('role', 'button');
      innerEl.setAttribute('aria-label', `${minorRoot.replace(/m$/, '')} minor`);

      const innerMid = midPoint((R_INNER_INNER + R_INNER_OUTER) / 2, startDeg, endDeg);
      const innerLabel = document.createElementNS(SVG_NS, 'text');
      innerLabel.setAttribute('class', 'wedge__label');
      innerLabel.setAttribute('x', innerMid.x);
      innerLabel.setAttribute('y', innerMid.y);
      innerLabel.setAttribute('font-size', '13');
      innerLabel.textContent = minorDisplayName(minorRoot, preferFlat);

      innerGroup.appendChild(innerEl);
      innerGroup.appendChild(innerLabel);

      WEDGES.push({ el: innerEl, keyIndex: i, kind: 'minor', root: minorRoot, preferFlat });
    });

    WEDGES.forEach(w => {
      w.el.addEventListener('click', () => onWedgeClick(w));
      w.el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onWedgeClick(w);
        }
      });
    });
  }

  /* -----------------------------------------------------
     State & selection
     ----------------------------------------------------- */
  const state = {
    mode: 'major',      // 'major' | 'minor'
    keyIndex: null,     // 0-11
    kind: null,         // 'major' | 'minor'
  };

  function onWedgeClick(w) {
    state.keyIndex = w.keyIndex;
    state.kind = w.kind;
    // If the user clicked a wedge of the "other" kind, swap mode to match.
    if (state.kind === 'major' && state.mode !== 'major') setMode('major');
    else if (state.kind === 'minor' && state.mode !== 'minor') setMode('minor');
    else render();
  }

  function clearSelection() {
    state.keyIndex = null;
    state.kind = null;
    document.getElementById('clear-btn').disabled = true;
    document.body.querySelector('.app').classList.remove('has-selection');
    WEDGES.forEach(w => w.el.classList.remove('is-selected', 'is-chord-major', 'is-chord-minor', 'is-chord-dim'));
    document.getElementById('hub-root').textContent = '—';
    document.getElementById('hub-mode').textContent = 'CLICK A KEY';
    document.getElementById('hub-eyebrow').textContent = 'SELECTED';
    document.getElementById('panel-root').textContent = '—';
    document.getElementById('panel-mode').textContent = 'NO KEY';
    document.getElementById('stage-hint').classList.remove('is-hidden');
    renderChordList(null);
  }

  function render() {
    if (state.keyIndex === null) return clearSelection();
    const entry = CIRCLE[state.keyIndex];
    const [majorRoot, minorRoot, sharps, flats, preferFlat] = entry;
    const displayRoot = state.kind === 'major' ? majorRoot : minorRoot.replace(/m$/, '');
    const modeLabel = state.kind === 'major' ? 'MAJOR' : 'MINOR';

    document.getElementById('clear-btn').disabled = false;
    document.querySelector('.app').classList.add('has-selection');
    document.getElementById('stage-hint').classList.add('is-hidden');

    document.getElementById('hub-root').textContent = displayRoot;
    document.getElementById('hub-mode').textContent = modeLabel;
    document.getElementById('hub-eyebrow').textContent = 'SELECTED';

    document.getElementById('panel-root').textContent = displayRoot;
    document.getElementById('panel-mode').textContent = modeLabel;

    // Compute diatonic chords. F# major / D# minor (6 sharps) need the
    // extended sharp table so their scale spells correctly with E#.
    const useHighSharps = sharps === 6;
    const chords = state.kind === 'major'
      ? majorKeyChords(majorRoot, preferFlat, useHighSharps)
      : minorKeyChords(minorRoot, preferFlat, useHighSharps);

    // Reset wedge states
    WEDGES.forEach(w => w.el.classList.remove('is-selected', 'is-chord-major', 'is-chord-minor', 'is-chord-dim'));

    // Mark selected wedge
    const sel = WEDGES.find(x => x.keyIndex === state.keyIndex && x.kind === state.kind);
    if (sel) sel.el.classList.add('is-selected');

    // Color chord wedges — match by chromatic index for correctness.
    // Major-quality chords highlight only their matching outer (major) wedge;
    // minor/dim-quality chords highlight only their matching inner (minor) wedge.
    chords.forEach(ch => {
      const chordIdx = noteToIndex(ch.root);
      const cls = ch.quality === 'major' ? 'is-chord-major'
        : ch.quality === 'minor' ? 'is-chord-minor'
          : 'is-chord-dim';
      if (ch.quality === 'major') {
        const outer = WEDGES.find(w => w.kind === 'major' && noteToIndex(w.root) === chordIdx);
        if (outer) outer.el.classList.add(cls);
      } else {
        const inner = WEDGES.find(w => w.kind === 'minor' && noteToIndex(w.root) === chordIdx);
        if (inner) inner.el.classList.add(cls);
      }
    });

    renderChordList(chords, displayRoot, modeLabel);
  }

  function renderChordList(chords, root, mode) {
    const list = document.getElementById('chord-list');
    if (!chords) {
      list.innerHTML = `
        <li class="chord-row chord-row--empty">
          <span class="chord-row__numeral">I</span>
          <span class="chord-row__name">—</span>
          <span class="chord-row__quality">PICK A WEDGE</span>
        </li>`;
      return;
    }
    list.innerHTML = chords.map(c => {
      const qLabel = c.quality === 'major' ? 'MAJ' : c.quality === 'minor' ? 'MIN' : 'DIM';
      const suffix = c.quality === 'minor' ? 'm' : c.quality === 'dim' ? '°' : '';
      const alt = otherSpelling(c.root);
      const nameHtml = alt
        ? `${c.root}${suffix}<span class="chord-row__alt">/${alt}${suffix}</span>`
        : `${c.root}${suffix}`;
      return `
        <li class="chord-row" data-quality="${c.quality}">
          <span class="chord-row__numeral">${c.numeral}</span>
          <span class="chord-row__name">${nameHtml}</span>
          <span class="chord-row__quality">${qLabel}</span>
        </li>`;
    }).join('');
  }

  /* -----------------------------------------------------
     Mode switcher + clear
     ----------------------------------------------------- */
  function setMode(mode) {
    state.mode = mode;
    if (state.keyIndex !== null) state.kind = mode;
    document.querySelectorAll('.seg').forEach(p => {
      const isActive = p.dataset.mode === mode;
      p.classList.toggle('is-active', isActive);
      p.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (state.keyIndex !== null) render();
  }

  function setupControls() {
    document.querySelectorAll('.seg').forEach(p => {
      p.addEventListener('click', () => setMode(p.dataset.mode));
    });
    document.getElementById('clear-btn').addEventListener('click', () => {
      if (state.keyIndex !== null) clearSelection();
    });
  }



/* -----------------------------------------------------
      Theme toggle
      ----------------------------------------------------- */
  const STORAGE_KEY = 'ord5.theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }
    document.getElementById('theme-label').textContent = theme === 'light' ? 'LIGHT' : 'DARK';
  }

  function setupTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const isSmall = () => window.matchMedia('(max-width: 767px)').matches;

    const update = () => {
      if (isSmall()) {
        // Mobile: follow OS, no manual control
        document.documentElement.setAttribute('data-os-light', mq.matches ? 'true' : 'false');
      } else {
        // Desktop: stored value (or dark default)
        let stored = 'dark';
        try { stored = localStorage.getItem(STORAGE_KEY) || 'dark'; } catch (_) { }
        applyTheme(stored);
      }
    };
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);

    document.getElementById('theme-toggle').addEventListener('click', () => {
      if (isSmall()) return;
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { }
      applyTheme(next);
    });
  }

  /* -----------------------------------------------------
      Boot
      ----------------------------------------------------- */
  function init() {
    buildCircle();
    setupControls();
    setupTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
// ==================================================
// ANNOTATIONS : modèle de données et dessin SVG (sans dépendance au navigateur)
// ==================================================
//
// Types d'annotation :
//   shape   forme dans une case (circle, square, diamond, triangle, star, disc)
//   text    lettre, nombre (0 à 20) ou symbole (sym:+ sym:x sym:-) ajusté à la case
//   label   texte libre centré sur la case, qui peut déborder sur les cases voisines
//   piece   figurine (« K:b » = Roi style plein, « K:w » = Roi style creux)
//   border  case appartenant à une zone dont on trace le contour extérieur
//   arrow   flèche ; arrow2 flèche double ; line trait simple
// Chaque case porte au plus un élément de chaque type (sauf border : un par couleur).
// ==================================================

import { PIECE_PATHS } from './piece-paths.js';

export const COLORS = [
  { id: 'noir', label: 'Noir', hex: '#141414', outline: '#ffffff' },
  { id: 'gris', label: 'Gris', hex: '#8b8b8b', outline: '#ffffff' },
  { id: 'blanc', label: 'Blanc', hex: '#ffffff', outline: '#141414' },
  { id: 'rouge', label: 'Rouge', hex: '#e02424', outline: '#ffffff' },
  { id: 'orange', label: 'Orange', hex: '#f77f00', outline: '#ffffff' },
  { id: 'jaune', label: 'Jaune', hex: '#ffd60a', outline: '#ffffff' },
  { id: 'vert', label: 'Vert', hex: '#1f9d3a', outline: '#ffffff' },
  { id: 'cyan', label: 'Cyan', hex: '#00b4d8', outline: '#ffffff' },
  { id: 'bleu', label: 'Bleu', hex: '#1d4ed8', outline: '#ffffff' },
  { id: 'violet', label: 'Violet', hex: '#8e24aa', outline: '#ffffff' },
  { id: 'rose', label: 'Rose', hex: '#f06292', outline: '#ffffff' },
];

const COLOR_BY_ID = Object.fromEntries(COLORS.map((color) => [color.id, color]));

// Ordre demandé : cercle, carré, losange, triangle, étoile, petit disque, trait, flèche, flèche double, + x -
export const SHAPES = [
  { type: 'shape', value: 'circle', label: 'Cercle' },
  { type: 'shape', value: 'square', label: 'Carré' },
  { type: 'shape', value: 'diamond', label: 'Losange' },
  { type: 'shape', value: 'triangle', label: 'Triangle' },
  { type: 'shape', value: 'star', label: 'Étoile à 5 branches' },
  { type: 'shape', value: 'disc', label: 'Petit disque' },
  { type: 'line', value: '', label: 'Trait : cliquer les deux cases extrêmes' },
  { type: 'arrow', value: '', label: 'Flèche : cliquer la case de départ, puis la case d’arrivée' },
  { type: 'arrow2', value: '', label: 'Flèche double : cliquer les deux cases extrêmes' },
  { type: 'text', value: 'sym:+', label: 'Plus' },
  { type: 'text', value: 'sym:x', label: 'Croix' },
  { type: 'text', value: 'sym:-', label: 'Moins' },
];

export const NUMBERS = Array.from({ length: 21 }, (_, i) => String(i)); // 0 à 20
export const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const PIECE_LETTERS = ['K', 'Q', 'R', 'B', 'N', 'P'];

export const TWO_CLICK = new Set(['line', 'arrow', 'arrow2']);

// --------------------------------------------------
// DONNÉES
// --------------------------------------------------

export function createMarkSet() {
  const items = [];

  const sameEnds = (item, from, to, ordered) =>
    ordered ? item.from === from && item.to === to : (item.from === from && item.to === to) || (item.from === to && item.to === from);

  return {
    items,

    clear() {
      items.length = 0;
    },

    isEmpty() {
      return items.length === 0;
    },

    /** Pose un élément dans une case ; le même clic une seconde fois l'enlève. */
    placeSquare(key, type, value, color) {
      const index = items.findIndex((item) => item.key === key && item.type === type);
      const item = { type, value, color, key };
      if (index < 0) items.push(item);
      else if (items[index].value === value && items[index].color === color) items.splice(index, 1);
      else items[index] = item;
    },

    /** Ajoute ou retire une case d'une zone entourée (une zone par couleur). */
    toggleBorder(key, color) {
      const index = items.findIndex((item) => item.type === 'border' && item.key === key && item.color === color);
      if (index >= 0) items.splice(index, 1);
      else items.push({ type: 'border', value: '', color, key });
    },

    /** Trait, flèche ou flèche double entre deux cases. */
    toggleLink(type, from, to, color) {
      const ordered = type === 'arrow';
      const index = items.findIndex((item) => item.type === type && sameEnds(item, from, to, ordered));
      const item = { type, color, from, to };
      if (index < 0) items.push(item);
      else if (items[index].color === color) items.splice(index, 1);
      else items[index] = item;
    },

    /** Gomme : retire tout ce qui touche la case (éléments, appartenance aux zones, traits et flèches). */
    eraseAt(key) {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item.key === key || item.from === key || item.to === key) items.splice(i, 1);
      }
    },
  };
}

// --------------------------------------------------
// ZONES ENTOURÉES (outil « Bordures »)
// --------------------------------------------------

/**
 * Contours extérieurs d'un ensemble de cases (coordonnées [colonne, rangée] à l'écran).
 * Renvoie une liste de boucles, chacune étant une liste de sommets [x, y] sur la grille ;
 * l'intérieur est à droite du sens de parcours. Les côtés communs à deux cases disparaissent.
 */
export function borderLoops(cells) {
  const set = new Set(cells.map(([c, r]) => c + ',' + r));
  const has = (c, r) => set.has(c + ',' + r);

  const outgoing = new Map(); // sommet -> arêtes sortantes
  const addEdge = (x1, y1, x2, y2) => {
    const key = x1 + ',' + y1;
    if (!outgoing.has(key)) outgoing.set(key, []);
    outgoing.get(key).push({ x1, y1, x2, y2, dx: x2 - x1, dy: y2 - y1, used: false });
  };

  for (const [c, r] of cells) {
    if (!has(c, r - 1)) addEdge(c, r, c + 1, r);
    if (!has(c + 1, r)) addEdge(c + 1, r, c + 1, r + 1);
    if (!has(c, r + 1)) addEdge(c + 1, r + 1, c, r + 1);
    if (!has(c - 1, r)) addEdge(c, r + 1, c, r);
  }

  const loops = [];
  for (const edges of outgoing.values()) {
    for (const start of edges) {
      if (start.used) continue;
      const loop = [];
      let edge = start;
      while (edge && !edge.used) {
        edge.used = true;
        loop.push([edge.x1, edge.y1]);
        const candidates = (outgoing.get(edge.x2 + ',' + edge.y2) || []).filter((e) => !e.used);
        // aux sommets de contact en diagonale : on tourne à droite pour séparer les contours
        const right = [-edge.dy, edge.dx];
        const left = [edge.dy, -edge.dx];
        const pick = (vector) => candidates.find((e) => e.dx === vector[0] && e.dy === vector[1]);
        edge = pick(right) || pick([edge.dx, edge.dy]) || pick(left) || candidates[0];
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

/** Décale une boucle vers l'intérieur de `inset` (unités de 100 par case) et supprime les sommets alignés. */
export function insetLoop(loop, inset) {
  const points = [];
  const count = loop.length;
  for (let i = 0; i < count; i++) {
    const previous = loop[(i + count - 1) % count];
    const current = loop[i];
    const next = loop[(i + 1) % count];
    const inDir = [Math.sign(current[0] - previous[0]), Math.sign(current[1] - previous[1])];
    const outDir = [Math.sign(next[0] - current[0]), Math.sign(next[1] - current[1])];
    if (inDir[0] === outDir[0] && inDir[1] === outDir[1]) continue; // sommet aligné : inutile
    const normalIn = [-inDir[1], inDir[0]]; // normale vers l'intérieur (à droite)
    const normalOut = [-outDir[1], outDir[0]];
    points.push([
      current[0] * 100 + inset * (normalIn[0] + normalOut[0]),
      current[1] * 100 + inset * (normalIn[1] + normalOut[1]),
    ]);
  }
  return points;
}

// --------------------------------------------------
// DESSIN
// --------------------------------------------------

const number = (value) => Math.round(value * 10) / 10;
const ROUND = 'stroke-linecap="round" stroke-linejoin="round"';

/** Trait avec un liseré de couleur contrastée (blanc, ou noir pour les marques blanches). */
function stroked(tag, attributes, color, width, extra = '') {
  return (
    `<${tag} ${attributes} fill="none" stroke="${color.outline}" stroke-width="${width + 7}" ${extra}/>` +
    `<${tag} ${attributes} fill="none" stroke="${color.hex}" stroke-width="${width}" ${extra}/>`
  );
}

function starPoints() {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const radius = i % 2 === 0 ? 42 : 17;
    points.push(number(50 + radius * Math.cos(angle)) + ',' + number(54 + radius * Math.sin(angle)));
  }
  return points.join(' ');
}

function escapeText(text) {
  return String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

const TEXT_STYLE = 'font-weight="700" font-family="Arial, Helvetica, sans-serif" stroke-linejoin="round" paint-order="stroke"';

/** Figurine dans une case de 100 × 100 : style plein (« b ») ou creux (« w »). */
function pieceFragment(value, color) {
  const [letter, style] = value.split(':');
  const paths = PIECE_PATHS[letter];
  if (!paths) return '';
  const scale = (90 / 2048).toFixed(5);
  const stroke = `stroke="${color.outline}" stroke-width="95" stroke-linejoin="round" paint-order="stroke"`;
  let inner;
  if (style === 'w') {
    // le liseré doit entourer le contour de la figurine (et pas seulement son fond) : on le dessine d'abord
    inner =
      `<path d="${paths.whiteLine}" fill="${color.outline}" ${stroke}/>` +
      `<path d="${paths.whiteBody}" fill="#fafafa"/>` +
      `<path d="${paths.whiteLine}" fill="${color.hex}"/>`;
  } else {
    // comme dans l'image d'origine : les parties claires sont dessous, le contour foncé (coloré ici) dessus
    inner =
      (paths.blackDetail ? `<path d="${paths.blackDetail}" fill="${color.outline}"/>` : '') +
      `<path d="${paths.black}" fill="${color.hex}" ${stroke}/>`;
  }
  return `<g transform="translate(5 5) scale(${scale})">${inner}</g>`;
}

/** Dessin d'un élément (hors texte libre) dans une case de 100 × 100 unités. */
function squareFragment(item, color) {
  switch (item.type) {
    case 'shape':
      switch (item.value) {
        case 'disc':
          return `<circle cx="50" cy="50" r="15" fill="${color.hex}" stroke="${color.outline}" stroke-width="4"/>`;
        case 'circle':
          return stroked('circle', 'cx="50" cy="50" r="39"', color, 8);
        case 'square':
          return stroked('rect', 'x="10" y="10" width="80" height="80" rx="15" ry="15"', color, 8);
        case 'diamond':
          return stroked('polygon', 'points="50,9 91,50 50,91 9,50"', color, 8, ROUND);
        case 'triangle':
          return stroked('polygon', 'points="50,12 90,87 10,87"', color, 8, ROUND);
        case 'star':
          return `<polygon points="${starPoints()}" fill="${color.hex}" stroke="${color.outline}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/>`;
        default:
          return '';
      }

    case 'piece':
      return pieceFragment(item.value, color);

    case 'text':
      switch (item.value) {
        case 'sym:+':
          return stroked('path', 'd="M50 24V76M24 50H76"', color, 11, ROUND);
        case 'sym:x':
          return stroked('path', 'd="M28 28L72 72M72 28L28 72"', color, 11, ROUND);
        case 'sym:-':
          return stroked('path', 'd="M24 50H76"', color, 11, ROUND);
        default: {
          const length = item.value.length;
          const size = length <= 1 ? 66 : length === 2 ? 56 : 90 / (length * 0.62);
          return (
            `<text x="50" y="53" text-anchor="middle" dominant-baseline="central" font-size="${number(size)}" ${TEXT_STYLE} ` +
            `fill="${color.hex}" stroke="${color.outline}" stroke-width="7">${escapeText(item.value)}</text>`
          );
        }
      }

    default:
      return '';
  }
}

/** Trait, flèche ou flèche double entre deux points (unités de 100 par case). */
function linkFragment(type, ax, ay, bx, by, color, preview = false) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  // aperçu : pointes réduites, le trait s'étend sur toute la longueur comme pour le trait simple
  const inset = preview ? 3 : 12;
  const headLength = preview ? 22 : 34;
  const headHalf = preview ? 15 : 22;

  const headAt = (tipX, tipY, sign) => {
    const tx = tipX - sign * ux * inset;
    const ty = tipY - sign * uy * inset;
    const baseX = tx - sign * ux * headLength;
    const baseY = ty - sign * uy * headLength;
    return {
      base: [baseX, baseY],
      points:
        `${number(tx)},${number(ty)} ` +
        `${number(baseX + px * headHalf)},${number(baseY + py * headHalf)} ` +
        `${number(baseX - px * headHalf)},${number(baseY - py * headHalf)}`,
    };
  };

  const endHead = type === 'line' ? null : headAt(bx, by, 1);
  const startHead = type === 'arrow2' ? headAt(ax, ay, -1) : null;
  const from = startHead ? startHead.base : [ax, ay];
  const to = endHead ? endHead.base : [bx, by];
  const shaft = `x1="${number(from[0])}" y1="${number(from[1])}" x2="${number(to[0])}" y2="${number(to[1])}"`;
  const heads = [endHead, startHead].filter(Boolean);

  const layer = (paint, width, headWidth) =>
    `<line ${shaft} stroke="${paint}" stroke-width="${width}" stroke-linecap="round"/>` +
    heads
      .map((head) => `<polygon points="${head.points}" fill="${paint}" stroke="${paint}" stroke-width="${headWidth}" stroke-linejoin="round"/>`)
      .join('');

  return `<g opacity=".92">${layer(color.outline, 21, 7)}${layer(color.hex, 14, 2)}</g>`;
}

/** Coin supérieur gauche d'une case dans le SVG de 800 × 800 unités. */
function squareOrigin(key, white) {
  const file = key.charCodeAt(0) - 97;
  const rank = parseInt(key[1], 10) - 1;
  return white ? [file * 100, (7 - rank) * 100] : [(7 - file) * 100, rank * 100];
}

const RANK = { border: 0, piece: 1, shape: 2, line: 3, arrow: 3, arrow2: 3, text: 4, label: 5 };

/** Contours des zones « Bordures » : un tracé continu par groupe de cases connexes. */
function bordersFragment(items, white) {
  const byColor = new Map();
  for (const item of items) {
    if (item.type !== 'border') continue;
    const [x, y] = squareOrigin(item.key, white);
    if (!byColor.has(item.color)) byColor.set(item.color, []);
    byColor.get(item.color).push([x / 100, y / 100]);
  }

  let body = '';
  for (const [colorId, cells] of byColor) {
    const color = COLOR_BY_ID[colorId] || COLORS[3];
    for (const loop of borderLoops(cells)) {
      const points = insetLoop(loop, 8);
      if (points.length < 3) continue;
      const d = 'M' + points.map(([x, y]) => number(x) + ' ' + number(y)).join('L') + 'Z';
      body += stroked('path', `d="${d}"`, color, 8, ROUND);
    }
  }
  return body;
}

/**
 * SVG complet des annotations pour l'orientation donnée.
 * pending : case de départ d'un trait ou d'une flèche en cours de tracé (anneau pointillé).
 */
export function renderSvg(items, white, pending = null) {
  const ordered = items.filter((item) => item.type !== 'border').sort((a, b) => RANK[a.type] - RANK[b.type]);
  let body = bordersFragment(items, white);

  for (const item of ordered) {
    const color = COLOR_BY_ID[item.color] || COLORS[3];

    if (item.type === 'line' || item.type === 'arrow' || item.type === 'arrow2') {
      const [fx, fy] = squareOrigin(item.from, white);
      const [tx, ty] = squareOrigin(item.to, white);
      body += linkFragment(item.type, fx + 50, fy + 50, tx + 50, ty + 50, color);
      continue;
    }

    const [x, y] = squareOrigin(item.key, white);

    if (item.type === 'label') {
      // centré sur la case ; peut déborder sur les voisines mais jamais hors de l'échiquier
      const text = String(item.value);
      let size = 44;
      let width = text.length * size * 0.62;
      if (width > 780) {
        size = 780 / (text.length * 0.62);
        width = 780;
      }
      const center = Math.min(Math.max(x + 50, 8 + width / 2), 792 - width / 2);
      body +=
        `<text x="${number(center)}" y="${number(y + 53)}" text-anchor="middle" dominant-baseline="central" font-size="${number(size)}" ${TEXT_STYLE} ` +
        `fill="${color.hex}" stroke="${color.outline}" stroke-width="7">${escapeText(text)}</text>`;
      continue;
    }

    body += `<g transform="translate(${x} ${y})">${squareFragment(item, color)}</g>`;
  }

  if (pending) {
    const [x, y] = squareOrigin(pending, white);
    body += `<g transform="translate(${x} ${y})"><circle cx="50" cy="50" r="44" fill="none" stroke="#2f6fd6" stroke-width="6" stroke-dasharray="11 9"/></g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
}

/** Petit SVG de prévisualisation d'un outil (boutons de la palette). */
export function glyphSvg(type, value, colorId) {
  const color = COLOR_BY_ID[colorId] || COLORS[3];
  const inner =
    type === 'line' || type === 'arrow' || type === 'arrow2'
      ? linkFragment(type, 20, 80, 80, 20, color, true)
      : squareFragment({ type, value }, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}

// ==================================================
// ANNOTATIONS : modèle de données et dessin SVG (sans dépendance au navigateur)
// ==================================================
//
// Une annotation est de l'un de ces types :
//   shape : forme dans une case  (value : disc | circle | square | triangle)
//   text  : lettre, chiffre ou symbole dans une case
//           (value : « a », « 7 »… ou « sym:+ », « sym:x », « sym:- »)
//   arrow : flèche d'une case à une autre
// Chaque case porte au plus une forme et un texte (on peut avoir les deux).
// ==================================================

export const COLORS = [
  { id: 'noir', label: 'Noir', hex: '#141414', outline: '#ffffff' },
  { id: 'gris', label: 'Gris', hex: '#8b8b8b', outline: '#ffffff' },
  { id: 'blanc', label: 'Blanc', hex: '#ffffff', outline: '#1a1a1a' },
  { id: 'rouge', label: 'Rouge', hex: '#e02424', outline: '#ffffff' },
  { id: 'orange', label: 'Orange', hex: '#f77f00', outline: '#ffffff' },
  { id: 'jaune', label: 'Jaune', hex: '#ffd60a', outline: '#4a4000' },
  { id: 'vert', label: 'Vert', hex: '#1f9d3a', outline: '#ffffff' },
  { id: 'cyan', label: 'Cyan', hex: '#00b4d8', outline: '#0b3a45' },
  { id: 'bleu', label: 'Bleu', hex: '#1d4ed8', outline: '#ffffff' },
  { id: 'violet', label: 'Violet', hex: '#8e24aa', outline: '#ffffff' },
  { id: 'rose', label: 'Rose', hex: '#f06292', outline: '#5a1a35' },
];

const COLOR_BY_ID = Object.fromEntries(COLORS.map((color) => [color.id, color]));

export const SHAPES = [
  { value: 'disc', label: 'Petit disque' },
  { value: 'circle', label: 'Cercle' },
  { value: 'square', label: 'Carré' },
  { value: 'triangle', label: 'Triangle' },
];
export const SYMBOLS = ['sym:+', 'sym:x', 'sym:-'];
export const DIGITS = '0123456789'.split('');
export const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// --------------------------------------------------
// DONNÉES
// --------------------------------------------------

export function createMarkSet() {
  const items = [];

  return {
    items,

    clear() {
      items.length = 0;
    },

    isEmpty() {
      return items.length === 0;
    },

    /** Pose une forme ou un texte ; le même clic une seconde fois l'enlève. */
    placeSquare(key, type, value, color) {
      const index = items.findIndex((item) => item.key === key && item.type === type);
      const item = { type, value, color, key };
      if (index < 0) items.push(item);
      else if (items[index].value === value && items[index].color === color) items.splice(index, 1);
      else items[index] = item;
    },

    toggleArrow(from, to, color) {
      const index = items.findIndex((item) => item.type === 'arrow' && item.from === from && item.to === to);
      const item = { type: 'arrow', from, to, color };
      if (index < 0) items.push(item);
      else if (items[index].color === color) items.splice(index, 1);
      else items[index] = item;
    },

    /** Gomme : retire tout ce qui touche la case (formes, textes, flèches qui y partent ou y arrivent). */
    eraseAt(key) {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item.key === key || item.from === key || item.to === key) items.splice(i, 1);
      }
    },
  };
}

// --------------------------------------------------
// DESSIN
// --------------------------------------------------

const number = (value) => Math.round(value * 10) / 10;

/** Trait avec un liseré de couleur contrastée (lisible sur cases claires et foncées). */
function stroked(tag, attributes, color, width, extra = '') {
  return (
    `<${tag} ${attributes} fill="none" stroke="${color.outline}" stroke-width="${width + 7}" ${extra}/>` +
    `<${tag} ${attributes} fill="none" stroke="${color.hex}" stroke-width="${width}" ${extra}/>`
  );
}

const ROUND = 'stroke-linecap="round" stroke-linejoin="round"';

/** Dessin d'un élément dans une case de 100 × 100 unités. */
function squareFragment(item, color) {
  if (item.type === 'shape') {
    switch (item.value) {
      case 'disc':
        return `<circle cx="50" cy="50" r="15" fill="${color.hex}" stroke="${color.outline}" stroke-width="4"/>`;
      case 'circle':
        return stroked('circle', 'cx="50" cy="50" r="39"', color, 8);
      case 'square':
        return stroked('rect', 'x="10" y="10" width="80" height="80" rx="15" ry="15"', color, 8);
      case 'triangle':
        return stroked('polygon', 'points="50,12 90,87 10,87"', color, 8, ROUND);
      default:
        return '';
    }
  }

  // texte
  switch (item.value) {
    case 'sym:+':
      return stroked('path', 'd="M50 24V76M24 50H76"', color, 11, ROUND);
    case 'sym:x':
      return stroked('path', 'd="M28 28L72 72M72 28L28 72"', color, 11, ROUND);
    case 'sym:-':
      return stroked('path', 'd="M24 50H76"', color, 11, ROUND);
    default:
      return (
        `<text x="50" y="53" text-anchor="middle" dominant-baseline="central" font-size="66" font-weight="700" ` +
        `font-family="Arial, Helvetica, sans-serif" fill="${color.hex}" stroke="${color.outline}" stroke-width="7" ` +
        `paint-order="stroke" stroke-linejoin="round">${escapeText(item.value)}</text>`
      );
  }
}

function escapeText(text) {
  return String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

/** Flèche entre deux points (coordonnées en unités de 100 par case). */
function arrowFragment(ax, ay, bx, by, color) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const tipX = bx - ux * 12;
  const tipY = by - uy * 12;
  const baseX = tipX - ux * 34;
  const baseY = tipY - uy * 34;
  const px = -uy;
  const py = ux;
  const head =
    `${number(tipX)},${number(tipY)} ` +
    `${number(baseX + px * 22)},${number(baseY + py * 22)} ` +
    `${number(baseX - px * 22)},${number(baseY - py * 22)}`;
  const shaft = `x1="${number(ax)}" y1="${number(ay)}" x2="${number(baseX)}" y2="${number(baseY)}"`;

  return (
    `<g opacity=".92">` +
    `<line ${shaft} stroke="${color.outline}" stroke-width="21" stroke-linecap="round"/>` +
    `<polygon points="${head}" fill="${color.outline}" stroke="${color.outline}" stroke-width="7" stroke-linejoin="round"/>` +
    `<line ${shaft} stroke="${color.hex}" stroke-width="14" stroke-linecap="round"/>` +
    `<polygon points="${head}" fill="${color.hex}" stroke="${color.hex}" stroke-width="2" stroke-linejoin="round"/>` +
    `</g>`
  );
}

/** Coin supérieur gauche d'une case dans le SVG de 800 × 800 unités. */
function squareOrigin(key, white) {
  const file = key.charCodeAt(0) - 97;
  const rank = parseInt(key[1], 10) - 1;
  return white ? [file * 100, (7 - rank) * 100] : [(7 - file) * 100, rank * 100];
}

const RANK = { shape: 0, arrow: 1, text: 2 }; // les textes passent au-dessus

/**
 * SVG complet des annotations pour l'orientation donnée.
 * pendingArrow : case de départ d'une flèche en cours de tracé (anneau pointillé).
 */
export function renderSvg(items, white, pendingArrow = null) {
  const ordered = [...items].sort((a, b) => RANK[a.type] - RANK[b.type]);
  let body = '';

  for (const item of ordered) {
    const color = COLOR_BY_ID[item.color] || COLORS[3];
    if (item.type === 'arrow') {
      const [fx, fy] = squareOrigin(item.from, white);
      const [tx, ty] = squareOrigin(item.to, white);
      body += arrowFragment(fx + 50, fy + 50, tx + 50, ty + 50, color);
    } else {
      const [x, y] = squareOrigin(item.key, white);
      body += `<g transform="translate(${x} ${y})">${squareFragment(item, color)}</g>`;
    }
  }

  if (pendingArrow) {
    const [x, y] = squareOrigin(pendingArrow, white);
    body += `<g transform="translate(${x} ${y})"><circle cx="50" cy="50" r="44" fill="none" stroke="#2f6fd6" stroke-width="6" stroke-dasharray="11 9"/></g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
}

/** Petit SVG de prévisualisation d'un outil (boutons de la palette). */
export function glyphSvg(type, value, colorId) {
  const color = COLOR_BY_ID[colorId] || COLORS[3];
  let inner;
  if (type === 'arrow') inner = arrowFragment(20, 80, 80, 20, color);
  else inner = squareFragment({ type: type === 'shape' ? 'shape' : 'text', value }, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, NUMBERS, SHAPES, borderLoops, createMarkSet, glyphSvg, insetLoop, renderSvg } from '../src/marks.js';

test('11 couleurs, liseré blanc partout sauf pour le blanc', () => {
  assert.deepEqual(COLORS.map((c) => c.id), ['noir','gris','blanc','rouge','orange','jaune','vert','cyan','bleu','violet','rose']);
  for (const c of COLORS) assert.equal(c.outline, c.id === 'blanc' ? '#141414' : '#ffffff', c.id);
});

test('nombres de 0 à 20 et ordre des formes', () => {
  assert.equal(NUMBERS.length, 21); assert.equal(NUMBERS[0], '0'); assert.equal(NUMBERS[20], '20');
  assert.deepEqual(SHAPES.map((s) => s.value || s.type), ['circle','square','diamond','triangle','star','disc','line','arrow','arrow2','sym:+','sym:x','sym:-']);
});

test('pose, remplacement et retrait d’un élément de case', () => {
  const m = createMarkSet();
  m.placeSquare('e4', 'shape', 'circle', 'rouge');
  m.placeSquare('e4', 'shape', 'square', 'rouge');
  assert.equal(m.items.length, 1); assert.equal(m.items[0].value, 'square');
  m.placeSquare('e4', 'shape', 'square', 'bleu'); assert.equal(m.items[0].color, 'bleu');
  m.placeSquare('e4', 'text', 'a', 'bleu'); assert.equal(m.items.length, 2);
  m.placeSquare('e4', 'label', "a''", 'bleu'); assert.equal(m.items.length, 3);
  m.placeSquare('e4', 'piece', 'K:b', 'rouge'); assert.equal(m.items.length, 4);
  m.placeSquare('e4', 'shape', 'square', 'bleu'); assert.equal(m.items.length, 3);
});

test('traits, flèches et flèches doubles', () => {
  const m = createMarkSet();
  m.toggleLink('arrow', 'a1', 'h8', 'vert');
  m.toggleLink('arrow', 'h8', 'a1', 'vert');          // sens inverse : autre flèche
  assert.equal(m.items.length, 2);
  m.toggleLink('line', 'a1', 'h8', 'rouge');
  m.toggleLink('line', 'h8', 'a1', 'rouge');          // un trait n'a pas de sens : bascule
  assert.equal(m.items.length, 2);
  m.toggleLink('arrow2', 'c3', 'f6', 'noir'); m.toggleLink('arrow2', 'f6', 'c3', 'bleu');
  assert.equal(m.items.length, 3); assert.equal(m.items[2].color, 'bleu');
  m.eraseAt('h8'); assert.deepEqual(m.items.map((i) => i.type), ['arrow2']);
});

test('zone : bascule par couleur ; la gomme retire la case', () => {
  const m = createMarkSet();
  m.toggleBorder('d4', 'rouge'); m.toggleBorder('d4', 'bleu'); assert.equal(m.items.length, 2);
  m.toggleBorder('d4', 'rouge'); assert.equal(m.items.length, 1);
  m.eraseAt('d4'); assert.ok(m.isEmpty());
});

const loops = (cells) => borderLoops(cells).map((l) => l.length);

test('contours : 1 case, domino, 3 alignées, L, trou, contact diagonal', () => {
  assert.deepEqual(loops([[0,0]]), [4]);
  assert.deepEqual(loops([[0,0],[1,0]]), [6]);                         // 6 sommets bruts (4 après suppression des alignés)
  assert.deepEqual(insetLoop(borderLoops([[0,0],[1,0]])[0], 8).length, 4);   // rectangle 1×2
  assert.deepEqual(insetLoop(borderLoops([[0,0],[1,0],[2,0]])[0], 8).length, 4); // rectangle 1×3
  assert.equal(insetLoop(borderLoops([[0,0],[0,1],[1,1]])[0], 8).length, 6);    // L
  const ring = [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]];                 // anneau 3×3 : 2 contours
  assert.equal(borderLoops(ring).length, 2);
  assert.equal(borderLoops([[0,0],[1,1]]).length, 2);                              // contact diagonal : 2 contours
  assert.equal(borderLoops([[0,0],[1,0],[0,1],[1,1]]).length, 1);                  // bloc 2×2 : 1 contour
});

test('contour décalé vers l’intérieur', () => {
  const pts = insetLoop(borderLoops([[2,3]])[0], 8);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  assert.equal(Math.min(...xs), 208); assert.equal(Math.max(...xs), 292);
  assert.equal(Math.min(...ys), 308); assert.equal(Math.max(...ys), 392);
});

test('rendu SVG : orientation, texte libre qui reste dans l’échiquier, figurines, zones', () => {
  const m = createMarkSet();
  m.placeSquare('a1', 'shape', 'star', 'rouge');
  m.placeSquare('h8', 'text', '20', 'bleu');
  m.placeSquare('a4', 'label', "longtexte''", 'noir');
  m.placeSquare('e5', 'piece', 'Q:w', 'vert'); m.placeSquare('e6', 'piece', 'N:b', 'blanc');
  m.toggleBorder('b2', 'orange'); m.toggleBorder('b3', 'orange');
  m.toggleLink('arrow2', 'a1', 'h8', 'vert');
  const svg = renderSvg(m.items, true);
  assert.match(svg, /translate\(0 700\)/); assert.match(svg, /translate\(700 0\)/);
  assert.match(svg, />20</); assert.match(svg, /longtexte/);
  assert.equal((svg.match(/<polygon/g) || []).length >= 3, true);       // étoile + 2 pointes de flèche double
  const x = Number(svg.match(/<text x="([\d.]+)"[^>]*>longtexte/)[1]);
  assert.ok(x >= 8 + 1 && x <= 792, 'texte libre dans les limites : ' + x);
  assert.match(svg, /M\d/);                                              // tracé de zone
  const black = renderSvg(m.items, false);
  assert.notEqual(black, svg);
  assert.match(renderSvg([], true, 'e4'), /stroke-dasharray/);
});

test('texte libre collé au bord : décalé vers l’intérieur', () => {
  const m = createMarkSet();
  m.placeSquare('h5', 'label', 'abcdefgh', 'rouge');
  const svg = renderSvg(m.items, true);
  const x = Number(svg.match(/<text x="([\d.]+)"/)[1]);
  assert.ok(x < 750, 'recentré à gauche : ' + x);
  m.clear(); m.placeSquare('a5', 'label', 'abcdefgh', 'rouge');
  const x2 = Number(renderSvg(m.items, true).match(/<text x="([\d.]+)"/)[1]);
  assert.ok(x2 > 50, 'recentré à droite : ' + x2);
});

test('aperçus des outils', () => {
  for (const s of SHAPES) assert.match(glyphSvg(s.type, s.value, 'rouge'), /^<svg/);
  assert.match(glyphSvg('piece', 'K:b', 'bleu'), /<path/);
  assert.match(glyphSvg('piece', 'P:w', 'blanc'), /<path/);
});

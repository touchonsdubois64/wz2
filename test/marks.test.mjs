import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, createMarkSet, glyphSvg, renderSvg } from '../src/marks.js';

test('11 couleurs, dans l’ordre demandé', () => {
  assert.deepEqual(COLORS.map((c) => c.id), ['noir','gris','blanc','rouge','orange','jaune','vert','cyan','bleu','violet','rose']);
});

test('pose, remplacement et retrait d’une forme', () => {
  const m = createMarkSet();
  m.placeSquare('e4', 'shape', 'circle', 'rouge');
  assert.equal(m.items.length, 1);
  m.placeSquare('e4', 'shape', 'square', 'rouge');          // autre forme : remplace
  assert.equal(m.items.length, 1); assert.equal(m.items[0].value, 'square');
  m.placeSquare('e4', 'shape', 'square', 'bleu');            // autre couleur : remplace
  assert.equal(m.items[0].color, 'bleu');
  m.placeSquare('e4', 'text', 'a', 'bleu');                  // forme et texte coexistent
  assert.equal(m.items.length, 2);
  m.placeSquare('e4', 'shape', 'square', 'bleu');            // même clic : retire
  assert.equal(m.items.length, 1);
});

test('flèches : bascule, remplacement de couleur, gomme', () => {
  const m = createMarkSet();
  m.toggleArrow('a1', 'h8', 'vert');
  m.toggleArrow('a1', 'h8', 'rouge');
  assert.equal(m.items.length, 1); assert.equal(m.items[0].color, 'rouge');
  m.placeSquare('h8', 'text', 'x', 'noir');
  m.placeSquare('c3', 'text', '7', 'noir');
  m.eraseAt('h8');                                            // retire texte et flèche arrivant en h8
  assert.deepEqual(m.items.map((i) => i.key || i.from), ['c3']);
  m.toggleArrow('a1', 'h8', 'rouge'); m.toggleArrow('a1', 'h8', 'rouge');
  assert.equal(m.items.length, 1);
  m.clear(); assert.ok(m.isEmpty());
});

test('lettre « x » et symbole croix ne se confondent pas', () => {
  const m = createMarkSet();
  m.placeSquare('d4', 'text', 'x', 'noir');
  m.placeSquare('d4', 'text', 'sym:x', 'noir');
  assert.equal(m.items.length, 1); assert.equal(m.items[0].value, 'sym:x');
});

test('rendu SVG : orientation et contenu', () => {
  const m = createMarkSet();
  m.placeSquare('a1', 'shape', 'disc', 'rouge');
  m.placeSquare('h8', 'text', 'Q', 'bleu');
  m.toggleArrow('a1', 'h8', 'vert');
  const white = renderSvg(m.items, true);
  assert.match(white, /translate\(0 700\)/);                 // a1 en bas à gauche
  assert.match(white, /translate\(700 0\)/);                 // h8 en haut à droite
  assert.match(white, />Q</);
  assert.match(white, /<polygon/);                           // pointe de flèche
  const black = renderSvg(m.items, false);
  assert.match(black, /translate\(700 0\)[^]*translate\(0 700\)|translate\(0 700\)[^]*translate\(700 0\)/);
  assert.match(black, /translate\(700 0\)/);                 // a1 en haut à droite quand retourné
  assert.match(renderSvg([], true, 'e4'), /stroke-dasharray/); // anneau de départ de flèche
});

test('aperçus des outils', () => {
  for (const [type, value] of [['shape','circle'],['shape','square'],['shape','triangle'],['shape','disc'],['arrow',''],['text','sym:+'],['text','sym:x'],['text','sym:-'],['text','b']]) {
    assert.match(glyphSvg(type, value, 'rouge'), /^<svg/);
  }
});

// ==================================================
// ANNOTATIONS : barre d'outils et interaction
// ==================================================
//
// Le bouton « crayon » ouvre la barre d'outils. Tant qu'elle est ouverte, un clic
// sur une case pose (ou retire) l'annotation choisie ; les pièces peuvent toujours
// être déplacées par glisser-déposer. Fermée, la barre laisse les annotations affichées.
// ==================================================

import { COLORS, DIGITS, LOWERCASE, SHAPES, SYMBOLS, UPPERCASE, createMarkSet, glyphSvg, renderSvg } from './marks.js';

const SYMBOL_LABEL = { 'sym:+': 'Plus', 'sym:x': 'Croix', 'sym:-': 'Moins' };

const ERASER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.1 3.9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H6.6l-3-3a2 2 0 0 1 0-2.8zM9 18h12" fill="none" stroke="#333" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';

export function setupMarks({ layer, panel, button, isWhite, onActiveChange }) {
  const marks = createMarkSet();
  let active = false;
  let colorId = 'rouge';
  let tool = { type: 'shape', value: 'circle' };
  let arrowStart = null;

  const colorButtons = [];
  const toolButtons = [];

  function render() {
    layer.innerHTML = renderSvg(marks.items, isWhite(), arrowStart);
  }

  function refreshButtons() {
    colorButtons.forEach(({ element, id }) => element.classList.toggle('selected', id === colorId));
    toolButtons.forEach(({ element, type, value, preview }) => {
      element.classList.toggle('selected', tool.type === type && tool.value === value);
      if (preview) element.innerHTML = glyphSvg(type, value, colorId);
    });
  }

  function selectTool(type, value) {
    tool = { type, value };
    arrowStart = null;
    refreshButtons();
    render();
  }

  // ---- construction de la barre d'outils
  panel.innerHTML = '';
  const addRow = (className) => {
    const row = document.createElement('div');
    row.className = 'marks-row ' + className;
    panel.appendChild(row);
    return row;
  };

  const colorsRow = addRow('marks-colors');
  for (const color of COLORS) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'marks-color' + (color.id === 'blanc' ? ' light' : '');
    element.style.setProperty('--c', color.hex);
    element.title = color.label;
    element.setAttribute('aria-label', color.label);
    element.addEventListener('click', () => {
      colorId = color.id;
      refreshButtons();
    });
    colorsRow.appendChild(element);
    colorButtons.push({ element, id: color.id });
  }

  function addTool(row, type, value, { label, preview = false, text = null, html = null }) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'marks-tool';
    element.title = label;
    element.setAttribute('aria-label', label);
    if (text !== null) element.textContent = text;
    if (html !== null) element.innerHTML = html;
    element.addEventListener('click', () => selectTool(type, value));
    row.appendChild(element);
    toolButtons.push({ element, type, value, preview });
  }

  // Les 70 outils sont rangés en onglets pour que la barre reste basse (utile sur téléphone).
  const tabsRow = addRow('marks-tabs');
  const groups = {};
  const tabButtons = {};
  const addGroup = (id, label, className) => {
    groups[id] = addRow(className);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'marks-tab';
    tab.textContent = label;
    tab.addEventListener('click', () => showGroup(id));
    tabsRow.appendChild(tab);
    tabButtons[id] = tab;
  };
  const showGroup = (id) => {
    for (const key of Object.keys(groups)) {
      groups[key].hidden = key !== id;
      tabButtons[key].classList.toggle('selected', key === id);
    }
  };

  addGroup('formes', 'Formes', 'marks-tools');
  addTool(groups.formes, 'erase', '', { label: 'Gomme : efface tout ce qui touche la case cliquée', html: ERASER_SVG });
  for (const shape of SHAPES) addTool(groups.formes, 'shape', shape.value, { label: shape.label, preview: true });
  addTool(groups.formes, 'arrow', '', { label: 'Flèche : cliquer la case de départ, puis la case d’arrivée', preview: true });
  for (const symbol of SYMBOLS) addTool(groups.formes, 'text', symbol, { label: SYMBOL_LABEL[symbol], preview: true });

  addGroup('chiffres', '0–9', 'marks-chars');
  for (const digit of DIGITS) addTool(groups.chiffres, 'text', digit, { label: 'Chiffre ' + digit, text: digit });
  addGroup('minuscules', 'a–z', 'marks-chars');
  for (const letter of LOWERCASE) addTool(groups.minuscules, 'text', letter, { label: 'Lettre ' + letter, text: letter });
  addGroup('majuscules', 'A–Z', 'marks-chars');
  for (const letter of UPPERCASE) addTool(groups.majuscules, 'text', letter, { label: 'Lettre ' + letter, text: letter });
  showGroup('formes');

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'marks-action';
  clearButton.textContent = 'Effacer tout';
  clearButton.addEventListener('click', () => api.clear());
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'marks-action';
  closeButton.textContent = 'Fermer';
  closeButton.addEventListener('click', () => api.setActive(false));
  tabsRow.append(clearButton, closeButton);

  refreshButtons();

  // ---- ouverture / fermeture
  button.addEventListener('click', () => api.setActive(!active));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && arrowStart) {
      arrowStart = null;
      render();
    }
  });

  const api = {
    isActive: () => active,

    setActive(value) {
      if (value === active) return;
      active = value;
      panel.hidden = !active;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      document.body.classList.toggle('marking', active);
      arrowStart = null;
      render();
      if (onActiveChange) onActiveChange(active);
    },

    /** Clic sur une case de l'échiquier alors que l'outil est actif. */
    click(key) {
      if (!active) return;
      if (tool.type === 'erase') {
        marks.eraseAt(key);
        arrowStart = null;
      } else if (tool.type === 'arrow') {
        if (!arrowStart) arrowStart = key;
        else if (arrowStart === key) arrowStart = null;
        else {
          marks.toggleArrow(arrowStart, key, colorId);
          arrowStart = null;
        }
      } else {
        marks.placeSquare(key, tool.type, tool.value, colorId);
      }
      render();
    },

    clear() {
      marks.clear();
      arrowStart = null;
      render();
    },

    render,
  };

  render();
  return api;
}

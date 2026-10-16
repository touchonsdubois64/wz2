// ==================================================
// ANNOTATIONS : barre d'outils et interaction
// ==================================================
//
// Le bouton « crayon » ouvre la barre d'outils. Tant qu'elle est ouverte, un clic
// sur une case pose (ou retire) l'annotation choisie ; les pièces peuvent toujours
// être déplacées par glisser-déposer. Fermée, la barre laisse les annotations affichées.
//
// Agencement : couleurs / « 0-20 a-z A-Z Texte » / « Figurines Formes Bordures » /
// « Gomme Effacer tout Fermer » / puis les outils du groupe choisi.
// ==================================================

import {
  COLORS,
  LOWERCASE,
  NUMBERS,
  PIECE_LETTERS,
  SHAPES,
  TWO_CLICK,
  UPPERCASE,
  createMarkSet,
  glyphSvg,
  renderSvg,
} from './marks.js';

const ERASER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.1 3.9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H6.6l-3-3a2 2 0 0 1 0-2.8zM9 18h12" fill="none" stroke="#333" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';

const PIECE_NAMES = { K: 'Roi', Q: 'Dame', R: 'Tour', B: 'Fou', N: 'Cavalier', P: 'Pion' };

export function setupMarks({ layer, panel, button, isWhite, onActiveChange }) {
  const marks = createMarkSet();
  let active = false;
  let colorId = 'rouge';
  let tool = { type: 'shape', value: 'circle' };
  let previousTool = tool; // pour revenir de la gomme
  let arrowStart = null;

  const colorButtons = [];
  const toolButtons = [];
  const groupTabs = {};
  const groupPanels = {};
  let eraserButton = null;
  let labelInput = null;

  function render() {
    layer.innerHTML = renderSvg(marks.items, isWhite(), arrowStart);
  }

  const isSelected = (entry) => tool.type === entry.type && tool.value === entry.value;

  function refreshButtons() {
    colorButtons.forEach(({ element, id }) => element.classList.toggle('selected', id === colorId));
    toolButtons.forEach((entry) => {
      entry.element.classList.toggle('selected', isSelected(entry));
      if (entry.preview) entry.element.innerHTML = glyphSvg(entry.type, entry.value, colorId);
    });
    if (eraserButton) eraserButton.classList.toggle('selected', tool.type === 'erase');
  }

  function selectTool(type, value = '') {
    if (type !== 'erase') previousTool = { type, value };
    tool = { type, value };
    arrowStart = null;
    refreshButtons();
    render();
  }

  // ---- construction de la barre d'outils
  panel.innerHTML = '';
  const addRow = (className, parent = panel) => {
    const row = document.createElement('div');
    row.className = 'marks-row ' + className;
    parent.appendChild(row);
    return row;
  };
  const addButton = (row, className, label, onClick) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = label;
    element.addEventListener('click', onClick);
    row.appendChild(element);
    return element;
  };

  // 1. couleurs
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

  // 2 et 3. onglets des groupes
  const tabsA = addRow('marks-tabs');
  const tabsB = addRow('marks-tabs');
  // 4. actions
  const actionsRow = addRow('marks-tabs');
  // 5. contenu du groupe choisi
  const content = addRow('marks-content');
  content.classList.remove('marks-row');

  function showGroup(id) {
    for (const key of Object.keys(groupPanels)) {
      groupPanels[key].hidden = key !== id;
      groupTabs[key].classList.toggle('selected', key === id);
    }
    // ces deux groupes n'ont qu'un seul outil : il est choisi d'office
    if (id === 'texte') selectTool('label');
    if (id === 'bordures') selectTool('border');
  }

  function addGroup(id, label, tabsRow) {
    groupTabs[id] = addButton(tabsRow, 'marks-tab', label, () => showGroup(id));
    const body = document.createElement('div');
    body.className = 'marks-group';
    body.hidden = true;
    content.appendChild(body);
    groupPanels[id] = body;
    return body;
  }

  function addTool(parent, type, value, { label, preview = false, text = null, html = null }) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'marks-tool';
    element.title = label;
    element.setAttribute('aria-label', label);
    if (text !== null) element.textContent = text;
    if (html !== null) element.innerHTML = html;
    element.addEventListener('click', () => selectTool(type, value));
    parent.appendChild(element);
    toolButtons.push({ element, type, value, preview });
  }

  const flowRow = (parent) => {
    const row = document.createElement('div');
    row.className = 'marks-row';
    parent.appendChild(row);
    return row;
  };

  // nombres 0-20, minuscules, majuscules
  const numbers = addGroup('nombres', '0-20', tabsA);
  const numbersRow = flowRow(numbers);
  for (const value of NUMBERS) addTool(numbersRow, 'text', value, { label: 'Nombre ' + value, text: value });

  const lower = addGroup('minuscules', 'a-z', tabsA);
  const lowerRow = flowRow(lower);
  for (const letter of LOWERCASE) addTool(lowerRow, 'text', letter, { label: 'Lettre ' + letter, text: letter });

  const upper = addGroup('majuscules', 'A-Z', tabsA);
  const upperRow = flowRow(upper);
  for (const letter of UPPERCASE) addTool(upperRow, 'text', letter, { label: 'Lettre ' + letter, text: letter });

  // texte libre
  const free = addGroup('texte', 'Texte', tabsA);
  labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'marks-text text-field';
  labelInput.maxLength = 30;
  labelInput.placeholder = "Texte court, ex. a', b'', 12…";
  labelInput.setAttribute('aria-label', 'Texte libre à poser sur une case');
  labelInput.autocomplete = 'off';
  labelInput.spellcheck = false;
  labelInput.addEventListener('focus', () => selectTool('label'));
  labelInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') labelInput.blur();
  });
  free.appendChild(labelInput);
  const freeHint = document.createElement('p');
  freeHint.className = 'marks-hint';
  freeHint.textContent = 'Saisissez le texte, puis cliquez une case : il y est centré et peut déborder sur les cases voisines.';
  free.appendChild(freeHint);

  // figurines : deux rangées comme dans l'éditeur de position (style creux puis style plein)
  const figurines = addGroup('figurines', 'Figurines', tabsB);
  for (const style of ['w', 'b']) {
    const row = flowRow(figurines);
    for (const letter of PIECE_LETTERS) {
      addTool(row, 'piece', letter + ':' + style, { label: PIECE_NAMES[letter] + (style === 'w' ? ' (creux)' : ' (plein)'), preview: true });
    }
  }

  // formes
  const shapes = addGroup('formes', 'Formes', tabsB);
  const shapesRow = flowRow(shapes);
  for (const shape of SHAPES) addTool(shapesRow, shape.type, shape.value, { label: shape.label, preview: true });

  // bordures
  const borders = addGroup('bordures', 'Bordures', tabsB);
  const borderHint = document.createElement('p');
  borderHint.className = 'marks-hint';
  borderHint.textContent =
    'Cliquez les cases de la zone à entourer : seul le contour extérieur est tracé (un clic de plus retire la case).';
  borders.appendChild(borderHint);

  // 4. gomme, effacer tout, fermer
  eraserButton = document.createElement('button');
  eraserButton.type = 'button';
  eraserButton.className = 'marks-tab marks-eraser';
  eraserButton.title = 'Gomme : efface tout ce qui touche la case cliquée';
  eraserButton.innerHTML = ERASER_SVG + '<span>Gomme</span>';
  eraserButton.addEventListener('click', () => {
    if (tool.type === 'erase') selectTool(previousTool.type, previousTool.value);
    else selectTool('erase');
  });
  actionsRow.appendChild(eraserButton);
  addButton(actionsRow, 'marks-tab', 'Effacer tout', () => api.clear());
  addButton(actionsRow, 'marks-tab', 'Fermer', () => api.setActive(false));

  showGroup('formes');
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
      } else if (TWO_CLICK.has(tool.type)) {
        if (!arrowStart) arrowStart = key;
        else if (arrowStart === key) arrowStart = null;
        else {
          marks.toggleLink(tool.type, arrowStart, key, colorId);
          arrowStart = null;
        }
      } else if (tool.type === 'border') {
        marks.toggleBorder(key, colorId);
      } else if (tool.type === 'label') {
        const text = labelInput.value.trim();
        if (!text) {
          labelInput.focus();
          return;
        }
        marks.placeSquare(key, 'label', text, colorId);
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

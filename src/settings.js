// ==================================================
// RÉGLAGES (roue dentée) : pour l'instant, les couleurs des cases de l'échiquier.
// Les choix sont mémorisés dans le navigateur (localStorage).
// ==================================================

const STORAGE_KEY = 'winning-zone.settings';

const PRESETS = [
  { id: 'classique', label: 'Classique', light: '#f0d9b5', dark: '#bdac8d' },
  { id: 'brun', label: 'Brun', light: '#f0d9b5', dark: '#b58863' },
  { id: 'vert', label: 'Vert', light: '#eeeed2', dark: '#769656' },
  { id: 'bleu', label: 'Bleu', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'gris', label: 'Gris', light: '#ebebeb', dark: '#a6a6a6' },
];
const DEFAULT = PRESETS[0];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && /^#[0-9a-f]{6}$/i.test(saved.light) && /^#[0-9a-f]{6}$/i.test(saved.dark)) return saved;
  } catch (error) {
    /* stockage indisponible : on garde les couleurs par défaut */
  }
  return { light: DEFAULT.light, dark: DEFAULT.dark };
}

function save(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    /* sans importance : le réglage vaut pour la session */
  }
}

function apply(settings) {
  const root = document.documentElement;
  root.style.setProperty('--board-light', settings.light);
  root.style.setProperty('--board-dark', settings.dark);
}

export function setupSettings({ button, menu }) {
  let settings = load();
  apply(settings);

  const close = () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  function render() {
    menu.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'settings-title';
    title.textContent = 'Réglages';
    menu.appendChild(title);

    const section = document.createElement('p');
    section.className = 'settings-section';
    section.textContent = 'Couleurs des cases';
    menu.appendChild(section);

    const presets = document.createElement('div');
    presets.className = 'settings-presets';
    for (const preset of PRESETS) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'settings-preset' + (preset.light === settings.light && preset.dark === settings.dark ? ' selected' : '');
      element.innerHTML =
        `<span class="settings-swatch"><i style="background:${preset.light}"></i><i style="background:${preset.dark}"></i></span>` +
        `<span>${preset.label}</span>`;
      element.addEventListener('click', () => change({ light: preset.light, dark: preset.dark }));
      presets.appendChild(element);
    }
    menu.appendChild(presets);

    const colors = document.createElement('div');
    colors.className = 'settings-colors';
    const makePicker = (label, key) => {
      const wrapper = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'color';
      input.value = settings[key];
      input.addEventListener('input', () => change({ ...settings, [key]: input.value }, false));
      wrapper.append(document.createTextNode(label), input);
      return wrapper;
    };
    colors.append(makePicker('Claires', 'light'), makePicker('Foncées', 'dark'));
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'settings-reset';
    reset.textContent = 'Rétablir';
    reset.addEventListener('click', () => change({ light: DEFAULT.light, dark: DEFAULT.dark }));
    colors.appendChild(reset);
    menu.appendChild(colors);

    const note = document.createElement('p');
    note.className = 'settings-note';
    note.textContent = 'D’autres réglages pourront être ajoutés ici.';
    menu.appendChild(note);
  }

  function change(next, redraw = true) {
    settings = next;
    apply(settings);
    save(settings);
    if (redraw) render();
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (menu.hidden) {
      render();
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    } else {
      close();
    }
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !event.composedPath().includes(menu)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

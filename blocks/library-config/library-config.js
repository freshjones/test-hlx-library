import { createTag } from './library-utils.js';

const validListTypes = ['blocks', 'sections', 'buttons', 'placeholders', 'assets', 'templates'];

const LIBRARY_PATH = '/block-library/library.json';

async function executeList(name, content, list) {
  const { default: listFn } = await import(`./lists/${name}.js`);
  listFn(content, list);
}

async function loadListContent(type, content, list) {
  list.innerHTML = '';
  if (validListTypes.includes(type)) {
    executeList(type, content, list);
  } else {
    // eslint-disable-next-line no-console
    console.log(`Library type not supported: ${type}`);
  }
}

async function fetchLibrary(domain) {
  const { searchParams } = new URL(window.location.href);
  const suppliedLibrary = searchParams.get('library');
  const library = suppliedLibrary || `${domain}${LIBRARY_PATH}`;
  const resp = await fetch(library);
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchSuppliedLibrary() {
  const { searchParams } = new URL(window.location.href);
  const repo = searchParams.get('repo');
  const owner = searchParams.get('owner');
  if (!repo || !owner) return null;
  return fetchLibrary(`https://main--${repo}--${owner}.hlx.live`);
}

async function fetchAssetsData(path) {
  if (!path) return null;
  const resp = await fetch(path);
  if (!resp.ok) return null;

  const json = await resp.json();
  return json.entities.map((entity) => entity.links[0].href);
}

async function combineLibraries(base, supplied) {
  if (!base) return {};

  const library = Object.entries(base).reduce((prev, [name, item]) => ({
    ...prev,
    [name]: [...(item.data || [])],
  }), {});

  const url = new URL(window.location.href);
  const assetsPath = url.searchParams.get('assets');
  library.assets = await fetchAssetsData(assetsPath);

  if (supplied) {
    Object.entries(supplied).forEach(([name, item]) => {
      const { data } = item;
      if (data && data.length > 0) {
        library[name].push(...data);
      }
    });
  }
  return library;
}

function createHeader() {
  const header = document.createElement('div');
  header.className = 'sk-library-header';
  header.innerHTML = `<p class="sk-library-title"></span> Select a library</p>
    <button title="Go back" aria-hidden="true"><span class="icon icon-back"></span></button>`;

  header.querySelector('button').addEventListener('click', (e) => {
    header.querySelector('.sk-library-title').textContent = 'Select a library';
    const library = e.target.closest('.sk-library');
    const expanded = library.querySelectorAll('[aria-expanded]');
    expanded.forEach((ex) => ex.setAttribute('aria-expanded', false));
    header.querySelector('button').setAttribute('aria-hidden', true);
  });
  return header;
}

function createLibraryList(libraries) {
  const container = createTag('div', { class: 'sk-library-body' });

  const libraryList = createTag('ul', { class: 'library-list' });
  container.append(libraryList);

  Object.entries(libraries).forEach(([type, lib]) => {
    if (!libraries[type] || libraries[type].length === 0) return;

    const item = createTag('li', { class: 'library-list-item' }, type);
    libraryList.append(item);

    const list = document.createElement('ul');
    list.classList.add('library-list-item-options', `library-${type}-item-options`);
    container.append(list);

    item.addEventListener('click', (e) => {
      const skLibrary = e.target.closest('.sk-library');
      skLibrary.querySelector('.sk-library-title').textContent = type;
      libraryList.setAttribute('aria-expanded', true);
      list.setAttribute('aria-expanded', true);
      skLibrary.querySelector('.sk-library-header button').setAttribute('aria-hidden', false);
      loadListContent(type, lib, list);
    });
  });

  return container;
}

function detectContext() {
  if (window.self === window.top) {
    document.body.classList.add('in-page');
  }
}

export default async function init(el) {
  el.querySelector('div').remove();
  detectContext();

  // Get the data
  const [base, supplied] = await Promise.allSettled([
    fetchLibrary(window.location.origin),
    fetchSuppliedLibrary(),
  ]);
  const libraries = await combineLibraries(base.value, supplied.value);

  // Create the UI
  const skLibrary = createTag('div', { class: 'sk-library' });

  const header = createHeader();
  skLibrary.append(header);

  const list = createLibraryList(libraries);
  skLibrary.append(list);
  el.attachShadow({ mode: 'open' });

  el.shadowRoot.append(skLibrary);

  // add styles
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', '/blocks/library-config/library-config.css');
  el.shadowRoot.appendChild(link);
}

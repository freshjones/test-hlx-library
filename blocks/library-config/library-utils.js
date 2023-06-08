/**
 * Convience method for creating tags in one line of code
 * @param {string} tag Tag to create
 * @param {object} attributes Key/value object of attributes
 * @param {HTMLElement | HTMLElement[] | string} children Child element
 * @returns {HTMLElement} The created tag
 */
export function createTag(tag, attributes, children) {
  const element = document.createElement(tag);
  if (children) {
    if (children instanceof HTMLElement
      || children instanceof SVGElement
      || children instanceof DocumentFragment) {
      element.append(children);
    } else if (Array.isArray(children)) {
      element.append(...children);
    } else {
      element.insertAdjacentHTML('beforeend', children);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      element.setAttribute(key, val);
    });
  }
  return element;
}

export function writeToClipboard(blob) {
  const data = [new ClipboardItem({ [blob.type]: blob })];
  navigator.clipboard.write(data);
}

export function appendListGroup(list, listData) {
  const titleText = createTag('p', { class: 'item-title' }, listData.name);
  const title = createTag('li', { class: 'library-list-item-option' }, titleText);
  const preview = document.createElement('a');
  preview.href = listData.path;
  preview.setAttribute('target', '_blank');
  preview.setAttribute('title', `Preview ${listData.name}`);
  preview.innerHTML = '<span class="icon icon-preview"></span>';
  title.append(preview);
  list.append(title);

  const groupList = createTag('ul', { class: 'library-list-item-variants' });
  list.append(groupList);

  title.addEventListener('click', () => {
    const expanded = title.getAttribute('aria-expanded') === 'true';
    title.setAttribute('aria-expanded', !expanded);
  });

  return groupList;
}

export function createGroupItem(itemName, onCopy = () => undefined) {
  if (itemName) {
    const item = document.createElement('li');
    item.innerHTML = `<p>${itemName}</p>
      <span class="status icon icon-copy"></span>`;
    item.addEventListener('click', () => {
      const copyContent = onCopy();
      item.dataset.copied = true;
      item.setAttribute('aria-label', 'Copied to clipboard');
      const icon = item.querySelector('.icon');
      icon.classList.remove('icon-copy');
      icon.classList.add('icon-check');
      const blob = new Blob([copyContent], { type: 'text/html' });
      writeToClipboard(blob);
      setTimeout(() => {
        item.removeAttribute('data-copied');
        item.removeAttribute('aria-label');
        icon.classList.remove('icon-check');
        icon.classList.add('icon-copy');
      }, 3000);
    });
    return item;
  }
  return undefined;
}

export async function fetchListDocument(listData) {
  try {
    const path = window.location.host.includes('localhost')
      ? new URL(listData.path).pathname
      : `${listData.path}.plain.html`;
    const resp = await fetch(path);
    if (!resp.ok) return null;
    const html = await resp.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  } catch (e) {
    return null;
  }
}

export function decorateImages(block, path) {
  const url = new URL(path);
  block.querySelectorAll('img').forEach((img) => {
    const srcSplit = img.src.split('/');
    const mediaPath = srcSplit.pop();
    img.src = `${url.origin}/${mediaPath}`;
    const { width, height } = img;
    const ratio = width > 200 ? 200 / width : 1;
    img.width = width * ratio;
    img.height = height * ratio;
  });
}

export function createTable(block, name, path) {
  decorateImages(block, path);
  const rows = [...block.children];
  const maxCols = rows.reduce((cols, row) => (
    row.children.length > cols ? row.children.length : cols), 0);
  const table = document.createElement('table');
  table.setAttribute('border', 1);
  const headerRow = document.createElement('tr');
  headerRow.append(createTag('th', { colspan: maxCols }, name));
  table.append(headerRow);
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    [...row.children].forEach((col) => {
      const td = document.createElement('td');
      if (row.children.length < maxCols) {
        td.setAttribute('colspan', maxCols);
      }
      td.innerHTML = col.innerHTML;
      tr.append(td);
    });
    table.append(tr);
  });
  return table.outerHTML;
}

import { createOptimizedPicture } from '../../scripts/lib-franklin.js';
import { fetchPageMeta } from '../../scripts/scripts.js';

async function loadPageReferences(pathnames, img = false) {
  let innerHTML = '';
  for (let i = 0; i < pathnames.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const meta = await fetchPageMeta(pathnames[i]);
    const picture = createOptimizedPicture(meta['og:image']).outerHTML;
    innerHTML += `<div>
        ${img ? `<div>${picture}</div>` : ''}
        <div>
          <h3>${meta['card-title']}</h3>
          <p>${meta['card-body']}</p>
          <p class="button-container"><a class="button secondary" href="${pathnames[i]}">${meta['card-cta']}</a></p>
        </div>
      </div>`;
  }
  return innerHTML;
}

export default async function decorate(block) {
  if (block.querySelector('a') && block.querySelector('a').textContent.startsWith('https://')) {
    const pathNames = [...block.querySelectorAll('a')];
    block.innerHTML = await loadPageReferences(pathNames, [...block.classList].includes('images'));
  }

  const ul = document.createElement('ul');
  [...block.children].forEach((row, i) => {
    const li = document.createElement('li');
    li.className = 'card-card';
    li.innerHTML = row.innerHTML;
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
        div.querySelectorAll('img').forEach((img) => {
          img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '820' }]));
        });
      } else if (div.children.length === 1 && div.querySelector('span.icon')) {
        div.className = 'cards-card-icon';
      } else {
        div.className = 'cards-card-body';
        if ([...block.classList].includes('numbered')) {
          const number = document.createElement('p');
          number.className = 'cards-card-body-number';
          number.textContent = `${i + 1}.`;
          div.prepend(number);
        }
      }
    });
    ul.append(li);
  });

  if (block.children.length < 3) block.classList.add(`cards-cols-${block.children.length}`);
  block.textContent = '';
  block.append(ul);
}

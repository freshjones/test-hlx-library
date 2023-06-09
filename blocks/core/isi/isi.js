import { decorateIcons, loadBlocks, fetchPlaceholders } from '../../scripts/lib-franklin.js';
import { decorateMain } from '../../scripts/scripts.js';

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const isi = document.getElementById('isi');
    if (isi) {
      const block = isi.closest('.block');
      const isiHead = isi.querySelector('.isi-head');
      const button = isiHead.querySelector('button');
      const headingHeight = isiHead.offsetHeight;
      const headingText = isiHead.querySelector('h2').textContent.trim();
      // collapse isi
      document.body.style.overflowY = '';
      block.dataset.state = 'collapsed';
      isi.setAttribute('aria-expanded', false);
      isi.setAttribute('aria-label', `${headingText} - ${button.dataset.collapse}`);
      block.style.top = `${window.innerHeight - headingHeight}px`;
      block.style.position = 'fixed';
      // update button
      button.querySelector('.isi-toggle-text').textContent = button.dataset.expand;
      button.setAttribute('aria-label', `${button.dataset.expand} ${headingText}`);
    }
  }
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();

  const resp = await fetch(`${path}.plain.html`);

  if (resp.ok) {
    const aside = document.createElement('aside');
    aside.innerHTML = await resp.text();
    decorateMain(aside, true);
    await loadBlocks(aside);
    block.innerHTML = '';
    block.append(aside);

    const ph = await fetchPlaceholders();

    aside.id = 'isi';
    aside.setAttribute('aria-expanded', true);
    block.style.position = 'sticky';
    block.style.top = '80vh';

    // wrap body content
    const body = document.createElement('div');
    body.className = 'isi-body';
    body.append(...aside.children);
    aside.append(body);

    // build and decorate heading
    const headingWrapper = document.createElement('div');
    headingWrapper.className = 'isi-head';
    const heading = aside.querySelector('h1, h2');
    if (heading) {
      headingWrapper.innerHTML = `<div class="section">${heading.outerHTML}</div>`;
      heading.remove();
    } else {
      // create synthetic heading
      headingWrapper.innerHTML = `<div class="section"><h2>${ph.isiFallbackTitle}</h2></div>`;
    }
    const headingText = headingWrapper.textContent.trim();
    aside.setAttribute('aria-label', `${headingText} - ${ph.isiPartial}`);
    block.dataset.state = 'partial';

    // build toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'button secondary';
    toggleBtn.dataset.expand = ph.isiExpand;
    toggleBtn.dataset.collapse = ph.isiCollapse;
    toggleBtn.setAttribute('aria-controls', 'isi');
    toggleBtn.setAttribute('aria-label', `${ph.isiExpand} ${headingText}`);
    toggleBtn.innerHTML = `<span class="isi-toggle-text">${ph.isiExpand}</span>
      <span class="icon icon-arrow-up"></span>`;
    toggleBtn.addEventListener('click', () => {
      const headingHeight = headingWrapper.offsetHeight;
      const expanded = aside.getAttribute('aria-expanded') === 'true';
      const { state } = block.dataset;
      if (state === 'partial' || !expanded) {
        // fully expand isi
        block.dataset.state = 'expanded';
        aside.setAttribute('aria-expanded', true);
        aside.setAttribute('aria-label', `${headingText} - ${ph.isiExpanded}`);
        block.style.top = 0;
        document.body.style.overflowY = 'hidden';
        window.addEventListener('keydown', closeOnEscape);
        // update button
        toggleBtn.querySelector('.isi-toggle-text').textContent = ph.isiCollapse;
        toggleBtn.setAttribute('aria-label', `${ph.isiCollapse} ${headingText}`);
      } else if (state === 'expanded') {
        // collapse isi
        block.dataset.state = 'collapsed';
        aside.setAttribute('aria-expanded', false);
        aside.setAttribute('aria-label', `${headingText} - ${ph.isiCollapsed}`);
        block.style.top = `${window.innerHeight - headingHeight}px`;
        document.body.style.overflowY = '';
        window.removeEventListener('keydown', closeOnEscape);
        // update button
        toggleBtn.querySelector('.isi-toggle-text').textContent = ph.isiExpand;
        toggleBtn.setAttribute('aria-label', `${ph.isiExpand} ${headingText}`);
      }
    });
    decorateIcons(toggleBtn);
    headingWrapper.querySelector('div').append(toggleBtn);
    aside.prepend(headingWrapper);
    window.addEventListener('resize', () => {
      if (!block.style.top.includes('vh') && block.style.top !== '0px') {
        block.style.top = `${window.innerHeight - headingWrapper.offsetHeight}px`;
      }
    });

    // downgrade headings to prevent duplicate H1s
    if (heading.nodeName === 'H1') {
      aside.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        const level = parseInt(h.nodeName[1], 10);
        if (level < 5) {
          const newH = document.createElement(`h${level + 1}`);
          newH.id = h.id;
          newH.innerHTML = h.innerHTML;
          h.replaceWith(newH);
        } else { // downgrad h6 to p > strong
          const p = document.createElement('p');
          p.id = h.id;
          p.innerHTML = `<strong>${h.innerHTML}</strong>`;
          h.replaceWith(p);
        }
      });
    }

    // morph to full isi when scrolled to bottom of page
    let lastState = {
      state: block.dataset.state,
      expanded: aside.getAttribute('aria-expanded'),
      label: aside.getAttribute('aria-label'),
      top: block.style.top,
    };
    const observer = new IntersectionObserver(async (entries) => {
      const observed = entries.find((entry) => entry.isIntersecting);
      if (observed) {
        if (lastState.state !== 'inline') {
          lastState = {
            state: block.dataset.state,
            expanded: aside.getAttribute('aria-expanded'),
            label: aside.getAttribute('aria-label'),
            top: block.style.top,
            position: block.style.position,
          };
        }
        // place isi back in document flow
        block.dataset.state = 'inline';
        aside.setAttribute('aria-expanded', true);
        aside.setAttribute('aria-label', `${headingText} - ${ph.isiExpanded}`);
        block.style.top = 'unset';
        block.style.position = 'static';
        window.removeEventListener('keydown', closeOnEscape);
        // disable button
        toggleBtn.disabled = true;
      } else {
        // remove isi from document flow
        block.dataset.state = lastState.state;
        aside.setAttribute('aria-expanded', lastState.expanded);
        aside.setAttribute('aria-label', lastState.label);
        block.style.top = lastState.top;
        block.style.position = 'fixed';
        // enable button
        toggleBtn.disabled = false;
      }
    }, { threshold: headingWrapper.offsetHeight });

    observer.observe(block.closest('.section'));
  }
}

import { getMetadata, decorateIcons } from '../../scripts/lib-franklin.js';

/**
 * decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // fetch footer content
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta).pathname : '/global/footer';
  const resp = await fetch(`${footerPath}.plain.html`);

  if (resp.ok) {
    const html = await resp.text();

    // decorate footer DOM
    const footer = document.createElement('div');
    footer.id = 'footer';
    footer.innerHTML = html;

    const classes = ['nav', 'social', 'cta', 'menu', 'copyright'];
    classes.forEach((c, i) => {
      const section = footer.children[i];
      if (section) section.classList.add(`footer-${c}`);
    });

    // decorate social buttons
    const social = footer.querySelector('.footer-social');
    if (social) {
      social.querySelectorAll('a[href]').forEach((a) => a.classList.add('button'));
    }

    // decorate cta
    const cta = footer.querySelector('.footer-cta');
    if (cta) {
      const a = cta.querySelector('a');
      if (a) {
        a.parentElement.classList.add('button-container');
        a.className = 'button small';
      }
    }

    decorateIcons(footer);
    block.innerHTML = '';
    block.append(footer);
  }
}

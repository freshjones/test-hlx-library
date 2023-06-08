import { decorateIcons } from '../../scripts/lib-franklin.js';

export default function decorate(block) {
  const [quotation, attribution] = block.children;
  const figure = document.createElement('figure');
  const quote = document.createElement('blockquote');
  quote.append(quotation);
  figure.append(quote);

  // add quotation mark icon
  const icon = document.createElement('span');
  icon.className = 'icon icon-opening-quotation';
  quote.prepend(icon);
  decorateIcons(quote);

  // decorate attribution
  if (attribution) {
    // identify content-based variants
    if (attribution.querySelector('img')) block.classList.add('blockquote-img');
    const cta = attribution.querySelector('a[href]');
    if (cta && attribution.textContent.trim() === cta.textContent) {
      block.classList.add('blockquote-cta');
    }

    // populate attribution
    const caption = document.createElement('figcaption');
    caption.append(attribution);
    figure.append(caption);
  }

  block.append(figure);
}

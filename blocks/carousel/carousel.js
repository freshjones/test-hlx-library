import { fetchPlaceholders, toClassName } from '../../scripts/lib-franklin.js';

export default function decorate(block) {
  const carousel = document.createElement('ol');
  carousel.className = 'carousel-slides';
  const content = [...block.children];

  // decorate carousel body
  const body = content.shift();
  body.classList.add('carousel-body');
  const title = `${toClassName(body.querySelector('h2, h3').textContent)}-carousel`;
  carousel.id = title;

  // decorate carousel slides
  content.forEach((c) => {
    const slide = document.createElement('li');
    slide.className = 'carousel-slide';
    slide.innerHTML = c.innerHTML;
    // decorate slide caption
    const caption = document.createElement('div');
    slide.querySelectorAll('div > *').forEach((el) => {
      if (!el.querySelector('picture')) caption.append(el);
    });
    if (caption.hasChildNodes()) {
      caption.className = 'carousel-slide-caption';
      slide.append(caption);
    }
    c.remove();
    carousel.append(slide);
  });
  block.prepend(carousel);

  // decorate carousel controls
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  const buttons = ['Previous', 'Next'];
  fetchPlaceholders().then((ph) => {
    buttons.forEach((type) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `carousel-controls-${type}`.toLowerCase();
      button.setAttribute('alt', ph[`carousel${type}`]);
      button.setAttribute('aria-controls', title);
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const slidesWidth = (content.length - 1) * carousel.offsetWidth;
        if (carousel.scrollLeft >= (slidesWidth * 0.99) && type === 'Next') {
          // user attempting to navigate right with no next slides
          carousel.scrollLeft = 0;
        } else if (carousel.scrollLeft <= 0 && type === 'Previous') {
          // user attempting to navigate left with no previous slides
          carousel.scrollLeft = slidesWidth;
        } else if (type === 'Next') {
          carousel.scrollLeft += carousel.offsetWidth;
        } else if (type === 'Previous') {
          carousel.scrollLeft -= carousel.offsetWidth;
        }
      });
      controls.append(button);
    });
  });
  body.firstElementChild.append(controls);
}

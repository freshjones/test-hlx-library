export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  cols.forEach((col, i) => {
    const picture = col.querySelector('picture');
    if (picture && col.children.length === 1) {
      col.className = `promo-img promo-img-${i ? 'right' : 'left'}`;
      block.classList.add(`promo-has-img-${i ? 'right' : 'left'}`);
    } else {
      col.className = 'promo-body';
    }
  });
}

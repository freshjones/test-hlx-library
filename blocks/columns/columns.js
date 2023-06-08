export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic && col.children.length === 1) {
        // picture is only content in column
        col.classList.add('columns-img-col');
      }
      const icon = col.querySelector('span.icon');
      if (icon && col.children.length === 1) {
        // icon is only content in column
        col.classList.add('columns-icon-col');
      }
      const cta = col.querySelector('a[href]');
      if (cta && cta.textContent === col.textContent) {
        // cta is the only content in column
        col.classList.add('columns-cta-col');
        row.classList.add('columns-cta');
      }
    });
  });
}

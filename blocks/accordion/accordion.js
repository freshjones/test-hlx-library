export default function decorate(block) {
  [...block.children].forEach((row) => {
    if (row.children.length === 2) {
      // decorate accordion item label
      const label = row.children[0];
      const summary = document.createElement('summary');
      summary.className = 'accordion-item-label';
      summary.append(...label.childNodes);
      // decorate accordion item content
      const content = row.children[1];
      content.className = 'accordion-item-content';
      // decorate accordion item
      const details = document.createElement('details');
      details.className = 'accordion-item';
      details.append(summary, content);
      row.replaceWith(details);
    }
  });
}

export default function decorate(block) {
  const [icon, body] = block.firstElementChild.children;

  if (icon) icon.className = 'pictogram-icon';
  if (body) body.className = 'pictogram-body';
}

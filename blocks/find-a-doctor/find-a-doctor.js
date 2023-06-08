import { fetchPlaceholders, loadScript } from '../../scripts/lib-franklin.js';

/**
 * loads and decorates an example for 3rd party widget
 * @reference: https://www.cibinqo.com/find-a-doctor
 */
export default async function decorate(block) {
  const observer = new IntersectionObserver(async (entries) => {
    const observed = entries.find((entry) => entry.isIntersecting);
    if (observed) {
      observer.disconnect();
      const { findADoctorWidget, partnerId } = await fetchPlaceholders();

      loadScript(findADoctorWidget, { id: 'directory-widget' }, () => {
        const widget = document.createElement('directory-widget');
        widget.setAttribute('partner', partnerId);
        block.append(widget);
      });
    }
  }, { threshold: 0 });

  observer.observe(block.closest('.section'));
}

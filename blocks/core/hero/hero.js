function decorateBannerBody(el) {
  const classes = ['banner', 'body'];
  classes.forEach((c, i) => {
    const row = el.children[i];
    if (row) row.className = `hero-${c}`;
  });
}

export default async function decorate(block) {
  if (![...block.classList].includes('inset')) {
    block.closest('.section').classList.add('full-width-container');
  }

  if (block.children.length === 1) {
    if (block.firstElementChild.children.length > 1) block.classList.add('split');
    decorateBannerBody(block.firstElementChild);

    // wrap picture
    const picture = block.querySelector('picture');
    if (picture) {
      const parent = picture.parentElement;
      const wrapper = document.createElement('div');
      wrapper.className = 'hero-banner-img';
      wrapper.append(picture.cloneNode(true));
      if (parent && parent.nodeName === 'P') {
        parent.replaceWith(wrapper);
      } else {
        picture.replaceWith(wrapper);
      }
    }
  } else {
    decorateBannerBody(block);

    // decorate banner
    const banner = block.querySelector('.hero-banner');
    if (banner) {
      const bannerClasses = ['img', 'callout'];
      bannerClasses.forEach((c, i) => {
        const col = banner.children[i];
        if (col) col.className = `hero-banner-${c}`;
      });

      // decorate banner image
      const img = banner.querySelector('.hero-banner-img');
      if (img) {
        // decorate caption and cta
        const picture = img.querySelector('picture');
        if (picture && img.textContent !== picture.textContent) {
          const caption = document.createElement('div');
          const cta = document.createElement('div');
          [...img.children].forEach((child) => {
            if (child !== picture && ![...child.children].includes(picture)) {
              const a = child.querySelector('a[href]');
              if (a && child.textContent === a.textContent) {
                a.classList.add('primary');
                cta.append(child);
              } else caption.append(child);
            }
          });
          if (caption.hasChildNodes()) {
            caption.className = 'hero-banner-caption';
            img.append(caption);
            const overlay = document.createElement('div');
            overlay.className = 'hero-banner-overlay';
            img.prepend(overlay);
          }
          if (cta.hasChildNodes()) {
            cta.className = 'hero-banner-cta';
            img.append(cta);
          }
        }
        // unwrap picture
        if (picture.parentElement.nodeName === 'P') picture.parentElement.replaceWith(picture.cloneNode(true));
      }

      // decorate banner callout
      const callout = banner.querySelector('.hero-banner-callout');
      if (callout && !callout.hasChildNodes()) {
        callout.remove();
        if (![...block.classList].includes('inset')) block.classList.add('overlay');
      } else if (callout) {
        const calloutWrapper = document.createElement('div');
        if ([...block.classList].includes('data')) {
          const icon = callout.querySelector('span.icon');
          const dataWrapper = document.createElement('div');
          // eslint-disable-next-line arrow-body-style
          dataWrapper.append(...[...callout.children].filter((c) => {
            return c !== icon && ![...c.children].includes(icon);
          }));
          calloutWrapper.append(icon.parentElement.nodeName === 'P' ? icon.parentElement : icon, dataWrapper);
        } else if ([...block.classList].includes('testimonial')) {
          const quotations = callout.querySelectorAll('h2');
          if (quotations) {
            const attr = [...callout.children].filter((c) => ![...quotations].includes(c));
            const figure = document.createElement('figure');
            const blockquote = document.createElement('blockquote');
            quotations.forEach((q) => {
              const p = document.createElement('p');
              p.innerHTML = q.innerHTML;
              q.remove();
              blockquote.append(p);
            });
            figure.append(blockquote);
            if (attr.length) {
              const caption = document.createElement('figcaption');
              caption.append(...attr);
              figure.append(caption);
            }
            calloutWrapper.append(figure);
          }
        } else {
          calloutWrapper.append(...callout.children);
        }
        callout.append(calloutWrapper);
      }
    }

    // decorate body
    const body = block.querySelector('.hero-body');
    if (body) {
      // remove empty cols
      body.querySelectorAll('div > div:empty').forEach((child) => {
        child.remove();
      });
    }
  }

  // decorate footnotes
  block.querySelectorAll('p > sub').forEach((footnote) => {
    footnote.closest('p').classList.add('hero-footnote');
  });
}

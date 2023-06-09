import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  createOptimizedPicture,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  getMetadata,
} from './lib-franklin.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list
const PRODUCTION_DOMAINS = [];
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here

/**
 * Turns absolute links within the domain into relative links.
 * @param {Element} main The container element
 */
export function makeLinksRelative(main) {
  // eslint-disable-next-line no-use-before-define
  const hosts = ['hlx.page', 'hlx.live', ...PRODUCTION_DOMAINS];
  main.querySelectorAll('a[href]').forEach((a) => {
    try {
      const url = new URL(a.href);
      const hostMatch = hosts.some((host) => url.hostname.includes(host));
      if (hostMatch) {
        a.href = `${url.pathname.replace('.html', '')}${url.search}${url.hash}`;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Could not make ${a.href} relative:`, e);
    }
  });
}

/**
 * Fetches metadata of page.
 * @param {string} path Pathname
 */
export async function fetchPageMeta(path) {
  const meta = {};
  const resp = await fetch(path);
  if (resp.ok) {
    // eslint-disable-next-line no-await-in-loop
    const text = await resp.text();
    const headStr = text.split('<head>')[1].split('</head>')[0];
    const head = document.createElement('head');
    head.innerHTML = headStr;
    const metaTags = head.querySelectorAll(':scope > meta');
    metaTags.forEach((tag) => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const value = tag.getAttribute('content');
      if (meta[name]) meta[name] += `, ${value}`;
      else meta[name] = value;
    });
  }
  return meta;
}

/** Builds announcement bar.
 */
async function buildAnnouncement() {
  if (getMetadata('announcement') !== 'off') {
    const resp = await fetch(`${window.location.origin}/global/announcement.plain.html`);
    if (resp.ok) {
      const wrapper = document.createElement('aside');
      wrapper.className = 'announcement';
      const announcement = document.createElement('div');
      announcement.innerHTML = await resp.text();
      decorateButtons(announcement);
      if (announcement.firstElementChild.children.length > 1) wrapper.classList.add('split');
      wrapper.append(announcement);
      document.body.prepend(wrapper);
    }
  }
}

/**
 * Builds hero block.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  if (main.querySelector('.hero')) return;
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const banner = [];
    const body = document.createElement('div');
    const section = h1.closest('main > div');
    if (!section.previousElementSibling) {
      [...section.children].forEach((child) => {
        if (child.querySelector('picture') && child.textContent.trim() === '') banner.push(child);
        else body.append(child);
      });
      section.append(buildBlock('hero', [banner, [body]]));
    } else {
      banner.push(picture);
      body.append(h1);
      const newSection = document.createElement('div');
      newSection.append(buildBlock('hero', [banner, [body]]));
      main.prepend(newSection);
    }
  }
}

function buildISI(main) {
  if (getMetadata('isi') !== 'off') {
    const isi = buildBlock('isi', [[`<a href="/global/isi">${window.location.origin}/global/isi</a>`]]);
    const newSection = document.createElement('div');
    newSection.append(isi);
    main.append(newSection);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
async function buildAutoBlocks(main) {
  try {
    await buildAnnouncement();
    buildHeroBlock(main);
    buildISI(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export async function decorateMain(main, fragment = false) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  if (!fragment) await buildAutoBlocks(main);

  decorateSections(main);
  const sections = [...main.querySelectorAll('.section')];
  sections.forEach((section) => {
    const bg = section.dataset.background;
    if (bg) {
      const picture = createOptimizedPicture(bg);
      picture.classList.add('section-background');
      section.prepend(picture);
    }
  });

  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.libraryBasePath}/styles/lazy-styles.css`);
  addFavIcon('/assets/favicon.png');
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  // handle 404 from document
  if (window.errorCode === '404') {
    const resp = await fetch('/global/404.plain.html');
    if (resp.status === 200) {
      const html = await resp.text();
      const main = document.querySelector('main');
      main.innerHTML = html;
      main.classList.remove('error');
    }
  }

  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

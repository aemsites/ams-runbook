import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  decorateBlock,
  getMetadata,
} from './aem.js';

/**
 * Checks if link text includes the href value
 * @param {Element} link The link element to check
 * @returns {boolean} True if the link text includes the href
 */
export function linkTextIncludesHref(link) {
  const href = link.getAttribute('href');
  const textcontent = link.textContent;
  return textcontent.includes(href);
}

export const PRODUCTION_DOMAINS = ['aem.live'];
const domainCheckCache = {};

/**
 * Checks a url to determine if it is a known domain.
 * @param {string | URL} url the url to check
 * @returns {Object} an object with properties indicating the urls domain types.
 */
export function checkDomain(url) {
  const urlToCheck = typeof url === 'string' ? new URL(url) : url;
  let result = domainCheckCache[urlToCheck.hostname];
  if (!result) {
    const isProd = PRODUCTION_DOMAINS.some((host) => urlToCheck.hostname.includes(host));
    const isHlx = ['aem.page', 'aem.live'].some((host) => urlToCheck.hostname.includes(host));
    const isLocal = urlToCheck.hostname.includes('localhost');
    const isPreview = isLocal || urlToCheck.hostname.includes('aem.page');
    const isKnown = isProd || isHlx || isLocal;
    const isExternal = !isKnown;
    result = {
      isProd,
      isHlx,
      isLocal,
      isKnown,
      isExternal,
      isPreview,
    };
    domainCheckCache[urlToCheck.hostname] = result;
  }
  return result;
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds fragment blocks from links to fragments
 * @param {Element} main The container element
 */
export function buildFragmentBlocks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    try {
      const url = new URL(a.href);
      const domainCheck = checkDomain(url);
      // don't autoblock the header navigation currently in fragments
      if (domainCheck.isKnown && linkTextIncludesHref(a) && (url.pathname.includes('/fragments/') && !url.pathname.includes('header/'))) {
        const block = buildBlock('fragment', url.pathname);
        a.replaceWith(block);
        decorateBlock(block);
      }
    } catch (error) {
    // eslint-disable-next-line no-console
      console.error('Error processing fragment link', error);
    }
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    buildFragmentBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

export async function processPageMetadata() {
  // Define all metadata keys we want to process
  const metadataKeys = ['customer_id', 'title', 'date', 'attendees'];

  // Create a mapping of metadata keys to their values
  const metadataValues = {};

  // Use the existing getMetadata function that's defined elsewhere
  // Special case for title: use og:title property instead of name
  metadataValues.title = getMetadata('og:title');

  // For other keys, use standard metadata
  metadataKeys.forEach((key) => {
    if (key !== 'title') { // Skip title as we've already handled it
      metadataValues[key] = getMetadata(key);
    }
  });

  // Find and process all text nodes containing any of our placeholders
  const textNodes = [];

  // Recursive function to find text nodes with placeholders
  function findTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Check if this text node contains any of our placeholders
      const nodeText = node.nodeValue;
      const hasPlaceholder = metadataKeys.some((key) => nodeText.includes(`{${key}}`));

      if (hasPlaceholder) {
        textNodes.push(node);
      }
    } else {
      // Process child nodes
      for (let i = 0; i < node.childNodes.length; i += 1) {
        findTextNodes(node.childNodes[i]);
      }
    }
  }

  // Start from the body to find all relevant text nodes
  findTextNodes(document.body);

  // Replace all placeholders in each text node
  textNodes.forEach((node) => {
    let updatedText = node.nodeValue;

    // Replace each placeholder with its corresponding value
    metadataKeys.forEach((key) => {
      const placeholder = `{${key}}`;
      if (updatedText.includes(placeholder)) {
        updatedText = updatedText.replaceAll(placeholder, metadataValues[key] || '');
      }
    });

    node.nodeValue = updatedText;
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  processPageMetadata(main);
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
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
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);
  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();
  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
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
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

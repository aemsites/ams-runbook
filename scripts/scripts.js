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

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/** Replaces all instances of "customer_id" in the page content with
 * the value from meta tag. */
function replaceCustomerID() {
  // Get the customer_id from meta tag
  const metaTag = document.querySelector('meta[name="customer_id"]');

  const customerId = metaTag.getAttribute('content');

  // Create a styled version of the customer ID
  const styledCustomerId = `<span style="font-style: italic; text-decoration: underline; color: #000072;">${customerId}</span>`;

  // Process all elements with text content
  const elementsWithText = document.querySelectorAll('body *:not(script):not(style)');

  elementsWithText.forEach((element) => {
    // Skip elements that have child elements (only process leaf text nodes)
    if (element.children.length === 0 && element.textContent.includes('customer_id')) {
      // Create a new container for the HTML content
      const container = document.createElement('div');

      // Replace the text and set as HTML
      container.innerHTML = element.innerHTML
        ? element.innerHTML.replace(/customer_id/g, styledCustomerId)
        : element.textContent.replace(/customer_id/g, styledCustomerId);

      // Replace the element's content with the new HTML
      element.innerHTML = container.innerHTML;
    }
  });
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', replaceCustomerID);

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
  replaceCustomerID();
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const link = row.querySelector('a[href]');

    while (row.firstElementChild) li.append(row.firstElementChild);

    const image = [...li.children].find((div) => div.querySelector('picture'));
    [...li.children].forEach((div) => {
      div.className = div === image ? 'cards-card-image' : 'cards-card-body';
    });

    if (!image) {
      const placeholder = document.createElement('div');
      placeholder.className = 'cards-card-image';
      li.prepend(placeholder);
    }

    if (link) {
      li.querySelectorAll('a').forEach((anchor) => {
        anchor.replaceWith(...anchor.childNodes);
      });
      const cardLink = document.createElement('a');
      cardLink.className = 'cards-card-link';
      cardLink.href = link.href;
      if (link.target) cardLink.target = link.target;
      if (link.rel) cardLink.rel = link.rel;
      cardLink.append(...li.childNodes);
      li.append(cardLink);
    }

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
}

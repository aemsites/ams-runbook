// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';

export default async function decorate(block) {
  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // Variables to track currently selected tab and its button
  let selectedPanel = null;
  let selectedButton = null;
  let currentlyHoveredButton = null;

  // decorate tabs and tabpanels
  const tabs = [...block.children].map((child) => child.firstElementChild);
  tabs.forEach((tab, i) => {
    const id = toClassName(tab.textContent);

    // decorate tabpanel
    const tabpanel = block.children[i];
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    // First tab panel is selected by default
    if (i === 0) {
      selectedPanel = tabpanel;
    }

    // build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');

    // Store reference to the first (default selected) button
    if (i === 0) {
      selectedButton = button;
    }

    // Click event - original functionality
    button.addEventListener('click', () => {
      // Reset any hover state
      if (currentlyHoveredButton) {
        currentlyHoveredButton = null;
      }

      // Update panels
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });

      // Update buttons
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });

      // Set the clicked panel and button as selected
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);

      // Update selected panel and button references
      selectedPanel = tabpanel;
      selectedButton = button;
    });

    // Add hover event handlers
    button.addEventListener('mouseenter', () => {
      // Update the currently hovered button
      currentlyHoveredButton = button;

      // Reset all buttons first
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });

      // Only set the current hovered button as selected
      button.setAttribute('aria-selected', true);

      // Hide all panels first
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });

      // Show the hovered panel
      tabpanel.setAttribute('aria-hidden', false);
    });

    tablist.append(button);
    tab.remove();
  });

  block.prepend(tablist);

  // Add mouseleave handler to the entire tablist
  tablist.addEventListener('mouseleave', () => {
    // Clear the currently hovered button
    currentlyHoveredButton = null;

    // Reset all buttons first
    tablist.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-selected', false);
    });

    // Hide all panels first
    block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
      panel.setAttribute('aria-hidden', true);
    });

    // Restore the selected state
    if (selectedButton) {
      selectedButton.setAttribute('aria-selected', true);
    }

    if (selectedPanel) {
      selectedPanel.setAttribute('aria-hidden', false);
    }
  });
}

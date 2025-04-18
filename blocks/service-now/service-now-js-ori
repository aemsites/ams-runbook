import { fetchPlaceholders, getMetadata } from '../../scripts/aem.js';

/**
 * Generate HTML for displaying a single server's details
 * @param {Object} placeholders Translation placeholders (may be empty)
 * @param {Object} envInfo Server information object
 * @returns {HTMLElement} Server details element
 */
const createServerDetailsElement = (placeholders, envInfo) => {
  const details = document.createElement('div');
  details.classList.add('server-item');

  // Display basic server details
  ['Name', 'Topology', 'PublicIP', 'PrivateIP', 'Dns', 'AvailabilityZone', 'CurrentSize', 'ContractSize'].forEach((field) => {
    if (envInfo[field] === undefined || envInfo[field] === null) {
      return;
    }

    // Use placeholder if available, otherwise use the field name
    let label;
    if (placeholders && placeholders[field.toLowerCase()]) {
      label = placeholders[field.toLowerCase()];
    } else {
      label = field;
    }
    const fieldDiv = document.createElement('div');
    fieldDiv.classList.add('details-item');
    fieldDiv.innerHTML = `
      <div class="label"><strong>${label}:</strong></div>
      <div class="data">${envInfo[field]}</div>
    `;
    details.appendChild(fieldDiv);
  });

  // Handle Notes field separately if it contains multiline content
  if (envInfo.Notes) {
    const field = 'Notes';
    let label;
    if (placeholders && placeholders[field.toLowerCase()]) {
      label = placeholders[field.toLowerCase()];
    } else {
      label = field;
    }
    const fieldDiv = document.createElement('div');
    fieldDiv.classList.add('details-item', 'notes');

    // Check if Notes contains multiple lines
    if (envInfo.Notes.includes('\n')) {
      const ul = document.createElement('ul');

      envInfo.Notes.split(/\r?\n|\r|\n/g).forEach((line) => {
        if (line.trim() !== '') {
          const li = document.createElement('li');
          li.textContent = line;
          ul.appendChild(li);
        }
      });

      fieldDiv.innerHTML = `
        <div class="label"><strong>${label}:</strong></div>
        <div class="data">${ul.outerHTML}</div>
      `;
    } else {
      fieldDiv.innerHTML = `
        <div class="label"><strong>${label}:</strong></div>
        <div class="data">${envInfo.Notes}</div>
      `;
    }

    details.appendChild(fieldDiv);
  }

  return details;
};

/**
 * Generate HTML for displaying all servers
 * @param {Object} placeholders Translation placeholders
 * @param {Array} serversData Array of server information objects
 * @returns {string} HTML string
 */
const serversHtml = (placeholders, serversData) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('servers-wrapper');

  serversData.forEach((envInfo) => {
    const serverElement = createServerDetailsElement(placeholders, envInfo);
    wrapper.appendChild(serverElement);

    // Add separator between servers (except after the last one)
    if (envInfo !== serversData[serversData.length - 1]) {
      const separator = document.createElement('hr');
      separator.classList.add('server-separator');
      wrapper.appendChild(separator);
    }
  });

  return wrapper.outerHTML;
};

export default async function decorate(block) {
  const prefix = getMetadata('locale');

  // Try to fetch placeholders, but handle the case when it fails
  let placeholders = {};
  try {
    placeholders = await fetchPlaceholders(prefix);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load placeholders, using default field names instead');
  }

  // Get server data URL
  let serverDataUrl;

  // Check if the block has the expected structure
  if (block.querySelector('a')) {
    serverDataUrl = block.querySelector('a').href;
  } else {
    // eslint-disable-next-line no-console
    console.error('Server data URL not found in block');
    block.innerHTML = '<div class="error-message">Configuration error: Server data URL not found.</div>';
    return;
  }

  try {
    // Fetch server data from the JSON endpoint
    const response = await fetch(serverDataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch server data: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.data || !Array.isArray(json.data)) {
      throw new Error('Invalid server data format: expected json.data array');
    }

    const serversData = json.data;

    if (serversData.length === 0) {
      block.innerHTML = '<div class="note-message">No server information available.</div>';
      return;
    }

    block.innerHTML = serversHtml(placeholders, serversData);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching server data:', error);
    block.innerHTML = `<div class="error-message">Error loading server details: ${error.message}</div>`;
  }
}

import { fetchPlaceholders, getMetadata } from '../../scripts/aem.js';

/**
 * Generate HTML for displaying a single server's details
 * @param {Object} placeholders Translation placeholders (may be empty)
 * @param {Object} envInfo Server information object
 * @returns {HTMLElement} Server details element
 */
const createServerDetailsElement = (placeholders, envInfo) => {
  console.log('Creating server details for:', envInfo);

  const details = document.createElement('div');
  details.classList.add('server-item');
  details.style.border = '1px dashed green'; // Add visual indicator
  details.style.padding = '10px';
  details.style.margin = '10px 0';

  // Check if we have any data to display
  let fieldsAdded = 0;

  // Display basic server details
  ['topology', 'name', 'url', 'target', 'notes'].forEach((field) => {
    if (envInfo[field] === undefined || envInfo[field] === null || envInfo[field] === '') {
      console.log(`Field ${field} is empty, skipping`);
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
    fieldsAdded++;
    console.log(`Added Notes field with content length: ${envInfo.Notes.length}`);
  }

  // Add a fallback if no fields were added
  if (fieldsAdded === 0) {
    console.log('No fields were added to the server item, adding fallback content');
    const noData = document.createElement('div');
    noData.classList.add('no-data');
    noData.textContent = 'No data available for this server';
    noData.style.fontStyle = 'italic';
    noData.style.color = '#666';
    details.appendChild(noData);
  }

  console.log('Created server element with content:', details.outerHTML);
  return details;
};

/**
 * Generate HTML for displaying all servers
 * @param {Object} placeholders Translation placeholders
 * @param {Array} serversData Array of server information objects
 * @returns {string} HTML string
 */
const serversHtml = (placeholders, serversData) => {
  console.log('Generating HTML for', serversData.length, 'servers');

  const wrapper = document.createElement('div');
  wrapper.classList.add('servers-wrapper');
  wrapper.style.border = '1px solid blue'; // Visual indicator

  serversData.forEach((envInfo, index) => {
    console.log(`Processing server ${index + 1}/${serversData.length}`);
    const serverElement = createServerDetailsElement(placeholders, envInfo);
    wrapper.appendChild(serverElement);

    // Add separator between servers (except after the last one)
    if (envInfo !== serversData[serversData.length - 1]) {
      const separator = document.createElement('hr');
      separator.classList.add('server-separator');
      wrapper.appendChild(separator);
    }
  });

  console.log('Final wrapper HTML:', wrapper.outerHTML.substring(0, 200) + '...');
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
    // Log the URL being fetched
    console.log('Fetching server data from:', serverDataUrl);

    const response = await fetch(serverDataUrl);
    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch server data: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    // Log the entire response to inspect its structure
    console.log('Server data response:', json);

    if (!json.data || !Array.isArray(json.data)) {
      throw new Error('Invalid server data format: expected json.data array');
    }

    const serversData = json.data;
    console.log('Servers data length:', serversData.length);
    if (serversData.length > 0) {
      console.log('First server data item:', serversData[0]);
    }

    // Add visual indicator to see if the block exists
    block.style.border = '1px solid red';

    if (serversData.length === 0) {
      block.innerHTML = '<div class="note-message">No server information available.</div>';
      return;
    }

    console.log('Server data structure check:');
    serversData.forEach((server, index) => {
      console.log(`Server ${index} has keys:`, Object.keys(server));
      // Check if any expected fields exist
      const hasAnyData = ['topology', 'name', 'url'].some(key => 
        server[key] !== undefined && server[key] !== null && server[key] !== '');
      console.log(`Server ${index} has some data:`, hasAnyData);
    });

    // Generate HTML and log it
    const html = serversHtml(placeholders, serversData);
    console.log('Generated HTML (first 200 chars):', html.substring(0, 200) + '...');
    block.innerHTML = html;

    // NEW DEBUGGING CODE STARTS HERE
    console.log('Block after HTML insertion:', block);
    console.log('Block parent elements:', block.parentElement, block.parentElement.parentElement);
    console.log('Block visibility:', window.getComputedStyle(block).display, window.getComputedStyle(block).visibility);

    // Also check the HTML structure directly in the DOM
    setTimeout(() => {
      console.log('Server items found:', document.querySelectorAll('.server-item').length);
      console.log('First server item if exists:', document.querySelector('.server-item'));

      // Test with simple HTML if no items are found
      if (document.querySelectorAll('.server-item').length === 0) {
        console.log('No server items found, trying basic HTML test');
        block.innerHTML = '<div class="server-item" style="padding: 20px; border: 2px solid blue;">Test Server Item</div>';
      }
    }, 500);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching server data:', error);
    block.innerHTML = `<div class="error-message">Error loading server details: ${error.message}</div>`;
  }
}

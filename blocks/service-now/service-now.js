import { fetchPlaceholders, getMetadata } from '../../scripts/aem.js';

/**
 * Format a value for display, with special handling for URLs, emails, and multiline text
 * @param {string} value - The value to display
 * @param {string} fieldName - The name of the field being displayed
 * @returns {string} - The formatted value
 */
const formatValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  // Handle URL fields - make them clickable links
  if (fieldName === 'url' && value) {
    try {
      // Validate URL and create link
      const url = new URL(value);
      return `<a href="${url.href}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    } catch (e) {
      // If URL is invalid, just return the text
      return value;
    }
  }

  // Handle email fields - make them mailto links
  if (fieldName === 'email' && value) {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      return `<a href="mailto:${value}">${value}</a>`;
    }
    return value;
  }

  // Handle phone number fields - format them as clickable tel links
  if ((fieldName === 'businessPhone' || fieldName === 'mobilePhone') && value) {
  // Simple phone number validation
    const phoneRegex = /^\d{11}$/;
    if (phoneRegex.test(value)) {
    // Format the phone number as +X (XXX) XXX-XXXX
      const formattedPhone = `+${value.slice(0, 1)} (${value.slice(1, 4)}) ${value.slice(4, 7)}-${value.slice(7)}`;
      return `<a href="tel:${value}">${formattedPhone}</a>`;
    }
    return value;
  }

  // Handle multiline notes
  if (typeof value === 'string' && value.includes('\n')) {
    const lines = value.split(/\r?\n|\r|\n/g)
      .filter((line) => line.trim() !== '')
      .map((line) => `<li>${line}</li>`)
      .join('');

    return `<ul>${lines}</ul>`;
  }

  return value;
};

/**
 * Create a section for a data table
 * @param {Object} placeholders - Translation placeholders
 * @param {Array} items - Data items to display
 * @param {Object} config - Configuration for this data type
 * @returns {HTMLElement} - The created section
 */
const createDataSection = (placeholders, items, config) => {
  const section = document.createElement('div');
  section.classList.add(`${config.type}-section`);

  // Add section title if provided
  if (config.sectionTitle) {
    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = config.sectionTitle;
    section.appendChild(title);
  }

  // Create table element
  const table = document.createElement('table');
  table.classList.add(`${config.type}-table`, 'data-table');
  section.appendChild(table);

  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  config.displayFields.forEach((field) => {
    const th = document.createElement('th');
    th.textContent = placeholders[field.toLowerCase()] || field;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');

  items.forEach((item) => {
    const row = document.createElement('tr');

    config.displayFields.forEach((field) => {
      const td = document.createElement('td');
      td.innerHTML = formatValue(item[field], field);
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  return section;
};

/**
 * Fetches data from a URL and processes it
 * @param {string} url - The URL to fetch data from
 * @returns {Promise<Array>} - The fetched data
 */
const fetchData = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (!json.data || !Array.isArray(json.data)) {
    throw new Error('Invalid data format: expected json.data array');
  }

  return json.data;
};

/**
 * Process a single data source
 * @param {string} dataType - Type of data being processed
 * @param {string} url - URL to fetch data from
 * @param {Object} config - Configuration for this data type
 * @param {Object} placeholders - Translation placeholders
 * @returns {HTMLElement} - Processed section element
 */
const processDataSource = async (dataType, url, config, placeholders) => {
  if (!url) {
    return null;
  }

  try {
    const data = await fetchData(url);

    if (data.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.classList.add('note-message');
      emptyMessage.textContent = `No ${dataType} information available.`;
      return emptyMessage;
    }

    return createDataSection(placeholders, data, config);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching ${dataType} data:`, error);
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    errorMessage.textContent = `Error loading ${dataType} details: ${error.message}`;
    return errorMessage;
  }
};

/**
 * Processes all data sources sequentially
 * @param {Object} dataUrls - Object containing URLs for different data types
 * @param {Object} dataConfigs - Configurations for each data type
 * @param {Object} placeholders - Translation placeholders
 * @returns {Promise<Array>} - Array of processed data sections
 */
const processAllDataSources = async (dataUrls, dataConfigs, placeholders) => {
  const results = [];
  const dataTypes = Object.keys(dataUrls);

  // Use Promise.all to process data sources in parallel
  const sectionPromises = dataTypes.map((dataType) => processDataSource(
    dataType,
    dataUrls[dataType],
    dataConfigs[dataType],
    placeholders,
  ));

  const sections = await Promise.all(sectionPromises);

  // Filter out null results and add valid sections to results
  sections.forEach((section) => {
    if (section) {
      results.push(section);
    }
  });

  return results;
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

  // Define data configurations
  const dataConfigs = {
    vitalSys: {
      type: 'system',
      sectionTitle: placeholders.vitalSysTitle || 'Vital System Information',
      displayFields: ['topology', 'name', 'url', 'target', 'notes'],
    },
    envInfo: {
      type: 'environment',
      sectionTitle: placeholders.envInfoTitle || 'Environment Information',
      displayFields: ['topology', 'name', 'publicIP', 'dns', 'availabilityZone'],
    },
    contacts: {
      type: 'contact',
      sectionTitle: placeholders.contactsTitle || 'Contact Information',
      displayFields: ['firstName', 'lastName', 'title', 'email', 'businessPhone', 'mobilePhone'],
    },
  };

  // Get data URLs from block content
  const links = block.querySelectorAll('a');
  const dataUrls = {};

  // Check if we have the expected data URLs
  if (links.length === 0) {
    // eslint-disable-next-line no-console
    console.error('No data URLs found in block');
    block.innerHTML = '<div class="error-message">Configuration error: Data URLs not found.</div>';
    return;
  }

  // Extract URLs from block and dynamically match them to dataConfigs
  links.forEach((link) => {
    const url = link.href;
    const linkText = link.textContent.trim().toLowerCase();

    if (linkText.includes('vital') || linkText.includes('system')) {
      dataUrls.vitalSys = url;
    } else if (linkText.includes('environment') || linkText.includes('env')) {
      dataUrls.envInfo = url;
    } else if (linkText.includes('contact')) {
      dataUrls.contacts = url;
    } else {
      // Handle unexpected or additional data types
      // eslint-disable-next-line no-console
      console.warn(`Unrecognized data type for URL: ${url}`);
    }
  });

  try {
    const wrapper = document.createElement('div');
    wrapper.classList.add('data-wrapper');

    // Process all data sources and add them to the wrapper
    const sections = await processAllDataSources(dataUrls, dataConfigs, placeholders);
    sections.forEach((section) => {
      wrapper.appendChild(section);
    });

    block.innerHTML = '';
    block.appendChild(wrapper);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing data:', error);
    block.innerHTML = `<div class="error-message">Error processing data: ${error.message}</div>`;
  }
}

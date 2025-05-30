export default async function decorate(block) {
  block.innerHTML = `
    <div class="filters">
      <select id="sort-order">
        <option value="newest">Sort: Newest to Oldest</option>
        <option value="oldest">Sort: Oldest to Newest</option>
      </select>
      <select id="filter-category">
        <option value="">All Categories</option>
      </select>
      <select id="filter-attendee">
        <option value="">All Attendees</option>
      </select>
      <select id="filter-month-year">
        <option value="">All Dates</option>
      </select>
    </div>
    <div id="minutes-list"></div>
    <div class="pagination">
      <button id="prev-page" disabled>Previous</button>
      <span id="page-info">Page 1</span>
      <button id="next-page">Next</button>
    </div>
  `;

  // Cache DOM elements for better performance
  let domElements;
  function getDomElements() {
    if (!domElements) {
      domElements = {
        filterCategory: block.querySelector('#filter-category'),
        filterMonthYear: block.querySelector('#filter-month-year'),
        filterAttendee: block.querySelector('#filter-attendee'),
        sortOrder: block.querySelector('#sort-order'),
        minutesList: block.querySelector('#minutes-list'),
        prevPageBtn: block.querySelector('#prev-page'),
        nextPageBtn: block.querySelector('#next-page'),
        pageInfo: block.querySelector('#page-info'),
      };
    }
    return domElements;
  }

  // Add pagination variables
  let currentPage = 1;
  const itemsPerPage = 12; // Show 12 cards per page (4 rows of 3 columns)
  let filteredData = [];

  async function fetchMeetingData() {
    const res = await fetch('/meeting-minutes/query-index.json');
    const minutesData = await res.json();
    return minutesData.data;
  }

  // Helper function to properly convert epoch timestamp to Date object
  function parseDate(dateValue) {
    if (!dateValue) return null;

    // Convert to number if it's a string
    const timestamp = Number(dateValue);
    if (Number.isNaN(timestamp)) return null;

    // Check if timestamp is in seconds (10 digits) and convert to milliseconds if needed
    // Most epoch timestamps in seconds are 10 digits, milliseconds are 13 digits
    const date = timestamp < 10000000000
      ? new Date(timestamp * 1000) // Convert seconds to milliseconds
      : new Date(timestamp); // Already in milliseconds

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function extractFilters(data) {
    const categories = new Set();
    const monthYears = new Set();
    const attendees = new Set();

    data.forEach((item) => {
      const date = parseDate(item.date);
      if (date) {
        const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        monthYears.add(monthYear);
      }
      if (item.category) {
        categories.add(item.category);
      }
      if (item.attendees) {
        item.attendees.split(',').map((a) => a.trim()).forEach((a) => {
          if (a) {
            attendees.add(a);
          }
        });
      }
    });

    return {
      categories: Array.from(categories).sort(),
      monthYears: Array.from(monthYears).sort((a, b) => {
        // Custom sort for month-year strings
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];

        if (yearA !== yearB) {
          return yearA - yearB;
        }
        return months.indexOf(monthA) - months.indexOf(monthB);
      }),
      attendees: Array.from(attendees).sort(),
    };
  }

  function renderFilters({ categories, monthYears, attendees }) {
    const elements = getDomElements();

    // More efficient population function with document fragment
    const populate = (select, values) => {
      const fragment = document.createDocumentFragment();
      values.forEach((val) => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        fragment.appendChild(option);
      });
      select.appendChild(fragment);
    };

    populate(elements.filterCategory, categories);
    populate(elements.filterMonthYear, monthYears);
    populate(elements.filterAttendee, attendees);
  }

  function renderList(data) {
    const elements = getDomElements();
    elements.minutesList.innerHTML = '';

    if (!data.length) {
      elements.minutesList.textContent = 'No meeting minutes found.';
      elements.prevPageBtn.disabled = true;
      elements.nextPageBtn.disabled = true;
      elements.pageInfo.textContent = 'Page 0 of 0';
      return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, data.length);
    const currentData = data.slice(startIndex, endIndex);

    // Update pagination controls
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    // Use document fragment for better rendering performance
    const fragment = document.createDocumentFragment();

    currentData.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'minute-cards';

      const date = parseDate(item.date);
      const readableDate = date
        ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Invalid Date';

      card.innerHTML = `
        <h3><a href="${item.path}">${item.title}</a></h3>
        <p class="italic-text">${readableDate} — ${item.category || ''}</p>
        <p class="description">${item.description || ''}</p>
      `;
      fragment.appendChild(card);
    });

    elements.minutesList.appendChild(fragment);
  }

  function filterData(data) {
    const elements = getDomElements();
    const category = elements.filterCategory.value;
    const monthYear = elements.filterMonthYear.value;
    const attendee = elements.filterAttendee.value;
    const sortOrder = elements.sortOrder.value;

    const filtered = data.filter((item) => {
      const date = parseDate(item.date);

      if (!date) {
        return false;
      }

      const itemMonthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      const matchCategory = category ? item.category === category : true;
      const matchMonthYear = monthYear ? itemMonthYear === monthYear : true;
      const matchAttendee = attendee
        ? (item.attendees || '').split(',').map((a) => a.trim()).includes(attendee)
        : true;

      return matchCategory && matchMonthYear && matchAttendee;
    });

    filtered.sort((a, b) => {
      const dateA = parseDate(a.date) || new Date(0);
      const dateB = parseDate(b.date) || new Date(0);
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    // Reset to first page when filter changes
    currentPage = 1;

    return filtered;
  }

  try {
    const data = await fetchMeetingData();
    const filters = extractFilters(data);
    renderFilters(filters);

    // Initial filter and render
    filteredData = filterData(data);
    renderList(filteredData);

    // Set up event listeners
    block.querySelectorAll('select').forEach((select) => {
      select.addEventListener('change', () => {
        filteredData = filterData(data);
        renderList(filteredData);
      });
    });

    // Pagination event listeners
    getDomElements().prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderList(filteredData);
      }
    });

    getDomElements().nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderList(filteredData);
      }
    });
  } catch (error) {
    getDomElements().minutesList.textContent = 'Error loading meeting minutes.';
  }
}

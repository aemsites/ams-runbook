/* eslint-disable max-len */

const INDEX = '/query-index.json';
const MEETING_MINUTES_INDEX = '/meeting-minutes/query-index.json';

/**
 * Returns the relative path from a given path.
 * If the path is a URL, it extracts the pathname.
 * @param {string} path - The path to get the relative path from.
 * @returns {string} - The relative path.
 */
export function getRelativePath(path) {
  let relPath = path;
  try {
    const url = new URL(path);
    relPath = url.pathname;
  } catch (error) {
    // do nothing
  }
  return relPath;
}

/**
 * Retrieves data from an index.
 * @param {string} [index=INDEX] - The index to retrieve data from.
 * @returns {Promise<Array>} - A promise that resolves to an array of retrieved data.
 */
async function getIndexData(index = INDEX) {
  const retrievedData = [];
  const limit = 500;

  // Helper function to append query parameters correctly
  const appendQuery = (url, param) => (url.includes('?') ? `${url}&${param}` : `${url}?${param}`);

  const first = await fetch(appendQuery(index, `limit=${limit}`))
    .then((resp) => {
      if (resp.ok) {
        return resp.json();
      }
      return {};
    });

  const { total } = first;
  if (total) {
    retrievedData.push(...first.data);
    const promises = [];
    const buckets = Math.ceil(total / limit);
    for (let i = 1; i < buckets; i += 1) {
      promises.push(new Promise((resolve) => {
        const offset = i * limit;
        fetch(appendQuery(index, `offset=${offset}&limit=${limit}`))
          .then((resp) => {
            if (resp.ok) {
              return resp.json();
            }
            return {};
          })
          .then((json) => {
            const { data } = json;
            if (data) {
              resolve(data);
            }
            resolve([]);
          });
      }));
    }

    await Promise.all(promises).then((values) => {
      values.forEach((list) => {
        retrievedData.push(...list);
      });
    });
  }
  return retrievedData;
}

const meetingMinutesData = [];
/**
 * Retrieves the meeting minutes index data.
 * @returns {Promise<Array>} A promise that resolves to an array of meeting minutes index data.
 */
export async function getMeetingMinutesIndexData() {
  if (!meetingMinutesData.length) {
    meetingMinutesData.push(...await getIndexData(MEETING_MINUTES_INDEX));
  }
  // Protected against callers modifying the objects
  return structuredClone(meetingMinutesData);
}

let indexData = null;
/**
 * Retrieves index data from the query-index file.
 * @returns {Promise<Array>} A promise that resolves to an array of index data.
 */
export const getGenericIndexData = (() => async () => {
  if (!indexData) {
    indexData = await getIndexData();
  }
  // Protected against callers modifying the objects
  return structuredClone(indexData);
})();

/**
 * Formats a date in a user-friendly format.
 * @param {string} dateString - Date string in YYYY-MM-DD format.
 * @returns {string} Formatted date string.
 */
export function getDateFormat(dateString) {
  if (!dateString) return '';

  const dateParts = dateString.split('-');
  if (dateParts.length !== 3) return dateString;

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) return dateString;

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Function to create ellipsis
function createEllipsis() {
  const listItem = document.createElement('li');
  const a = document.createElement('a');
  const span = document.createElement('span');
  a.className = 'gap';
  span.textContent = '...';
  a.appendChild(span);
  listItem.appendChild(a);
  return listItem;
}

export function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Function to create a page link
function createPageLink(pageNumber, text, className) {
  const link = document.createElement('a');
  const currentPagePath = window.location.pathname;
  const currentPageQuery = window.location.search;
  if (className !== 'active') {
    link.href = `${currentPagePath}${currentPageQuery}#page=${pageNumber}`;
  }
  link.onclick = scrollTop;
  link.textContent = text;

  if (className) {
    link.classList.add(className);
  }

  return link;
}

export function generatePagination(paginationContainer, currentPage, totalPages) {
  const displayPages = 5;
  const paginationList = document.createElement('ul');
  paginationList.className = 'pagination';

  // Previous page link
  const prevDiv = document.createElement('div');
  prevDiv.className = 'prev';
  if (currentPage === 1) {
    prevDiv.appendChild(createPageLink(currentPage - 1, '< PREVIOUS', 'active'));
  } else {
    prevDiv.appendChild(createPageLink(currentPage - 1, '< PREVIOUS'));
  }
  paginationContainer.appendChild(prevDiv);

  // Page links
  const startPage = Math.max(1, currentPage - Math.floor(displayPages / 2));
  const endPage = Math.min(totalPages, startPage + displayPages - 1);

  if (startPage > 1) {
    const li = document.createElement('li');
    li.appendChild(createPageLink(1, '1'));
    paginationList.appendChild(li);
    if (startPage > 2) {
      paginationList.appendChild(createEllipsis());
    }
  }

  for (let i = startPage; i <= endPage; i += 1) {
    const li = document.createElement('li');
    if (i === currentPage) {
      li.appendChild(createPageLink(i, i, 'active'));
    } else {
      li.appendChild(createPageLink(i, i));
    }
    paginationList.appendChild(li);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationList.appendChild(createEllipsis());
    }
    const li = document.createElement('li');
    li.appendChild(createPageLink(totalPages, totalPages));
    paginationList.appendChild(li);
  }

  paginationContainer.appendChild(paginationList);

  // Next page link
  const nextDiv = document.createElement('div');
  nextDiv.className = 'next';
  if (currentPage < totalPages) {
    nextDiv.appendChild(createPageLink(currentPage + 1, 'NEXT >'));
  } else {
    nextDiv.appendChild(createPageLink(currentPage + 1, 'NEXT >', 'active'));
  }
  paginationContainer.appendChild(nextDiv);
}

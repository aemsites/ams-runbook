function parseDate(epoch) {
  const num = Number(epoch);
  if (Number.isNaN(num)) return null;
  return new Date(num < 1e12 ? num * 1000 : num); // Handle seconds vs ms
}

async function renderLatestMeeting(container) {
  try {
    const res = await fetch('/meeting-minutes/query-index.json');
    const json = await res.json();
    const { data } = json;

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<p>No recent meetings found.</p>';
      return;
    }

    // Sort by date descending (newest first)
    data.sort((a, b) => Number(b.date) - Number(a.date));

    const topMeetings = data.slice(0, 3); // Get top 3

    const listItems = topMeetings.map((item) => {
      const date = parseDate(item.date);
      const readableDate = date
        ? date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        : 'Unknown Date';

      return `
        <li>
          <a href="${item.path}">
            <span class="meeting-date">${readableDate}</span>
            <span class="meeting-description">${item.description}</span>
          </a>
        </li>
      `;
    }).join('');

    container.innerHTML = `
        <ul class="meeting-list">
          ${listItems}
        </ul>
    `;
  } catch (e) {
    container.innerHTML = '<p>Error loading meetings.</p>';
  }
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  const cells = block.querySelectorAll('.columns > div > div');
  cells.forEach((cell) => {
    cell.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim().toLowerCase() === 'latest-meeting') {
        const placeholder = document.createElement('div');
        placeholder.className = 'latest-meeting-placeholder';
        p.replaceWith(placeholder);
        renderLatestMeeting(placeholder);
      }
    });
  });

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}

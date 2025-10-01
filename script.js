(function () {
  const START_HOUR = 5;
  const END_HOUR = 23;
  const STORAGE_KEY = 'timeboxing-planner-state';

  const scheduleBody = document.getElementById('schedule-body');
  const dateInput = document.getElementById('planner-date');
  const clearButton = document.getElementById('clear-planner');
  const printButton = document.getElementById('print-planner');

  buildSchedule();

  const fields = Array.from(document.querySelectorAll('[data-storage-key]'));

  let storageEnabled = true;
  const state = loadState();

  const initialDate = determineInitialDate(state.lastDate);
  dateInput.value = initialDate;
  if (state.lastDate !== initialDate) {
    state.lastDate = initialDate;
    saveState();
  }
  applyDate(initialDate);

  dateInput.addEventListener('change', handleDateChange);
  fields.forEach((field) => {
    field.addEventListener('input', handleFieldInput);
  });

  clearButton.addEventListener('click', handleClear);
  printButton.addEventListener('click', () => window.print());

  function buildSchedule() {
    for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
      const row = document.createElement('tr');

      const timeHeader = document.createElement('th');
      timeHeader.scope = 'row';
      timeHeader.className = 'time-label';
      timeHeader.textContent = formatHourLabel(hour);
      row.appendChild(timeHeader);

      [0, 30].forEach((minutes) => {
        const cell = document.createElement('td');
        const textarea = document.createElement('textarea');
        textarea.rows = 2;
        textarea.dataset.storageKey = `slot-${hour}-${minutes === 0 ? '00' : '30'}`;
        textarea.setAttribute(
          'aria-label',
          `${formatHourLabel(hour, true)} ${minutes === 0 ? 'on the hour' : 'half past'}`
        );
        cell.appendChild(textarea);
        row.appendChild(cell);
      });

      scheduleBody.appendChild(row);
    }
  }

  function loadState() {
    if (!storageEnabled) return createEmptyState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createEmptyState();
      }
      const parsed = JSON.parse(raw);
      const lastDate = typeof parsed.lastDate === 'string' ? parsed.lastDate : '';
      const entries = parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {};
      return { lastDate, entries };
    } catch (error) {
      storageEnabled = false;
      console.warn('Local storage is unavailable. Planner data will not persist.', error);
      return createEmptyState();
    }
  }

  function saveState() {
    if (!storageEnabled) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      storageEnabled = false;
      console.warn('Local storage is unavailable. Planner data will not persist.', error);
    }
  }

  function createEmptyState() {
    return { lastDate: '', entries: {} };
  }

  function determineInitialDate(lastDate) {
    if (isValidDateString(lastDate)) {
      return lastDate;
    }
    return formatDate(new Date());
  }

  function handleDateChange() {
    const dateValue = getActiveDate();
    state.lastDate = dateValue;
    saveState();
    applyDate(dateValue);
  }

  function handleFieldInput(event) {
    const target = event.target;
    const key = target.dataset.storageKey;
    if (!key) return;

    const activeDate = getActiveDate();
    const entry = getOrCreateEntry(activeDate);
    const value = target.value;

    if (value.trim().length === 0) {
      delete entry[key];
      cleanupEntryIfEmpty(activeDate);
    } else {
      entry[key] = value;
    }
    saveState();
  }

  function handleClear() {
    const activeDate = getActiveDate();
    if (!activeDate) return;

    const hasContent = fields.some((field) => field.value.trim().length > 0);
    if (!hasContent) return;

    const confirmClear = window.confirm('Clear all planner fields for the selected date?');
    if (!confirmClear) return;

    fields.forEach((field) => {
      field.value = '';
    });

    delete state.entries[activeDate];
    saveState();
  }

  function applyDate(dateValue) {
    const entry = state.entries[dateValue] || {};
    fields.forEach((field) => {
      const key = field.dataset.storageKey;
      field.value = entry[key] || '';
    });
  }

  function getActiveDate() {
    if (dateInput.value && isValidDateString(dateInput.value)) {
      return dateInput.value;
    }
    const today = formatDate(new Date());
    dateInput.value = today;
    return today;
  }

  function getOrCreateEntry(dateValue) {
    if (!state.entries[dateValue]) {
      state.entries[dateValue] = {};
    }
    return state.entries[dateValue];
  }

  function cleanupEntryIfEmpty(dateValue) {
    if (!state.entries[dateValue]) return;
    const hasValues = Object.keys(state.entries[dateValue]).length > 0;
    if (!hasValues) {
      delete state.entries[dateValue];
    }
  }

  function isValidDateString(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatHourLabel(hour, verbose = false) {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = ((hour + 11) % 12) + 1;
    if (verbose) {
      return `${displayHour}:00 ${suffix}`;
    }
    return `${displayHour} ${suffix}`;
  }
})();

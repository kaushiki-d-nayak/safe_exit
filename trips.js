(() => {
  const STORAGE_KEY = 'safeexit.trips.v1';
  const MAX_TRIPS = 50;
  const $ = id => document.getElementById(id);

  const form = $('tripForm');
  const tripList = $('tripList');
  if (!form || !tripList) return;

  const fields = {
    name: $('tripName'),
    destination: $('tripDestination'),
    startDate: $('tripStart'),
    endDate: $('tripEnd'),
    stay: $('tripStay'),
    contact: $('tripContact'),
    notes: $('tripNotes'),
  };
  const countLabel = $('tripCount');
  const emptyState = $('tripsEmpty');
  const loadingState = $('tripsLoading');
  const nextTrip = $('nextTrip');
  let trips = readTrips();

  function notify(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  function readTrips() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error('Saved trips are not a list.');
      return parsed.filter(trip =>
        trip && typeof trip.id === 'string' &&
        typeof trip.name === 'string' &&
        typeof trip.destination === 'string' &&
        isValidDate(trip.startDate) && isValidDate(trip.endDate)
      );
    } catch {
      notify('Saved trips could not be read in this browser.');
      return [];
    }
  }

  function writeTrips() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      return true;
    } catch {
      notify('Your browser could not save this trip. Check available storage and try again.');
      return false;
    }
  }

  function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function localToday() {
    const today = new Date();
    return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  }

  function formatDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(year, month - 1, day, 12));
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function addDetail(container, label, value) {
    if (!value) return;
    const row = makeElement('p');
    const heading = makeElement('b', '', `${label}: `);
    row.append(heading, document.createTextNode(value));
    container.append(row);
  }

  function addAction(container, trip, action, label, extraClass = '') {
    const button = makeElement('button', `outline-btn ${extraClass}`.trim(), label);
    button.type = 'button';
    button.dataset.tripAction = action;
    button.dataset.tripId = trip.id;
    container.append(button);
  }

  function createTripCard(trip) {
    const card = makeElement('article', 'trip-card');
    if (trip.endDate < localToday()) card.classList.add('past');

    const top = makeElement('div', 'trip-top');
    const titleGroup = document.createElement('div');
    titleGroup.append(
      makeElement('h3', '', trip.name),
      makeElement('p', 'trip-where', trip.destination),
    );
    const dateText = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;
    top.append(titleGroup, makeElement('span', 'trip-dates', dateText));
    card.append(top);

    const details = makeElement('div', 'trip-details');
    addDetail(details, 'Stay', trip.stay);
    addDetail(details, 'Trusted contact', trip.contact);
    addDetail(details, 'Notes', trip.notes);
    if (details.childElementCount) card.append(details);

    const actions = makeElement('div', 'trip-actions');
    addAction(actions, trip, 'safety', 'Open live safety');
    addAction(actions, trip, 'plan', 'Build a Plan B');
    addAction(actions, trip, 'delete', 'Delete trip', 'delete-trip');
    card.append(actions);
    return card;
  }

  function createNextTripCard(trip) {
    const info = makeElement('div', 'next-trip-info');
    info.append(makeElement('span', 'trip-icon', '✈'));
    const description = document.createElement('div');
    description.append(
      makeElement('div', 'eyebrow', 'UP NEXT'),
      makeElement('strong', '', `${trip.name} · ${trip.destination}`),
      makeElement('p', '', `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`),
    );
    info.append(description);

    const button = makeElement('button', 'outline-btn', 'View trip');
    button.type = 'button';
    button.dataset.tripAction = 'view';
    button.dataset.tripId = trip.id;
    nextTrip.replaceChildren(info, button);
    nextTrip.classList.remove('hidden');
  }

  function render() {
    trips.sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    tripList.replaceChildren(...trips.map(createTripCard));
    if (countLabel) countLabel.textContent = `${trips.length} ${trips.length === 1 ? 'TRIP' : 'TRIPS'}`;
    if (emptyState) emptyState.classList.toggle('hidden', trips.length > 0);
    if (loadingState) loadingState.classList.add('hidden');

    const upcoming = trips.find(trip => trip.endDate >= localToday());
    if (nextTrip) {
      if (upcoming) createNextTripCard(upcoming);
      else {
        nextTrip.replaceChildren();
        nextTrip.classList.add('hidden');
      }
    }
  }

  function newId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }

  function openPage(page) {
    const button = document.querySelector(`[data-page="${page}"]`);
    if (button) button.click();
  }

  function handleTripAction(action, trip) {
    if (!trip) return;
    if (action === 'delete') {
      if (!window.confirm(`Delete “${trip.name}”?`)) return;
      const previous = trips;
      trips = trips.filter(item => item.id !== trip.id);
      if (!writeTrips()) {
        trips = previous;
        return;
      }
      render();
      notify('Trip deleted.');
      return;
    }

    if (action === 'view') {
      openPage('trips');
      return;
    }

    if (action === 'safety') {
      const label = $('liveLabel');
      if (label) label.value = `${trip.name} — ${trip.destination}`;
      openPage('safety');
      return;
    }

    if (action === 'plan') {
      const contact = $('contactName');
      if (contact && trip.contact) contact.value = trip.contact;
      openPage('plan');
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();

    const trip = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
    if (!trip.name || !trip.destination) {
      notify('Add a trip name and destination.');
      (trip.name ? fields.destination : fields.name).focus();
      return;
    }
    if (!isValidDate(trip.startDate) || !isValidDate(trip.endDate)) {
      notify('Choose valid start and end dates.');
      (!isValidDate(trip.startDate) ? fields.startDate : fields.endDate).focus();
      return;
    }
    if (trip.endDate < trip.startDate) {
      notify('The end date must be on or after the start date.');
      fields.endDate.focus();
      return;
    }
    if (trips.length >= MAX_TRIPS) {
      notify(`You can save up to ${MAX_TRIPS} trips. Delete an old trip first.`);
      return;
    }

    const previous = trips;
    trips = [...trips, { ...trip, id: newId(), createdAt: new Date().toISOString() }];
    if (!writeTrips()) {
      trips = previous;
      return;
    }
    form.reset();
    render();
    notify('Trip saved in this browser.');
  });

  tripList.addEventListener('click', event => {
    const button = event.target.closest('[data-trip-action]');
    if (!button) return;
    handleTripAction(button.dataset.tripAction, trips.find(trip => trip.id === button.dataset.tripId));
  });

  if (nextTrip) {
    nextTrip.addEventListener('click', event => {
      const button = event.target.closest('[data-trip-action]');
      if (button) handleTripAction(button.dataset.tripAction, trips.find(trip => trip.id === button.dataset.tripId));
    });
  }

  document.querySelectorAll('[data-add-trip]').forEach(button => {
    button.addEventListener('click', () => {
      openPage('trips');
      fields.name.focus();
    });
  });

  render();
})();

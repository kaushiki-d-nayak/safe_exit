/* My trips: saved server-side against an anonymous HttpOnly device cookie. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let trips = [], loaded = false, busy = false, pendingDelete = null, toastTimer;

  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 3000);
  }
  const goTo = page => document.querySelector('.nav-list [data-page="' + page + '"]').click();
  const today = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const formatDate = value => new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const status = trip => trip.endDate < today() ? 'past' : trip.startDate <= today() ? 'ongoing' : 'upcoming';
  const STATUS = {
    ongoing: ['ON THE ROAD', 'green'],
    upcoming: ['UPCOMING', 'amber'],
    past: ['COMPLETED', 'neutral']
  };

  async function api(method, body, query = '') {
    const options = { method, headers: {}, credentials: 'same-origin', cache: 'no-store' };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    let res, json;
    try {
      res = await fetch('/api/trips' + query, options);
      json = await res.json();
    } catch {
      throw new Error('Could not reach SafeExit. Check your connection and try again.');
    }
    if (!res.ok) throw new Error(json.error || 'Something went wrong. Try again.');
    return json.trips || [];
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function detail(label, value) {
    const p = el('p');
    p.append(el('b', '', label + ': '), document.createTextNode(value));
    return p;
  }
  function button(label, onClick, extra = '') {
    const b = el('button', 'outline-btn' + extra, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function startSafety(trip) {
    $('liveLabel') && ($('liveLabel').value = (trip.name + ' · ' + trip.destination).slice(0, 60));
    goTo('safety');
    toast('Trip label added. Start your safety session when you are ready.');
  }
  function planB(trip) {
    if (trip.stay) $('fallback').value = trip.stay;
    if (trip.contact) $('contactName').value = trip.contact;
    goTo('plan');
    toast('Trip details added to your Plan B.');
  }
  async function remove(trip, b) {
    if (pendingDelete !== trip.id) {
      pendingDelete = trip.id;
      b.textContent = 'Tap again to delete';
      setTimeout(() => {
        if (pendingDelete === trip.id) {
          pendingDelete = null;
          b.textContent = 'Delete';
        }
      }, 4000);
      return;
    }
    pendingDelete = null;
    b.disabled = true;
    try {
      trips = await api('DELETE', null, '?id=' + encodeURIComponent(trip.id));
      render();
      toast('Trip deleted.');
    } catch (e) {
      b.disabled = false;
      toast(e.message);
    }
  }

  function render() {
    const list = $('tripList');
    list.replaceChildren();
    $('tripsLoading').classList.toggle('hidden', loaded);
    $('tripsEmpty').classList.toggle('hidden', !loaded || trips.length > 0);
    $('tripCount').textContent = trips.length + (trips.length === 1 ? ' TRIP' : ' TRIPS');

    const order = { ongoing: 0, upcoming: 1, past: 2 };
    const sorted = [...trips].sort((a, b) =>
      order[status(a)] - order[status(b)] ||
      (status(a) === 'past'
        ? b.startDate.localeCompare(a.startDate)
        : a.startDate.localeCompare(b.startDate))
    );

    for (const trip of sorted) {
      const s = status(trip);
      const card = el('article', 'trip-card' + (s === 'past' ? ' past' : ''));
      const top = el('div', 'trip-top');
      const info = el('div');

      info.append(
        el('h3', '', trip.name),
        el('p', 'trip-where', '◎ ' + trip.destination),
        el(
          'p',
          'trip-dates',
          trip.startDate === trip.endDate
            ? formatDate(trip.startDate)
            : formatDate(trip.startDate) + ' → ' + formatDate(trip.endDate)
        )
      );
      top.append(info, el('span', 'pill ' + STATUS[s][1], STATUS[s][0]));
      card.append(top);

      if (trip.stay || trip.contact || trip.notes) {
        const details = el('div', 'trip-details');
        if (trip.stay) details.append(detail('Staying at', trip.stay));
        if (trip.contact) details.append(detail('Trusted contact', trip.contact));
        if (trip.notes) details.append(detail('Notes', trip.notes));
        card.append(details);
      }

      const actions = el('div', 'trip-actions');
      if (s !== 'past') {
        actions.append(
          button('Start live safety →', () => startSafety(trip)),
          button('Build Plan B ↗', () => planB(trip))
        );
      }
      const del = button('Delete', () => remove(trip, del), ' live-danger-outline');
      actions.append(del);
      card.append(actions);
      list.append(card);
    }
    renderNext(sorted.find(t => status(t) !== 'past'));
  }

  function renderNext(trip) {
    const box = $('nextTrip');
    box.replaceChildren();
    box.classList.toggle('hidden', !trip);
    if (!trip) return;

    const s = status(trip);
    const info = el('div', 'next-trip-info');
    const text = el('div');
    text.append(
      el('div', 'eyebrow', s === 'ongoing' ? 'CURRENT TRIP' : 'NEXT TRIP'),
      el('div', 'card-heading', trip.name + ' · ' + trip.destination)
    );
    text.firstChild.style.marginBottom = '5px';
    text.append(
      el(
        'p',
        '',
        formatDate(trip.startDate) +
          (trip.endDate !== trip.startDate ? ' → ' + formatDate(trip.endDate) : '') +
          (trip.stay ? ' · ' + trip.stay : '')
      )
    );
    info.append(el('div', 'trip-icon', '✈'), text);

    const view = el('button', 'outline-btn', 'View my trips →');
    view.type = 'button';
    view.addEventListener('click', () => goTo('trips'));
    box.append(info, view);
  }

  async function load() {
    try {
      trips = await api('GET');
      loaded = true;
      render();
    } catch (e) {
      loaded = true;
      render();
      $('tripsEmpty').querySelector('p').textContent = e.message;
    }
  }

  $('tripForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;

    const trip = {
      name: $('tripName').value.trim(),
      destination: $('tripDestination').value.trim(),
      startDate: $('tripStart').value,
      endDate: $('tripEnd').value,
      stay: $('tripStay').value.trim(),
      contact: $('tripContact').value.trim(),
      notes: $('tripNotes').value.trim()
    };

    if (!trip.name || !trip.destination) {
      toast('Add a trip name and destination.');
      return;
    }
    if (!trip.startDate || !trip.endDate) {
      toast('Choose start and end dates.');
      return;
    }
    if (trip.endDate < trip.startDate) {
      toast('The end date must be on or after the start date.');
      return;
    }

    busy = true;
    $('tripSave').disabled = true;
    $('tripSave').textContent = 'Saving…';
    try {
      trips = await api('POST', trip);
      loaded = true;
      $('tripForm').reset();
      render();
      toast('Trip saved.');
    } catch (err) {
      toast(err.message);
    } finally {
      busy = false;
      $('tripSave').disabled = false;
      $('tripSave').textContent = 'Save trip ✈';
    }
  });

  $('tripStart').addEventListener('change', () => {
    $('tripEnd').min = $('tripStart').value;
    if (!$('tripEnd').value || $('tripEnd').value < $('tripStart').value) {
      $('tripEnd').value = $('tripStart').value;
    }
  });

  document.querySelectorAll('[data-add-trip]').forEach(b =>
    b.addEventListener('click', () => {
      goTo('trips');
      setTimeout(() => $('tripName').focus(), 50);
    })
  );

  if (!location.hash.startsWith('#watch=')) load();
})();
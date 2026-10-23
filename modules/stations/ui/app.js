'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  // Gating: Redirect guests to login
  const user = await window.EVSBS.getUser();
  if (!user) {
    window.location.href = '/modules/auth/';
    return;
  }

  const searchForm = document.getElementById('search');
  const resetBtn = document.getElementById('reset-btn');
  const searchStatus = document.getElementById('search-status');
  const resultsEl = document.getElementById('results');
  const detailsSection = document.getElementById('details-section');
  const detailsEl = document.getElementById('details');

  async function api(path) {
    const res = await fetch('/api/stations' + path, { credentials: 'same-origin' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error((json.error && json.error.message) || 'Failed to fetch station data.');
    }
    return json.data;
  }

  // Search stations
  async function performSearch(queryObj) {
    resultsEl.replaceChildren();
    searchStatus.textContent = 'Searching active stations...';

    const params = new URLSearchParams();
    if (queryObj.city) params.set('city', queryObj.city);
    if (queryObj.name) params.set('name', queryObj.name);

    try {
      const stations = await api('/?' + params.toString());
      sessionStorage.setItem('evsbs_station_query', JSON.stringify(queryObj));

      if (!stations.length) {
        searchStatus.textContent = 'No active charging stations found matching your criteria.';
        resultsEl.innerHTML = '<p class="text-muted">No stations found. Try searching for a different city or name.</p>';
        return;
      }

      searchStatus.textContent = `Found ${stations.length} active station(s).`;

      for (const s of stations) {
        const item = document.createElement('article');
        item.className = 'station-item';
        item.dataset.id = s.id;

        const h3 = document.createElement('h3');
        h3.textContent = s.name;
        item.appendChild(h3);

        const meta = document.createElement('div');
        meta.className = 'station-meta';
        meta.textContent = `${s.city} · ${s.address} · Hours: ${s.openingTime} – ${s.closingTime}`;
        item.appendChild(meta);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm';
        btn.textContent = 'View Chargers & Availability';
        btn.onclick = () => showStation(s.id);
        item.appendChild(btn);

        resultsEl.appendChild(item);
      }

      // Check if a station was previously selected
      const savedStationId = sessionStorage.getItem('evsbs_selected_station_id');
      if (savedStationId && stations.some(s => s.id === savedStationId)) {
        showStation(savedStationId);
      }
    } catch (err) {
      searchStatus.textContent = err.message;
      resultsEl.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    }
  }

  searchForm.onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(searchForm);
    const query = {
      city: (formData.get('city') || '').trim(),
      name: (formData.get('name') || '').trim()
    };
    performSearch(query);
  };

  resetBtn.onclick = () => {
    searchForm.reset();
    sessionStorage.removeItem('evsbs_station_query');
    sessionStorage.removeItem('evsbs_selected_station_id');
    detailsSection.hidden = true;
    performSearch({ city: '', name: '' });
  };

  // Show station details and chargers
  async function showStation(stationId) {
    sessionStorage.setItem('evsbs_selected_station_id', stationId);

    // Highlight selected station in list
    document.querySelectorAll('.station-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === stationId);
    });

    detailsSection.hidden = false;
    detailsEl.replaceChildren();
    const loadingP = document.createElement('p');
    loadingP.textContent = 'Loading chargers and station details...';
    detailsEl.appendChild(loadingP);

    try {
      const station = await api('/' + stationId);
      detailsEl.replaceChildren();

      // Station header
      const title = document.createElement('h2');
      title.textContent = station.name;
      detailsEl.appendChild(title);

      const infoP = document.createElement('p');
      infoP.className = 'station-meta';
      infoP.textContent = `${station.address}, ${station.city} · Status: ${station.status} · Timezone: ${station.timeZone || 'Asia/Kolkata'} · Operating: ${station.openingTime} - ${station.closingTime}`;
      detailsEl.appendChild(infoP);

      // Availability checking section
      const availBox = document.createElement('div');
      availBox.className = 'availability-section';

      const availTitle = document.createElement('h3');
      availTitle.textContent = 'Check Charger Availability';
      availBox.appendChild(availTitle);

      const timeLabel = document.createElement('label');
      timeLabel.innerHTML = 'Select Hour (IST station time):<span class="help-text">Whole hour slots only (e.g. 10:00, 14:00)</span>';
      
      const timeInput = document.createElement('input');
      timeInput.type = 'datetime-local';
      timeInput.step = '3600';
      timeInput.required = true;

      // Default timeInput to next whole hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      timeInput.value = localISO;

      timeLabel.appendChild(timeInput);
      availBox.appendChild(timeLabel);

      const checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.className = 'btn btn-sm';
      checkBtn.textContent = 'Check Hourly Availability';
      availBox.appendChild(checkBtn);

      const availStatus = document.createElement('div');
      availStatus.id = 'avail-status';
      availStatus.setAttribute('role', 'status');
      availStatus.style.marginTop = '8px';
      availBox.appendChild(availStatus);

      detailsEl.appendChild(availBox);

      // Chargers list container
      const chargersHeader = document.createElement('h3');
      chargersHeader.textContent = `Chargers (${station.slots ? station.slots.length : 0})`;
      detailsEl.appendChild(chargersHeader);

      const chargersList = document.createElement('div');
      chargersList.id = 'chargers-list';
      detailsEl.appendChild(chargersList);

      function renderBaseSlots() {
        chargersList.replaceChildren();
        if (!station.slots || !station.slots.length) {
          chargersList.innerHTML = '<p class="text-muted">No chargers configured for this station.</p>';
          return;
        }

        for (const slot of station.slots) {
          const card = document.createElement('div');
          card.className = 'charger-card';
          card.dataset.slotId = slot.id;

          const info = document.createElement('div');
          info.className = 'charger-info';
          info.innerHTML = `<h4>Charger ${slot.slotNumber} (${slot.connectorType})</h4>
            <p>${slot.maxPowerKw} kW · ₹${window.EVSBS.formatRupees(slot.hourlyRatePaise)}/hr · <span class="badge ${slot.status === 'ACTIVE' ? 'badge-active' : 'badge-maintenance'}">${slot.status}</span></p>`;
          card.appendChild(info);

          chargersList.appendChild(card);
        }
      }

      renderBaseSlots();

      // Check availability action
      checkBtn.onclick = async () => {
        availStatus.replaceChildren();
        const startVal = timeInput.value;

        // Validation
        if (!startVal) {
          availStatus.innerHTML = '<div class="msg msg-error">Please select a date and hour to check.</div>';
          return;
        }

        // Validate whole hour
        const minPart = startVal.slice(-2);
        if (minPart !== '00') {
          availStatus.innerHTML = '<div class="msg msg-error">Please select a whole hour (e.g. 10:00, 11:00).</div>';
          return;
        }

        checkBtn.disabled = true;
        checkBtn.textContent = 'Checking availability...';

        try {
          const availData = await api(`/${stationId}/availability?start=${encodeURIComponent(startVal)}`);

          // BUG-02 Fix: clear previous state and re-render slots with availability
          chargersList.replaceChildren();

          let availableCount = 0;
          for (const availSlot of availData.slots) {
            const baseSlot = station.slots.find(s => s.id === availSlot.slotId);
            if (!baseSlot) continue;

            const card = document.createElement('div');
            card.className = 'charger-card';

            const info = document.createElement('div');
            info.className = 'charger-info';

            const h4 = document.createElement('h4');
            h4.textContent = `Charger ${baseSlot.slotNumber} (${baseSlot.connectorType})`;
            info.appendChild(h4);

            const p = document.createElement('p');
            p.textContent = `${baseSlot.maxPowerKw} kW · ₹${window.EVSBS.formatRupees(baseSlot.hourlyRatePaise)}/hr`;
            info.appendChild(p);
            card.appendChild(info);

            // Action section (badge and booking button)
            const actionDiv = document.createElement('div');
            actionDiv.className = 'flex-row';

            if (availSlot.available) {
              availableCount++;
              const badge = document.createElement('span');
              badge.className = 'badge badge-available';
              badge.textContent = 'Available';
              actionDiv.appendChild(badge);

              const bookLink = document.createElement('a');
              bookLink.className = 'btn btn-sm';
              bookLink.textContent = `Book Charger ${baseSlot.slotNumber}`;
              // Human-friendly query params, no raw ID exposed to user interface
              bookLink.href = `/modules/bookings/?slotId=${baseSlot.id}&slotNumber=${baseSlot.slotNumber}&stationName=${encodeURIComponent(station.name)}&start=${encodeURIComponent(startVal)}`;
              actionDiv.appendChild(bookLink);
            } else {
              const badge = document.createElement('span');
              badge.className = 'badge badge-unavailable';
              let reasonLabel = 'Unavailable';
              if (availSlot.reason === 'ALREADY_BOOKED') reasonLabel = 'Booked';
              else if (availSlot.reason === 'STATION_INACTIVE') reasonLabel = 'Station Closed';
              else if (availSlot.reason === 'SLOT_INACTIVE') reasonLabel = 'Maintenance';
              badge.textContent = reasonLabel;
              actionDiv.appendChild(badge);
            }

            card.appendChild(actionDiv);
            chargersList.appendChild(card);
          }

          availStatus.innerHTML = `<div class="msg ${availableCount > 0 ? 'msg-success' : 'msg-info'}">${availableCount} charger(s) available for the selected hour.</div>`;
        } catch (err) {
          // BUG-01 Fix: Show availability error directly inline near the button
          availStatus.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
        } finally {
          checkBtn.disabled = false;
          checkBtn.textContent = 'Check Hourly Availability';
        }
      };

    } catch (err) {
      detailsEl.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    }
  }

  // Restore previous search on load if exists, or do initial blank search
  const savedQuery = sessionStorage.getItem('evsbs_station_query');
  if (savedQuery) {
    try {
      const q = JSON.parse(savedQuery);
      if (searchForm.elements['city']) searchForm.elements['city'].value = q.city || '';
      if (searchForm.elements['name']) searchForm.elements['name'].value = q.name || '';
      performSearch(q);
    } catch {
      performSearch({ city: '', name: '' });
    }
  } else {
    performSearch({ city: '', name: '' });
  }
});

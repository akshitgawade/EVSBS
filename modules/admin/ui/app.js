'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const authErrorEl = document.getElementById('auth-error');
  const controlsEl = document.getElementById('controls');

  // Verify Admin Session
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const meJson = await meRes.json();
    if (!meRes.ok || !meJson.data || meJson.data.role !== 'ADMIN') {
      authErrorEl.hidden = false;
      return;
    }
    controlsEl.hidden = false;
  } catch (err) {
    authErrorEl.hidden = false;
    return;
  }

  // Admin API Helper
  async function api(path, method = 'GET', body = null) {
    const opts = { method, credentials: 'same-origin' };
    if (body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const res = await fetch('/api/admin/' + path, opts);
    const json = await res.json();
    if (!res.ok) {
      throw new Error((json.error && json.error.message) || 'Operation failed.');
    }
    return json.data;
  }


  // ----------------------------------------------------
  // SECTION 1: STATIONS MANAGEMENT
  // ----------------------------------------------------
  const stationForm = document.getElementById('station');
  const stationFormTitle = document.getElementById('station-form-title');
  const stationFeedback = document.getElementById('station-feedback');
  const saveStationBtn = document.getElementById('save-station-btn');
  const cancelStationEditBtn = document.getElementById('cancel-station-edit-btn');
  const stationsTbody = document.getElementById('stations-tbody');
  const slotStationSelect = document.getElementById('slot-station-id');

  let allStations = [];

  async function loadStations() {
    stationsTbody.innerHTML = '<tr><td colspan="5" class="text-muted">Loading stations...</td></tr>';
    try {
      allStations = await api('stations');
      renderStationsTable();
      populateStationDropdown();
    } catch (err) {
      stationsTbody.innerHTML = `<tr><td colspan="5" class="msg-error">${err.message}</td></tr>`;
    }
  }

  function renderStationsTable() {
    stationsTbody.replaceChildren();
    if (!allStations.length) {
      stationsTbody.innerHTML = '<tr><td colspan="5" class="text-muted">No stations created yet.</td></tr>';
      return;
    }

    for (const st of allStations) {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.innerHTML = `<strong>${st.name}</strong><br><span class="help-text">${st.address}</span>`;
      tr.appendChild(tdName);

      const tdCity = document.createElement('td');
      tdCity.textContent = st.city;
      tr.appendChild(tdCity);

      const tdHours = document.createElement('td');
      tdHours.textContent = `${st.openingTime} - ${st.closingTime}`;
      tr.appendChild(tdHours);

      const tdStatus = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge badge-${st.status.toLowerCase()}`;
      badge.textContent = st.status;
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      const tdAction = document.createElement('td');
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => editStation(st);
      tdAction.appendChild(editBtn);
      tr.appendChild(tdAction);

      stationsTbody.appendChild(tr);
    }
  }

  function populateStationDropdown() {
    const curVal = slotStationSelect.value;
    slotStationSelect.replaceChildren();

    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = '-- Select a station --';
    slotStationSelect.appendChild(defOpt);

    for (const st of allStations) {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.textContent = `${st.name} (${st.city})`;
      slotStationSelect.appendChild(opt);
    }
    if (curVal) slotStationSelect.value = curVal;
  }

  function editStation(st) {
    stationFormTitle.textContent = `Edit Station: ${st.name}`;
    document.getElementById('station-id').value = st.id;
    document.getElementById('station-name').value = st.name;
    document.getElementById('station-city').value = st.city;
    document.getElementById('station-address').value = st.address;
    document.getElementById('station-state').value = st.state;
    document.getElementById('station-postal').value = st.postalCode;
    document.getElementById('station-opening').value = st.openingTime;
    document.getElementById('station-closing').value = st.closingTime;
    document.getElementById('station-status').value = st.status;

    saveStationBtn.textContent = 'Update Station';
    cancelStationEditBtn.hidden = false;
    stationForm.scrollIntoView({ behavior: 'smooth' });
  }

  function resetStationForm() {
    stationForm.reset();
    document.getElementById('station-id').value = '';
    document.getElementById('station-opening').value = '06:00';
    document.getElementById('station-closing').value = '23:00';
    stationFormTitle.textContent = 'Add New Station';
    saveStationBtn.textContent = 'Save Station';
    cancelStationEditBtn.hidden = true;
    stationFeedback.replaceChildren();
  }

  cancelStationEditBtn.onclick = resetStationForm;

  stationForm.onsubmit = async (e) => {
    e.preventDefault();
    stationFeedback.replaceChildren();

    const fd = new FormData(stationForm);
    const payload = Object.fromEntries(fd);
    const id = payload.id;
    delete payload.id;
    payload.timeZone = 'Asia/Kolkata';

    saveStationBtn.disabled = true;
    try {
      const path = id ? `stations/${encodeURIComponent(id)}` : 'stations';
      const method = id ? 'PATCH' : 'POST';
      const res = await api(path, method, payload);

      stationFeedback.innerHTML = `<div class="msg msg-success">Station "${res.name}" saved successfully.</div>`;
      resetStationForm();
      await loadStations();
    } catch (err) {
      stationFeedback.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    } finally {
      saveStationBtn.disabled = false;
    }
  };

  // ----------------------------------------------------
  // SECTION 2: CHARGERS MANAGEMENT
  // ----------------------------------------------------
  const slotForm = document.getElementById('slot');
  const slotFormTitle = document.getElementById('slot-form-title');
  const slotFeedback = document.getElementById('slot-feedback');
  const saveSlotBtn = document.getElementById('save-slot-btn');
  const cancelSlotEditBtn = document.getElementById('cancel-slot-edit-btn');
  const slotsTbody = document.getElementById('slots-tbody');

  let currentStationSlots = [];

  async function loadStationSlots(stationId) {
    if (!stationId) {
      slotsTbody.innerHTML = '<tr><td colspan="6" class="text-muted">Select a station above to view its chargers.</td></tr>';
      return;
    }

    slotsTbody.innerHTML = '<tr><td colspan="6" class="text-muted">Loading chargers for station...</td></tr>';
    try {
      // Use stations route to get slot details
      const res = await fetch('/api/stations/' + stationId, { credentials: 'same-origin' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error.message);

      currentStationSlots = json.data.slots || [];
      renderSlotsTable();
    } catch (err) {
      slotsTbody.innerHTML = `<tr><td colspan="6" class="msg-error">${err.message}</td></tr>`;
    }
  }

  function renderSlotsTable() {
    slotsTbody.replaceChildren();
    if (!currentStationSlots.length) {
      slotsTbody.innerHTML = '<tr><td colspan="6" class="text-muted">No chargers configured for this station yet.</td></tr>';
      return;
    }

    for (const slot of currentStationSlots) {
      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.innerHTML = `<strong>Charger ${slot.slotNumber}</strong>`;
      tr.appendChild(tdNum);

      const tdType = document.createElement('td');
      tdType.textContent = slot.connectorType;
      tr.appendChild(tdType);

      const tdPower = document.createElement('td');
      tdPower.textContent = `${slot.maxPowerKw} kW`;
      tr.appendChild(tdPower);

      const tdRate = document.createElement('td');
      tdRate.textContent = `₹${window.EVSBS.formatRupees(slot.hourlyRatePaise)}/hr`;
      tr.appendChild(tdRate);

      const tdStatus = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge badge-${slot.status.toLowerCase()}`;
      badge.textContent = slot.status;
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      const tdAction = document.createElement('td');
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => editSlot(slot);
      tdAction.appendChild(editBtn);
      tr.appendChild(tdAction);

      slotsTbody.appendChild(tr);
    }
  }

  slotStationSelect.onchange = () => {
    resetSlotForm();
    loadStationSlots(slotStationSelect.value);
  };

  function editSlot(slot) {
    slotFormTitle.textContent = `Edit Charger ${slot.slotNumber}`;
    document.getElementById('slot-id').value = slot.id;
    document.getElementById('slot-number').value = slot.slotNumber;
    document.getElementById('slot-connector').value = slot.connectorType;
    document.getElementById('slot-power').value = slot.maxPowerKw;
    document.getElementById('slot-price').value = (slot.hourlyRatePaise / 100).toFixed(2);
    document.getElementById('slot-status').value = slot.status;

    saveSlotBtn.textContent = 'Update Charger';
    cancelSlotEditBtn.hidden = false;
    slotForm.scrollIntoView({ behavior: 'smooth' });
  }

  function resetSlotForm() {
    const stationId = slotStationSelect.value;
    slotForm.reset();
    slotStationSelect.value = stationId;
    document.getElementById('slot-id').value = '';
    slotFormTitle.textContent = 'Add Charger to Station';
    saveSlotBtn.textContent = 'Save Charger';
    cancelSlotEditBtn.hidden = true;
    slotFeedback.replaceChildren();
  }

  cancelSlotEditBtn.onclick = resetSlotForm;

  slotForm.onsubmit = async (e) => {
    e.preventDefault();
    slotFeedback.replaceChildren();

    const stationId = slotStationSelect.value;
    if (!stationId) {
      slotFeedback.innerHTML = '<div class="msg msg-error">Please select a target station first.</div>';
      return;
    }

    const slotId = document.getElementById('slot-id').value;
    const slotNumber = Number(document.getElementById('slot-number').value);
    const connectorType = document.getElementById('slot-connector').value;
    const maxPowerKw = Number(document.getElementById('slot-power').value);
    const priceRupees = Number(document.getElementById('slot-price').value);
    const status = document.getElementById('slot-status').value;

    const payload = {
      slotNumber,
      connectorType,
      maxPowerKw,
      hourlyRatePaise: Math.round(priceRupees * 100),
      status
    };

    saveSlotBtn.disabled = true;
    try {
      const path = slotId ? `slots/${encodeURIComponent(slotId)}` : `stations/${encodeURIComponent(stationId)}/slots`;
      const method = slotId ? 'PATCH' : 'POST';
      const res = await api(path, method, payload);

      slotFeedback.innerHTML = `<div class="msg msg-success">Charger ${res.slotNumber} saved successfully.</div>`;
      resetSlotForm();
      await loadStationSlots(stationId);
    } catch (err) {
      slotFeedback.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    } finally {
      saveSlotBtn.disabled = false;
    }
  };

  // ----------------------------------------------------
  // SECTION 3: REPORTS & RECORDS
  // ----------------------------------------------------
  const viewForm = document.getElementById('view');
  const reportStatus = document.getElementById('report-status');
  const reportOutput = document.getElementById('output');
  const loadReportBtn = document.getElementById('load-report-btn');

  viewForm.onsubmit = async (e) => {
    e.preventDefault();
    reportStatus.replaceChildren();
    reportOutput.innerHTML = '<p class="text-muted">Generating report data...</p>';
    loadReportBtn.disabled = true;

    const fd = new FormData(viewForm);
    const route = fd.get('route');
    const query = new URLSearchParams();
    if (fd.get('from')) query.set('from', fd.get('from'));
    if (fd.get('to')) query.set('to', fd.get('to'));

    try {
      const rows = await api(route + '?' + query.toString());
      renderReportTable(route, rows);
    } catch (err) {
      reportOutput.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    } finally {
      loadReportBtn.disabled = false;
    }
  };

  function renderReportTable(route, rows) {
    reportOutput.replaceChildren();
    if (!rows || !rows.length) {
      reportOutput.innerHTML = '<p class="text-muted">No records found matching the specified dates.</p>';
      return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);

    const trHead = document.createElement('tr');

    if (route === 'reports/stations') {
      ['Station Name', 'Total', 'Confirmed', 'Completed', 'Cancelled', 'Gross (₹)', 'Refunded (₹)', 'Net (₹)'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      for (const r of rows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.stationName}</strong></td>
          <td>${r.totalBookings}</td>
          <td>${r.confirmedBookings}</td>
          <td>${r.completedBookings}</td>
          <td>${r.cancelledBookings}</td>
          <td>₹${window.EVSBS.formatRupees(r.grossRevenuePaise)}</td>
          <td>₹${window.EVSBS.formatRupees(r.refundedPaise)}</td>
          <td><strong>₹${window.EVSBS.formatRupees(r.netRevenuePaise)}</strong></td>
        `;
        tbody.appendChild(tr);
      }
    } else if (route === 'bookings') {
      ['Booking ID', 'Station', 'Start Time (IST)', 'Status', 'Amount (₹)'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      for (const r of rows) {
        const tr = document.createElement('tr');
        const stName = r.station ? r.station.name : 'Station';
        const startIST = window.EVSBS.formatIST(r.startTime);
        const amt = window.EVSBS.formatRupees(r.amountPaise);
        tr.innerHTML = `
          <td><span class="help-text">${r.id}</span></td>
          <td>${stName}</td>
          <td>${startIST}</td>
          <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
          <td>₹${amt}</td>
        `;
        tbody.appendChild(tr);
      }
    } else if (route === 'payments') {
      ['Payment ID', 'Reference', 'Amount (₹)', 'Status', 'Date (IST)'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      for (const r of rows) {
        const tr = document.createElement('tr');
        const dateIST = window.EVSBS.formatIST(r.createdAt);
        const amt = window.EVSBS.formatRupees(r.amountPaise);
        tr.innerHTML = `
          <td><span class="help-text">${r.id}</span></td>
          <td><strong>${r.transactionReference}</strong></td>
          <td>₹${amt}</td>
          <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
          <td>${dateIST}</td>
        `;
        tbody.appendChild(tr);
      }
    } else {
      // All Stations
      ['Station Name', 'City', 'Hours', 'Status'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      for (const r of rows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.name}</strong><br><span class="help-text">${r.address}</span></td>
          <td>${r.city}</td>
          <td>${r.openingTime} - ${r.closingTime}</td>
          <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
        `;
        tbody.appendChild(tr);
      }
    }

    reportOutput.appendChild(table);
  }

  // Initial load
  loadStations();
});

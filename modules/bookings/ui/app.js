'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('book');
  const bookBtn = document.getElementById('book-btn');
  const bookingMsg = document.getElementById('booking-message');
  const summaryEl = document.getElementById('selection-summary');
  const historyEl = document.getElementById('history');
  const historyStatus = document.getElementById('history-status');
  const refreshBtn = document.getElementById('refresh');

  const slotIdInput = document.getElementById('slotId');
  const startTimeInput = document.getElementById('start-time');

  async function api(path, method = 'GET', body = null) {
    const opts = {
      method,
      credentials: 'same-origin'
    };
    if (body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const res = await fetch('/api/bookings' + path, opts);
    const json = await res.json();
    if (!res.ok) {
      throw new Error((json.error && json.error.message) || 'Booking request failed.');
    }
    return json.data;
  }

  // Parse URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const slotId = urlParams.get('slotId');
  const start = urlParams.get('start');
  const slotNumber = urlParams.get('slotNumber');
  const stationName = urlParams.get('stationName');

  if (slotId) {
    slotIdInput.value = slotId;
    if (start) startTimeInput.value = start;

    summaryEl.className = 'msg msg-info';
    summaryEl.innerHTML = `<strong>Selected Charger:</strong> Charger ${slotNumber ? slotNumber : ''} at <em>${stationName ? decodeURIComponent(stationName) : 'Charging Station'}</em>`;
  } else {
    summaryEl.className = 'msg msg-warning';
    summaryEl.innerHTML = `No charger selected yet. Please select an available charger from the <a href="/modules/stations/">Find Chargers</a> page.`;
    bookBtn.disabled = true;
  }

  // Handle Booking Creation
  form.onsubmit = async (e) => {
    e.preventDefault();
    bookingMsg.replaceChildren();

    if (!slotIdInput.value) {
      bookingMsg.innerHTML = '<div class="msg msg-error">No charger selected. Please pick a charger first.</div>';
      return;
    }

    bookBtn.disabled = true;
    bookBtn.textContent = 'Processing booking & mock payment...';

    const payload = {
      slotId: slotIdInput.value,
      start: startTimeInput.value
    };

    try {
      const booking = await api('/', 'POST', payload);
      const paidRupees = window.EVSBS.formatRupees(booking.payment ? booking.payment.amountPaise : booking.ratePerHourPaise);
      const ref = booking.payment ? booking.payment.transactionReference : 'SIMULATED';

      bookingMsg.innerHTML = `<div class="msg msg-success">
        <strong>Booking Confirmed!</strong> Mock payment of ₹${paidRupees} processed successfully.<br>
        <span class="help-text">Transaction reference: ${ref}</span>
      </div>`;

      await loadHistory();
    } catch (err) {
      bookingMsg.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    } finally {
      bookBtn.disabled = false;
      bookBtn.textContent = 'Confirm Reservation & Mock Pay';
    }
  };

  // Load and Render History
  async function loadHistory() {
    historyEl.replaceChildren();
    try {
      const list = await api('/my');
      if (!list || !list.length) {
        historyEl.innerHTML = '<p class="text-muted">You have no booking reservations yet.</p>';
        return;
      }

      for (const b of list) {
        const item = document.createElement('article');
        item.className = `booking-item status-${b.status.toLowerCase()}`;

        // Header
        const header = document.createElement('div');
        header.className = 'booking-header';

        const h3 = document.createElement('h3');
        h3.textContent = b.station ? b.station.name : 'EV Station';
        header.appendChild(h3);

        const badge = document.createElement('span');
        badge.className = `badge badge-${b.status.toLowerCase()}`;
        badge.textContent = b.status;
        header.appendChild(badge);
        item.appendChild(header);

        // Details
        const details = document.createElement('div');
        details.className = 'booking-details';

        const slotInfo = b.slot ? `Charger ${b.slot.slotNumber} (${b.slot.connectorType})` : 'Charger';
        const formattedTime = window.EVSBS.formatIST(b.startTime);
        const amount = window.EVSBS.formatRupees(b.amountPaise);
        const payStatus = b.paymentStatus || 'PAID';

        details.innerHTML = `
          <div><strong>Charger:</strong> ${slotInfo}</div>
          <div><strong>Scheduled Time:</strong> ${formattedTime} (1 hour)</div>
          <div><strong>Amount:</strong> ₹${amount} · <span class="badge badge-${payStatus.toLowerCase()}">${payStatus}</span></div>
        `;
        item.appendChild(details);

        // Inline Cancel Confirmation (for upcoming confirmed bookings)
        const isUpcoming = Date.parse(b.startTime) > Date.now();
        if (b.status === 'CONFIRMED' && isUpcoming) {
          const actionBox = document.createElement('div');

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn btn-secondary btn-sm';
          cancelBtn.textContent = 'Cancel Booking';

          const confirmBox = document.createElement('div');
          confirmBox.className = 'inline-confirm';
          confirmBox.hidden = true;

          confirmBox.innerHTML = `
            <p>Are you sure you want to cancel this booking? The full amount of ₹${amount} will be refunded.</p>
            <div class="flex-row">
              <button type="button" class="btn btn-danger btn-sm do-confirm-btn">Yes, Cancel & Refund</button>
              <button type="button" class="btn btn-secondary btn-sm do-abort-btn">Keep Booking</button>
            </div>
            <div class="cancel-status" style="margin-top: 6px;"></div>
          `;

          cancelBtn.onclick = () => {
            confirmBox.hidden = false;
            cancelBtn.hidden = true;
          };

          const abortBtn = confirmBox.querySelector('.do-abort-btn');
          abortBtn.onclick = () => {
            confirmBox.hidden = true;
            cancelBtn.hidden = false;
          };

          const doConfirmBtn = confirmBox.querySelector('.do-confirm-btn');
          const cancelStatus = confirmBox.querySelector('.cancel-status');

          doConfirmBtn.onclick = async () => {
            doConfirmBtn.disabled = true;
            abortBtn.disabled = true;
            cancelStatus.textContent = 'Processing cancellation and refund...';

            try {
              await api(`/${b.id}/cancel`, 'POST', {});
              cancelStatus.innerHTML = '<span class="badge badge-refunded">Cancelled and refunded successfully.</span>';
              setTimeout(() => loadHistory(), 800);
            } catch (err) {
              cancelStatus.innerHTML = `<span class="badge badge-unavailable">${err.message}</span>`;
              doConfirmBtn.disabled = false;
              abortBtn.disabled = false;
            }
          };

          actionBox.appendChild(cancelBtn);
          actionBox.appendChild(confirmBox);
          item.appendChild(actionBox);
        }

        historyEl.appendChild(item);
      }
    } catch (err) {
      historyEl.innerHTML = `<div class="msg msg-error">${err.message}</div>`;
    }
  }

  refreshBtn.onclick = loadHistory;
  loadHistory();
});

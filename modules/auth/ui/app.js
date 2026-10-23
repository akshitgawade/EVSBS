'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('panel-login');
  const panelRegister = document.getElementById('panel-register');

  const formLogin = document.getElementById('login');
  const formRegister = document.getElementById('register');
  const loginMsg = document.getElementById('login-message');
  const registerMsg = document.getElementById('register-message');
  const sessionBox = document.getElementById('session-box');
  const sessionUser = document.getElementById('session-user');
  const logoutBtn = document.getElementById('logout');

  // Tab switching
  function showTab(tab) {
    if (tab === 'register') {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      panelRegister.hidden = false;
      panelLogin.hidden = true;
    } else {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      panelLogin.hidden = false;
      panelRegister.hidden = true;
    }
  }

  tabLogin.onclick = () => showTab('login');
  tabRegister.onclick = () => showTab('register');

  // Check existing session
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        sessionUser.textContent = `${data.data.firstName} ${data.data.lastName} (${data.data.role})`;
        sessionBox.hidden = false;
      }
    }
  } catch (err) {
    console.warn('Session check failed', err);
  }

  // Handle Login
  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    loginMsg.replaceChildren();
    const submitBtn = document.getElementById('login-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const payload = Object.fromEntries(new FormData(formLogin));
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error((body.error && body.error.message) || 'Login failed. Please check your credentials.');
      }

      const user = body.data.user;
      // Requirement: successful customer redirects to /modules/stations/, admin to /modules/admin/
      if (user.role === 'ADMIN') {
        window.location.href = '/modules/admin/';
      } else {
        window.location.href = '/modules/stations/';
      }
    } catch (err) {
      const alert = document.createElement('div');
      alert.className = 'msg msg-error';
      alert.textContent = err.message;
      loginMsg.appendChild(alert);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  };

  // Handle Register
  formRegister.onsubmit = async (e) => {
    e.preventDefault();
    registerMsg.replaceChildren();
    const submitBtn = document.getElementById('register-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const payload = Object.fromEntries(new FormData(formRegister));
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error((body.error && body.error.message) || 'Registration failed.');
      }

      // Switch to login tab and prefill email
      showTab('login');
      formLogin.elements['email'].value = payload.email || '';
      formLogin.elements['password'].value = '';

      const alert = document.createElement('div');
      alert.className = 'msg msg-success';
      alert.textContent = 'Account created successfully! Please sign in with your credentials.';
      loginMsg.replaceChildren(alert);

      formRegister.reset();
    } catch (err) {
      const alert = document.createElement('div');
      alert.className = 'msg msg-error';
      alert.textContent = err.message;
      registerMsg.appendChild(alert);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  };

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: '{}'
        });
      } catch (err) {
        console.warn('Logout error', err);
      }
      window.location.reload();
    };
  }
});

/**
 * Boody & Yaroo Wedding Invitation
 * Production-Grade Single Page Application
 */

// ==========================================================================
// 1. EVENT CONFIGURATION (Single Source of Truth)
// ==========================================================================

export const EVENT_CONFIG = {
  type: 'wedding',

  couple: {
    partner1: 'Boody',
    partner2: 'Yaroo',
    combinedName: 'Boody&Yaroo',
    monogram: 'B&Y',
  },

  locale: 'ar-EG',
  direction: 'rtl',
  eventDateIso: '2026-11-11T19:30:00+02:00',
  dateFormatted: 'الأربعاء، 11 نوفمبر 2026',
  eventTime: '7:30 مساءً',

  venue: {
    title: 'قاعة ريونا',
    name: 'قاعة ريونا في دكرنس',
    address: 'مدينة دكرنس، مركز دكرنس، محافظة الدقهلية 7820222',
    time: '7:30 مساءً',
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent('قاعة ريونا، مدينة دكرنس، مركز دكرنس، محافظة الدقهلية 7820222'),
  },

  media: {
    overlayMobile: 'assets/imgs/overlaybgmobile.webp',
    overlayDesktop: 'assets/imgs/overlaybglap.webp',
    envelope: 'assets/imgs/envelope.webp',
    coupleHero: 'assets/imgs/BY.webp',
    backgroundMusic: 'assets/audio/music.mp3',
  },

  firebase: {
    apiKey: atob('QUl6YVN5QjlWTER2ZE9qR2tzdk1zanljVXNram9PSExTOGRHd29v'),
    authDomain: 'boody-yaroo.firebaseapp.com',
    projectId: 'boody-yaroo',
    storageBucket: 'boody-yaroo.firebasestorage.app',
    messagingSenderId: '242379966536',
    appId: '1:242379966536:web:6dff8387fe746626e7707d',
    measurementId: 'G-5GKP9HE4J3',
    collectionName: 'boody_yaroo_wedding_wishes',
  },

  limits: {
    name: 80,
    message: 1000,
    submitCooldownMs: 15000,
    wishesToRender: 100,
  },

  developer: {
    label: 'designed and developed by Arsany Ramy',
    portfolioUrl: 'https://arsanyramy37.github.io/portfolio/',
  },
};

// ==========================================================================
// 2. Firebase Modular SDK Initialization
// ==========================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

let app = null;
let db = null;
let wishesRef = null;

try {
  app = initializeApp(EVENT_CONFIG.firebase);
  db = getFirestore(app);
  wishesRef = collection(db, EVENT_CONFIG.firebase.collectionName);
} catch (initErr) {
  console.error('Firebase initialization error:', initErr);
}

// ==========================================================================
// 3. Audio Controller
// ==========================================================================

export class AudioController {
  constructor(audioSrc) {
    this.audio = new Audio(audioSrc);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.isPlaying = false;

    // Listen to native audio events to keep UI in sync
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updateUI(true);
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateUI(false);
    });
  }

  play() {
    return this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.updateUI(true);
      })
      .catch((error) => {
        console.warn('Audio playback was blocked or deferred:', error);
        this.isPlaying = false;
        this.updateUI(false);
      });
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.updateUI(false);
  }

  toggle() {
    return this.isPlaying ? this.pause() : this.play();
  }

  updateUI(playing) {
    const button = document.getElementById('music-toggle-btn');
    if (!button) return;

    button.classList.toggle('is-playing', playing);
    button.classList.toggle('is-paused', !playing);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute(
      'aria-label',
      playing ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'
    );
  }
}

export const audioController = new AudioController(
  EVENT_CONFIG.media.backgroundMusic
);

// ==========================================================================
// 4. Live Countdown Logic
// ==========================================================================

export function initCountdown(targetIso, onTick, onExpired) {
  const targetDate = new Date(targetIso).getTime();

  if (!Number.isFinite(targetDate)) {
    console.error('Invalid countdown target date:', targetIso);
    return () => {};
  }

  let intervalId;

  function update() {
    const distance = targetDate - Date.now();

    if (distance <= 0) {
      onExpired();
      if (intervalId) clearInterval(intervalId);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor(
      (distance % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    onTick({
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    });
  }

  update();
  intervalId = window.setInterval(update, 1000);

  return () => window.clearInterval(intervalId);
}

// ==========================================================================
// 5. Firebase Firestore Wishes Operations
// ==========================================================================

export function subscribeToWishes(onWishesUpdated, onError) {
  if (!wishesRef) {
    onError?.(new Error('Firebase is not initialized'));
    return () => {};
  }

  const q = query(
    wishesRef,
    orderBy('createdAt', 'desc'),
    limit(EVENT_CONFIG.limits.wishesToRender)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const wishes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onWishesUpdated(wishes);
    },
    (error) => {
      console.error('Could not load guest wishes:', error);
      onError?.(error);
    }
  );
}

export async function submitWish(name, message) {
  if (!wishesRef) {
    throw new Error('خدمة إرسال التهاني غير متاحة حالياً.');
  }

  const cleanName = String(name)
    .trim()
    .slice(0, EVENT_CONFIG.limits.name);

  const cleanMessage = String(message)
    .trim()
    .slice(0, EVENT_CONFIG.limits.message);

  if (!cleanName || !cleanMessage) {
    throw new Error('من فضلك اكتب اسمك والتهنئة.');
  }

  const storageKey = 'boody_yaroo_wedding_last_wish_time';
  let lastSubmit = null;

  try {
    lastSubmit = sessionStorage.getItem(storageKey);
  } catch (storageErr) {
    console.warn('SessionStorage access failed:', storageErr);
  }

  const now = Date.now();

  if (
    lastSubmit &&
    now - Number(lastSubmit) < EVENT_CONFIG.limits.submitCooldownMs
  ) {
    throw new Error('من فضلك انتظر قليلًا قبل إرسال تهنئة أخرى.');
  }

  await addDoc(wishesRef, {
    name: cleanName,
    message: cleanMessage,
    createdAt: serverTimestamp(),
  });

  try {
    sessionStorage.setItem(storageKey, String(now));
  } catch (storageErr) {
    // Ignore storage quota/access errors
  }
}

// ==========================================================================
// 6. Application DOM Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Intro Overlay Interaction ---
  const overlay = document.getElementById('intro-overlay');
  let isOpening = false;

  const envelopeImg   = overlay ? overlay.querySelector('.intro-envelope') : null;
  const namesAbove    = overlay ? overlay.querySelector('.intro-names-above') : null;
  const textGroup     = overlay ? overlay.querySelector('.intro-text-group') : null;
  const openedImgSrc  = 'assets/imgs/opened.webp';

  function openInvitation() {
    if (isOpening) return;
    isOpening = true;

    // Block all touch/click interaction during the sequence
    overlay.style.pointerEvents = 'none';
    overlay.style.touchAction   = 'none';

    // Direct user gesture to start audio
    audioController.play();

    if (!overlay) return;

    // --- Step 1: swap envelope → opened with a cross-fade ---
    if (envelopeImg) {
      // Fade out closed envelope
      envelopeImg.style.transition = 'opacity 350ms ease';
      envelopeImg.style.opacity    = '0';

      setTimeout(() => {
        // Hide names and tagline when opened envelope shows
        if (namesAbove) namesAbove.classList.add('is-hidden-for-open');
        if (textGroup)  textGroup.classList.add('is-hidden-for-open');

        envelopeImg.src             = openedImgSrc;
        envelopeImg.alt             = 'ظرف مفتوح';
        envelopeImg.style.opacity   = '0';

        // Tiny frame to allow browser to update src before fading in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            envelopeImg.style.opacity = '1';
          });
        });
      }, 380);
    }

    // --- Step 2: after 3 s, fade the whole overlay out ---
    const dismissAfter = 3000; // ms to show the opened envelope

    const finishOpening = () => {
      overlay.classList.add('is-hidden');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.add('invitation-open');
      // Re-enable scroll & touch now that overlay is gone
      document.body.style.pointerEvents = '';
      document.body.style.touchAction   = '';
      overlay.removeEventListener('transitionend', onTransitionEnd);
    };

    const onTransitionEnd = (event) => {
      if (event.target === overlay && event.propertyName === 'opacity') {
        finishOpening();
      }
    };

    setTimeout(() => {
      overlay.classList.add('is-opening'); // triggers opacity → 0 CSS transition
      overlay.addEventListener('transitionend', onTransitionEnd);
      window.setTimeout(finishOpening, 800); // reliable fallback
    }, dismissAfter);
  }

  if (overlay) {
    overlay.addEventListener('click', openInvitation);
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openInvitation();
      }
    });
  }

  // --- Music Toggle Button ---
  const musicBtn = document.getElementById('music-toggle-btn');
  if (musicBtn) {
    musicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audioController.toggle();
    });
  }

  // --- Mobile Navigation Menu ---
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
      navMenu.classList.toggle('is-active', !isExpanded);
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-active');
      }
    });
  }

  // --- Countdown Initialization ---
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');
  const timerGrid = document.getElementById('countdown-timer');
  const expiredMsg = document.getElementById('countdown-expired');

  initCountdown(
    EVENT_CONFIG.eventDateIso,
    ({ days, hours, minutes, seconds }) => {
      if (daysEl) daysEl.textContent = days;
      if (hoursEl) hoursEl.textContent = hours;
      if (minutesEl) minutesEl.textContent = minutes;
      if (secondsEl) secondsEl.textContent = seconds;
    },
    () => {
      if (timerGrid) timerGrid.style.display = 'none';
      if (expiredMsg) expiredMsg.style.display = 'block';
    }
  );

  // --- Send Wish Form Handling ---
  const wishForm = document.getElementById('wish-form');
  const wishNameInput = document.getElementById('wish-name');
  const wishMessageInput = document.getElementById('wish-message');
  const charCounter = document.getElementById('char-counter');
  const formStatus = document.getElementById('form-status');
  const submitBtn = document.getElementById('wish-submit-btn');

  if (wishMessageInput && charCounter) {
    wishMessageInput.addEventListener('input', () => {
      const currentLength = wishMessageInput.value.length;
      charCounter.textContent = `${currentLength} / ${EVENT_CONFIG.limits.message}`;
    });
  }

  function setFormStatus(message, type = 'info') {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = 'form-status';
    if (type === 'success') {
      formStatus.classList.add('is-success');
    } else if (type === 'error') {
      formStatus.classList.add('is-error');
    }
  }

  function clearFormStatus() {
    if (!formStatus) return;
    formStatus.textContent = '';
    formStatus.className = 'form-status';
  }

  if (wishForm) {
    wishForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormStatus();

      const name = wishNameInput?.value || '';
      const message = wishMessageInput?.value || '';

      if (!name.trim()) {
        setFormStatus('من فضلك اكتب اسمك الكريم.', 'error');
        wishNameInput?.focus();
        return;
      }

      if (!message.trim()) {
        setFormStatus('من فضلك اكتب رسالة التهنئة.', 'error');
        wishMessageInput?.focus();
        return;
      }

      // Enter loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
      }

      try {
        await submitWish(name, message);

        setFormStatus('شكراً لتهنئتكم الجميلة! تم إرسال رسالتكم بنجاح.', 'success');
        if (wishNameInput) wishNameInput.value = '';
        if (wishMessageInput) wishMessageInput.value = '';
        if (charCounter) charCounter.textContent = `0 / ${EVENT_CONFIG.limits.message}`;

        setTimeout(() => {
          clearFormStatus();
        }, 6000);
      } catch (err) {
        setFormStatus(err.message || 'حدث خطأ أثناء إرسال التهنئة. يرجى المحاولة مرة أخرى.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
        }
      }
    });
  }

  // --- Real-time Guest Wishes Stream ---
  const wishesList = document.getElementById('wishes-list');
  const wishesEmpty = document.getElementById('wishes-empty');
  const wishesError = document.getElementById('wishes-error');
  const wishesScrollHint = document.getElementById('wishes-scroll-hint');
  const retryBtn = document.getElementById('wishes-retry-btn');

  let unsubscribeWishes = null;

  function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('ar-EG', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return '';
    }
  }

  function renderWishes(wishes) {
    if (!wishesList) return;

    if (wishesError) wishesError.style.display = 'none';

    if (!wishes || wishes.length === 0) {
      wishesList.innerHTML = '';
      if (wishesEmpty) wishesEmpty.style.display = 'block';
      if (wishesScrollHint) wishesScrollHint.style.display = 'none';
      return;
    }

    if (wishesEmpty) wishesEmpty.style.display = 'none';
    if (wishesScrollHint) wishesScrollHint.style.display = 'inline-flex';
    wishesList.innerHTML = '';

    const fragment = document.createDocumentFragment();

    wishes.forEach((wish) => {
      const card = document.createElement('div');
      card.className = 'wish-card';

      const header = document.createElement('div');
      header.className = 'wish-header';

      const author = document.createElement('span');
      author.className = 'wish-author';
      // Safe text rendering to prevent XSS
      author.textContent = wish.name || 'محب';

      header.appendChild(author);

      if (wish.createdAt) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'wish-date';
        dateSpan.textContent = formatDate(wish.createdAt);
        header.appendChild(dateSpan);
      }

      const msg = document.createElement('p');
      msg.className = 'wish-message';
      // Safe text rendering to prevent XSS
      msg.textContent = wish.message || '';

      card.appendChild(header);
      card.appendChild(msg);

      fragment.appendChild(card);
    });

    wishesList.appendChild(fragment);
  }

  function startWishesSubscription() {
    if (unsubscribeWishes) {
      unsubscribeWishes();
      unsubscribeWishes = null;
    }

    unsubscribeWishes = subscribeToWishes(
      (wishes) => {
        renderWishes(wishes);
      },
      (error) => {
        if (wishesList) wishesList.innerHTML = '';
        if (wishesEmpty) wishesEmpty.style.display = 'none';
        if (wishesScrollHint) wishesScrollHint.style.display = 'none';
        if (wishesError) wishesError.style.display = 'block';
      }
    );
  }

  startWishesSubscription();

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      if (wishesList) {
        wishesList.innerHTML = `
          <div class="wish-card skeleton-card" aria-hidden="true">
            <div class="skeleton-header"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        `;
      }
      if (wishesError) wishesError.style.display = 'none';
      startWishesSubscription();
    });
  }

  // --- Scroll Reveal Animations Observer (Scroll Up & Down) ---
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          } else {
            // Remove when leaving viewport so it re-triggers smoothly on scroll up/down
            entry.target.classList.remove('is-revealed');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.12,
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    revealElements.forEach((el) => el.classList.add('is-revealed'));
  }
});


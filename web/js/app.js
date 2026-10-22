// El Reto Viteba · flujo de la experiencia (bienvenida → registro → juego → premio → reinicio)

import { CONFIG } from './config.js';
import { COPY, LEGAL } from '../data/copy.js';
import { QUESTIONS, TOPICS } from '../data/questions.js';
import { createApi, createBackgroundQueue } from './api.js';
import { createSound } from './audio.js';
import { createConfetti } from './confetti.js';
import { pickQuestions, rememberUse } from './game.js';
import { checkEmail, checkPhone, PREFIXES } from './validate.js';
import { enter, leave, isReduced, watchFrames, onHold, wait } from './motion.js';
import { downloadParticipantsExcel } from './export.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const api = createApi(CONFIG);
const queue = createBackgroundQueue();
const sound = createSound();
const confetti = createConfetti($('#confetti'));

const screens = Object.fromEntries($$('.screen').map((el) => [el.dataset.screen, el]));
const steps = Object.fromEntries($$('.step').map((el) => [el.dataset.step, el]));
const el = {
  progress: $('#progress'), progressLabel: $('#progress-label'), progressBar: $('#progress-bar'),
  name: $('#name-input'), nameError: $('#name-error'), form: $('#reg-form'), input: $('#contact-input'), label: $('#contact-label'), prefix: $('#prefix'),
  chips: $('#domain-chips'), fieldError: $('#field-error'), consent: $('#consent'), consentText: $('#consent-text'),
  saveErrorText: $('#save-error-text'),
  countdown: $('#countdown'), countdownNumber: $('#countdown-number'),
  question: $('#question'), qTopic: $('#q-topic'), qText: $('#q-text'), qImg: $('#q-img'), timer: $('#timer'),
  feedback: $('#feedback'), feedbackBadge: $('#feedback-badge'), feedbackText: $('#feedback-text'),
  answers: $('#answers'), next: $('#next'), nextLabel: $('#next-label'),
  rewardScore: $('#reward-score'), rewardCode: $('#reward-code'),
  deliver: $('#deliver'), deliverLabel: $('#deliver-label'), deliverHint: $('#deliver-hint'),
  toast: $('#toast'), live: $('#live'),
  idleDialog: $('#idle-dialog'), idleSeconds: $('#idle-seconds'),
  privacyDialog: $('#privacy-dialog'), deliverErrorDialog: $('#deliver-error-dialog'),
  staffDialog: $('#staff-dialog'), staffStatus: $('#staff-status'),
};

// Estado en memoria. Nada del participante se escribe en el almacenamiento del navegador.
let screen = 'welcome';
let step = 'choose';
let busy = false;
let session = null;             // { id, code, questions, index, answers, score, locked }
let pendingRegistration = null; // datos a la espera de confirmación del servidor
let contactType = 'email';
let runId = 0;                  // invalida temporizadores de partidas anteriores
const timers = new Set();

function later(fn, ms) {
  const id = runId;
  const timer = setTimeout(() => {
    timers.delete(timer);
    if (id === runId) fn();
  }, ms);
  timers.add(timer);
  return timer;
}

const track = (type, meta) => queue.run(() => api.track(type, meta, session ? session.id : undefined));
const announce = (text) => { el.live.textContent = text; };

// ---------- textos ----------

function applyCopy() {
  for (const node of $$('[data-copy]')) {
    const value = node.dataset.copy.split('.').reduce((obj, key) => obj && obj[key], COPY);
    if (typeof value === 'string') node.textContent = value;
  }
  $('#welcome-facts').replaceChildren(...COPY.welcome.facts.map((fact) => {
    const li = document.createElement('li');
    li.textContent = fact;
    return li;
  }));
  el.deliverLabel.textContent = COPY.reward.deliver;
  el.deliverHint.textContent = COPY.reward.deliverHint;
  $('#prizes').setAttribute('aria-label', COPY.reward.productAlt);
  $('#prizes-ring').replaceChildren(...CONFIG.prizes.map((prize, i) => {
    const item = document.createElement('div');
    item.className = 'carousel__item';
    item.style.setProperty('--a', `${(360 / CONFIG.prizes.length) * i}deg`);
    const img = document.createElement('img');
    img.addEventListener('error', () => {
      if (prize.fallback && !img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = `assets/img/${prize.fallback}.webp`;
      }
    });
    img.src = `assets/img/${prize.img}.webp`;
    img.alt = '';
    img.decoding = 'async';
    item.append(img);
    return item;
  }));
  $('#privacy-title').textContent = LEGAL.privacyTitle;
  $('#privacy-close').textContent = LEGAL.privacyClose;
  $('#privacy-list').replaceChildren(...LEGAL.privacy.flatMap(([term, text]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = text;
    return [dt, dd];
  }));
  el.prefix.replaceChildren(...PREFIXES.map(([code, country]) => new Option(`${code} ${country}`, code)));
  el.prefix.setAttribute('aria-label', COPY.register.prefixLabel);
  el.chips.replaceChildren(...['@gmail.com', '@hotmail.com', '@yahoo.es', '@outlook.com'].map((domain) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.domain = domain;
    chip.textContent = domain;
    return chip;
  }));
  if (api.demo) {
    $('#demo-badge').textContent = COPY.demoBadge;
    $('#demo-badge').hidden = false;
  }
}

// ---------- navegación ----------

async function go(name, { force = false } = {}) {
  if (busy && !force) return false;
  busy = true;
  const from = screens[screen];
  const to = screens[name];
  if (from !== to) {
    watchFrames();
    await leave(from, 340);
    from.classList.remove('is-active');
  }
  screen = name;
  to.classList.add('is-active');
  enter(to);
  el.progress.hidden = name !== 'game';
  const heading = $('[tabindex="-1"]', to);
  if (heading) heading.focus({ preventScroll: true });
  busy = false;
  armIdle();
  return true;
}

async function setStep(name, { instant = false } = {}) {
  const from = steps[step];
  const to = steps[name];
  if (from !== to) {
    if (instant) from.hidden = true;
    else await leave(from, 260);
  }
  step = name;
  screens.register.dataset.step = name;
  $$(':scope > *', to).forEach((child, i) => child.style.setProperty('--i', i));
  enter(to, 700);
}

// ---------- 1 · bienvenida ----------

async function start() {
  if (busy || screen !== 'welcome') return;
  sound.unlock();
  sound.tap();
  runId++;
  resetForm();
  for (const s of Object.values(steps)) s.hidden = true;
  step = 'choose';
  screens.register.dataset.step = 'choose';
  steps.choose.hidden = false;
  $('#anonymous-link').hidden = !CONFIG.allowAnonymous;
  track('start');
  await go('register');
}

// ---------- 2 · registro ----------

function resetForm() {
  el.form.reset();
  el.input.value = '';
  el.name.value = '';
  el.nameError.textContent = '';
  el.name.removeAttribute('aria-invalid');
  $('#other-contact').open = false;
  el.prefix.value = '+34';
  el.consent.checked = false;
  showFieldError('');
}

function showFieldError(message) {
  el.fieldError.textContent = message;
  el.input.setAttribute('aria-invalid', message ? 'true' : 'false');
  const field = el.input.parentElement;
  field.classList.remove('is-invalid');
  if (message) {
    void field.offsetWidth; // reinicia la animación de aviso
    field.classList.add('is-invalid');
  }
}

function choose(type) {
  if (busy || !['choose', 'form'].includes(step)) return;
  sound.tap();
  contactType = type;
  const isEmail = type === 'email';
  const firstName = el.name.value;
  resetForm();
  el.name.value = firstName;
  $('#switch-contact').dataset.type = isEmail ? 'phone' : 'email';
  $('#switch-contact').textContent = isEmail ? 'Prefiero usar mi teléfono móvil' : 'Volver al correo electrónico';
  el.label.textContent = isEmail ? COPY.register.emailLabel : COPY.register.phoneLabel;
  el.input.type = isEmail ? 'email' : 'tel';
  el.input.inputMode = isEmail ? 'email' : 'tel';
  el.input.placeholder = isEmail ? COPY.register.emailPlaceholder : COPY.register.phonePlaceholder;
  el.input.maxLength = isEmail ? 254 : 20;
  el.prefix.hidden = isEmail;
  el.chips.hidden = !isEmail;
  el.consentText.textContent = LEGAL.consent[type];
  track(isEmail ? 'choose_email' : 'choose_phone');
  // Cambio inmediato para poder abrir el teclado dentro del mismo toque (requisito de iOS).
  setStep('form', { instant: true });
  el.input.focus({ preventScroll: true });
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function submitForm() {
  if (busy || step !== 'form') return;
  const firstName = el.name.value.trim().replace(/\s+/g, ' ');
  if (!firstName || !/^[\p{L}\p{M}][\p{L}\p{M} ’'·-]{0,39}$/u.test(firstName)) {
    el.nameError.textContent = 'Escribe tu nombre, sin apellidos.';
    el.name.setAttribute('aria-invalid', 'true');
    el.name.focus();
    return;
  }
  el.nameError.textContent = '';
  el.name.removeAttribute('aria-invalid');
  const result = contactType === 'email'
    ? checkEmail(el.input.value, COPY.errors)
    : checkPhone(el.input.value, el.prefix.value, COPY.errors);
  if (!result.ok) {
    showFieldError(result.message);
    el.input.focus({ preventScroll: true });
    return;
  }
  showFieldError('');
  el.input.blur();
  sound.tap();
  const consent = el.consent.checked;
  pendingRegistration = {
    id: newId(),
    firstName,
    contactType,
    contact: result.value,
    marketingConsent: consent,
    consentVersion: consent ? LEGAL.consentVersion : undefined,
    consentText: consent ? LEGAL.consent[contactType] : undefined,
    privacyVersion: LEGAL.privacyVersion,
    source: CONFIG.source,
  };
  sendRegistration();
}

function playAnonymous() {
  if (busy || step !== 'choose') return;
  sound.tap();
  pendingRegistration = { id: newId(), contactType: 'anonymous', marketingConsent: false, source: CONFIG.source };
  track('choose_anonymous');
  sendRegistration();
}

async function sendRegistration() {
  const run = runId;
  const payload = pendingRegistration;
  await setStep('saving');
  let result;
  try {
    // El mismo id en cada reintento: el servidor nunca crea dos registros para un envío.
    result = await api.register(payload);
  } catch (err) {
    if (run !== runId) return;
    queue.run(() => api.track('error', { where: 'register', kind: err.kind }));
    if (err.kind === 'invalid' && payload.contactType !== 'anonymous') {
      await setStep('form');
      showFieldError(payload.contactType === 'email' ? COPY.errors.emailBad : COPY.errors.phoneBad);
      return;
    }
    // Un error de sesión pública se puede reintentar sin pedir la clave del personal.
    el.saveErrorText.textContent = err.kind === 'busy' ? COPY.errors.busyText : COPY.errors.saveText;
    await setStep('error');
    $('#save-error-title').focus({ preventScroll: true });
    return;
  }
  if (run !== runId) return;

  const questions = pickQuestions(QUESTIONS, CONFIG.questionsPerGame);
  session = { id: result.id, code: result.code, firstName: payload.firstName || '', questions, index: 0, answers: [], score: 0, locked: false };
  const consented = payload.marketingConsent;
  pendingRegistration = null;
  resetForm(); // el contacto ya está en el servidor: se borra de la pantalla y de la memoria
  track('register_ok', { type: payload.contactType });
  if (consented) track('consent_yes');
  await setStep('ok');
  sound.correct();
  announce(COPY.register.ok);
  later(() => go('ready'), isReduced() ? 900 : 1500);
}

// ---------- 3 · preparación ----------

async function begin() {
  if (busy || screen !== 'ready' || !session || session.started) return;
  session.started = true;
  sound.tap();
  sound.startMusic();
  rememberUse(session.questions);
  queue.run(() => api.progress(session.id, { status: 'playing' }));
  track('game_start');
  if (CONFIG.countdown && !isReduced()) await countdown();
  renderQuestion(0);
  await go('game');
  enterQuestion();
}

function countdown() {
  const run = runId;
  return new Promise((resolve) => {
    let n = 3;
    let timer = null;
    const finish = async () => {
      clearTimeout(timer);
      el.countdown.removeEventListener('pointerdown', finish);
      resolve();
      // La cortina se retira cuando la pantalla de juego ya está debajo.
      await wait(380);
      el.countdown.hidden = true;
    };
    const tick = () => {
      if (run !== runId) return finish();
      if (n === 0) return finish();
      const span = document.createElement('span');
      span.textContent = n;
      el.countdown.replaceChildren(span);
      sound.tap();
      n--;
      timer = setTimeout(tick, 640);
    };
    el.countdown.hidden = false;
    el.countdown.addEventListener('pointerdown', finish);
    tick();
  });
}

// ---------- 4-6 · juego ----------

function renderProgress() {
  const total = session.questions.length;
  el.progressLabel.textContent = COPY.game.progress(Math.min(session.index + 1, total), total);
  el.progressBar.replaceChildren(...session.questions.map((_, i) => {
    const li = document.createElement('li');
    if (i < session.answers.length) li.className = 'is-done';
    else if (i === session.index) li.className = 'is-current';
    return li;
  }));
}

// Ajusta la letra al espacio disponible: las frases cortas crecen (hasta 1,5×) y las largas
// encogen lo justo para que nunca haya que desplazarse.
function fitQuestion() {
  if (screen !== 'game' || !session) return;
  const body = $('.question__body', el.question);
  el.question.classList.remove('needs-scroll');
  let fit = 1.5;
  el.question.style.setProperty('--fit', fit);
  const available = () => {
    const style = getComputedStyle(el.question);
    let height = el.question.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (style.flexDirection.startsWith('column') && !el.qImg.hidden) {
      height -= el.qImg.getBoundingClientRect().height + parseFloat(style.rowGap);
    }
    return height;
  };
  while (fit > 0.8 && (body.scrollHeight > available() + 1 || body.scrollWidth > body.clientWidth + 1)) {
    fit = Math.max(0.8, fit - 0.025);
    el.question.style.setProperty('--fit', fit);
  }
  // En móviles pequeños o con A+, conservar un tamaño legible y permitir leer todo.
  if (body.scrollHeight > available() + 1) el.question.classList.add('needs-scroll');
}

let questionTick = null;
function stopQuestionTick() {
  clearInterval(questionTick);
  questionTick = null;
}
function startQuestionTick() {
  stopQuestionTick();
  const end = performance.now() + CONFIG.timerSeconds * 1000;
  let previous = -1;
  questionTick = setInterval(() => {
    if (!session || session.locked || screen !== 'game') return stopQuestionTick();
    const remaining = Math.ceil((end - performance.now()) / 1000);
    if (remaining <= 0) return stopQuestionTick();
    if (remaining <= 5 && remaining !== previous && !document.hidden && !el.idleDialog.open) sound.clock(remaining);
    previous = remaining;
  }, 100);
}

function renderQuestion(index) {
  const q = session.questions[index];
  session.index = index;
  session.locked = false;
  el.qTopic.textContent = TOPICS[q.topic] || '';
  el.qText.textContent = q.text;
  el.qImg.hidden = !q.image;
  if (q.image) el.qImg.src = `assets/img/${q.image}.webp`;
  stopQuestionTick();
  el.question.classList.remove('is-answered', 'needs-scroll');
  el.feedback.hidden = true;
  el.answers.hidden = false;
  el.answers.classList.remove('is-locked');
  $$('.answer', el.answers).forEach((b) => b.classList.remove('is-chosen'));
  el.next.hidden = true;
  el.next.classList.remove('is-counting', 'is-waiting');
  el.timer.classList.remove('is-running', 'is-paused');
  renderProgress();
}

function enterQuestion() {
  el.question.hidden = false;
  fitQuestion();
  for (const node of [el.question, el.answers]) {
    node.classList.remove('is-entering');
    void node.offsetWidth;
    node.classList.add('is-entering');
  }
  later(() => {
    el.question.classList.remove('is-entering');
    el.answers.classList.remove('is-entering');
  }, 1100);
  el.timer.style.setProperty('--timer-s', `${CONFIG.timerSeconds}s`);
  void el.timer.getBoundingClientRect();
  el.timer.classList.add('is-running'); // decorativo: al llenarse no ocurre nada
  startQuestionTick();
  el.qText.focus({ preventScroll: true });
  announce(`${COPY.game.progress(session.index + 1, session.questions.length)}. ${el.qText.textContent}`);
}

async function answer(value, button) {
  if (!session || screen !== 'game' || session.locked || busy) return;
  stopQuestionTick();
  session.locked = true; // bloquea dobles pulsaciones
  const run = runId;
  const q = session.questions[session.index];
  const correct = value === q.answer;
  session.answers.push({ q: q.id, ok: correct });
  if (correct) session.score++;

  el.answers.classList.add('is-locked');
  button.classList.add('is-chosen');
  el.timer.classList.add('is-paused');
  if (correct) sound.correct(); else sound.wrong();
  track('answer', { q: q.id, ok: correct, n: session.index + 1 });

  await wait(isReduced() ? 0 : 520);
  if (run !== runId) return;
  await leave(el.answers, 300);
  if (run !== runId) return;

  el.question.classList.add('is-answered');
  el.feedback.dataset.result = correct ? 'correct' : 'wrong';
  el.feedbackBadge.textContent = correct ? COPY.game.correct : COPY.game.wrong;
  const truth = document.createElement('b');
  truth.textContent = `${COPY.game.truth(q.answer)}. `;
  el.feedbackText.replaceChildren(truth, q.explanation);
  el.feedback.hidden = false;
  fitQuestion();
  el.feedback.classList.remove('is-entering');
  void el.feedback.offsetWidth;
  el.feedback.classList.add('is-entering');
  renderProgress();
  if (correct && !isReduced()) confetti.fire({ small: true });

  const last = session.index === session.questions.length - 1;
  el.nextLabel.textContent = last ? COPY.game.finish : COPY.game.next;
  el.next.style.setProperty('--feedback-ms', `${CONFIG.feedbackMs}ms`);
  el.next.hidden = false;
  fitQuestion();
  const auto = CONFIG.feedbackMs > 0;
  el.next.classList.remove('is-entering', 'is-counting', 'is-waiting');
  void el.next.offsetWidth;
  el.next.classList.add('is-entering', auto ? 'is-counting' : 'is-waiting');
  announce(`${el.feedbackBadge.textContent} ${el.feedbackText.textContent}`);
  // Por defecto la persona lee sin prisa y avanza cuando pulsa SIGUIENTE.
  if (auto) session.autoNext = later(next, CONFIG.feedbackMs);
}

async function next() {
  if (!session || screen !== 'game' || !session.locked || session.advancing) return;
  session.advancing = true;
  clearTimeout(session.autoNext);
  const run = runId;
  if (session.index === session.questions.length - 1) {
    finish();
    return;
  }
  sound.tap();
  await Promise.all([leave(el.question, 360), leave(el.next, 300)]);
  if (run !== runId) return;
  renderQuestion(session.index + 1);
  session.advancing = false;
  enterQuestion();
}

// ---------- 7 · recompensa ----------

async function finish() {
  const { id, score, answers, questions, code } = session;
  queue.run(() => api.progress(id, { status: 'completed', score, answers }));
  track('game_complete', { score });
  el.rewardScore.textContent = COPY.reward.score(score, questions.length);
  el.rewardCode.textContent = session.firstName || 'Invitado';
  el.deliver.disabled = false;
  el.deliverLabel.textContent = COPY.reward.deliver;
  await go('reward', { force: true });
  el.question.hidden = false;
  sound.win();
  sound.stopMusic(4);
  if (!isReduced()) later(() => confetti.fire(), 450);
}

// ---------- 8 · entrega y reinicio ----------

async function deliver() {
  if (!session || screen !== 'reward' || el.deliver.disabled) return;
  const run = runId;
  el.deliver.disabled = true;
  el.deliverLabel.textContent = COPY.reward.delivering;
  try {
    await api.deliver(session.id, { score: session.score, answers: session.answers });
  } catch (err) {
    if (run !== runId) return;
    queue.run(() => api.track('error', { where: 'deliver', kind: err.kind }));
    el.deliver.disabled = false;
    el.deliverLabel.textContent = COPY.reward.deliver;
    $('#deliver-error-code').textContent = session.code;
    el.deliverErrorDialog.showModal();
    return;
  }
  if (run !== runId) return;
  track('reward_delivered');
  sound.correct();
  await showToast(`✓ ${COPY.reward.delivered}`, 1300);
  if (run === runId) reset();
}

async function showToast(text, ms) {
  el.toast.textContent = text;
  el.toast.classList.remove('is-leaving');
  el.toast.hidden = false;
  await wait(ms);
  el.toast.classList.add('is-leaving');
  await wait(isReduced() ? 0 : 280);
  el.toast.hidden = true;
}

// Deja la tablet como recién encendida: ni un dato del participante anterior en pantalla o memoria.
async function reset() {
  stopQuestionTick();
  runId++;
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  clearTimeout(idleTimer);
  clearInterval(idleTick);
  session = null;
  pendingRegistration = null;
  resetForm();
  confetti.stop();
  sound.stopMusic(0.8);
  for (const dialog of [el.idleDialog, el.privacyDialog, el.deliverErrorDialog, el.staffDialog, exportDialog]) {
    if (dialog.open) dialog.close();
  }
  el.toast.hidden = true;
  el.countdown.hidden = true;
  el.qText.textContent = '';
  el.feedbackText.textContent = '';
  el.rewardCode.textContent = '';
  el.rewardScore.textContent = '';
  await go('welcome', { force: true });
}

// ---------- inactividad ----------

let idleTimer = null;
let idleTick = null;

function armIdle() {
  clearTimeout(idleTimer);
  if (screen === 'welcome' || el.idleDialog.open) return;
  const ms = screen === 'reward' ? CONFIG.idleRewardMs : CONFIG.idleMs;
  idleTimer = setTimeout(askIdle, ms);
}

function askIdle() {
  if (screen === 'welcome' || step === 'saving' && screen === 'register') return armIdle();
  let seconds = CONFIG.idleConfirmSeconds;
  el.idleSeconds.textContent = COPY.idle.seconds(seconds);
  if (el.privacyDialog.open) el.privacyDialog.close();
  el.idleDialog.showModal();
  idleTick = setInterval(() => {
    seconds--;
    el.idleSeconds.textContent = COPY.idle.seconds(seconds);
    if (seconds <= 0) {
      clearInterval(idleTick);
      abandon();
    }
  }, 1000);
}

function abandon() {
  const where = screen;
  if (session && where !== 'reward') {
    const { id } = session;
    queue.run(() => api.progress(id, { status: 'abandoned' }));
  }
  queue.run(() => api.track('abandon', { step: where }));
  reset();
}

el.idleDialog.addEventListener('close', () => {
  clearInterval(idleTick);
  armIdle();
});
for (const type of ['pointerdown', 'keydown', 'input']) {
  document.addEventListener(type, () => { if (!el.idleDialog.open) armIdle(); }, { passive: true, capture: true });
}

// ---------- activación de la tablet y menú del personal ----------

async function openStaffMenu() {
  el.staffStatus.textContent = 'Comprobando conexión…';
  $('#staff-motion').setAttribute('aria-pressed', String(document.documentElement.classList.contains('reduce-motion')));
  el.staffDialog.showModal();
  let connection = 'Sin conexión con el servidor';
  try {
    await api.health();
    connection = api.demo ? 'MODO DEMO: no se guarda ningún dato' : 'Servidor y base de datos: correcto';
  } catch { /* se muestra el aviso por defecto */ }
  el.staffStatus.textContent = [
    connection,
    `Envíos en curso: ${queue.pending} · fallidos: ${queue.failed}`,
    `${CONFIG.event} · versión ${CONFIG.version}`,
  ].join('\n');
}

// Exportación a Excel desde la bienvenida: pide la clave de administración cada vez
// y no conserva ni la clave ni la sesión en la tablet.
const exportDialog = $('#export-dialog');
$('#export-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('#export-password');
  const msg = $('#export-msg');
  const submit = $('#export-submit');
  if (api.demo) {
    msg.textContent = 'Modo demostración: no hay datos guardados que exportar.';
    password.value = '';
    return;
  }
  msg.textContent = '';
  msg.classList.remove('is-ok');
  submit.disabled = true;
  try {
    const res = await fetch(`${CONFIG.apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value, scope: 'panel' }),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 429) throw new Error('Demasiados intentos. Espera 15 minutos.');
    if (!res.ok || !data || data.role !== 'admin') throw new Error('Clave de administración incorrecta.');
    const result = await downloadParticipantsExcel(CONFIG.apiBase, data.token);
    msg.classList.add('is-ok');
    msg.textContent = `Excel descargado: ${result.total} registros (${result.marketing} aptos para marketing).`;
  } catch (err) {
    msg.textContent = err instanceof TypeError || err.message === 'export_failed'
      ? 'No se ha podido exportar. Revisa la conexión.'
      : err.message;
  } finally {
    password.value = '';
    submit.disabled = false;
  }
});
exportDialog.addEventListener('close', () => {
  $('#export-password').value = '';
  $('#export-msg').textContent = '';
});

onHold($('#logo'), 1500, openStaffMenu);
onHold(el.deliver, 1200, deliver);

const staffActions = {
  'staff-reset': () => {
    if (session && screen !== 'reward') {
      const { id } = session;
      queue.run(() => api.progress(id, { status: 'abandoned' }));
    }
    queue.run(() => api.track('reset'));
    reset();
  },
  'staff-fullscreen': () => {
    const root = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
    el.staffDialog.close();
  },
  'staff-motion': () => {
    const on = document.documentElement.classList.toggle('reduce-motion');
    $('#staff-motion').setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('rv-reduce-motion', on ? '1' : '0'); } catch { /* preferencia no persistida */ }
  },

};

// ---------- controles globales ----------

function syncToggles() {
  const soundBtn = $('#sound-toggle');
  soundBtn.setAttribute('aria-pressed', String(sound.enabled));
  soundBtn.setAttribute('aria-label', sound.enabled ? COPY.controls.soundOn : COPY.controls.soundOff);
  const textBtn = $('#text-toggle');
  const large = document.documentElement.dataset.text === 'large';
  textBtn.setAttribute('aria-pressed', String(large));
  textBtn.setAttribute('aria-label', large ? COPY.controls.textNormal : COPY.controls.textBigger);
}

$('#sound-toggle').addEventListener('click', () => {
  sound.setEnabled(!sound.enabled);
  if (sound.enabled) {
    sound.tap();
    if (screen === 'game') sound.startMusic();
  }
  syncToggles();
});

$('#text-toggle').addEventListener('click', () => {
  const root = document.documentElement;
  if (root.dataset.text === 'large') delete root.dataset.text;
  else root.dataset.text = 'large';
  syncToggles();
  if (screen === 'game') fitQuestion();
});

const actions = {
  start,
  choose: (target) => choose(target.dataset.type),
  'switch-contact': (target) => choose(target.dataset.type),
  anonymous: playAnonymous,
  back: () => { if (!busy && step === 'form') { resetForm(); setStep('choose'); } },
  privacy: () => el.privacyDialog.showModal(),
  export: () => { if (screen === 'welcome') exportDialog.showModal(); },
  'retry-register': () => { if (pendingRegistration && step === 'error') sendRegistration(); },
  'cancel-register': () => reset(),
  begin,
  'deliver-retry': () => { el.deliverErrorDialog.close(); deliver(); },
  'deliver-skip': () => { el.deliverErrorDialog.close(); reset(); },
  ...staffActions,
};

document.addEventListener('click', (e) => {
  const closer = e.target.closest('[data-close]');
  if (closer) return closer.closest('dialog').close();
  const answerBtn = e.target.closest('[data-answer]');
  if (answerBtn) return answer(answerBtn.dataset.answer === 'true', answerBtn);
  const chip = e.target.closest('[data-domain]');
  if (chip) {
    const user = el.input.value.split('@')[0].trim();
    el.input.value = user + chip.dataset.domain;
    showFieldError('');
    el.input.focus({ preventScroll: true });
    return undefined;
  }
  const target = e.target.closest('[data-action]');
  if (target && actions[target.dataset.action]) actions[target.dataset.action](target);
  return undefined;
});

el.next.addEventListener('click', next);
el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitForm();
});
el.input.addEventListener('input', () => { if (el.fieldError.textContent) showFieldError(''); });

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') openStaffMenu();
});

// Protección frente a recargas o cierres accidentales con una partida en curso.
window.addEventListener('beforeunload', (e) => {
  if (session || pendingRegistration) e.preventDefault();
});
// Sin zoom por pellizco ni menús contextuales: la tablet se comporta como un quiosco.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
el.qImg.addEventListener('load', () => { if (screen === 'game') fitQuestion(); });
document.fonts.ready.then(() => { if (screen === 'game') fitQuestion(); });
window.visualViewport?.addEventListener('resize', () => { if (screen === 'game') fitQuestion(); });
window.addEventListener('resize', () => { if (screen === 'game' && session) fitQuestion(); });

// ---------- arranque ----------

function init() {
  try {
    if (localStorage.getItem('rv-reduce-motion') === '1') document.documentElement.classList.add('reduce-motion');
    if (sessionStorage.getItem('rv-lite') === '1') document.documentElement.classList.add('lite');
  } catch { /* preferencias no disponibles */ }
  applyCopy();
  syncToggles();
  enter(screens.welcome);
  // El juego es público: tanto la tablet como los visitantes por QR pueden participar.
  // Precarga de las imágenes del juego para que ninguna pantalla aparezca a medias.
  for (const name of ['forma', 'vf-iconos', 'vitamina-c', 'movimiento', 'podio']) {
    new Image().src = `assets/img/${name}.webp`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();

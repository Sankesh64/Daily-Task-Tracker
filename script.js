// Register GSAP
gsap.registerPlugin(ScrollTrigger);

// ============ STATE ============
const state = {
  currentUser: null,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  completedDates: {},
  goals: {
    first: { name: '', completed: false },
    second: { name: '', completed: false },
    third: { name: '', completed: false }
  }
};

// ============ DOM CACHE ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  // Modal
  loginModal: $('#loginModal'),
  modalContent: $('#modalContent'),
  modalClose: $('#modalClose'),
  loginForm: $('#loginForm'),
  
  // Header
  dayName: $('#dayName'),
  fullDate: $('#fullDate'),
  userSection: $('#userSection'),
  userAvatar: $('#userAvatar'),
  userName: $('#userName'),
  logoutBtn: $('#logoutBtn'),
  
  // Calendar
  calGrid: $('#calGrid'),
  calMonthYear: $('#calMonthYear'),
  prevMonth: $('#prevMonth'),
  nextMonth: $('#nextMonth'),
  
  // Goals
  goalContainers: $$('.goal-container'),
  checkboxes: $$('.custom-checkbox'),
  inputs: $$('.goal-input'),
  progressBar: $('#progressBar'),
  progressValue: $('#progressValue'),
  progressPct: $('#progressPct'),
  errorLabel: $('#errorLabel'),
  
  // Toast
  toastContainer: $('#toastContainer'),
  
  // Theme toggle (calendar toggle for this theme)
  themeToggle: $('#themeToggle')
};

// ============ QUOTES ============
const quotes = [
  'Raise the bar by completing your goals!',
  'Well begun is half done!',
  'Just a step away, keep going!',
  '🎉 All goals completed! Time to celebrate!',
];

// ============ UTILS ============
function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  els.toastContainer.appendChild(toast);
  
  gsap.from(toast, { opacity: 0, x: 50, duration: 0.25 });
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function formatDateKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ============ DATE DISPLAY ============
function updateDate() {
  const now = new Date();
  els.dayName.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
  els.fullDate.textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ============ CALENDAR ============
function renderCalendar(month, year) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  els.calMonthYear.textContent = `${months[month]} ${year}`;
  
  els.calGrid.innerHTML = '';
  const todayKey = formatDateKey();
  
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    
    if (d.getMonth() !== month) {
      cell.classList.add('empty');
    } else {
      cell.textContent = d.getDate();
      const key = formatDateKey(d);
      
      if (key === todayKey) cell.classList.add('today');
      if (state.completedDates[key]) cell.classList.add('completed');
    }
    
    els.calGrid.appendChild(cell);
  }
}

function changeMonth(dir) {
  state.currentMonth += dir;
  if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
  if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
  
  gsap.fromTo(els.calGrid, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
  renderCalendar(state.currentMonth, state.currentYear);
}

// ============ AUTH - FIXED MODAL LOGIC ============
function initAuth() {
  const saved = localStorage.getItem('focusUser');
  if (saved) {
    state.currentUser = JSON.parse(saved);
    updateUserInfo();
    loadGoals();
    // FIXED: Don't show modal if user exists
    hideModal();
  } else {
    // FIXED: Show modal with proper CSS class, not just hidden attribute
    showModal();
  }
}

// FIXED: Use CSS class for visibility to avoid race conditions
function showModal() {
  els.loginModal.classList.add('is-visible');
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';
}

function hideModal() {
  els.loginModal.classList.remove('is-visible');
  document.body.style.overflow = '';
}

function login(name, pass) {
  // Demo auth
  if (pass === 'focus123' && name.trim()) {
    state.currentUser = { id: Date.now(), name: name.trim() };
    localStorage.setItem('focusUser', JSON.stringify(state.currentUser));
    updateUserInfo();
    loadGoals();
    hideModal();
    showToast(`Welcome, ${name.split(' ')[0]}! 🎯`, 'success', 4000);
    return true;
  }
  return false;
}

function logout() {
  saveGoals(); // Save before logout
  state.currentUser = null;
  localStorage.removeItem('focusUser');
  
  // Reset UI
  els.userName.textContent = 'Guest';
  els.userAvatar.textContent = 'G';
  els.inputs.forEach(i => { i.value = ''; i.parentElement.classList.remove('completed'); });
  
  state.goals = { first: {name:'',completed:false}, second: {name:'',completed:false}, third: {name:'',completed:false} };
  state.completedDates = {};
  updateProgress(0);
  renderCalendar(state.currentMonth, state.currentYear);
  
  showModal();
  showToast('Logged out', 'info', 2000);
}

function updateUserInfo() {
  if (!state.currentUser) return;
  els.userName.textContent = state.currentUser.name;
  els.userAvatar.textContent = getInitials(state.currentUser.name);
}

// ============ GOALS ============
function loadGoals() {
  if (!state.currentUser) return;
  
  const key = `goals_${state.currentUser.id}`;
  const saved = localStorage.getItem(key);
  
  if (saved) {
    const data = JSON.parse(saved);
    state.goals = { ...state.goals, ...data.goals };
    state.completedDates = data.completedDates || {};
  }
  
  // Populate inputs
  els.inputs.forEach(input => {
    const g = state.goals[input.id];
    if (g?.name) input.value = g.name;
    if (g?.completed) input.parentElement.classList.add('completed');
  });
  
  const count = Object.values(state.goals).filter(g => g.completed).length;
  updateProgress(count);
  renderCalendar(state.currentMonth, state.currentYear);
}

function saveGoals() {
  if (!state.currentUser) return;
  
  const today = formatDateKey();
  const count = Object.values(state.goals).filter(g => g.completed).length;
  if (count === 3) state.completedDates[today] = true;
  
  localStorage.setItem(`goals_${state.currentUser.id}`, JSON.stringify({
    goals: state.goals,
    completedDates: state.completedDates
  }));
}

function updateProgress(count) {
  const pct = Math.round((count / 3) * 100);
  
  // GSAP smooth animation
  gsap.to(els.progressValue, {
    width: `${pct}%`,
    duration: 0.6,
    ease: "power2.out"
  });
  
  els.progressValue.querySelector('span').textContent = `${count}/3 Completed`;
  els.progressPct.textContent = `${pct}%`;
  
  if (pct > 0) els.progressValue.classList.add('has-progress');
  else els.progressValue.classList.remove('has-progress');
  
  els.errorLabel.textContent = quotes[count];
  
  // Update calendar today marker
  if (count === 3) {
    state.completedDates[formatDateKey()] = true;
    saveGoals();
    renderCalendar(state.currentMonth, state.currentYear);
  }
}

// ============ EVENT HANDLERS - FIXED ============
function setupEvents() {
  // FIXED: Modal close - use event delegation and stopPropagation
  els.modalClose?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent overlay click
    hideModal();
  });
  
  // FIXED: Overlay click only closes if clicking the overlay itself
  els.loginModal?.addEventListener('click', (e) => {
    if (e.target === els.loginModal) {
      hideModal();
    }
  });
  
  // FIXED: Prevent modal content clicks from bubbling to overlay
  els.modalContent?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // Login form
  els.loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#username')?.value;
    const pass = $('#password')?.value;
    
    if (login(name, pass)) {
      els.loginForm?.reset();
    } else {
      showToast('Try password: focus123', 'error');
      // Shake animation
      gsap.fromTo(els.modalContent, { x: 0 }, { x: -10, duration: 0.08, repeat: 4, yoyo: true });
    }
  });
  
  // Logout
  els.logoutBtn?.addEventListener('click', logout);
  
  // Calendar nav
  els.prevMonth?.addEventListener('click', () => changeMonth(-1));
  els.nextMonth?.addEventListener('click', () => changeMonth(1));
  
  // Theme toggle (calendar toggle)
  els.themeToggle?.addEventListener('click', () => {
    const widget = $('#calendarWidget');
    if (widget) {
      widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
      showToast(widget.style.display === 'none' ? 'Calendar hidden' : 'Calendar shown', 'info', 1500);
    }
  });
  
  // Checkboxes - FIXED: Proper validation and state management
  els.checkboxes.forEach((box, idx) => {
    box.addEventListener('click', () => {
      const container = box.parentElement;
      const input = container.querySelector('.goal-input');
      const goalId = input?.id;
      
      // Validate all goals filled
      const allFilled = [...els.inputs].every(i => i.value.trim());
      
      if (!allFilled) {
        els.progressBar.classList.add('show-error', 'shake');
        els.errorLabel.classList.add('is-visible');
        showToast('Please fill all 3 goals first', 'error');
        
        // Remove shake class after animation
        setTimeout(() => els.progressBar.classList.remove('shake'), 400);
        return;
      }
      
      // Clear error state
      els.progressBar.classList.remove('show-error');
      els.errorLabel.classList.remove('is-visible');
      
      // Toggle completed
      container.classList.toggle('completed');
      
      // Micro-interaction
      gsap.fromTo(box, { scale: 1 }, { scale: 1.25, duration: 0.12, yoyo: true, repeat: 1 });
      
      // Update state
      if (goalId && state.goals[goalId]) {
        state.goals[goalId].completed = !state.goals[goalId].completed;
      }
      
      // Update progress
      const count = Object.values(state.goals).filter(g => g.completed).length;
      updateProgress(count);
      saveGoals();
      
      // Celebration
      if (count === 3) {
        gsap.fromTo('.app-container', { scale: 1 }, { scale: 1.02, duration: 0.15, yoyo: true, repeat: 1, ease: "elastic.out(1, 0.3)" });
        showToast('🎉 All done! Amazing!', 'success', 5000);
      }
    });
  });
  
  // Inputs - debounced save
  els.inputs.forEach(input => {
    let timer;
    
    input.addEventListener('focus', () => {
      els.progressBar.classList.remove('show-error');
      els.errorLabel.classList.remove('is-visible');
    });
    
    input.addEventListener('input', (e) => {
      const goalId = input.id;
      
      // Prevent editing completed goals
      if (state.goals[goalId]?.completed) {
        input.value = state.goals[goalId].name;
        return;
      }
      
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!state.goals[goalId]) {
          state.goals[goalId] = { name: '', completed: false };
        }
        state.goals[goalId].name = input.value;
        saveGoals();
        
        // Subtle feedback
        gsap.fromTo(input.parentElement, 
          { boxShadow: "0 0 0 rgba(255,107,74,0)" }, 
          { boxShadow: "0 0 12px rgba(255,107,74,0.2)", duration: 0.2, yoyo: true, repeat: 1 }
        );
      }, 200);
    });
  });
  
  // Keyboard: Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.loginModal?.classList.contains('is-visible')) {
      hideModal();
    }
  });
}

// ============ GSAP ANIMATIONS ============
function initAnimations() {
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  
  tl.from(".title", { duration: 0.7, y: -30, opacity: 0, ease: "back.out(1.7)" })
    .from(".app-header", { duration: 0.4, y: 15, opacity: 0 }, "-=0.4")
    .from(".calendar-widget", { duration: 0.5, x: -25, opacity: 0 }, "-=0.3")
    .from(".today-header, .quote, .progress-section", { 
      duration: 0.4, y: 20, opacity: 0, stagger: 0.1 
    }, "-=0.2")
    .from(".goal-container", { 
      duration: 0.5, x: -30, opacity: 0, stagger: 0.15, ease: "power2.out" 
    }, "-=0.3")
    .from(".made-with", { duration: 0.3, y: 10, opacity: 0 }, "-=0.2");
  
  // Scroll: parallax sun
  ScrollTrigger.create({
    trigger: "body",
    start: "top top",
    onUpdate: (self) => {
      const sun = document.querySelector('.sun-icon');
      if (sun) gsap.set(sun, { y: self.progress * 20, rotation: self.progress * 8 });
    }
  });
}

// ============ INIT ============
function init() {
  // 1. Update date
  updateDate();
  
  // 2. Render calendar
  renderCalendar(state.currentMonth, state.currentYear);
  
  // 3. FIXED: Init auth AFTER DOM is ready and events are set up
  // But we need to check auth first to decide modal state
  // So we init auth, BUT modal visibility is controlled by CSS class
  
  // 4. Setup events FIRST (critical fix)
  setupEvents();
  
  // 5. Then init auth (which will show/hide modal properly)
  initAuth();
  
  // 6. Animations
  initAnimations();
  
  // 7. Refresh ScrollTrigger
  ScrollTrigger.refresh();
  
  // 8. Update date every minute
  setInterval(updateDate, 60000);
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle resize
window.addEventListener('resize', () => ScrollTrigger.refresh(), { passive: true });
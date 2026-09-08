const BRANCH_NAMES = {
  ME: 'Mechanical (ME)',
  CV: 'Civil (CV)',
  BM: 'Bio-medical (BM)'
};

let selectedBranch = localStorage.getItem('selectedBranch') || null;
let now = new Date();
let isTodayMode = true;
let selectedDateStr = getLocalDateString(now);
let workingDays = [];
let timetable = [];

// SVG Icons
const Icons = {
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`
};

async function init() {
  try {
    const [wdRes, ttRes] = await Promise.all([
      fetch('./Database/working_days.csv'),
      fetch('./Database/timetable.csv')
    ]);
    const wdText = await wdRes.text();
    const ttText = await ttRes.text();

    workingDays = parseCSV(wdText);
    timetable = parseCSV(ttText);

    setInterval(() => {
      now = new Date();
      if (selectedBranch) renderTimetableScreen();
    }, 10000);

    render();
  } catch (err) {
    console.error("Initialization error:", err);
    document.getElementById('root').innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center p-6 text-center h-screen">
        <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">Failed to load Database</h2>
        <p class="text-slate-600">Please ensure you are running this app on a web server so that the CSV files can be fetched correctly.</p>
      </div>`;
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ? vals[idx].trim() : null;
    });
    data.push(obj);
  }
  return data;
}

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

function timeToMins(time24) {
  if (!time24) return 0;
  const [hStr, mStr] = time24.split(':');
  return parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

// Ensure these functions are accessible globally for onclick attributes
window.handleBranchSelect = function(branch) {
  selectedBranch = branch;
  localStorage.setItem('selectedBranch', branch);
  render();
};

window.handleBack = function() {
  selectedBranch = null;
  render();
};

window.handleDateChange = function(e) {
  if (e.target.value) {
    selectedDateStr = e.target.value;
    isTodayMode = (e.target.value === getLocalDateString(now));
    renderTimetableScreen();
  }
};

window.handleTodayClick = function() {
  isTodayMode = true;
  selectedDateStr = getLocalDateString(now);
  renderTimetableScreen();
};

function render() {
  const root = document.getElementById('root');
  if (!selectedBranch) {
    root.innerHTML = getBranchSelectionHTML();
  } else {
    root.innerHTML = getTimetableContainerHTML();
    renderTimetableScreen();
  }
}

function getBranchSelectionHTML() {
  let buttonsHtml = '';
  for (const [code, name] of Object.entries(BRANCH_NAMES)) {
    buttonsHtml += `
      <button onclick="handleBranchSelect('${code}')" class="group w-full p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:shadow-md hover:bg-blue-50/50 transition-all text-left flex items-center justify-between bg-white cursor-pointer">
        <div class="flex flex-col">
          <span class="text-lg font-bold text-slate-800 group-hover:text-blue-900 transition-colors">${name}</span>
          <span class="text-sm font-medium text-slate-500">1st Semester Routine</span>
        </div>
        <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-700 text-slate-400 transition-colors font-bold text-lg">
          ${code}
        </div>
      </button>
    `;
  }

  return `
    <div class="flex-1 flex flex-col items-center justify-center p-4 relative min-h-screen">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div class="p-6 bg-blue-600 text-white text-center">
          <div class="flex justify-center mb-4">
            <img src="https://i.ibb.co/sp3JzMpn/logo.jpg" alt="Golaghat Polytechnic Logo" class="w-24 h-24 object-contain rounded-full shadow-md bg-white p-1" />
          </div>
          <h1 class="text-3xl sm:text-4xl font-extrabold uppercase tracking-wider leading-tight drop-shadow-md">GOLAGHAT POLYTECHNIC, FURKATING</h1>
          <p class="text-blue-100 text-base mt-2 font-medium">Class Routine - 1st Semester</p>
        </div>
        <div class="p-6 space-y-4">
          <h2 class="text-xl font-bold text-slate-800 text-center mb-6">Select Your Branch</h2>
          ${buttonsHtml}
        </div>
      </div>
      <div class="mt-6 text-center text-xs text-slate-500 pb-4">
        Developed by <a href="https://elevixstudio.in" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-semibold">Elevix Studio</a>
      </div>
    </div>
  `;
}

function getTimetableContainerHTML() {
  return `
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <header class="bg-blue-600 text-white p-4 shrink-0 shadow-md z-10 relative">
        <div class="flex items-center mb-2">
          <button onclick="handleBack()" class="flex items-center text-blue-100 hover:text-white transition-colors cursor-pointer p-1 -ml-1 rounded">
            ${Icons.arrowLeft} <span class="ml-1 font-medium text-sm">Back</span>
          </button>
        </div>
        <div class="text-center mb-5 mt-1">
          <div class="flex justify-center mb-3">
            <img src="https://i.ibb.co/sp3JzMpn/logo.jpg" alt="Golaghat Polytechnic Logo" class="w-16 h-16 object-contain rounded-full shadow-sm bg-white p-1" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-sm">Daily Time Table</h1>
          <h2 class="text-blue-100 text-sm sm:text-base font-medium mt-1">1st Semester, Golaghat Polytechnic</h2>
        </div>
        <div class="bg-blue-700/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm shadow-inner">
          <div class="flex items-center justify-between sm:justify-start sm:gap-2 border-b border-blue-500/30 sm:border-0 pb-2 sm:pb-0">
            <span class="text-blue-200">Branch :</span>
            <span id="header-branch-name" class="font-bold"></span>
          </div>
          <div class="hidden sm:block w-px h-4 bg-blue-500/50"></div>
          <div class="flex items-center justify-between sm:justify-start sm:gap-2 border-b border-blue-500/30 sm:border-0 pb-2 sm:pb-0">
            <span class="text-blue-200">Date :</span>
            <span id="header-date-display" class="font-bold"></span>
          </div>
          <div class="hidden sm:block w-px h-4 bg-blue-500/50"></div>
          <div class="flex items-center justify-between sm:justify-start sm:gap-2">
            <span class="text-blue-200">Status :</span>
            <span id="header-working-day-status" class="font-bold"></span>
          </div>
        </div>
      </header>

      <div class="flex items-center justify-between p-4 bg-white border-b shadow-sm shrink-0">
        <input 
          type="date" 
          id="date-picker"
          class="p-2 border rounded-md text-sm font-medium text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          min="2026-08-05"
          max="2026-11-25"
          onchange="handleDateChange(event)"
        />
        <button 
          id="today-btn"
          onclick="handleTodayClick()"
          class="px-4 py-2 rounded-md text-sm font-bold transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>

      <main id="timetable-content" class="flex-1 p-4 space-y-6 overflow-y-auto bg-slate-50 relative"></main>

      <footer class="p-4 text-center text-xs text-slate-500 shrink-0 border-t bg-white">
        Developed by <a href="https://elevixstudio.in" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-semibold">Elevix Studio</a>
      </footer>
    </div>
  `;
}

function renderTimetableScreen() {
  const displayedDateStr = isTodayMode ? getLocalDateString(now) : selectedDateStr;
  const isViewingToday = displayedDateStr === getLocalDateString(now);

  const branchEl = document.getElementById('header-branch-name');
  if (branchEl) branchEl.innerText = BRANCH_NAMES[selectedBranch];
  
  const dayLabelEl = document.getElementById('header-day-label');
  if (dayLabelEl) dayLabelEl.innerText = isViewingToday ? 'Today' : 'Viewing Date';
  
  const dateDisplayEl = document.getElementById('header-date-display');
  if (dateDisplayEl) dateDisplayEl.innerText = formatDisplayDate(displayedDateStr);
  
  const datePicker = document.getElementById('date-picker');
  if (datePicker && datePicker.value !== displayedDateStr) datePicker.value = displayedDateStr;

  const todayBtn = document.getElementById('today-btn');
  if (todayBtn) {
    if (isTodayMode) {
      todayBtn.className = "px-4 py-2 rounded-md text-sm font-bold transition-colors bg-blue-100 text-blue-700 cursor-pointer ring-2 ring-blue-200";
    } else {
      todayBtn.className = "px-4 py-2 rounded-md text-sm font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer";
    }
  }

  let workingDayData = workingDays.find(d => d.date === displayedDateStr);
  if (!workingDayData) {
    workingDayData = { date: displayedDateStr, working_day: null, status: 'holiday', holiday: 'Date out of bounds' };
  }

  const statusEl = document.getElementById('header-working-day-status');
  if (statusEl) {
    statusEl.innerText = workingDayData.status === 'working' ? `(${workingDayData.working_day} working day)` : '(Holiday)';
  }

  const classesForDay = (workingDayData.status === 'working' && workingDayData.working_day)
    ? timetable.filter(c => c.branch === selectedBranch && c.working_day === workingDayData.working_day)
               .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time))
    : [];

  const mainContent = document.getElementById('timetable-content');
  if (!mainContent) return;

  if (workingDayData.status === 'holiday' || !workingDayData.status) {
    mainContent.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
        <div class="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
          ${Icons.calendar}
        </div>
        <h2 class="text-3xl font-extrabold text-slate-800 mb-3">Holiday Off</h2>
        <p class="text-lg font-medium text-slate-500">${workingDayData.holiday || 'No classes today'}</p>
      </div>
    `;
    return;
  }

  let currentClassUI = null;
  let nextClassUI = null;

  if (isViewingToday) {
    const currentMins = timeToMins(`${now.getHours()}:${now.getMinutes()}`);
    
    if (currentMins < 540) { // before 9:00 AM
      currentClassUI = { type: 'message', message: 'Classes Start at 9:00 AM' };
      nextClassUI = classesForDay.length > 0 ? { type: 'class', data: classesForDay[0] } : null;
    } else if (currentMins >= 930) { // after 3:30 PM
      currentClassUI = { type: 'message', message: 'Classes Ended' };
      nextClassUI = null;
    } else if (currentMins >= 780 && currentMins < 810) { // 1:00 PM - 1:30 PM
      currentClassUI = { type: 'break' };
      const next = classesForDay.find(c => timeToMins(c.start_time) >= 810);
      nextClassUI = next ? { type: 'class', data: next } : null;
    } else {
      for (let i = 0; i < classesForDay.length; i++) {
        const c = classesForDay[i];
        const startMins = timeToMins(c.start_time);
        const endMins = timeToMins(c.end_time);
        
        if (currentMins >= startMins && currentMins < endMins) {
          currentClassUI = { type: 'class', data: c };
          if (endMins === 780) {
            nextClassUI = { type: 'break' };
          } else {
            nextClassUI = i + 1 < classesForDay.length ? { type: 'class', data: classesForDay[i+1] } : null;
          }
          break;
        }
      }
    }
    
    if (!currentClassUI && currentMins >= 540 && currentMins < 930) {
       currentClassUI = { type: 'message', message: 'Free Period / No current class' };
       const next = classesForDay.find(c => timeToMins(c.start_time) > currentMins);
       nextClassUI = next ? { type: 'class', data: next } : null;
    }
  }

  let html = '';

  if (isViewingToday) {
    html += '<div class="space-y-4">';
    
    // Current Class Card
    html += `
      <div class="bg-white border-2 border-blue-500 rounded-3xl p-6 shadow-lg shadow-blue-500/10 relative overflow-hidden transition-all">
        <div class="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
        <h3 class="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center">
          <span class="relative flex h-3 w-3 mr-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          Live Now
        </h3>
    `;
    if (currentClassUI?.type === 'class') {
      html += `
        <div>
          <div class="text-3xl font-extrabold text-slate-900 mb-3 leading-tight">${currentClassUI.data.subject}</div>
          <div class="inline-flex items-center text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-sm">
            <span class="mr-2 opacity-75">${Icons.clock}</span>
            ${formatTime(currentClassUI.data.start_time)} – ${formatTime(currentClassUI.data.end_time)}
          </div>
        </div>
      `;
    } else if (currentClassUI?.type === 'break') {
      html += `<div class="text-3xl font-extrabold text-slate-900 mb-2 tracking-widest">BREAK</div>`;
    } else if (currentClassUI?.type === 'message') {
      html += `<div class="text-2xl font-bold text-slate-800 mb-2">${currentClassUI.message}</div>`;
    }
    html += `</div>`;

    // Next Class Card
    html += `
      <div class="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">Coming Up Next</h3>
    `;
    if (nextClassUI?.type === 'class') {
      html += `
        <div>
          <div class="text-xl font-bold text-slate-800 mb-2">${nextClassUI.data.subject}</div>
          <div class="inline-flex items-center text-slate-600 bg-slate-200/50 px-3 py-1.5 rounded-lg font-semibold text-sm">
            <span class="mr-1.5 text-slate-400">${Icons.clock}</span>
            ${formatTime(nextClassUI.data.start_time)} – ${formatTime(nextClassUI.data.end_time)}
          </div>
        </div>
      `;
    } else if (nextClassUI?.type === 'break') {
      html += `<div class="text-xl font-extrabold text-slate-800 mb-1 tracking-widest">BREAK</div>`;
    } else {
      html += `<div class="text-lg font-medium text-slate-400">No More Classes Today</div>`;
    }
    html += `</div></div>`;
  }

  // Entire Day Routine
  html += `
    <div class="mt-8 pb-4">
      <h3 class="text-lg font-extrabold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">
        ${isViewingToday ? "Today's Full Routine" : "Classes for this date"}
      </h3>
      <div class="space-y-4">
  `;

  classesForDay.forEach((c, i) => {
    const endMins = timeToMins(c.end_time);
    const isLastBeforeBreak = endMins === 780; // 12:00-13:00 class
    
    const currentMins = timeToMins(`${now.getHours()}:${now.getMinutes()}`);
    const startMins = timeToMins(c.start_time);
    const isCurrent = isViewingToday && currentMins >= startMins && currentMins < endMins;

    const containerClasses = isCurrent 
      ? "flex p-5 rounded-2xl border-2 transition-all group bg-blue-50 border-blue-300 shadow-md ring-4 ring-blue-50"
      : "flex p-5 rounded-2xl border-2 transition-all group bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50 shadow-sm";
    
    const timeClasses = isCurrent ? "text-blue-700" : "text-slate-800";
    const subjectClasses = isCurrent ? "text-blue-900" : "text-slate-700";

    html += `
      <div class="flex flex-col">
        <div class="${containerClasses}">
          <div class="w-24 shrink-0 flex flex-col justify-center border-r-2 border-slate-100 pr-4 mr-4 group-hover:border-blue-200 transition-colors">
            <span class="text-base font-extrabold ${timeClasses}">${formatTime(c.start_time)}</span>
            <span class="text-xs font-semibold text-slate-400 mt-1">${formatTime(c.end_time)}</span>
          </div>
          <div class="flex flex-col justify-center flex-1">
            <span class="font-bold text-lg leading-snug ${subjectClasses}">${c.subject}</span>
          </div>
        </div>
    `;
    
    if (isLastBeforeBreak) {
      html += `
        <div class="my-5 flex items-center justify-center p-4 bg-slate-100/80 rounded-2xl border-2 border-slate-200 border-dashed">
          <span class="text-sm font-bold text-slate-500 tracking-widest uppercase">Break (1:00 PM – 1:30 PM)</span>
        </div>
      `;
    }
    html += `</div>`;
  });

  if (classesForDay.length > 0) {
    html += `
      <div class="mt-6 flex items-center justify-center p-4">
        <div class="h-px bg-slate-200 flex-1"></div>
        <span class="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Classes End ${formatTime('15:30')}</span>
        <div class="h-px bg-slate-200 flex-1"></div>
      </div>
    `;
  } else if (workingDayData.status === 'working') {
    html += `<div class="p-6 text-center text-slate-500 font-medium">No classes scheduled for this branch.</div>`;
  }

  html += `</div></div>`;
  mainContent.innerHTML = html;
}

// Start everything up once DOM is completely loaded
document.addEventListener('DOMContentLoaded', init);

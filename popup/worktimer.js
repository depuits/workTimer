const hasBrowser = typeof browser !== "undefined";
/* data format
{
  '2023-05-15': {
    'entries': [
      {
        'desc': 'bla',
        'begin': 'start dateTime',
        'end': 'end dateTime'
      },
    ],
    'currentTimer': '2023-06-05T13:48:40.642+02:00',
    'currentDesc': ''
  }
}
*/
let data = {}; // all data is in here

const viewTargetEl = document.getElementById('target');
const template = document.getElementById('template').innerHTML;

const dateEl = document.getElementById('date');
let currentDate = new Date();

function getCurrentDay() {
   const day = data[dateEl.value] || {};
   data[dateEl.value] = day;

  // make sure some values are always filled in
  if (!Array.isArray(day.entries)) {
    day.entries = [];
  }

  return day;
}

function pad (n) {
  return `${Math.floor(Math.abs(n))}`.padStart(2, '0');
}

function addDays(days) {
  var result = new Date(currentDate);
  result.setDate(result.getDate() + days);

  setDate(result);
}

function setDate(date) {
  currentDate = date || new Date();

  const dateStr = currentDate.getFullYear() +
    '-' + pad(currentDate.getMonth() + 1) +
    '-' + pad(currentDate.getDate());
  dateEl.value = dateStr;

  // refresh data
  render();
}

function dateIsValid(date) {
  return (date instanceof Date && !isNaN(date.valueOf()));
}

function dateToHour(date) {
  if (!dateIsValid(date)) {
    return undefined;
  }

  return formatHoursMinutes(date.getHours(), date.getMinutes());
}

function formatHoursMinutes(hours, minutes) {
  return `${pad(hours)}:${pad(minutes)}`;
}

function MsToFormatHoursMinutes(ms) {
    const minutes = Math.round((ms % 3600000) / 60000);
    const hours = Math.floor(ms / 3600000);

    return formatHoursMinutes(hours, minutes);
}

async function save() {
  console.log('saving data');
  console.log(data);
  if (hasBrowser) {
    await browser.storage.local.set({data});
  } else {
    localStorage.setItem("data", JSON.stringify(data));
  }
}

async function initialize() {
  if (hasBrowser) {
    let storageItem = await browser.storage.local.get('data');
    if (storageItem.data) {
      data = storageItem.data;
    }
  } else {
    const jsonData = localStorage.getItem("data");
    data = jsonData ? JSON.parse(jsonData) : {};
  }

  setDate();
}

function render() {
  const day = getCurrentDay();

  // create view data
  const view = {};
  let combinedTotalMs = 0;

  // transform current entry to time view
  view.currentDesc = day.currentDesc,
  view.currentTimer = dateToHour(new Date(day.currentTimer));
  if (view.currentTimer) {
    const totalMs = new Date() - new Date(day.currentTimer);
    combinedTotalMs += totalMs;

    view.currentTotal = MsToFormatHoursMinutes(totalMs);
  }

  // transform entries to date object to time view
  // calculate total time for entry
  view.entries = day.entries.map(function (e, i) {
    const totalMs = new Date(e.end) - new Date(e.begin);
    combinedTotalMs += totalMs;

    return {
      id: i,
      desc: e.desc,
      begin: dateToHour(new Date(e.begin)),
      end: dateToHour(new Date(e.end)),
      total: MsToFormatHoursMinutes(totalMs),
    };
  });

  view.combinedTotal = MsToFormatHoursMinutes(combinedTotalMs);

  viewTargetEl.innerHTML = 'Loading...';

  console.log('rendering template');
  const rendered = Mustache.render(template, view);
  
  console.log('displaying render');
  viewTargetEl.innerHTML = rendered;
}

// add timer to update timing fields only if timer is running
setInterval(() => {
  console.log('minute update');

  const day = getCurrentDay();
  const currentTimer = dateToHour(new Date(day.currentTimer));
  if (currentTimer) {
    const totalMs = new Date() - new Date(day.currentTimer);
    let combinedTotalMs = totalMs;

    day.entries.forEach((e) => {
      const totalMs = new Date(e.end) - new Date(e.begin);
      combinedTotalMs += totalMs;
    });

    document.querySelectorAll('[data-name="current-total"]').forEach((el) => {
      el.innerHTML = MsToFormatHoursMinutes(totalMs);
    });

    document.querySelectorAll('[data-name="combined-total"]').forEach((el) => {
      el.innerHTML = MsToFormatHoursMinutes(combinedTotalMs);
    });

  }
}, 5000);

// add listeners for time fields
// focusout  because blur does not bubble up
document.addEventListener('focusout', (e) => {
  if (e.target.id == 'date') {
    render();
  }

  const action = e.target.getAttribute('data-name');
  if (!action) {
    return;
  }

  const dateActions = [ 'currentTimer', 'begin', 'end' ];
  const isDateAction = dateActions.includes(action)

  console.log('updating: ' + action);

  // get index
  const indexEl = e.target.closest('[data-index]');

  let entry = getCurrentDay();
  if (indexEl) {
    const index = indexEl.getAttribute('data-index');
    console.log('on index: ' + index);
    entry = entry.entries[index];
  }

  // update value corresponding to input and save it
  let val = e.target.value;
  // if date then convert to date
  if (isDateAction) {
    const time = val.split(':');
    val = new Date(currentDate);
    val.setHours(time[0]);
    val.setMinutes(time[1]);
  }
  console.log('setting val: ' + val);

  entry[action] = val;
  save();

  if (isDateAction) {
    // when a timer element is changed then the view should be rerendered to calculated and update totals
    render();
  }
});

function saveDataToFile(data, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  }));
  a.setAttribute("download", `${name || 'export'}.json`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// add click handlers
document.addEventListener("click", (e) => {
  if (e.target.classList.contains('popout')) {
    openNewWindow();
    return;
  }

  if (e.target.classList.contains('export')) {
    const day = getCurrentDay();
    saveDataToFile(day, dateEl.value);
    return;
  }

  // dat browse actions
  if (e.target.classList.contains('date-next')) {
    addDays(1);
    return;
  }
  if (e.target.classList.contains('date-prev')) {
    addDays(-1);
    return;
  }

  // handle start and stop button actions
  if (e.target.type === 'button') {
    const day = getCurrentDay();

    switch (e.target.value) {
    case 'start':
      // start current timer
      console.log('timer start');
      day.currentTimer = new Date(currentDate);
      break;
    case 'stop':
      // stop the current timer and add the new entry
      console.log('timer stop');
      day.entries.push({
        desc: day.currentDesc,
        begin: day.currentTimer,
        end: new Date(),
      });

      day.currentDesc = '';
      day.currentTimer = undefined;
      break;

    case 'delete':
        // get index
        const indexEl = e.target.closest('[data-index]');
        if (!indexEl) {
          console.error('Trying to remove entry without index');
          return;
        }

        const index = indexEl.getAttribute('data-index');
        console.log('delete index: ' + index);
        day.entries.splice(index, 1);
      break;
    }

    save();

    render();
  }
});

initialize()
  .then(() => console.log('init done'))
  .catch(reportExecuteScriptError);

async function openNewWindow() {
  let popupURL = browser.extension.getURL("popup/worktimer.html");

  const windowInfo = await browser.windows.create({
    url: popupURL,
    type: "popup",
    height: 400,
    width: 595,
  });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to execute work timer script: ${error.message}`);
}

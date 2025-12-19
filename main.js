const WORKER_URL = "https://slient-star-fba7.kanikani34423.workers.dev/";
const LIFF_ID = "2008726714-eZTej71E";

let userId = "";
let tasks = [];
let filter = "todo";

(async () => {
  await liff.init({ liffId: LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  const profile = await liff.getProfile();
  userId = profile.userId;

  document.getElementById("userLabel").textContent =
    `User: ${userId.slice(0, 6)}****`;

  await loadTasks();
})();

async function loadTasks() {
  const res = await fetch(
    `${WORKER_URL}/tasks?userId=${encodeURIComponent(userId)}`
  );
  tasks = await res.json();
  render();
}

async function addTask() {
  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!title || !date) return;

  const timestamp = time
    ? new Date(`${date}T${time}`).getTime()
    : new Date(`${date}T09:00`).getTime();

  await fetch(`${WORKER_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      userId,
      title,
      date,
      time: timestamp
    })
  });

  document.getElementById("title").value = "";
  await loadTasks();
}

function setFilter(f) {
  filter = f;
  render();
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  tasks
    .filter(t => t.status === filter)
    .sort((a, b) => a.time - b.time)
    .forEach(t => {
      const div = document.createElement("div");
      div.className = `task ${t.status}`;

      const date = new Date(t.time);

      div.innerHTML = `
        <div class="info">
          <div>${t.title}</div>
          <div class="time">
            ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <button onclick="nextStatus('${t.id}')">
          ${t.status === "todo" ? "▶" : t.status === "doing" ? "✓" : "↩"}
        </button>
      `;

      list.appendChild(div);
    });
}

async function nextStatus(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.status === "todo") task.status = "doing";
  else if (task.status === "doing") task.status = "done";
  else task.status = "todo";

  await fetch(`${WORKER_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task)
  });

  await loadTasks();
}

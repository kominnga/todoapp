const API_BASE = "https://empty-haze-29be.kanikani34423.workers.dev";

async function initLiff() {
  await liff.init({ liffId: "2008726714-eZTej71E" });
  if (!liff.isLoggedIn()) liff.login();
  loadTodos();
}

// Todo取得
async function loadTodos() {
  const res = await fetch(`${API_BASE}/todos`);
  const todos = await res.json();
  const list = document.getElementById("todoList");
  list.innerHTML = "";
  todos.forEach(todo => {
    const li = document.createElement("li");
    li.textContent = `${todo.title} - ${todo.datetime}`;
    list.appendChild(li);
  });
}

// Todo追加
async function addTodo() {
  const title = document.getElementById("title").value;
  const datetime = document.getElementById("datetime").value;
  if (!title || !datetime) return alert("タイトルと日時を入力");

  const profile = await liff.getProfile();
  const res = await fetch(`${API_BASE}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, datetime, userId: profile.userId }),
  });
  await res.json();
  loadTodos();
}

// 通知用タイマー（ブラウザ側簡易版）
function setupNotificationChecker() {
  setInterval(async () => {
    const res = await fetch(`${API_BASE}/todos`);
    const todos = await res.json();
    const now = new Date();
    todos.forEach(async todo => {
      const todoTime = new Date(todo.datetime);
      const diff = (todoTime - now) / 1000; // 秒差
      // 5分前通知
      if (diff > 0 && diff <= 300 && !todo.notifiedBefore) {
        await sendLineMessage(`5分前: ${todo.title}`);
        todo.notifiedBefore = true;
      }
      // 5分後通知
      if (diff < -300 && !todo.notifiedAfter) {
        await sendLineMessage(`5分後: ${todo.title}`);
        todo.notifiedAfter = true;
      }
    });
  }, 60000); // 1分ごと
}

// LINE通知
async function sendLineMessage(msg) {
  const token = "YOUR_CHANNEL_ACCESS_TOKEN";
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      to: "USER_ID_OR_GROUP_ID",
      messages: [{ type: "text", text: msg }]
    })
  });
}

document.getElementById("addBtn").addEventListener("click", addTodo);
initLiff();
setupNotificationChecker();

const STORAGE_KEY = "fine_todos";
let currentFilter = "all";

// ===== LIFF 初期化 =====
liff.init({ liffId: "2008726714-eZTej71E" });

// ===== Storage =====
function getTodos() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// ===== 追加 =====
function addTodo() {
  const title = document.getElementById("title").value;
  const energy = document.getElementById("energy").value;
  const startTime = document.getElementById("startTime").value;

  if (!title) return;

  const todos = getTodos();
  todos.push({
    title,
    energy,
    startTime,
    status: "todo",
    notified: false,        // 開始時間通知
    created: Date.now()
  });

  saveTodos(todos);
  document.getElementById("title").value = "";
  render();
}

// ===== フィルタ =====
function setFilter(filter) {
  currentFilter = filter;
  render();
}

// ===== 状態変更（★ここが本命）=====
function changeStatus(index) {
  const todos = getTodos();
  const todo = todos[index];

  // todo → doing
  if (todo.status === "todo") {
    todo.status = "doing";

    // ★ 実行開始通知
    if (liff.isInClient()) {
      liff.sendMessages([
        {
          type: "text",
          text: `▶ 実行開始\n「${todo.title}」を始めました`
        }
      ]);
    }

  }
  // doing → done
  else if (todo.status === "doing") {
    todo.status = "done";
  }
  // done → todo
  else {
    todo.status = "todo";
    todo.notified = false; // 開始時間通知リセット
  }

  saveTodos(todos);
  render();
}

// ===== 表示用 =====
function labelEnergy(e) {
  return ["低", "中", "高"][e - 1];
}

function labelStatus(s) {
  if (s === "todo") return "▶ 実行開始";
  if (s === "doing") return "✔ 終了";
  return "↩ 戻す";
}

// ===== 描画 =====
function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let todos = getTodos();

  // ★ 実行中を一番上に固定
  todos.sort((a, b) => {
    if (a.status === "doing" && b.status !== "doing") return -1;
    if (a.status !== "doing" && b.status === "doing") return 1;
    return a.created - b.created;
  });

  if (currentFilter !== "all") {
    todos = todos.filter(t => t.status === currentFilter);
  }

  if (todos.length === 0) {
    list.innerHTML = "<p style='text-align:center;'>ToDoなし</p>";
    return;
  }

  todos.forEach((todo, index) => {
    const div = document.createElement("div");
    div.className = `todo ${todo.status}`;

    div.innerHTML = `
      <b>${todo.title}</b><br>
      <small>
        ${todo.startTime ? "🕒 " + todo.startTime + " / " : ""}
        気力：${labelEnergy(todo.energy)}
      </small><br>
      <button onclick="changeStatus(${index})">
        ${labelStatus(todo.status)}
      </button>
    `;

    list.appendChild(div);
  });
}

// ===== 開始時間通知 =====
function checkStartTimeNotification() {
  const todos = getTodos();
  const now = new Date();

  const nowHHMM =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  let changed = false;

  todos.forEach(todo => {
    if (
      todo.startTime === nowHHMM &&
      todo.status === "todo" &&
      !todo.notified
    ) {
      if (liff.isInClient()) {
        liff.sendMessages([
          {
            type: "text",
            text: `⏰ ${todo.startTime}\n「${todo.title}」の開始時間です`
          }
        ]);
      }

      todo.notified = true;
      changed = true;
    }
  });

  if (changed) saveTodos(todos);
}

// ★ 1分ごとにチェック
setInterval(checkStartTimeNotification, 60 * 1000);

// 初期表示
render();

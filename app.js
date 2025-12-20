const API_BASE = "https://empty-haze-29be.kanikani34423.workers.dev/";

async function initLiff() {
  await liff.init({ liffId: "2008726714-eZTej71E" });
  if (!liff.isLoggedIn()) await liff.login();

  document.getElementById("addBtn").addEventListener("click", addTodo);
  loadTodos();
}

// Todo取得してリスト分け
async function loadTodos() {
  const res = await fetch(`${API_BASE}/todos`);
  const todos = await res.json();

  const planned = document.getElementById("plannedList");
  const unfinished = document.getElementById("unfinishedList");
  const finished = document.getElementById("finishedList");

  planned.innerHTML = unfinished.innerHTML = finished.innerHTML = "";

  const now = new Date();

  todos.forEach(todo => {
    const li = document.createElement("li");
    const dt = new Date(todo.datetime);
    li.textContent = `${todo.title} (${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours()}:${("0"+dt.getMinutes()).slice(-2)})`;

    // 完了ボタン
    if (!todo.done) {
      const doneBtn = document.createElement("button");
      doneBtn.textContent = "完了";
      doneBtn.onclick = async () => { await toggleDone(todo.id, true); loadTodos(); };
      li.appendChild(doneBtn);
    } else {
      li.classList.add("done");
      const undoBtn = document.createElement("button");
      undoBtn.textContent = "未完了に戻す";
      undoBtn.onclick = async () => { await toggleDone(todo.id, false); loadTodos(); };
      li.appendChild(undoBtn);
    }

    // 分ける
    if (dt > now && !todo.done) planned.appendChild(li);
    else if (!todo.done) unfinished.appendChild(li);
    else finished.appendChild(li);
  });
}

// 完了状態切替
async function toggleDone(id, done) {
  const todos = await (await fetch(`${API_BASE}/todos`)).json();
  const todo = todos.find(t=>t.id===id);
  if (!todo) return;
  todo.done = done;
  await fetch(`${API_BASE}/todos`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(todo) 
  });
}

// Todo追加
async function addTodo() {
  const title = document.getElementById("title").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!title || !date || !time) {
    alert("タイトル・日付・時間を入力してください");
    return;
  }

  const datetime = new Date(`${date}T${time}`).toISOString();
  const profile = await liff.getProfile();

  try {
    const res = await fetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, datetime, userId: profile.userId }),
    });

    if (!res.ok) {
      console.error(await res.text());
      alert("Todo 追加に失敗しました");
      return;
    }

    document.getElementById("title").value = "";
    document.getElementById("date").value = "";
    document.getElementById("time").value = "";

    loadTodos();
  } catch (err) {
    console.error(err);
    alert("ネットワークエラー");
  }
}

initLiff();


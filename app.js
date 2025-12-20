const API_BASE = "https://empty-haze-29be.kanikani34423.workers.dev"; // Worker URL
const LIFF_ID = "2008726714-eZTej71E"; // 自分のLIFF IDに置き換え

async function initLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) await liff.login();
    document.getElementById("addBtn").addEventListener("click", addTodo);
    loadTodos();
  } catch (err) {
    console.error("LIFF 初期化エラー", err);
    alert("LIFF 初期化に失敗しました");
  }
}

async function loadTodos() {
  try {
    const res = await fetch(`${API_BASE}/todos`);
    if (!res.ok) throw new Error(await res.text());
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

      if (dt > now && !todo.done) planned.appendChild(li);
      else if (!todo.done) unfinished.appendChild(li);
      else finished.appendChild(li);
    });
  } catch (err) {
    console.error("Todoロード失敗", err);
    alert("Todo取得に失敗しました");
  }
}

async function toggleDone(id, done) {
  try {
    const todos = await (await fetch(`${API_BASE}/todos`)).json();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.done = done;

    await fetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo)
    });
  } catch (err) {
    console.error("完了状態変更エラー", err);
    alert("Todo 更新に失敗しました");
  }
}

async function addTodo() {
  const title = document.getElementById("title").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;

  if (!title || !date || !time) {
    alert("タイトル・日付・時間を入力してください");
    return;
  }

  const datetime = new Date(`${date}T${time}`).toISOString();

  try {
    const profile = await liff.getProfile();

    const res = await fetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        datetime,
        userId: profile.userId
      })
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
    console.error("Todo追加エラー", err);
    alert("ネットワークエラー");
  }
}

initLiff();

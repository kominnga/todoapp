const STORAGE_KEY = "todos";
let currentFilter = "all";
let userId = null;

// ===== Storage =====
const getTodos = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTodos = (todos) => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

// ===== util =====
function nowHHMM() { return new Date().toTimeString().slice(0,5); }
function dayOfWeek(dateStr) {
  const days = ["日","月","火","水","木","金","土"];
  return days[new Date(dateStr).getDay()];
}

// ===== タスク追加 =====
async function addTodo() {
  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  if (!title || !date) return;

  const todos = getTodos();
  const todo = {
    id: Date.now().toString(),
    userId,
    title, date, startTime,
    status:"todo", notifiedBefore:false, notifiedLate:false,
    createdAt: Date.now(),
    startedAt:null, endedAt:null
  };
  todos.push(todo);
  saveTodos(todos);
  document.getElementById("title").value="";
  render();

  // Worker に送信
  fetch("https://empty-haze-29be.kanikani34423.workers.dev", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(todo)
  });
}

// ===== フィルタ =====
function setFilter(filter) { currentFilter = filter; render(); }

// ===== 状態変更 =====
function changeStatus(index){
  const todos = getTodos();
  const todo = todos[index];

  if(todo.status==="todo"){ todo.status="doing"; todo.startedAt=Date.now(); }
  else if(todo.status==="doing"){ todo.status="done"; todo.endedAt=Date.now(); }
  else { todo.status="todo"; todo.notifiedBefore=false; todo.notifiedLate=false; }

  saveTodos(todos);
  render();
}

// ===== 描画 =====
function render(){
  const list = document.getElementById("list");
  list.innerHTML="";
  let todos = getTodos();

  todos = todos.filter(t => t.userId === userId);

  if(currentFilter!=="all") todos = todos.filter(t=>t.status===currentFilter);

  if(!todos.length){ list.innerHTML="<p style='text-align:center;'>ToDoなし</p>"; return; }

  const now = nowHHMM();
  todos.forEach((todo,i)=>{
    const div = document.createElement("div");
    div.className=`todo ${todo.status}`;

    if(todo.status==="todo" && todo.startTime && todo.startTime<now) div.classList.add("late");
    if(todo.status==="doing" && todo.startedAt && Date.now()-todo.startedAt>60*60*1000) div.classList.add("over");

    let duration="";
    if(todo.startedAt && todo.endedAt){
      const min = Math.floor((todo.endedAt - todo.startedAt)/60000);
      duration = ` ⏱${min}分`;
    }

    div.innerHTML=`
      <div>
        <div class="todo-text">${todo.title}</div>
        <div class="todo-time">${todo.date}(${dayOfWeek(todo.date)}) ${todo.startTime || ""}${duration}</div>
      </div>
      <button onclick="changeStatus(${i})">${todo.status==="todo"?"▶":todo.status==="doing"?"✓":"↩"}</button>
    `;
    list.appendChild(div);
  });
}

// ===== LIFF 初期化 =====
async function main() {
  await liff.init({ liffId: "2008726714-eZTej71E" });
  if (!liff.isInClient()) { alert("LINEアプリ内で開いてください"); return; }
  userId = liff.getContext().userId;
  document.getElementById("user").textContent = `ユーザーID: ${userId}`;
  render();
}

// ===== イベント登録 =====
window.addEventListener("load", main);
document.getElementById("addBtn").addEventListener("click", addTodo);

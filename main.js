export default {
  // =========================
  // fetch（HTTP / LINE / HTML）
  // =========================
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== LINE Webhook =====
    if (url.pathname === "/webhook") {
      const body = await request.json();
      const event = body.events?.[0];

      if (!event || event.type !== "message") {
        return new Response("OK");
      }

      const userId = event.source.userId;
      const text = event.message.text.trim();

      await handleLineCommand(userId, text, env);
      return new Response("OK");
    }

    // ===== HTML → タスク保存 =====
    if (url.pathname === "/tasks" && request.method === "POST") {
      const task = await request.json();

      await env.TASKS.put(task.id, JSON.stringify({
        ...task,
        status: task.status || "todo",
        notifiedBefore: false,
        notifiedLate: false,
        createdAt: Date.now()
      }));

      return new Response("saved");
    }

    return new Response("OK");
  },

  // =========================
  // Cron Trigger（毎分）
  // =========================
  async scheduled(event, env, ctx) {
    await handleCron(env);
  }
};

// =========================
// LINE コマンド処理
// =========================
async function handleLineCommand(userId, text, env) {
  const list = await env.TASKS.list();
  const tasks = [];

  for (const k of list.keys) {
    const t = JSON.parse(await env.TASKS.get(k.name));
    if (t.userId === userId && t.status !== "done") {
      tasks.push({ key: k.name, ...t });
    }
  }

  if (!tasks.length) {
    await sendLine(userId, "📭 操作できるタスクがありません", env);
    return;
  }

  // 一番近いタスク
  const target = tasks.sort((a, b) => a.time - b.time)[0];

  if (text.includes("開始")) {
    target.status = "doing";
    await env.TASKS.put(target.key, JSON.stringify(target));
    await sendLine(userId, `▶ 開始しました\n${target.title}`, env);
  }

  if (text.includes("完了")) {
    target.status = "done";
    await env.TASKS.put(target.key, JSON.stringify(target));
    await sendLine(userId, `✅ 完了しました\n${target.title}`, env);
  }
}

// =========================
// Cron 処理本体
// =========================
async function handleCron(env) {
  const now = new Date();
  const nowMs = Date.now();
  const hour = now.getHours();

  const list = await env.TASKS.list();
  const userTasks = {};

  for (const k of list.keys) {
    const t = JSON.parse(await env.TASKS.get(k.name));

    if (t.status !== "done") {
      userTasks[t.userId] ||= [];
      userTasks[t.userId].push({ key: k.name, ...t });
    }
  }

  // ===== 朝9時まとめ =====
  if (hour === 9) {
    for (const userId in userTasks) {
      const msg = userTasks[userId]
        .map(t => `・${t.title}`)
        .join("\n");

      await sendLine(
        userId,
        `📋 今日のToDo\n\n${msg}`,
        env
      );
    }
  }

  // ===== 5分前 / 5分遅れ =====
  for (const userId in userTasks) {
    for (const t of userTasks[userId]) {
      const diff = Math.floor((t.time - nowMs) / 60000);

      if (diff === 5 && !t.notifiedBefore) {
        await sendLine(userId, `⏰ 5分後です\n${t.title}`, env);
        t.notifiedBefore = true;
      }

      if (diff === -5 && !t.notifiedLate) {
        await sendLine(userId, `⚠ 5分遅れています\n${t.title}`, env);
        t.notifiedLate = true;
      }

      await env.TASKS.put(t.key, JSON.stringify(t));
    }
  }
}

// =========================
// LINE Push 送信
// =========================
async function sendLine(userId, text, env) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }]
    })
  });

  if (!res.ok) {
    console.error("LINE送信失敗", await res.text());
  }
}








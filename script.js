"use strict";

const appRootEl = document.getElementById("app");
const navButtons = Array.from(document.querySelectorAll(".nav-item[data-tab]"));

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${pad2(minutes)}:${pad2(seconds)}:${pad3(millis)}`;
}

function shuffleInPlace(arr) {
  // Fisher–Yates 洗牌算法：保证均匀随机
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickOneExcept(arr, exclude) {
  // 从数组中随机挑选一个不等于 exclude 的值
  if (arr.length <= 1) return arr[0];
  let v = pickOne(arr);
  while (v === exclude) v = pickOne(arr);
  return v;
}

class SchulteModule {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.gridEl = null;
    this.timerEl = null;
    this.timerTextEl = null;

    this.running = false;
    this.startPerf = 0;
    this.rafId = 0;
    this.elapsedMs = 0;

    // 需求写的是 黑/红/蓝；暗色主题下“黑”会看不见，这里用白色作为可视替代
    this.colorPool = ["#ffffff", "#ff5252", "#4dabff"]; // 白(黑的可视替代)、红、蓝

    this.onTimerClick = this.onTimerClick.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.tick = this.tick.bind(this);
  }

  mount() {
    this.rootEl.innerHTML = `
      <div class="module" aria-label="舒尔特方格模块">
        <div class="module-header">
          <div>
            <div class="module-title">舒尔特方格</div>
            <div class="module-subtitle">点击计时器开始，按空格停止</div>
          </div>
        </div>

        <div class="schulte-layout">
          <section class="panel" aria-label="计时器面板">
            <button id="timer" class="timer" type="button" aria-label="点击开始计时">
              <span id="timerText" class="timer-text">00:00:00</span>
              <span class="timer-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2" />
                  <path d="M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </span>
              <span class="timer-stop" aria-hidden="true">停止计时</span>
            </button>
            <div class="hint">
              <div>点击计时器开始（计时器会隐藏）</div>
              <div>按空格停止并显示用时</div>
            </div>
          </section>

          <section class="board" aria-label="6×6 舒尔特方格">
            <div id="grid" class="grid" role="grid" aria-label="数字方格"></div>
          </section>
        </div>
      </div>
    `;

    this.gridEl = this.rootEl.querySelector("#grid");
    this.timerEl = this.rootEl.querySelector("#timer");
    this.timerTextEl = this.rootEl.querySelector("#timerText");

    this.timerEl.addEventListener("click", this.onTimerClick);
    window.addEventListener("keydown", this.onKeydown);

    this.renderGrid();
  }

  unmount() {
    this.stopTimer();
    if (this.timerEl) this.timerEl.removeEventListener("click", this.onTimerClick);
    window.removeEventListener("keydown", this.onKeydown);
    this.rootEl.innerHTML = "";
  }

  renderGrid() {
    // 1) 生成 1~36
    const nums = Array.from({ length: 36 }, (_, i) => i + 1);
    // 2) 随机打乱
    shuffleInPlace(nums);

    // 3) 渲染到 6×6 网格，每个数字随机字体颜色（白/红/蓝）
    this.gridEl.innerHTML = "";
    for (const n of nums) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = String(n);
      cell.style.color = this.colorPool[Math.floor(Math.random() * this.colorPool.length)];
      cell.setAttribute("role", "gridcell");
      this.gridEl.appendChild(cell);
    }
  }

  tick() {
    // 使用 performance.now() 提供更高精度的计时
    this.elapsedMs = performance.now() - this.startPerf;
    // 计时器隐藏时仍在后台更新数值，便于停止时立即展示准确时间
    this.timerTextEl.textContent = formatTime(this.elapsedMs);
    this.rafId = requestAnimationFrame(this.tick);
  }

  startTimer() {
    if (this.running) return;
    this.running = true;
    this.elapsedMs = 0;
    this.timerTextEl.textContent = "00:00:00";
    this.timerEl.classList.add("is-hidden");
    this.timerEl.setAttribute("aria-label", "点击停止计时");
    this.startPerf = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stopTimer() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    // 停止时再计算一次，避免最后一帧延迟导致的误差
    this.elapsedMs = performance.now() - this.startPerf;
    this.timerTextEl.textContent = formatTime(this.elapsedMs);
    this.timerEl.classList.remove("is-hidden");
    this.timerEl.setAttribute("aria-label", "点击开始计时");
  }

  onTimerClick() {
    // 兼容移动端：开始后允许再次点击/触摸同一区域立即停止
    if (this.running) this.stopTimer();
    else this.startTimer();
  }

  onKeydown(e) {
    // 空格键：停止计时
    if (e.code !== "Space") return;
    e.preventDefault();
    this.stopTimer();
  }
}

class StroopModule {
  constructor(rootEl) {
    this.rootEl = rootEl;

    this.colors = [
      { name: "红", hex: "#ff5252" },
      { name: "黄", hex: "#ffd54f" },
      { name: "蓝", hex: "#4dabff" },
      { name: "绿", hex: "#66bb6a" },
      { name: "紫", hex: "#ba68c8" },
    ];

    this.total = 20;
    this.index = 0;
    this.correct = 0;
    this.started = false;
    this.startPerf = 0;

    this.currentWord = null; // {text, inkName, inkHex}

    this.onChoose = this.onChoose.bind(this);
  }

  mount() {
    this.rootEl.innerHTML = `
      <div class="module" aria-label="斯特鲁普测试模块">
        <div class="module-header">
          <div>
            <div class="module-title">斯特鲁普测试 (Stroop)</div>
            <div class="module-subtitle">请选择“字体实际颜色”，不要选字面意思</div>
          </div>
          <div class="progress" id="stroopProgress">0/${this.total}</div>
        </div>

        <div class="card">
          <div id="stroopWord" class="stroop-word">点击任意颜色开始</div>
          <div class="btn-row" id="stroopButtons"></div>
        </div>

        <div id="stroopResult" class="result" aria-live="polite"></div>
      </div>
    `;

    const btnRow = this.rootEl.querySelector("#stroopButtons");
    btnRow.innerHTML = this.colors
      .map((c) => `<button class="btn" type="button" data-color="${c.name}">${c.name}</button>`)
      .join("");

    btnRow.addEventListener("click", this.onChoose);

    this.nextTrial();
  }

  unmount() {
    const btnRow = this.rootEl.querySelector("#stroopButtons");
    if (btnRow) btnRow.removeEventListener("click", this.onChoose);
    this.rootEl.innerHTML = "";
  }

  generateTrial() {
    // Stroop 的“冲突生成逻辑”：
    // - 随机抽取一个“文字内容”(红/黄/蓝/绿/紫)
    // - 再随机决定“渲染颜色”
    // - 为了训练效果，让“冲突”的概率更高（例如 70% 冲突、30% 一致）
    const word = pickOne(this.colors);
    const conflictProb = 0.7;

    let ink;
    if (Math.random() < conflictProb) {
      ink = pickOneExcept(this.colors, word);
    } else {
      ink = word;
    }

    return {
      text: word.name,
      inkName: ink.name,
      inkHex: ink.hex,
    };
  }

  nextTrial() {
    if (this.index >= this.total) {
      this.finish();
      return;
    }

    this.currentWord = this.generateTrial();
    const wordEl = this.rootEl.querySelector("#stroopWord");
    const progressEl = this.rootEl.querySelector("#stroopProgress");
    const resultEl = this.rootEl.querySelector("#stroopResult");

    resultEl.textContent = "";
    progressEl.textContent = `${this.index + 1}/${this.total}`;
    wordEl.textContent = this.currentWord.text;
    wordEl.style.color = this.currentWord.inkHex;
  }

  onChoose(e) {
    const btn = e.target.closest("button[data-color]");
    if (!btn) return;

    if (!this.started) {
      this.started = true;
      this.startPerf = performance.now();
    }

    const chosen = btn.dataset.color;
    if (chosen === this.currentWord.inkName) this.correct += 1;
    this.index += 1;
    this.nextTrial();
  }

  finish() {
    const costMs = this.started ? performance.now() - this.startPerf : 0;
    const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
    const resultEl = this.rootEl.querySelector("#stroopResult");
    resultEl.textContent = `完成！总耗时：${formatTime(costMs)}；正确率：${accuracy}%（${this.correct}/${this.total}）`;
  }
}

class NBackModule {
  constructor(rootEl) {
    this.rootEl = rootEl;

    this.n = 2;
    this.total = 20;
    this.stepMs = 2000;
    this.showMs = 1000;

    this.sequence = []; // 字母序列
    this.isMatchArr = []; // 每个位置是否为匹配项

    this.index = 0;
    this.running = false;

    this.matchesCount = 0;
    this.hits = 0;
    this.falseAlarms = 0;
    this.responded = false;

    this.startPerf = 0;
    this.timeouts = new Set();

    this.onMatch = this.onMatch.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  mount() {
    this.rootEl.innerHTML = `
      <div class="module" aria-label="N-Back 模块">
        <div class="module-header">
          <div>
            <div class="module-title">N-Back 训练 (默认 2-Back)</div>
            <div class="module-subtitle">当 当前字母与前 2 个字母中有一个相同的，点击“匹配”或按 M</div>
          </div>
          <div class="progress" id="nbackProgress">0/${this.total}</div>
        </div>

        <div class="card">
          <div id="nbackLetter" class="nback-letter">准备</div>
          <div class="btn-row">
            <button id="nbackStart" class="btn" type="button">开始</button>
            <button id="nbackMatch" class="btn" type="button" disabled>匹配 (M)</button>
          </div>
        </div>

        <div id="nbackResult" class="result" aria-live="polite"></div>
      </div>
    `;

    this.rootEl.querySelector("#nbackStart").addEventListener("click", () => this.start());
    this.rootEl.querySelector("#nbackMatch").addEventListener("click", this.onMatch);
    window.addEventListener("keydown", this.onKeydown);
  }

  unmount() {
    this.stop();
    const matchBtn = this.rootEl.querySelector("#nbackMatch");
    if (matchBtn) matchBtn.removeEventListener("click", this.onMatch);
    window.removeEventListener("keydown", this.onKeydown);
    this.rootEl.innerHTML = "";
  }

  clearAllTimeouts() {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts.clear();
  }

  stop() {
    this.running = false;
    this.clearAllTimeouts();
  }

  buildSequence() {
    // N-Back 的“队列比对逻辑”核心：
    // - 在位置 i，若 i>=n 且 sequence[i] === sequence[i-n]，则该位置是匹配项
    // 本需求要求至少 30% 匹配项：这里用“目标匹配数 + 强制生成”实现。
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const targetMatches = Math.ceil(this.total * 0.3);

    const seq = [];
    const isMatch = Array(this.total).fill(false);
    let matches = 0;

    for (let i = 0; i < this.total; i++) {
      const canMatch = i >= this.n;
      const remaining = this.total - i;
      const remainingNeed = targetMatches - matches;

      // 若后面剩余数量刚好需要全部做匹配，则强制匹配
      const mustMatch = canMatch && remainingNeed > 0 && remainingNeed === remaining;
      const wantMatch = canMatch && (mustMatch || (matches < targetMatches && Math.random() < 0.35));

      if (wantMatch) {
        seq[i] = seq[i - this.n];
        isMatch[i] = true;
        matches += 1;
      } else {
        const exclude = canMatch ? seq[i - this.n] : null;
        seq[i] = exclude ? pickOneExcept(letters, exclude) : pickOne(letters);
      }
    }

    this.sequence = seq;
    this.isMatchArr = isMatch;
    this.matchesCount = matches;
  }

  start() {
    if (this.running) return;

    this.buildSequence();
    this.index = 0;
    this.hits = 0;
    this.falseAlarms = 0;
    this.responded = false;
    this.running = true;
    this.startPerf = performance.now();

    this.rootEl.querySelector("#nbackResult").textContent = "";
    this.rootEl.querySelector("#nbackStart").disabled = true;
    this.rootEl.querySelector("#nbackMatch").disabled = false;

    this.step();
  }

  step() {
    if (!this.running) return;
    if (this.index >= this.total) {
      this.finish();
      return;
    }

    const letterEl = this.rootEl.querySelector("#nbackLetter");
    const progressEl = this.rootEl.querySelector("#nbackProgress");
    progressEl.textContent = `${this.index + 1}/${this.total}`;

    this.responded = false;
    letterEl.textContent = this.sequence[this.index];

    // 1 秒后隐藏字母
    this.timeouts.add(
      setTimeout(() => {
        if (!this.running) return;
        letterEl.textContent = "";
      }, this.showMs)
    );

    // 2 秒后进入下一步
    this.timeouts.add(
      setTimeout(() => {
        if (!this.running) return;
        this.index += 1;
        this.step();
      }, this.stepMs)
    );
  }

  onMatch() {
    if (!this.running) return;
    if (this.responded) return;
    this.responded = true;

    const isMatch = this.isMatchArr[this.index];
    if (isMatch) this.hits += 1;
    else this.falseAlarms += 1;
  }

  onKeydown(e) {
    if (e.code !== "KeyM") return;
    this.onMatch();
  }

  finish() {
    this.stop();

    const costMs = performance.now() - this.startPerf;
    const nonMatch = this.total - this.matchesCount;
    const hitRate = this.matchesCount > 0 ? Math.round((this.hits / this.matchesCount) * 100) : 0;
    const falseAlarmRate = nonMatch > 0 ? Math.round((this.falseAlarms / nonMatch) * 100) : 0;

    this.rootEl.querySelector("#nbackStart").disabled = false;
    this.rootEl.querySelector("#nbackMatch").disabled = true;

    const resultEl = this.rootEl.querySelector("#nbackResult");
    resultEl.textContent = `完成！总耗时：${formatTime(costMs)}；命中率：${hitRate}%（${this.hits}/${this.matchesCount}）  误报率：${falseAlarmRate}%（${this.falseAlarms}/${nonMatch}）`;
  }
}

class App {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.current = null;
    this.modules = {
      schulte: () => new SchulteModule(this.rootEl),
      stroop: () => new StroopModule(this.rootEl),
      nback: () => new NBackModule(this.rootEl),
    };
  }

  setActive(tab) {
    if (!this.modules[tab]) return;

    if (this.current) this.current.unmount();
    this.current = this.modules[tab]();
    this.current.mount();
  }
}

const app = new App(appRootEl);

function setActiveNav(tab) {
  for (const b of navButtons) {
    b.classList.toggle("is-active", b.dataset.tab === tab);
  }
}

for (const btn of navButtons) {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    setActiveNav(tab);
    app.setActive(tab);
  });
}

// 默认进入舒尔特方格
setActiveNav("schulte");
app.setActive("schulte");

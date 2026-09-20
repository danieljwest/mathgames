(() => {
  const TICKET_BANDS = [
    { min: 50, tickets: 5 },
    { min: 45, tickets: 4 },
    { min: 35, tickets: 3 },
    { min: 27, tickets: 2 },
    { min: 20, tickets: 1 },
  ];
  const LOOKAHEAD = 5;
  const PAST_VISIBLE = 3;

  function ticketsForCorrect(correct) {
    for (const band of TICKET_BANDS) {
      if (correct >= band.min) return band.tickets;
    }
    return 0;
  }

  function formatTime(date = new Date()) {
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function burstConfetti(count = 48) {
    const layer = document.createElement("div");
    layer.className = "confetti";
    const colors = ["#d6f24a", "#ff5c3a", "#6ef0c2", "#ffc14d", "#f3f0e6"];
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.setProperty("--c", colors[i % colors.length]);
      piece.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
      piece.style.animationDelay = `${Math.random() * 0.35}s`;
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    window.setTimeout(() => layer.remove(), 3600);
  }

  function flashScreen() {
    let flash = document.querySelector(".flash");
    if (!flash) {
      flash = document.createElement("div");
      flash.className = "flash";
      document.body.appendChild(flash);
    }
    flash.classList.remove("on");
    void flash.offsetWidth;
    flash.classList.add("on");
  }

  function createChallenge(config) {
    const duration = config.duration ?? 60;
    const lookahead = config.lookahead ?? LOOKAHEAD;
    const els = {
      ready: document.getElementById("screen-ready"),
      play: document.getElementById("screen-play"),
      done: document.getElementById("screen-done"),
      prompt: document.getElementById("prompt"),
      answer: document.getElementById("answer"),
      upcoming: document.getElementById("problem-rail"),
      railTrack: null,
      reviewList: document.getElementById("review-list"),
      timer: document.getElementById("stat-timer"),
      correct: document.getElementById("stat-correct"),
      incorrect: document.getElementById("stat-incorrect"),
      score: document.getElementById("stat-score"),
      finalScore: document.getElementById("final-score"),
      finalCorrect: document.getElementById("final-correct"),
      finalIncorrect: document.getElementById("final-incorrect"),
      finalTickets: document.getElementById("final-tickets"),
      finalTime: document.getElementById("final-time"),
      ticketRow: document.getElementById("ticket-row"),
      ticketMessage: document.getElementById("ticket-message"),
    };

    const state = {
      running: false,
      remaining: duration,
      correct: 0,
      incorrect: 0,
      queue: [],
      history: [],
      timerId: null,
      accepting: true,
      advanceTimer: null,
      phase: "ready",
    };

    function show(screen) {
      [els.ready, els.play, els.done].forEach((node) => {
        if (node) node.classList.toggle("active", node === screen);
      });
      document.querySelector(".playfield")?.classList.toggle(
        "playfield-review",
        screen === els.done
      );
    }

    function setDoneControls(armed) {
      const confirmRow = document.getElementById("done-confirm");
      const restartRow = document.getElementById("done-restart");
      if (confirmRow) confirmRow.hidden = armed;
      if (restartRow) restartRow.hidden = !armed;
    }

    function armRestart() {
      if (state.phase !== "done") return;
      state.phase = "done-armed";
      setDoneControls(true);
      window.setTimeout(() => document.body.focus(), 0);
    }

    function score() {
      return state.correct - state.incorrect;
    }

    function current() {
      return state.queue[0] ?? null;
    }

    function fillQueue() {
      while (state.queue.length < lookahead + 1) {
        state.queue.push(config.nextProblem());
      }
    }

    function renderHud() {
      els.timer.textContent = String(state.remaining);
      els.correct.textContent = String(state.correct);
      els.incorrect.textContent = String(state.incorrect);
      els.score.textContent = String(score());
      els.timer.classList.toggle("urgent", state.running && state.remaining <= 10);
    }

    function buildRailItems() {
      const past = state.history.slice(-PAST_VISIBLE).reverse();
      const next = state.queue.slice(1, 1 + lookahead);
      return [
        ...past.map((entry) => ({
          kind: "past",
          ok: entry.ok,
          text: entry.ok
            ? `${entry.prompt} = ${entry.given}`
            : `${entry.prompt} ≠ ${entry.given}`,
        })),
        ...next.map((problem) => ({
          kind: "next",
          text: problem.prompt,
        })),
      ];
    }

    function paintRail(items) {
      if (!els.upcoming) return;
      els.upcoming.innerHTML = "";
      const track = document.createElement("div");
      track.className = "rail-track";
      track.id = "rail-track";
      items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = `rail-item ${item.kind}${
          item.kind === "past" ? (item.ok ? " ok" : " bad") : ""
        }`;
        row.style.setProperty("--i", String(index));
        if (item.kind === "past") {
          row.innerHTML = `<span class="rail-mark" aria-hidden="true">${
            item.ok ? "✓" : "✗"
          }</span><span class="rail-text">${item.text}</span>`;
        } else {
          row.innerHTML = `<span class="rail-mark" aria-hidden="true">→</span><span class="rail-text">${item.text}</span>`;
        }
        track.appendChild(row);
      });
      els.upcoming.appendChild(track);
      els.railTrack = track;
    }

    function renderRail({ animate = false } = {}) {
      if (!els.upcoming) return;
      const items = buildRailItems();
      if (!animate || !els.railTrack || items.length === 0) {
        paintRail(items);
        return;
      }

      const track = els.railTrack;
      const firstRow = track.querySelector(".rail-item");
      const distance = firstRow ? firstRow.getBoundingClientRect().height + 8 : 40;
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      void track.offsetWidth;
      track.style.transition = "transform 180ms ease";
      track.classList.add("is-shifting");
      track.style.transform = `translateY(-${distance}px)`;

      window.setTimeout(() => {
        paintRail(items);
      }, 180);
    }

    function renderProblem({ animateRail = false } = {}) {
      const problem = current();
      if (!problem) return;
      els.prompt.textContent = problem.prompt;
      els.answer.value = "";
      els.prompt.classList.remove("wrong", "right");
      renderRail({ animate: animateRail });
      state.accepting = true;
      els.answer.focus();
    }

    function renderReview() {
      if (!els.reviewList) return;
      els.reviewList.innerHTML = "";
      if (state.history.length === 0) {
        const empty = document.createElement("li");
        empty.className = "review-empty";
        empty.textContent = "No answers this round.";
        els.reviewList.appendChild(empty);
        return;
      }

      state.history.forEach((entry) => {
        const item = document.createElement("li");
        item.className = `review-item ${entry.ok ? "ok" : "bad"}`;
        const mark = entry.ok ? "✓" : "✗";
        const detail = entry.ok
          ? `${entry.prompt} = ${entry.given}`
          : `${entry.prompt} → you ${entry.given}, answer ${entry.answer}`;
        item.innerHTML = `<span class="review-mark" aria-hidden="true">${mark}</span><span class="review-detail">${detail}</span>`;
        els.reviewList.appendChild(item);
      });
    }

    function finish() {
      if (!state.running) return;
      state.running = false;
      window.clearInterval(state.timerId);
      window.clearTimeout(state.advanceTimer);
      const endedAt = new Date();
      const tickets = ticketsForCorrect(state.correct);
      els.finalScore.textContent = String(score());
      els.finalCorrect.textContent = String(state.correct);
      els.finalIncorrect.textContent = String(state.incorrect);
      els.finalTickets.textContent = String(tickets);
      els.finalTime.textContent = formatTime(endedAt);
      els.ticketRow.innerHTML = "";
      for (let i = 0; i < tickets; i += 1) {
        const ticket = document.createElement("div");
        ticket.className = "ticket";
        ticket.setAttribute("aria-hidden", "true");
        els.ticketRow.appendChild(ticket);
      }
      if (tickets === 0) {
        els.ticketMessage.textContent =
          "No tickets this round — hit 20 correct to earn your first from Mrs. West!";
      } else if (tickets === 1) {
        els.ticketMessage.textContent =
          "You earned 1 ticket. Wave Mrs. West over!";
      } else {
        els.ticketMessage.textContent = `You earned ${tickets} tickets. Wave Mrs. West over!`;
      }
      renderReview();
      state.phase = "done";
      setDoneControls(false);
      show(els.done);
      if (tickets > 0) burstConfetti(36 + tickets * 10);
      flashScreen();
      window.setTimeout(() => {
        document.querySelector("[data-action='confirm-score']")?.focus();
      }, 0);
    }

    function tick() {
      state.remaining -= 1;
      renderHud();
      if (state.remaining <= 0) finish();
    }

    function advance() {
      state.queue.shift();
      fillQueue();
      renderProblem({ animateRail: true });
    }

    function start() {
      if (state.phase === "done") return;
      window.clearInterval(state.timerId);
      window.clearTimeout(state.advanceTimer);
      state.running = true;
      state.phase = "play";
      state.remaining = duration;
      state.correct = 0;
      state.incorrect = 0;
      state.queue = [];
      state.history = [];
      fillQueue();
      renderHud();
      show(els.play);
      renderProblem();
      state.timerId = window.setInterval(tick, 1000);
    }

    function submit() {
      if (!state.running || !state.accepting) return;
      const problem = current();
      if (!problem) return;
      const raw = els.answer.value.trim();
      if (raw === "") return;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;

      state.accepting = false;
      const ok = value === problem.answer;
      state.history.push({
        prompt: problem.prompt,
        answer: problem.answer,
        given: value,
        ok,
      });
      if (ok) {
        state.correct += 1;
        els.prompt.classList.add("right");
        flashScreen();
      } else {
        state.incorrect += 1;
        els.prompt.classList.add("wrong");
      }
      renderHud();
      window.clearTimeout(state.advanceTimer);
      state.advanceTimer = window.setTimeout(advance, ok ? 90 : 220);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        if (state.running) {
          event.preventDefault();
          finish();
        }
        return;
      }

      if (!state.running) {
        if (event.key === "Enter" || event.key === " ") {
          const tag = document.activeElement?.tagName;
          if (tag === "A" || tag === "BUTTON") return;
          if (state.phase !== "ready" && state.phase !== "done-armed") {
            return;
          }
          event.preventDefault();
          start();
        }
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    els.answer?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    els.answer?.addEventListener("input", () => {
      els.answer.value = els.answer.value.replace(/[^\d-]/g, "");
    });
    document.addEventListener("pointerdown", () => {
      if (state.running) {
        window.setTimeout(() => els.answer?.focus(), 0);
      }
    });

    document.querySelectorAll("[data-action='start']").forEach((node) => {
      node.addEventListener("click", start);
    });
    document.querySelectorAll("[data-action='confirm-score']").forEach((node) => {
      node.addEventListener("click", armRestart);
    });
    document.querySelectorAll("[data-action='again']").forEach((node) => {
      node.addEventListener("click", () => {
        if (state.phase === "done-armed") start();
      });
    });

    show(els.ready);
    setDoneControls(false);
    renderHud();
    window.setTimeout(() => document.body.focus(), 0);

    return { start, finish };
  }

  window.MathGames = {
    createChallenge,
    ticketsForCorrect,
    formatTime,
  };
})();

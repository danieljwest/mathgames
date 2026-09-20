(() => {
  const TICKET_BANDS = [
    { min: 50, tickets: 5 },
    { min: 45, tickets: 4 },
    { min: 35, tickets: 3 },
    { min: 27, tickets: 2 },
    { min: 20, tickets: 1 },
  ];

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
    const els = {
      ready: document.getElementById("screen-ready"),
      play: document.getElementById("screen-play"),
      done: document.getElementById("screen-done"),
      prompt: document.getElementById("prompt"),
      answer: document.getElementById("answer"),
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
      current: null,
      timerId: null,
      accepting: true,
    };

    function show(screen) {
      [els.ready, els.play, els.done].forEach((node) => {
        if (node) node.classList.toggle("active", node === screen);
      });
    }

    function score() {
      return state.correct - state.incorrect;
    }

    function renderHud() {
      els.timer.textContent = String(state.remaining);
      els.correct.textContent = String(state.correct);
      els.incorrect.textContent = String(state.incorrect);
      els.score.textContent = String(score());
      els.timer.classList.toggle("urgent", state.running && state.remaining <= 10);
    }

    function nextProblem() {
      state.current = config.nextProblem();
      els.prompt.textContent = state.current.prompt;
      els.answer.value = "";
      els.prompt.classList.remove("wrong", "right");
      state.accepting = true;
      els.answer.focus();
    }

    function finish() {
      if (!state.running) return;
      state.running = false;
      window.clearInterval(state.timerId);
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
      show(els.done);
      if (tickets > 0) burstConfetti(36 + tickets * 10);
      flashScreen();
    }

    function tick() {
      state.remaining -= 1;
      renderHud();
      if (state.remaining <= 0) finish();
    }

    function start() {
      state.running = true;
      state.remaining = duration;
      state.correct = 0;
      state.incorrect = 0;
      renderHud();
      show(els.play);
      nextProblem();
      window.clearInterval(state.timerId);
      state.timerId = window.setInterval(tick, 1000);
    }

    function submit() {
      if (!state.running || !state.accepting) return;
      const raw = els.answer.value.trim();
      if (raw === "") return;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;

      state.accepting = false;
      const ok = value === state.current.answer;
      if (ok) {
        state.correct += 1;
        els.prompt.classList.add("right");
        flashScreen();
      } else {
        state.incorrect += 1;
        els.prompt.classList.add("wrong");
      }
      renderHud();
      window.setTimeout(nextProblem, ok ? 140 : 280);
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
    document.querySelectorAll("[data-action='again']").forEach((node) => {
      node.addEventListener("click", start);
    });

    show(els.ready);
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

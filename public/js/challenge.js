(() => {
  const TICKET_BANDS = [
    { min: 60, tickets: 10 },
    { min: 59, tickets: 9 },
    { min: 58, tickets: 8 },
    { min: 57, tickets: 7 },
    { min: 56, tickets: 6 },
    { min: 50, tickets: 5 },
    { min: 45, tickets: 4 },
    { min: 35, tickets: 3 },
    { min: 27, tickets: 2 },
    { min: 20, tickets: 1 },
  ];

  const ELITE_MESSAGES = {
    56: "LEGENDARY! Mrs. West is going to need to buy more tickets.",
    57: "That's not a score — that's a rumor kids will tell next year.",
    58: "MYTHIC! Even the school computer is impressed.",
    59: "NEARLY PERFECT! So close the bell got jealous.",
    60: "PERFECT 60! Mrs. West Knows Best — and so do you.",
  };
  const LOOKAHEAD = 5;
  const PAST_VISIBLE = 3;

  function ticketsForScore(finalScore) {
    for (const band of TICKET_BANDS) {
      if (finalScore >= band.min) return band.tickets;
    }
    return 0;
  }

  function eliteMessageForScore(finalScore) {
    if (finalScore > 60) {
      return "BEYOND PERFECT! The scoreboard can't contain you.";
    }
    return ELITE_MESSAGES[finalScore] || null;
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

  function burstConfetti(count = 36) {
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

  function launchFireworks(count) {
    const layer = document.createElement("div");
    layer.className = "fireworks";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    const colors = ["#d6f24a", "#ff5c3a", "#6ef0c2", "#ffc14d", "#f3f0e6", "#7ec8ff"];

    for (let f = 0; f < count; f += 1) {
      window.setTimeout(() => {
        const x = 18 + Math.random() * 64;
        const y = 22 + Math.random() * 38;
        const rocket = document.createElement("div");
        rocket.className = "firework-rocket";
        rocket.style.left = `${x}%`;
        layer.appendChild(rocket);

        window.setTimeout(() => {
          rocket.remove();
          const burst = document.createElement("div");
          burst.className = "firework-burst";
          burst.style.left = `${x}%`;
          burst.style.top = `${y}%`;
          const sparks = 28 + Math.floor(Math.random() * 12);
          for (let p = 0; p < sparks; p += 1) {
            const spark = document.createElement("i");
            const angle = (p / sparks) * Math.PI * 2 + Math.random() * 0.2;
            const dist = 70 + Math.random() * 90;
            spark.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
            spark.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
            spark.style.setProperty("--c", colors[p % colors.length]);
            spark.style.animationDelay = `${Math.random() * 40}ms`;
            burst.appendChild(spark);
          }
          // Extra confetti sprinkle from the burst point
          for (let c = 0; c < 14; c += 1) {
            const bit = document.createElement("b");
            bit.style.setProperty("--c", colors[c % colors.length]);
            bit.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
            bit.style.setProperty("--dy", `${40 + Math.random() * 120}px`);
            bit.style.animationDelay = `${80 + Math.random() * 200}ms`;
            burst.appendChild(bit);
          }
          layer.appendChild(burst);
          window.setTimeout(() => burst.remove(), 1600);
        }, 520);
      }, f * 480);
    }

    window.setTimeout(() => layer.remove(), count * 480 + 2800);
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
      pastRail: document.getElementById("rail-past"),
      nextRail: document.getElementById("rail-next"),
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
      pastTrack: null,
      nextTrack: null,
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

    function paintTrack(container, items, trackKey) {
      if (!container) return;
      container.innerHTML = "";
      const track = document.createElement("div");
      track.className = "rail-track";
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = `rail-item ${item.kind}${
          item.placeholder ? " placeholder" : ""
        }${item.kind === "past" && !item.placeholder ? (item.ok ? " ok" : " bad") : ""}`;
        if (item.placeholder) {
          row.innerHTML =
            '<span class="rail-mark" aria-hidden="true"></span><span class="rail-text">&nbsp;</span>';
        } else {
          const mark = item.kind === "past" ? (item.ok ? "✓" : "✗") : "·";
          row.innerHTML = `<span class="rail-mark" aria-hidden="true">${mark}</span><span class="rail-text">${item.text}</span>`;
        }
        track.appendChild(row);
      });
      container.appendChild(track);
      state[trackKey] = track;
    }

    function pastItems() {
      const items = state.history.slice(-PAST_VISIBLE).map((entry) => ({
        kind: "past",
        ok: entry.ok,
        text: entry.ok
          ? `${entry.prompt} = ${entry.given}`
          : `${entry.prompt} ≠ ${entry.given}`,
      }));
      while (items.length < PAST_VISIBLE) {
        items.unshift({ kind: "past", placeholder: true });
      }
      return items;
    }

    function nextItems() {
      const items = state.queue.slice(1, 1 + lookahead).map((problem) => ({
        kind: "next",
        text: problem.prompt,
      }));
      while (items.length < lookahead) {
        items.push({ kind: "next", placeholder: true });
      }
      return items;
    }

    function shiftTrack(track, onDone) {
      if (!track) {
        onDone();
        return;
      }
      const row = track.querySelector(".rail-item");
      const distance = row ? row.getBoundingClientRect().height + 6 : 28;
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
      void track.offsetWidth;
      track.style.transition = "transform 160ms ease";
      track.classList.add("is-shifting");
      track.style.transform = `translateY(-${distance}px)`;
      window.setTimeout(onDone, 160);
    }

    function renderRails({ animate = false } = {}) {
      const past = pastItems();
      const next = nextItems();
      if (!animate) {
        paintTrack(els.pastRail, past, "pastTrack");
        paintTrack(els.nextRail, next, "nextTrack");
        return;
      }
      let pending = 2;
      const finishPaint = () => {
        pending -= 1;
        if (pending > 0) return;
        paintTrack(els.pastRail, past, "pastTrack");
        paintTrack(els.nextRail, next, "nextTrack");
      };
      shiftTrack(state.pastTrack, finishPaint);
      shiftTrack(state.nextTrack, finishPaint);
    }

    function renderProblem({ animateRail = false } = {}) {
      const problem = current();
      if (!problem) return;
      els.prompt.textContent = problem.prompt;
      els.answer.value = "";
      els.prompt.classList.remove("wrong", "right");
      renderRails({ animate: animateRail });
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

    function goToReady() {
      window.clearInterval(state.timerId);
      window.clearTimeout(state.advanceTimer);
      state.running = false;
      state.phase = "ready";
      state.accepting = true;
      show(els.ready);
      window.setTimeout(() => document.body.focus(), 0);
    }

    function finish() {
      if (!state.running) return;
      state.running = false;
      window.clearInterval(state.timerId);
      window.clearTimeout(state.advanceTimer);
      const endedAt = new Date();
      const finalScore = score();
      const tickets = ticketsForScore(finalScore);
      els.finalScore.textContent = String(finalScore);
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
          "No tickets this round — reach a score of 20 to earn your first from Mrs. West!";
      } else {
        const elite = eliteMessageForScore(finalScore);
        if (elite) {
          els.ticketMessage.innerHTML = `<strong class="elite-banner">${elite}</strong><span>You earned ${tickets} tickets. Wave Mrs. West over — she needs to see this!</span>`;
        } else if (tickets === 1) {
          els.ticketMessage.textContent =
            "You earned 1 ticket. Wave Mrs. West over!";
        } else {
          els.ticketMessage.textContent = `You earned ${tickets} tickets. Wave Mrs. West over!`;
        }
      }
      renderReview();
      state.phase = "done";
      show(els.done);
      if (tickets >= 6) {
        const fireworks = tickets - 5;
        launchFireworks(fireworks);
        burstConfetti(40 + tickets * 10);
      } else if (tickets > 0) {
        burstConfetti(28 + tickets * 8);
      }
      flashScreen();
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
      if (state.phase !== "ready") return;
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
      const ok =
        typeof problem.check === "function"
          ? problem.check(value)
          : Math.round(value * 100) === Math.round(problem.answer * 100);
      state.history.push({
        prompt: problem.prompt,
        answer: problem.answerLabel ?? problem.answer,
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

      if (
        state.running &&
        (event.key === "x" || event.key === "X") &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        goToReady();
        return;
      }

      if (event.key === "Backspace") {
        if (!state.running || !state.accepting) {
          if (state.running) event.preventDefault();
          return;
        }
        // Keep edits in the answer box — don't let the browser go "back".
        if (document.activeElement !== els.answer) {
          event.preventDefault();
          els.answer.focus();
          els.answer.value = els.answer.value.slice(0, -1);
        }
        return;
      }

      if (!state.running) {
        if (event.key === "Enter" || event.key === " ") {
          if (state.phase !== "ready") return;
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
      // Let Backspace delete normally inside the field.
    });
    els.answer?.addEventListener("input", () => {
      let cleaned = els.answer.value.replace(/[^\d.-]/g, "");
      cleaned = cleaned.replace(/(?!^)-/g, "");
      const minus = cleaned.startsWith("-") ? "-" : "";
      cleaned = cleaned.replace(/-/g, "");
      const parts = cleaned.split(".");
      const normalized =
        minus +
        (parts.length === 1
          ? parts[0]
          : `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`);
      if (els.answer.value !== normalized) {
        els.answer.value = normalized;
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!state.running) return;
      if (event.target.closest("a, button")) return;
      window.setTimeout(() => els.answer?.focus(), 0);
    });

    document.querySelectorAll("[data-action='start']").forEach((node) => {
      node.addEventListener("click", start);
    });
    document.querySelectorAll("[data-action='again']").forEach((node) => {
      node.addEventListener("click", goToReady);
    });

    document.documentElement.style.setProperty("--past-rows", String(PAST_VISIBLE));
    document.documentElement.style.setProperty("--next-rows", String(lookahead));

    show(els.ready);
    renderHud();
    paintTrack(els.pastRail, pastItems(), "pastTrack");
    paintTrack(els.nextRail, nextItems(), "nextTrack");
    window.setTimeout(() => document.body.focus(), 0);

    return { start, finish, goToReady };
  }

  window.MathGames = {
    createChallenge,
    ticketsForScore,
    formatTime,
  };
})();

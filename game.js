(() => {
  'use strict';

  // ─── DOM refs ───
  const boardEl       = document.getElementById('board');
  const moveCountEl   = document.getElementById('moveCount');
  const timerEl       = document.getElementById('timer');
  const bestScoreEl   = document.getElementById('bestScore');
  const btnShuffle    = document.getElementById('btnShuffle');
  const btnHint       = document.getElementById('btnHint');
  const winOverlay    = document.getElementById('winOverlay');
  const winMovesEl    = document.getElementById('winMoves');
  const winTimeEl     = document.getElementById('winTime');
  const deviceIconEl  = document.getElementById('deviceIcon');
  const deviceLabelEl = document.getElementById('deviceLabel');
  const confettiBox   = document.getElementById('confettiCanvas');

  // Score Form refs
  const startOverlay  = document.getElementById('startOverlay');
  const scoreForm     = document.getElementById('scoreForm');
  const fullNameIn    = document.getElementById('fullName');
  const userIdNameIn  = document.getElementById('userIdName');
  const scoreError    = document.getElementById('scoreError');
  const btnPlayAgain  = document.getElementById('btnPlayAgain');
  const winStatus     = document.getElementById('winStatus');


  // Leaderboard refs
  const btnLeaderboard  = document.getElementById('btnLeaderboard');
  const leaderboardOverlay = document.getElementById('leaderboardOverlay');
  const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
  const leaderboardBody = document.getElementById('leaderboardBody');
  const leaderboardLoading = document.getElementById('leaderboardLoading');
  const tabWeekly       = document.getElementById('tabWeekly');
  const tabRecords      = document.getElementById('tabRecords');

  // ─── State ───
  const SIZE = 4;
  const TOTAL = SIZE * SIZE;
  let tiles = [];          // 1-D array of tile values (0 = empty)
  let moves = 0;
  let seconds = 0;
  let timerInterval = null;
  let gameStarted = false;
  let gameWon = false;
  let currentLeaderboardTab = 'weekly'; // 'weekly' or 'records'
  let globalFullName = '';
  let globalUserIdName = '';


  // ─── Best score (localStorage) ───
  function loadBest() {
    const b = localStorage.getItem('puzzle15_best');
    return b ? JSON.parse(b) : null;
  }
  function saveBest(moves, time) {
    const prev = loadBest();
    if (!prev || moves < prev.moves) {
      localStorage.setItem('puzzle15_best', JSON.stringify({ moves, time }));
    }
  }
  function displayBest() {
    const b = loadBest();
    bestScoreEl.textContent = b ? `${b.moves}` : '—';
  }

  // ─── Timer helpers ───
  function formatTime(s) {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  }
  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  function resetTimer() {
    stopTimer();
    seconds = 0;
    timerEl.textContent = '00:00';
  }

  // ─── Solvability check ───
  function countInversions(arr) {
    let inv = 0;
    const nums = arr.filter(v => v !== 0);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        if (nums[i] > nums[j]) inv++;
      }
    }
    return inv;
  }
  function isSolvable(arr) {
    const inv = countInversions(arr);
    const emptyRow = Math.floor(arr.indexOf(0) / SIZE);
    // For even-sized grids: solvable if (inversions + row of blank from bottom) is odd
    const blankFromBottom = SIZE - emptyRow;
    return (inv + blankFromBottom) % 2 === 1;
  }

  // ─── Shuffle ───
  function generateSolvable() {
    let arr;
    do {
      arr = Array.from({ length: TOTAL }, (_, i) => i); // 0..15
      // Fisher-Yates
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (!isSolvable(arr) || isWin(arr));
    return arr;
  }

  // ─── Win check ───
  function isWin(arr) {
    for (let i = 0; i < TOTAL - 1; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[TOTAL - 1] === 0;
  }

  // ─── Render ───
  function render(animate) {
    boardEl.innerHTML = '';
    tiles.forEach((val, idx) => {
      const div = document.createElement('div');
      div.classList.add('tile');
      if (val === 0) {
        div.classList.add('empty');
      } else {
        div.textContent = val;
        // Correct position highlight
        if (val === idx + 1) div.classList.add('correct');
        if (animate) {
          div.classList.add('pop-in');
          div.style.animationDelay = `${idx * 25}ms`;
        }
      }
      div.dataset.index = idx;
      div.addEventListener('click', () => handleClick(idx));
      boardEl.appendChild(div);
    });
  }

  // ─── Move logic ───
  function getEmptyIndex() {
    return tiles.indexOf(0);
  }
  function getNeighbors(idx) {
    const row = Math.floor(idx / SIZE);
    const col = idx % SIZE;
    const n = [];
    if (row > 0) n.push({ i: idx - SIZE, dir: 'up' });
    if (row < SIZE - 1) n.push({ i: idx + SIZE, dir: 'down' });
    if (col > 0) n.push({ i: idx - 1, dir: 'left' });
    if (col < SIZE - 1) n.push({ i: idx + 1, dir: 'right' });
    return n;
  }
  function canMove(idx) {
    const emptyIdx = getEmptyIndex();
    return getNeighbors(idx).some(n => n.i === emptyIdx);
  }

  function handleClick(idx) {
    if (gameWon) return;
    const emptyIdx = getEmptyIndex();
    const neighbor = getNeighbors(idx).find(n => n.i === emptyIdx);
    if (!neighbor) return;

    // Start timer on first move
    if (!gameStarted) {
      gameStarted = true;
      startTimer();
    }

    // Swap
    [tiles[idx], tiles[emptyIdx]] = [tiles[emptyIdx], tiles[idx]];
    moves++;
    moveCountEl.textContent = moves;

    // Re-render with slide hint
    render(false);

    // Check win
    if (isWin(tiles)) {
      gameWon = true;
      stopTimer();
      saveBest(moves, formatTime(seconds));
      displayBest();

      setTimeout(showWin, 400);
    }
  }

  // ─── Keyboard support ───
  document.addEventListener('keydown', (e) => {
    if (gameWon) return;
    const emptyIdx = getEmptyIndex();
    const row = Math.floor(emptyIdx / SIZE);
    const col = emptyIdx % SIZE;
    let targetIdx = -1;
    switch (e.key) {
      case 'ArrowUp':    if (row < SIZE - 1) targetIdx = emptyIdx + SIZE; break;
      case 'ArrowDown':  if (row > 0)        targetIdx = emptyIdx - SIZE; break;
      case 'ArrowLeft':  if (col < SIZE - 1) targetIdx = emptyIdx + 1;    break;
      case 'ArrowRight': if (col > 0)        targetIdx = emptyIdx - 1;    break;
    }
    if (targetIdx >= 0) {
      e.preventDefault();
      handleClick(targetIdx);
    }
  });

  // ─── Touch / Swipe support ───
  let touchStartX = 0, touchStartY = 0;
  boardEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  boardEl.addEventListener('touchend', (e) => {
    if (gameWon) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return; // too small

    const emptyIdx = getEmptyIndex();
    const row = Math.floor(emptyIdx / SIZE);
    const col = emptyIdx % SIZE;
    let targetIdx = -1;

    if (absDx > absDy) {
      // Horizontal swipe
      if (dx > 0 && col > 0)        targetIdx = emptyIdx - 1;    // swipe right → move left tile right
      if (dx < 0 && col < SIZE - 1) targetIdx = emptyIdx + 1;    // swipe left
    } else {
      // Vertical swipe
      if (dy > 0 && row > 0)        targetIdx = emptyIdx - SIZE; // swipe down
      if (dy < 0 && row < SIZE - 1) targetIdx = emptyIdx + SIZE; // swipe up
    }
    if (targetIdx >= 0) handleClick(targetIdx);
  }, { passive: true });

  // ─── Hint ───
  btnHint.addEventListener('click', () => {
    if (gameWon) return;
    // Find a tile that can move closer to its goal
    const emptyIdx = getEmptyIndex();
    const neighbors = getNeighbors(emptyIdx);
    let bestTile = null;
    let bestImprove = -Infinity;

    for (const n of neighbors) {
      const val = tiles[n.i];
      if (val === 0) continue;
      const goalIdx = val - 1; // where it should be
      const currentDist = manhattan(n.i, goalIdx);
      const newDist = manhattan(emptyIdx, goalIdx);
      const improvement = currentDist - newDist;
      if (improvement > bestImprove) {
        bestImprove = improvement;
        bestTile = n.i;
      }
    }
    if (bestTile !== null) {
      const el = boardEl.children[bestTile];
      if (el) {
        el.classList.remove('hint-glow');
        void el.offsetWidth; // reflow
        el.classList.add('hint-glow');
      }
    }
  });

  function manhattan(idx, goalIdx) {
    const r1 = Math.floor(idx / SIZE), c1 = idx % SIZE;
    const r2 = Math.floor(goalIdx / SIZE), c2 = goalIdx % SIZE;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  // ─── Win screen ───
  function showWin() {
    winMovesEl.textContent = moves;
    winTimeEl.textContent = formatTime(seconds);
    winOverlay.classList.add('visible');
    spawnConfetti();

    winStatus.textContent = 'Saving score...';
    winStatus.style.color = 'var(--text-secondary)';
    btnPlayAgain.style.display = 'none';

    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moves: moves,
        time_seconds: seconds,
        full_name: globalFullName,
        user_id_name: globalUserIdName
      })
    })
    .then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Request failed');
      winStatus.textContent = 'Score saved to leaderboard!';
      winStatus.style.color = 'var(--accent-3)';
      btnPlayAgain.style.display = 'inline-flex';
    })
    .catch(err => {
      winStatus.textContent = 'Failed to save score.';
      winStatus.style.color = '#ef4444';
      btnPlayAgain.style.display = 'inline-flex';
    });
  }
  
  function hideWin() {
    winOverlay.classList.remove('visible');
  }

  function spawnConfetti() {
    confettiBox.innerHTML = '';
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'];
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.classList.add('confetti-piece');
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 1.5 + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      confettiBox.appendChild(piece);
    }
  }
  
  // ─── Form Submission (Start Game) ───
  scoreForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullName = fullNameIn.value.trim();
    const userIdName = userIdNameIn.value.trim();
    
    if (!fullName || !userIdName) {
      scoreError.textContent = 'Both fields are required.';
      return;
    }
    
    globalFullName = fullName;
    globalUserIdName = userIdName;
    
    // Save locally for convenience
    localStorage.setItem('puzzle15_fullname', fullName);
    localStorage.setItem('puzzle15_useridname', userIdName);
    
    startOverlay.classList.remove('visible');
    newGame();
  });

  // ─── New Game ───
  function newGame() {
    hideWin();
    gameWon = false;
    gameStarted = false;
    moves = 0;
    moveCountEl.textContent = '0';
    resetTimer();
    tiles = generateSolvable();
    render(true);
    displayBest();
  }

  btnShuffle.addEventListener('click', () => {
    // If they shuffle, we just restart the board (they already entered their name)
    newGame();
  });
  btnPlayAgain.addEventListener('click', newGame);


  // ─── Leaderboard Logic ───
  function loadLeaderboard(tab) {
    currentLeaderboardTab = tab;
    tabWeekly.classList.toggle('active', tab === 'weekly');
    tabRecords.classList.toggle('active', tab === 'records');
    
    leaderboardLoading.style.display = 'block';
    leaderboardBody.innerHTML = '';
    
    const endpoint = tab === 'weekly' ? '/api/leaderboard' : '/api/records';

    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        leaderboardLoading.style.display = 'none';
        if (data.length === 0) {
          leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center">No scores yet!</td></tr>';
          return;
        }
        data.forEach((score, index) => {
          const tr = document.createElement('tr');
          // Format time
          const m = String(Math.floor(score.time_seconds / 60)).padStart(2, '0');
          const s = String(score.time_seconds % 60).padStart(2, '0');
          
          tr.innerHTML = `
            <td>#${index + 1}</td>
            <td style="font-weight:600;color:var(--accent-3)">${score.username}</td>
            <td>${score.moves}</td>
            <td>${m}:${s}</td>
          `;
          leaderboardBody.appendChild(tr);
        });
      })
      .catch(err => {
        leaderboardLoading.style.display = 'none';
        leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444">Error loading leaderboard.</td></tr>';
      });
  }

  btnLeaderboard.addEventListener('click', () => {
    leaderboardOverlay.classList.add('visible');
    loadLeaderboard('weekly');
  });
  
  tabWeekly.addEventListener('click', () => loadLeaderboard('weekly'));
  tabRecords.addEventListener('click', () => loadLeaderboard('records'));

  btnCloseLeaderboard.addEventListener('click', () => leaderboardOverlay.classList.remove('visible'));

  // ─── Device Detection ───
  function detectDevice() {
    const w = window.innerWidth;
    if (w <= 600) {
      deviceIconEl.textContent = '📱';
      deviceLabelEl.textContent = 'Mobile';
    } else if (w <= 1024) {
      deviceIconEl.textContent = '📱';
      deviceLabelEl.textContent = 'Tablet';
    } else {
      deviceIconEl.textContent = '🖥️';
      deviceLabelEl.textContent = 'Desktop';
    }
  }
  window.addEventListener('resize', detectDevice);
  detectDevice();

  // ─── Init ───
  const savedFullName = localStorage.getItem('puzzle15_fullname');
  const savedUserIdName = localStorage.getItem('puzzle15_useridname');
  if (savedFullName) fullNameIn.value = savedFullName;
  if (savedUserIdName) userIdNameIn.value = savedUserIdName;
  startOverlay.classList.add('visible');
  
  // We initialize the board behind the overlay
  tiles = generateSolvable();
  render(false);
  displayBest();
})();

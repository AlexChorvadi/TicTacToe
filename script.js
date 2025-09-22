// ======= app.js (Play vs CPU + Difficulty Dropdown + Block Glow + Hard Mode) =======

// 🔧 Utility Functions
const get = id => document.getElementById(id);

function notify(msg = 'Done', duration = 2000) {
  const note = get('notification');
  note.textContent = msg;
  note.classList.add('show');
  setTimeout(() => note.classList.remove('show'), duration);
}

function startAutoResetCountdown(seconds = 2, callback) {
  const status = get('player-status');
  let count = seconds;
  status.textContent = `Board will auto reset in ${count} seconds...`;
  const timer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(timer);
      callback();
    } else {
      status.textContent = `Board will auto reset in ${count} seconds...`;
    }
  }, 1000);
}

function setStatus(msg) {
  get('status').textContent = msg;
}

// 🧩 Game State
let peer, isHost = false, connected = false;
let currentPlayer = 'X';
let boardState = Array(9).fill(null);
let hostWins = 0, joinWins = 0;
let moveQueues = { 'X': [], 'O': [] };
let vsCPU = false;
let cpuDifficulty = 'easy';

// 📦 UI Setup
function initUI() {
  get('howToPlayBtn').onclick = () => get('howToPanel').style.right = '0';
  get('closeHowTo').onclick = () => get('howToPanel').style.right = '-400px';

  get('hostBtn').onclick = () => initPeer(true);
  get('joinBtn').onclick = () => initPeer(false);
  get('playCpuBtn').onclick = () => {
    cpuDifficulty = get('cpuDifficulty').value || 'medium';
    startCpuGame();
  };

  get('connectBtn').onclick = () => {
    const signal = get('signalIn').value;
    if (peer && signal) {
      try {
        peer.signal(JSON.parse(signal));
      } catch { alert('Invalid signal data'); }
    }
  };

  get('disconnectBtn').onclick = () => {
    if (peer) {
      peer.destroy();
      setStatus('Disconnected');
    }
  };

  get('copySignalBtn').onclick = () => {
    navigator.clipboard.writeText(get('signalOut').value).then(() => notify('Copied'));
  };
  get('pasteSignalBtn').onclick = async () => {
    try {
      get('signalIn').value = await navigator.clipboard.readText();
      notify('Pasted');
    } catch { notify('Paste failed'); }
  };
}

// 🎮 Game Logic
function createBoard() {
  const board = document.createElement('div');
  board.className = 'board';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.onclick = handleMove;
    board.appendChild(cell);
  }
  get('game').innerHTML = '';
  get('game').appendChild(board);
  updatePlayerStatus();
  updateScoreboard();
}

function handleMove(e) {
  if (!connected && !vsCPU) return notify('Not connected!');
  if ((isHost && currentPlayer !== 'X') || (!isHost && currentPlayer !== 'O')) return;
  const idx = e.target.dataset.index;
  if (boardState[idx]) return;

  manageMoveLimit(currentPlayer, idx);

  boardState[idx] = currentPlayer;
  e.target.textContent = currentPlayer;
  moveQueues[currentPlayer].push(idx);
  if (!vsCPU) sendMove(idx);
  handlePostMove();

  if (vsCPU && currentPlayer === 'O') {
    get('player-status').textContent = '🤖 CPU is thinking...';
    setTimeout(() => makeCpuMove(cpuDifficulty), 1000);
  }
}

function manageMoveLimit(player, newIdx) {
  if (moveQueues[player].length >= 3) {
    const oldIdx = moveQueues[player].shift();
    boardState[oldIdx] = null;
    const cell = document.querySelector(`.cell[data-index='${oldIdx}']`);
    cell.classList.add('fade-out');
    setTimeout(() => {
      cell.classList.remove('fade-out');
      cell.textContent = '';
    }, 500);
  }
}

function handlePostMove() {
  if (checkWinner()) {
    const won = (isHost && currentPlayer === 'X') || (!isHost && currentPlayer === 'O') || (vsCPU && currentPlayer === 'X');
    won ? hostWins++ : joinWins++;
    notify(won ? 'You win!' : 'Opponent wins!');
    updateScoreboard();
    startAutoResetCountdown(2, resetGame);
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updatePlayerStatus();
}

function makeCpuMove(difficulty = 'easy') {
  let move = null;

  if (difficulty === 'easy') {
    const available = boardState.map((val, i) => val === null ? i : null).filter(i => i !== null);
    move = available[Math.floor(Math.random() * available.length)];
  } else if (difficulty === 'medium') {
    move = findBlockingMove(true) ?? findRandomMove();
  } else if (difficulty === 'hard') {
    move = findWinningMove('O') ?? findBlockingMove(true) ?? findRandomMove();
  }

  if (move === null) return;

  manageMoveLimit('O', move);

  boardState[move] = 'O';
  moveQueues['O'].push(move);
  const cell = document.querySelector(`.cell[data-index='${move}']`);
  if (cell) {
    cell.textContent = 'O';
    cell.classList.remove('glow');
  }
  handlePostMove();
}

function findBlockingMove(glow = false) {
  const wins = [ [0,1,2],[3,4,5],[6,7,8], [0,3,6],[1,4,7],[2,5,8], [0,4,8],[2,4,6] ];
  for (let combo of wins) {
    const [a,b,c] = combo;
    const values = [boardState[a], boardState[b], boardState[c]];
    if (values.filter(v => v === 'X').length === 2 && values.includes(null)) {
      const index = combo[values.indexOf(null)];
      if (glow) {
        const cell = document.querySelector(`.cell[data-index='${index}']`);
        if (cell) cell.classList.add('glow');
      }
      return index;
    }
  }
  return null;
}

function findWinningMove(player) {
  const wins = [ [0,1,2],[3,4,5],[6,7,8], [0,3,6],[1,4,7],[2,5,8], [0,4,8],[2,4,6] ];
  for (let combo of wins) {
    const [a,b,c] = combo;
    const values = [boardState[a], boardState[b], boardState[c]];
    if (values.filter(v => v === player).length === 2 && values.includes(null)) {
      return combo[values.indexOf(null)];
    }
  }
  return null;
}

function findRandomMove() {
  return boardState.findIndex((v, i) => v === null);
}

function receiveMove({ idx, player }) {
  manageMoveLimit(player, idx);
  boardState[idx] = player;
  get('game').querySelectorAll('.cell')[idx].textContent = player;
  moveQueues[player].push(idx);

  if (checkWinner()) {
    const won = (!isHost && player === 'X') || (isHost && player === 'O');
    won ? hostWins++ : joinWins++;
    notify(won ? 'You win!' : 'Opponent wins!');
    updateScoreboard();
    startAutoResetCountdown(2, resetGame);
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updatePlayerStatus();
}

function sendMove(idx) {
  if (peer && peer.connected) {
    peer.send(JSON.stringify({ type: 'move', idx, player: currentPlayer }));
  }
}

function updateScoreboard() {
  const el = get('scoreboard');
  const total = hostWins + joinWins;
  el.innerHTML = `<span>You wins: ${hostWins}</span><span>Opponent wins: ${joinWins}</span><span>Total games: ${total}</span>`;
}

function updatePlayerStatus() {
  if (!connected && !vsCPU) return get('player-status').textContent = '';
  const myTurn = currentPlayer === 'X';
  get('player-status').textContent = myTurn ? `Your turn (${currentPlayer})` : `Opponent turn (${currentPlayer})`;
}

function checkWinner() {
  const wins = [ [0,1,2],[3,4,5],[6,7,8], [0,3,6],[1,4,7],[2,5,8], [0,4,8],[2,4,6] ];
  return wins.some(p => p.every(i => boardState[i] === currentPlayer));
}

function resetGame() {
  boardState = Array(9).fill(null);
  moveQueues = { 'X': [], 'O': [] };
  get('game').querySelectorAll('.cell').forEach(c => c.textContent = '');
  currentPlayer = 'X';
  updatePlayerStatus();
}

function startCpuGame() {
  vsCPU = true;
  connected = true;
  isHost = true;
  setStatus('Playing vs Computer');
  createBoard();
}

// ------------------------------
// 🌐 Peer Setup
// ------------------------------
function initPeer(hosting) {
  isHost = hosting;
  peer = new SimplePeer({ initiator: hosting, trickle: false });
  setStatus(hosting ? 'Waiting for connection...' : 'Ready to join...');
  setupPeerEvents();
}

function setupPeerEvents() {
  peer.on('signal', data => get('signalOut').value = JSON.stringify(data));
  peer.on('connect', () => {
    connected = true;
    setStatus('Connected!');
    createBoard();
    updatePlayerStatus();
  });
  peer.on('data', d => {
    try {
      const msg = JSON.parse(d);
      if (msg.type === 'move') receiveMove(msg);
    } catch {}
  });
  peer.on('error', e => setStatus('Error: ' + e));
  peer.on('close', () => {
    connected = false;
    setStatus('Connection closed');
  });
}

// ------------------------------
// 🚀 Initialize Everything
// ------------------------------
window.addEventListener('DOMContentLoaded', initUI);
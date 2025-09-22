
// Get game container after DOM is loaded
const gameContainer = document.getElementById('game');

window.addEventListener('DOMContentLoaded', () => {
  // Reference static UI elements
  const howToPlayBtn = document.getElementById('howToPlayBtn');
  const sidePanel = document.getElementById('howToPanel');
  const closeHowToBtn = document.getElementById('closeHowTo');
  const toast = document.getElementById('toast');

  howToPlayBtn.onclick = () => {
    sidePanel.style.right = '0';
  };
  closeHowToBtn.onclick = () => {
    sidePanel.style.right = '-400px';
  };
});


// Add player status UI
const statusBar = document.createElement('div');
statusBar.id = 'player-status';
statusBar.style.display = 'flex';
statusBar.style.alignItems = 'center';
statusBar.style.justifyContent = 'flex-start';
statusBar.style.margin = '0 auto 16px auto';
statusBar.style.maxWidth = '400px';
statusBar.style.height = '32px';
statusBar.style.fontSize = '1.2em';
statusBar.style.fontWeight = 'bold';
statusBar.style.color = '#1976d2';
gameContainer.parentNode.insertBefore(statusBar, gameContainer);

// Add toast message UI
toast.style.top = '32px';
toast.style.transform = 'translateX(-50%)';
toast.style.background = '#1976d2';
toast.style.color = '#fff';
toast.style.padding = '12px 32px';
toast.style.borderRadius = '8px';
toast.style.fontSize = '1.1em';
toast.style.fontWeight = 'bold';
toast.style.boxShadow = '0 2px 8px rgba(25,118,210,0.15)';
toast.style.zIndex = '9999';
toast.style.display = 'none';
document.body.appendChild(toast);
// Toast is now static in HTML. Use this function to show messages.
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 1800);
}

// Add scoreboard UI
const scoreboard = document.createElement('div');
scoreboard.id = 'scoreboard';
scoreboard.style.display = 'flex';
scoreboard.style.justifyContent = 'center';
scoreboard.style.alignItems = 'center';
scoreboard.style.gap = '32px';
scoreboard.style.margin = '24px auto 0 auto';
scoreboard.style.maxWidth = '400px';
scoreboard.style.fontSize = '1.1em';
scoreboard.style.fontWeight = 'bold';
scoreboard.style.color = '#263238';
scoreboard.style.background = '#e3f2fd';
scoreboard.style.borderRadius = '8px';
scoreboard.style.padding = '12px 0';
scoreboard.style.boxShadow = '0 2px 8px rgba(25,118,210,0.08)';
gameContainer.parentNode.insertBefore(scoreboard, null);

let hostWins = 0;
let joinWins = 0;
function updateScoreboard() {
    let total = hostWins + joinWins;
    let hostLabel = 'Host';
    let joinLabel = 'Join';
    if (isHost) {
        hostLabel = 'You';
        joinLabel = 'Opponent';
    } else {
        hostLabel = 'Opponent';
        joinLabel = 'You';
    }
    scoreboard.innerHTML = `
        <span>${hostLabel} wins: ${hostWins}</span>
        <span>${joinLabel} wins: ${joinWins}</span>
        <span>Total games: ${total}</span>
    `;
}

function updatePlayerStatus() {
    if (!connected) {
        statusBar.textContent = '';
        return;
    }
    let isMyTurn = (isHost && currentPlayer === 'X') || (!isHost && currentPlayer === 'O');
    if (isMyTurn) {
        statusBar.textContent = `Your turn (${currentPlayer})`;
    } else {
        statusBar.textContent = `Opponent turn (${currentPlayer})`;
    }
}



// Render peering menu above game area
const peerMenu = document.getElementById('peer-menu');
peerMenu.innerHTML = `
    <button id="hostBtn">Host</button>
    <button id="joinBtn">Join</button>
`;


// Peering controls in a new row below Host/Join, side by side
const controlsRow = document.createElement('div');
controlsRow.style.display = 'flex';
controlsRow.style.justifyContent = 'center';
controlsRow.style.alignItems = 'flex-start';
controlsRow.style.gap = '16px';
controlsRow.style.margin = '16px auto 24px auto';
controlsRow.style.maxWidth = '400px';

const yourSignalDiv = document.createElement('div');
yourSignalDiv.style.flex = '1';
yourSignalDiv.innerHTML = `
    <label for="signalOut" style="font-weight:500;display:block;margin-bottom:4px;">Your Signal</label>
    <textarea id="signalOut" rows="2" cols="20" placeholder="Your signal data will appear here" style="margin-bottom:4px;width:100%;"></textarea>    
    <button id="copySignalBtn" style="width:100%;">Copy Signal</button>
`;

const peerSignalDiv = document.createElement('div');
peerSignalDiv.style.flex = '1';
peerSignalDiv.innerHTML = `
    <label for="signalIn" style="font-weight:500;display:block;margin-bottom:4px;">Peer-Signal</label>
    <textarea id="signalIn" rows="2" cols="20" placeholder="Paste peer signal data here" style="margin-bottom:4px;width:100%;"></textarea>
    <button id="pasteSignalBtn" style="width:100%;">Paste Signal</button>
`;

controlsRow.appendChild(yourSignalDiv);
controlsRow.appendChild(peerSignalDiv);
peerMenu.parentNode.insertBefore(controlsRow, peerMenu.nextSibling);

// Tooltip logic for copy/paste actions
function showCopyTooltip(message = 'copied successfully') {
    const tooltip = document.getElementById('copyTooltip');
    tooltip.textContent = message;
    tooltip.style.display = 'block';
    setTimeout(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
    }, 10);
    setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(20px)';
    }, 2000);
    setTimeout(() => {
        tooltip.style.display = 'none';
    }, 2400);
}

document.addEventListener('DOMContentLoaded', () => {
    // Copy Your Signal
    const copySignalBtn = document.getElementById('copySignalBtn');
    if (copySignalBtn) {
        copySignalBtn.onclick = () => {
            const signalOut = document.getElementById('signalOut');
            if (signalOut && signalOut.value) {
                navigator.clipboard.writeText(signalOut.value).then(() => {
                    showCopyTooltip('copied successfully');
                });
            }
        };
    }
    // Paste Peer Signal
    const pasteSignalBtn = document.getElementById('pasteSignalBtn');
    if (pasteSignalBtn) {
        pasteSignalBtn.onclick = async () => {
            const signalIn = document.getElementById('signalIn');
            try {
                const text = await navigator.clipboard.readText();
                signalIn.value = text;
                showCopyTooltip('paste successfully');
            } catch (e) {
                showCopyTooltip('paste failed');
            }
        };
    }
});


// Submit and Disconnect buttons, status below signals
const submitDiv = document.createElement('div');
submitDiv.style.maxWidth = '400px';
submitDiv.style.margin = '0 auto 16px auto';
submitDiv.innerHTML = `
    <button id="connectBtn" style="width:100%;margin-bottom:8px;">Submit Signal</button>
    <button id="disconnectBtn" style="width:100%;margin-bottom:8px;background:#fff;color:#d32f2f;border:2px solid #d32f2f;">Disconnect</button>
    <div><span id="status"></span></div>
`;
controlsRow.parentNode.insertBefore(submitDiv, controlsRow.nextSibling);

// Disconnect button logic
document.addEventListener('DOMContentLoaded', () => {
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.onclick = () => {
            if (peer) {
                peer.destroy();
                setStatus('Disconnected');
            }
        };
    }
});

let peer;
let isHost = false;
let connected = false;
let currentPlayer = 'X';
let boardState = Array(9).fill(null);

function createBoard() {
    const board = document.createElement('div');
    board.className = 'board';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', handleMove);
        board.appendChild(cell);
    }
    gameContainer.appendChild(board);
    updatePlayerStatus();
    updateScoreboard();
}

function handleMove(e) {
    if (!connected) return showToast('Not connected!');
    if ((isHost && currentPlayer !== 'X') || (!isHost && currentPlayer !== 'O')) return;
    const idx = e.target.dataset.index;
    if (boardState[idx]) return;
    boardState[idx] = currentPlayer;
    e.target.textContent = currentPlayer;
    sendMove(idx);
    if (checkWinner()) {
        setTimeout(() => {
            // Determine winner and update scoreboard
            let winnerIsHost = (isHost && currentPlayer === 'X') || (!isHost && currentPlayer === 'O');
            if (winnerIsHost) {
                hostWins++;
                showToast('You win!');
            } else {
                joinWins++;
                showToast('Opponent wins!');
            }
            updateScoreboard();
            // Show timestamp/countdown before auto-reset for winner
            let countdown = 2;
            statusBar.textContent = `Board will auto reset in ${countdown} seconds...`;
            const interval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    statusBar.textContent = `Board will auto reset in ${countdown} seconds...`;
                } else {
                    clearInterval(interval);
                    resetGame();
                }
            }, 1000);
        }, 100);
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

function receiveMove(data) {
    const { idx, player } = data;
    boardState[idx] = player;
    document.querySelectorAll('.cell')[idx].textContent = player;
    // Ensure board update is visible before alert/reset
    if (checkWinner()) {
        // Show the last move before toast and reset
        document.querySelectorAll('.cell')[idx].textContent = player;
        // Determine winner and update scoreboard
        let winnerIsHost = (!isHost && player === 'X') || (isHost && player === 'O');
        if (winnerIsHost) {
            hostWins++;
            showToast(isHost ? 'Opponent wins!' : 'You win!');
        } else {
            joinWins++;
            showToast(isHost ? 'You win!' : 'Opponent wins!');
        }
        updateScoreboard();
        // Show timestamp/countdown before auto-reset
        let countdown = 2;
        statusBar.textContent = `Board will auto reset in ${countdown} seconds...`;
        const interval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                statusBar.textContent = `Board will auto reset in ${countdown} seconds...`;
            } else {
                clearInterval(interval);
                resetGame();
            }
        }, 1000);
        return;
    }
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updatePlayerStatus();
}

function checkWinner() {
    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    return winPatterns.some(pattern =>
        pattern.every(idx => boardState[idx] === currentPlayer)
    );
}

function resetGame() {
    boardState = Array(9).fill(null);
    document.querySelectorAll('.cell').forEach(cell => cell.textContent = '');
    currentPlayer = 'X';
    updatePlayerStatus();
}

function setStatus(msg) {
    document.getElementById('status').textContent = msg;
}

document.getElementById('hostBtn').onclick = () => {
    isHost = true;
    peer = new SimplePeer({ initiator: true, trickle: false });
    setStatus('Waiting for connection...');
    setupPeer();
};

document.getElementById('joinBtn').onclick = () => {
    isHost = false;
    peer = new SimplePeer({ initiator: false, trickle: false });
    setStatus('Ready to join...');
    setupPeer();
};

document.getElementById('connectBtn').onclick = () => {
    const signal = document.getElementById('signalIn').value;
    if (peer && signal) {
        try {
            peer.signal(JSON.parse(signal));
        } catch (e) {
            alert('Invalid signal data');
        }
    }
};

function setupPeer() {
    peer.on('signal', data => {
        document.getElementById('signalOut').value = JSON.stringify(data);
    });
    peer.on('connect', () => {
        connected = true;
        setStatus('Connected!');
        createBoard();
        updatePlayerStatus();
    });
    peer.on('data', data => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'move') {
                receiveMove(msg);
            }
        } catch (e) {}
    });
    peer.on('error', err => {
        setStatus('Error: ' + err);
    });
    peer.on('close', () => {
        setStatus('Connection closed');
        connected = false;
    });
}

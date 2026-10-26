// when program is starting, this autoplays the bgm unless autoplay is blocked by the browser,
// then bgm starts playing when the user has clicked something
document.addEventListener('DOMContentLoaded', () => {
    const bgm = document.getElementById('intro-bgm');
    bgm.volume = 0.7;
    bgm.play().catch(() => {
        console.log('Auto-play was prevented. Click the screen to start the audio.');
    });

    // capture phase, so this runs before any button handler that switches the audio
    document.addEventListener('click', () => {
        bgm.play().catch(() => {});
    }, { once: true, capture: true });
});

// create 2d array of tiles in a 10 x 10 grid

let board = [];
let timer;
let seconds = 0;
let gameover;
let firstClick;
let flagsPlaced = 0;
let explosionTimeout;
let muted = false;
const size = 10;
const numBombs = 12;
const longPressDelay = 500;
const doubleClickDelay = 250;
const directions = [
    [-1,-1], [-1,0], [-1,1],
    [0,-1],          [0,1],
    [1,-1],  [1,0],  [1,1]
];
// keeps track of number of revealed tiles - if >= (size * size) - numBombs, game ends
let revealedTiles = 0;

function initializeBoard() {
    playAudio('game-bgm');
    clearTimeout(explosionTimeout);
    document.querySelectorAll('.explosion').forEach(explosion => explosion.remove());

    gameover = false;
    firstClick = true;
    revealedTiles = 0;
    flagsPlaced = 0;
    updateSlapsLeft();
    resetTimer();

    // hide game over overlay
    document.getElementById("win-lose-section").classList.add('hidden');
    document.getElementById("board").classList.remove('locked');

    // clear board - slaps are placed on the first click so it is always safe
    board = Array(size).fill().map(() => Array(size).fill(0));

    displayBoard();
}

function placeBombs(safeRow, safeCol) {
    let placedBombs = 0;

    // randomly populate grid with bombs, keeping the first clicked tile and its neighbours clear
    while (placedBombs < numBombs) {
        let row = Math.floor(Math.random() * size);  // randomly generates row number from 0 to 9
        let col = Math.floor(Math.random() * size);  // randomly generates col number from 0 to 9
        let nearFirstClick = Math.abs(row - safeRow) <= 1 && Math.abs(col - safeCol) <= 1;
        if (board[row][col] === 0 && !nearFirstClick) {
            board[row][col] = -1;     // this tile is now a bomb (-1)
            placedBombs += 1;
        }
    }

    // fill in non-bomb tiles with the number of bombs in their proximity
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (board[row][col] != -1) {  // tile is not a bomb

                let nearbyBombs = 0;

                // check each direction in tile's proximity for bombs
                for (let [dx,dy] of directions) {
                    let newRow = row+dx;
                    let newCol = col+dy;
                    if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
                        // array indexes are valid
                        if (board[newRow][newCol] === -1) {
                            nearbyBombs++;
                        }
                    }
                }

                // update 2d array tile with number of bombs
                board[row][col] = nearbyBombs;
            }
        }
    }
}

function displayBoard() {
    const gridContainer = document.getElementById("board");
    gridContainer.innerHTML = '';  // clear the board before populating it

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // create grid item
            const tile = document.createElement("div");
            tile.className = "grid-item";
            tile.dataset.row = row;
            tile.dataset.col = col;

            // assign light or dark color for checkered board pattern
            if ((row + col) % 2 === 0) {
                tile.classList.add("grid-item-light");
            } else {
                tile.classList.add("grid-item-dark");
            }

            // when left/regular-clicked, reveals bomb or number of nearby bombs
            // when double-clicked, right-clicked or long-pressed on touch screens, marks tile with flag
            let clickTimer = null;
            tile.addEventListener("click", () => {
                if (tile.dataset.longPressed) {
                    // the long press already flagged this tile
                    delete tile.dataset.longPressed;
                    return;
                }
                if (clickTimer) {
                    // second click came quickly enough - it's a double click
                    clearTimeout(clickTimer);
                    clickTimer = null;
                    flagTile(tile);
                    return;
                }
                // wait to see if a second click follows before revealing
                clickTimer = setTimeout(() => {
                    clickTimer = null;
                    revealTiles(tile);
                }, doubleClickDelay);
            });

            tile.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                // some mobile browsers fire contextmenu on long press, which is handled below
                if (!tile.dataset.touching) {
                    flagTile(tile);
                }
            });

            addLongPress(tile);

            // add grid item to grid container
            gridContainer.appendChild(tile);
        }
    }
}

function addLongPress(tile) {
    let pressTimer;

    tile.addEventListener("touchstart", () => {
        tile.dataset.touching = 'true';
        delete tile.dataset.longPressed;
        pressTimer = setTimeout(() => {
            tile.dataset.longPressed = 'true';
            flagTile(tile);
        }, longPressDelay);
    }, { passive: true });

    const cancel = () => {
        clearTimeout(pressTimer);
        delete tile.dataset.touching;
    };
    tile.addEventListener("touchend", cancel);
    tile.addEventListener("touchmove", cancel, { passive: true });
    tile.addEventListener("touchcancel", cancel);
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        document.getElementById('timer').innerText = `Time: ${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
}

function resetTimer() {
    clearInterval(timer);
    seconds = 0;
    document.getElementById('timer').innerText = `Time: ${seconds}`;
}

function updateSlapsLeft() {
    document.getElementById('slaps-left').innerText = `Slaps: ${numBombs - flagsPlaced}`;
}

function flagTile(tile) {
    // check that game is running and tile is not revealed
    if (gameover || tile.classList.contains('revealed')) {
        return;
    }

    if (!tile.classList.contains('flagged')) {
        // adds flag
        tile.classList.add('flagged');
        tile.innerHTML = '🚩';
        flagsPlaced++;
    } else {
        // removes flag
        tile.classList.remove('flagged');
        tile.innerHTML = '';
        flagsPlaced--;
    }
    updateSlapsLeft();
}

// recursive function
function revealTiles(tile) {
    if (gameover) {
        return;
    }

    if (tile.classList.contains('revealed') || tile.classList.contains('flagged')) {
        return;
    }

    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);

    if (firstClick) {
        firstClick = false;
        placeBombs(row, col);
        startTimer();
    }

    const value = board[row][col];
    tile.classList.add('revealed');

    if (value === -1) {     // is a bomb
        gameover = true;
        stopTimer();

        tile.classList.add('slap');
        tile.innerHTML = '✋🏻';
        document.getElementById('board').classList.add('locked');

        // create explosion image, centered over the tile
        const explosion = document.createElement('img');
        explosion.src = 'art/slap.png';
        explosion.classList.add('explosion');
        explosion.style.left = `${tile.offsetLeft + tile.offsetWidth / 2}px`;
        explosion.style.top = `${tile.offsetTop + tile.offsetHeight / 2}px`;
        document.getElementById('board-wrapper').appendChild(explosion);

        // stop game bgm and play slap sound
        playAudio('slap-sound');

        // remove the explosion image after 1 second
        explosionTimeout = setTimeout(() => {
            explosion.remove();
            gameOver('lose');
        }, 1000);

        return;
    }

    revealedTiles++;

    if (value > 0) { // has nearby bombs
        tile.innerHTML = value;
        tile.style.color = getTextColor(value);
    } else {                // empty tile (recursively reveals nearby tiles!)
        for (let [dx,dy] of directions) {
            let newRow = row + dx;
            let newCol = col + dy;
            if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
                const adjTile = document.querySelector(`.grid-item[data-row='${newRow}'][data-col='${newCol}']`);

                if (adjTile) {
                    revealTiles(adjTile);
                }
            }
        }
    }

    if (!gameover && revealedTiles === (size * size) - numBombs) {
        gameOver('win');
    }
}

function getTextColor(num) {
    switch(num) {
        case 1:
            return 'darkblue';
        case 2:
            return 'darkgreen';
        case 3:
            return 'darkred';
        case 4:
            return 'darkorchid';
        case 5:
            return 'darkorange';
        case 6:
            return 'darkcyan';
        case 7:
            return 'deeppink';
        case 8:
            return 'darkolivegreen';
    }
}

function gameOver(winOrLose) {
    gameover = true;
    stopTimer();
    document.getElementById('board').classList.add('locked');

    const winLose = document.getElementById("win-lose-text");
    const winLoseImage = document.getElementById("win-lose-image");

    if (winOrLose === 'win') {
        winLose.textContent = 'You Are Legen-Wait-for-it-dary!';
        winLoseImage.src = 'art/you_won.png';
        playAudio('intro-bgm');
    } else {
        winLose.textContent = 'You Lose :(';
        winLoseImage.src = 'art/you_lose.png';
        playAudio('lost-bgm');
        // reveals all bomb tiles
        document.querySelectorAll('.grid-item').forEach(tile => {
            if (board[tile.dataset.row][tile.dataset.col] === -1) {
                tile.classList.remove('flagged');
                tile.classList.add('slap');
                tile.innerHTML = '✋🏻';
            }
        });
    }

    document.getElementById('win-lose-section').classList.remove('hidden');
}

// AUDIO

// stops every other track and plays the given one from the start
function playAudio(audioId) {
    document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
    document.getElementById(audioId).play().catch(error => {
        console.error(`Failed to play ${audioId}:`, error);
    });
}

document.getElementById('mute-btn').addEventListener('click', function() {
    muted = !muted;
    document.querySelectorAll('audio').forEach(audio => {
        audio.muted = muted;
    });
    this.textContent = muted ? '🔇' : '🔊';
    this.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
});

// BUTTONS

document.getElementById('play-again-btn').addEventListener('click', function() {
    initializeBoard();
});

function switchScreens(fromScreen, toScreen) {
    document.getElementById(fromScreen).classList.add('hidden');
    document.getElementById(toScreen).classList.remove('hidden');
}

function setStartButtonsDisabled(disabled) {
    document.querySelectorAll('#start-screen-buttons button').forEach(button => {
        button.disabled = disabled;
    });
}

document.getElementById('start-game-btn').addEventListener('click', function() {
    setStartButtonsDisabled(true);
    document.getElementById('title-barney').classList.add('hidden');
    document.getElementById('title-barney-cry').classList.remove('hidden');
    playAudio('slap-sound');
    setTimeout(function() {
        switchScreens('start-screen', 'game-screen');
        initializeBoard();
    }, 2000); // Wait for 2 seconds
});

document.getElementById('home-to-rules-btn').addEventListener('click', function() {
    switchScreens('start-screen', 'rules-screen');
});

document.getElementById('rules-to-home-btn').addEventListener('click', function() {
    switchScreens('rules-screen', 'start-screen');
});

document.getElementById('home-to-credits-btn').addEventListener('click', function() {
    switchScreens('start-screen', 'credits-screen');
});

document.getElementById('credits-to-home-btn').addEventListener('click', function() {
    switchScreens('credits-screen', 'start-screen');
});

document.getElementById('game-to-home-btn').addEventListener('click', function() {
    // stop the current game so the timer or slap animation doesn't keep going in the background
    gameover = true;
    stopTimer();
    clearTimeout(explosionTimeout);

    document.getElementById('title-barney-cry').classList.add('hidden');
    document.getElementById('title-barney').classList.remove('hidden');
    setStartButtonsDisabled(false);
    playAudio('intro-bgm');
    switchScreens('game-screen', 'start-screen');
});

// when program is starting, this autoplays the bgm unless autoplay is blocked by the browser,
// then bgm starts playing when the user has clicked something
document.addEventListener('DOMContentLoaded', (event) => {
    const bgm = document.getElementById('intro-bgm');
    bgm.volume = 0.7;
    bgm.play().catch(error => {
        console.log('Auto-play was prevented. Click the screen to start the audio.');
    });

    document.addEventListener('click', () => {
        bgm.play();
    }, { once: true });
});

// create 2d array of tiles in a 10 x 10 grid


let board = [];
let timer;
let gameover;
const size = 10
const numBombs = 12;
const directions = [
    [-1,-1], [-1,0], [-1,1],
    [0,-1],          [0,1],
    [1,-1],  [1,0],  [1,1]
];
// keeps track of number of revealed tiles - if >= (size * size) - numBombs, game ends
let revealedTiles = 0;

function initializeBoard() {
    switchAudio('intro-bgm', 'game-bgm');
    console.log('Initializing board...');
    gameover = false;
    resetTimer();
    
    // hide game over texts
    document.getElementById("win-lose-text").classList.add('hidden');
    document.getElementById("win-lose-image").classList.add('hidden');
    document.getElementById("play-again-btn").classList.add('hidden');

    // clear board
    board = Array(size).fill().map(() => Array(size).fill(0));

    revealedTiles = 0;
    let placedBombs = 0;
    
    // randomly populate grid with 10 bombs
    while (placedBombs < numBombs) {
        let row = Math.floor(Math.random() * size);  // randomly generates row number from 0 to 9
        let col = Math.floor(Math.random() * size);  // randomly generates col number from 0 to 9
        if (board[row][col] === 0) {
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

    displayBoard();
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
            tile.dataset.value = board[row][col];
            console.log('Working 1...')
            // assign light or dark green color for checkered board pattern
            if ((row%2 === 0 && col%2 === 0) || (row%2 === 1 && col%2 === 1)) {
                tile.classList.add("grid-item-light");
            } else {
                tile.classList.add("grid-item-dark");
            }
            console.log('Working 2...')
            // when left/regular-clicked, reveals bomb or number of nearby bombs
            // when right-clicked, marks tile with flag
            tile.addEventListener("click", () => {
                revealTiles(tile);
                console.log('Working 3...')
            });

            tile.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                flagTile(tile);
                console.log('Working 4...')
            });

            // add grid item to grid container
            gridContainer.appendChild(tile);
        }
    }
    
    startTimer();
}

function startTimer() {
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

function flagTile(tile) {
    // check that tile is not revealed
    if (!tile.classList.contains('revealed')) {
        if (tile.innerHTML != '🚩') {
            // adds flag
            tile.innerHTML = '🚩';
        } else {
            // removes flag
            tile.innerHTML = '';
        }
    }
}

// recursive function
function revealTiles(tile) {
    if (gameover === true) {
        return;
    }

    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    const value = Number(tile.dataset.value);

    if (tile.classList.contains('revealed') || tile.innerHTML === '🚩') {
        return;
    }
    tile.classList.add('revealed');
    revealedTiles++;

    if (value === -1) {     // is a bomb
        gameover = true;

        tile.innerHTML = 'slap';
        tile.style.backgroundColor = 'red';

        // makes the cursor default when hovering over tiles
        const allTiles = document.querySelectorAll('.grid-item');
        allTiles.forEach(tile => {
            tile.classList.add('revealed');
        });

        // create explosion image
        const explosion = document.createElement('img');
        explosion.src = 'art/slap.png';
        explosion.classList.add('explosion');
        
        // position the explosion over the tile
        explosion.style.left = `${tile.offsetLeft}px`;
        explosion.style.top = `${tile.offsetTop + 20}px`;

        // add explosion image to the game screen
        const gameScreen = document.getElementById('game-screen');
        gameScreen.appendChild(explosion);

        // pause game bgm and play bomb sound
        switchAudio('game-bgm', 'slap-sound');

        // remove the explosion image after 1 second
        setTimeout(() => {
            gameScreen.removeChild(explosion);
            gameOver('lose');
        }, 1000);

    } else  {
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

        if (revealedTiles === (size * size) - numBombs) {
            gameOver('win');
        }
    }

    // assign light or dark brown color for checkered board pattern 
    if (tile.dataset.value != -1) {    // bomb tiles are red
        if (tile.classList.contains('grid-item-light')) {
            tile.style.backgroundColor = 'rgb(255, 255, 255)';    // light
        } else {
            tile.style.backgroundColor = '#c4c4c4';    // dark
        }
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
        case 9:
            return 'darkslategrey';
    }
}

function gameOver(winOrLose) {
    

    stopTimer();

    const winLose = document.getElementById("win-lose-text");
    const winLoseImage = document.getElementById("win-lose-image");
    winLose.classList.remove('hidden');
    winLoseImage.classList.remove('hidden');
    
    const allTiles = document.querySelectorAll('.grid-item');

    if (winOrLose === 'win') {
        winLose.textContent = 'You Are Legen-Wait-for-it-dary!';
        winLoseImage.src = 'art/you_won.png';
        document.getElementById('intro-bgm').play();
    } else {
        winLose.textContent = 'You Lose :(';
        winLoseImage.src = 'art/you_lose.png';
        document.getElementById('lost-bgm').play();
        // reveals all bomb tiles
        allTiles.forEach(tile => {
            if (tile.dataset.value === '-1') {
                tile.innerHTML = '✋🏻';
                tile.style.backgroundColor = 'red';
            }
        });
    }

    document.getElementById('play-again-btn').classList.remove('hidden');
}

// BUTTONS

document.getElementById('play-again-btn').addEventListener('click', function() {
    initializeBoard();
});

function switchScreens(fromScreen, toScreen) {
    console.log(`Switching from ${fromScreen} to ${toScreen}`);
    document.getElementById(fromScreen).classList.add('hidden');
    document.getElementById(toScreen).classList.remove('hidden');
}

function switchAudio(fromAudio, toAudio) {
    try {
        const fromAudioElement = document.getElementById(fromAudio);
        fromAudioElement.pause();
        fromAudioElement.currentTime = 0;

        setTimeout(() => {
            const toAudioElement = document.getElementById(toAudio);
            toAudioElement.play().catch(error => {
                console.error(`Failed to play ${toAudio}:`, error);
            });
        }, 100);
    } catch (error) {
        console.error('Error in switchAudio:', error);
    }
}

document.getElementById('start-game-btn').addEventListener('click', function() {
    document.getElementById('title-barney').classList.add('hidden');
    document.getElementById('title-barney-cry').classList.remove('hidden');
    switchAudio('intro-bgm', 'slap-sound');
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
    document.getElementById('title-barney-cry').classList.add('hidden');
    document.getElementById('title-barney').classList.remove('hidden');
    switchAudio('game-bgm', 'intro-bgm');
    switchScreens('game-screen', 'start-screen');
});
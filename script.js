// 🎮 DOM Elements
const bird = document.getElementById("bird");
const game = document.getElementById("game");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreText = document.getElementById("finalScore");
const highScoreDisplay = document.getElementById("highScore");
const countdownScreen = document.getElementById("countdownScreen");
const countdownText = document.getElementById("countdown");

// 📊 Game State Variables
let birdTop = 200;
let gravity = 2;
let velocity = 0;
let score = 0;
let pipeSpeed = 2;
let gameRunning = false;
let playerName = "";
let gameEnded = false;

// 💾 Load local high score
let highScore = localStorage.getItem("floppyHighScore") || 0;
highScoreDisplay.innerText = "High Score: " + highScore;

// 🔐 Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcuxX5haVwQErnv3s9nlzLqiyqIIGMOsY",
  authDomain: "flythebird-788d3.firebaseapp.com",
  databaseURL: "https://flythebird-788d3-default-rtdb.firebaseio.com/",
  projectId: "flythebird-788d3",
  storageBucket: "flythebird-788d3.firebasestorage.app",
  messagingSenderId: "143389158685",
  appId: "1:143389158685:web:2ed0bad2dec0aa980e45f4"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 🔁 Reset player name
function changeName() {
  localStorage.removeItem("floppyPlayerName");
  location.reload();
}

// 🧠 Load saved player name and start game
window.addEventListener("DOMContentLoaded", () => {
  const savedName = localStorage.getItem("floppyPlayerName");
  if (savedName) {
    playerName = savedName;
    console.log("👋 Welcome back,", playerName);
    document.getElementById("namePrompt").style.display = "none";
    startCountdown();
  }
});

// 🏆 Live Leaderboard Setup
function setupLiveLeaderboard() {
  console.log("📡 setupLiveLeaderboard() called");
  const list = document.getElementById("topPlayersList");

  database.ref("scores")
    .orderByChild("score")
    .limitToLast(5)
    .on("value", (snapshot) => {
      console.log("📥 Firebase snapshot received for leaderboard");
      const data = [];
      snapshot.forEach(child => {
        data.push(child.val());
      });

      // Sort highest to lowest
      data.sort((a, b) => b.score - a.score);
      list.innerHTML = "";
      data.forEach((player, i) => {
        const item = document.createElement("li");
        item.innerText = `${i + 1}. ${player.name}: ${player.score}`;
        list.appendChild(item);
      });
    });
}

// 📝 Submit Player Name
function submitName() {
  const nameInput = document.getElementById("playerName").value.trim();
  if (!nameInput) return alert("Please enter your name!");
  playerName = nameInput;

  localStorage.setItem("floppyPlayerName", playerName);
  console.log("✅ Player name set:", playerName);
  document.getElementById("namePrompt").style.display = "none";
  startCountdown();
}

// ⏱️ Start Countdown Before Game
function startCountdown() {
  let count = 3;
  countdownText.textContent = count;
  countdownScreen.style.display = "flex";

  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
      countdownText.style.animation = "none";
      countdownText.offsetHeight; // trigger reflow
      countdownText.style.animation = null;
    } else {
      clearInterval(countdownInterval);
      countdownText.textContent = "Go!";
      setTimeout(() => {
        countdownScreen.style.display = "none";
        gameRunning = true;
      }, 500);
    }
  }, 1000);
}

// ⬇️ Gravity Effect on Bird (slowed down)
let gravity = 1;

function applyGravity() {
  velocity += gravity;
  birdTop += velocity;

  if (birdTop >= game.offsetHeight - 30) {
    birdTop = game.offsetHeight - 30;
    endGame();
  }

  bird.style.top = birdTop + "px";
}

// ⬆️ Jump Mechanism (gentler jump)
function jump() {
  if (gameRunning) velocity = -6;
}

document.addEventListener("keydown", jump);
document.addEventListener("touchstart", jump);
document.addEventListener("mousedown", jump);

// ❌ End Game and Save Score
function endGame() {
  if (gameEnded) return;
  gameEnded = true;
  gameRunning = false;

  // 🏅 Update local high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("floppyHighScore", highScore);
    highScoreDisplay.innerText = "High Score: " + highScore;
  }

  finalScoreText.textContent = `Your Score: ${score}\nHigh Score: ${highScore}`;
  gameOverScreen.style.display = "flex";

  // 💾 Save score to Firebase
  if (playerName) {
    const userRef = database.ref("scores/" + playerName);

    userRef.once("value", (snapshot) => {
      const existingData = snapshot.val();
      if (!existingData || score > existingData.score) {
        console.log("🔥 Saving NEW high score:", score);
        userRef.set({
          name: playerName,
          score: score,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        });
      } else {
        console.log("⚠️ Not saving. Existing score is higher:", existingData.score);
      }
    });
  } else {
    console.warn("❌ playerName is empty. Not saving to Firebase.");
  }
}

// 🔁 Restart Game
function restartGame() {
  location.reload();
}

// 🧱 Generate Pipes
function createPipe() {
  if (!gameRunning) return;

  const pipe = document.createElement("div");
  pipe.classList.add("pipe");

  // Random pipe heights
  let pipeTopHeight = Math.random() * 200 + 50;
  let pipeBottomHeight = game.offsetHeight - pipeTopHeight - 150;

  // Top Pipe
  const topPipe = pipe.cloneNode();
  topPipe.style.height = pipeTopHeight + "px";
  topPipe.style.top = "0";
  topPipe.style.left = game.offsetWidth + "px";

  // Bottom Pipe
  const bottomPipe = pipe.cloneNode();
  bottomPipe.style.height = pipeBottomHeight + "px";
  bottomPipe.style.bottom = "0";
  bottomPipe.style.top = "";
  bottomPipe.style.left = game.offsetWidth + "px";

  game.appendChild(topPipe);
  game.appendChild(bottomPipe);

  // Pipe Movement
  const move = setInterval(() => {
    if (!gameRunning) {
      clearInterval(move);
      return;
    }

    let left = parseInt(topPipe.style.left);

    // Offscreen → remove and increment score
    if (left < -50) {
      clearInterval(move);
      game.removeChild(topPipe);
      game.removeChild(bottomPipe);
      score++;
      scoreDisplay.innerText = "Score: " + score;

      // Update high score
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("floppyHighScore", highScore);
        highScoreDisplay.innerText = "High Score: " + highScore;
      }

      // Speed up every 5 points
      if (score % 5 === 0) pipeSpeed += 0.5;

    } else {
      topPipe.style.left = left - pipeSpeed + "px";
      bottomPipe.style.left = left - pipeSpeed + "px";

      // Collision Detection
      let birdBottom = birdTop + 30;
      let topHeight = parseInt(topPipe.style.height);
      let bottomHeight = parseInt(bottomPipe.style.height);

      if (
        left < 80 && left > 20 &&
        (birdTop < topHeight || birdBottom > game.offsetHeight - bottomHeight)
      ) {
        clearInterval(move);
        endGame();
      }
    }
  }, 20);
}

// 🔁 Game Loop: Apply Gravity
setInterval(() => {
  if (gameRunning) applyGravity();
}, 20);

// 🔁 Pipe Generator Loop
setInterval(() => {
  if (gameRunning) createPipe();
}, 2000);

// 🚀 Start Firebase Leaderboard Sync
setupLiveLeaderboard(); // <-- Yeh fix hai!

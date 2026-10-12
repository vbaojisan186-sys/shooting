const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-button");

const keys = new Set();
const stars = [];
const bullets = [];
const enemies = [];
const particles = [];
const player = { x: 0, y: 0, width: 30, height: 34, speed: 300, invulnerable: 0 };

let width = 0;
let height = 0;
let score = 0;
let lives = 3;
let running = false;
let lastTime = 0;
let enemyTimer = 0;
let shotTimer = 0;
let pointerActive = false;

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (!player.x) {
    player.x = width / 2;
    player.y = height - 62;
  } else {
    player.x = Math.min(Math.max(player.x, player.width), width - player.width);
    player.y = Math.min(Math.max(player.y, player.height), height - player.height);
  }

  if (stars.length === 0) {
    for (let i = 0; i < 75; i += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 45 + 20,
        alpha: Math.random() * 0.65 + 0.2,
      });
    }
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  player.x = width / 2;
  player.y = height - 62;
  player.invulnerable = 0;
  enemyTimer = 0.5;
  shotTimer = 0;
  updateHud();
}

function updateHud() {
  scoreElement.textContent = String(score).padStart(6, "0");
  livesElement.textContent = String(lives);
}

function startGame() {
  resetGame();
  running = true;
  overlay.hidden = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  overlayTitle.textContent = "ゲームオーバー";
  overlayMessage.textContent = `スコア：${String(score).padStart(6, "0")}　—　もう一度挑戦しよう！`;
  startButton.textContent = "もう一度プレイ";
  overlay.hidden = false;
}

function spawnEnemy() {
  const size = Math.random() * 12 + 25;
  enemies.push({
    x: size + Math.random() * (width - size * 2),
    y: -size,
    size,
    speed: Math.random() * 55 + 90 + Math.min(score / 150, 100),
    drift: (Math.random() - 0.5) * 75,
    phase: Math.random() * Math.PI * 2,
    hp: size > 32 ? 2 : 1,
  });
}

function fire() {
  bullets.push({ x: player.x, y: player.y - player.height / 2, speed: 480 });
}

function burst(x, y, color) {
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    const speed = Math.random() * 100 + 35;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.35,
      color,
    });
  }
}

function update(delta) {
  let moveX = 0;
  let moveY = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) moveX -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) moveX += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) moveY -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) moveY += 1;

  const magnitude = Math.hypot(moveX, moveY) || 1;
  player.x += (moveX / magnitude) * player.speed * delta;
  player.y += (moveY / magnitude) * player.speed * delta;
  player.x = Math.max(player.width / 2, Math.min(width - player.width / 2, player.x));
  player.y = Math.max(player.height / 2, Math.min(height - player.height / 2, player.y));
  player.invulnerable = Math.max(0, player.invulnerable - delta);

  shotTimer -= delta;
  if (shotTimer <= 0) {
    fire();
    shotTimer = 0.22;
  }

  enemyTimer -= delta;
  if (enemyTimer <= 0) {
    spawnEnemy();
    enemyTimer = Math.max(0.34, 0.95 - score / 9000);
  }

  for (const star of stars) {
    star.y += star.speed * delta;
    if (star.y > height) {
      star.y = 0;
      star.x = Math.random() * width;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    bullets[i].y -= bullets[i].speed * delta;
    if (bullets[i].y < -10) bullets.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * delta;
    enemy.x += Math.sin(enemy.y / 60 + enemy.phase) * enemy.drift * delta;
    enemy.x = Math.max(enemy.size, Math.min(width - enemy.size, enemy.x));

    for (let j = bullets.length - 1; j >= 0; j -= 1) {
      const bullet = bullets[j];
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.size * 0.9) {
        bullets.splice(j, 1);
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          burst(enemy.x, enemy.y, "#ff6c87");
          enemies.splice(i, 1);
          score += 100;
          updateHud();
        }
        break;
      }
    }

    if (!enemies[i]) continue;
    const hitDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (hitDistance < enemy.size * 0.65 + player.width * 0.35 && player.invulnerable <= 0) {
      enemies.splice(i, 1);
      burst(player.x, player.y, "#48e1ee");
      lives -= 1;
      player.invulnerable = 1.2;
      updateHud();
      if (lives <= 0) {
        endGame();
        return;
      }
    } else if (enemy.y - enemy.size > height) {
      enemies.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
    if (particle.life <= 0) particles.splice(i, 1);
  }
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = "#48e1ee";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#f2fbff";
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(player.width / 2, player.height / 2);
  ctx.lineTo(0, player.height / 3);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#42d7f0";
  ctx.beginPath();
  ctx.moveTo(-5, player.height / 2 - 2);
  ctx.lineTo(0, player.height / 2 + 12 + Math.random() * 5);
  ctx.lineTo(5, player.height / 2 - 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#080d1c";
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#b9d6ff";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#6ff3ff";
  ctx.shadowColor = "#48e1ee";
  ctx.shadowBlur = 12;
  for (const bullet of bullets) {
    ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 14);
  }
  ctx.shadowBlur = 0;

  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.sin(enemy.y / 70) * 0.15);
    ctx.shadowColor = "#ff476e";
    ctx.shadowBlur = 15;
    ctx.fillStyle = enemy.hp > 1 ? "#a83261" : "#d84368";
    ctx.beginPath();
    ctx.moveTo(0, enemy.size * 0.92);
    ctx.lineTo(enemy.size * 0.24, enemy.size * 0.28);
    ctx.lineTo(enemy.size * 0.88, -enemy.size * 0.38);
    ctx.lineTo(enemy.size * 0.62, enemy.size * 0.34);
    ctx.lineTo(enemy.size * 0.28, enemy.size * 0.18);
    ctx.lineTo(enemy.size * 0.2, -enemy.size * 0.56);
    ctx.lineTo(0, -enemy.size * 0.78);
    ctx.lineTo(-enemy.size * 0.2, -enemy.size * 0.56);
    ctx.lineTo(-enemy.size * 0.28, enemy.size * 0.18);
    ctx.lineTo(-enemy.size * 0.62, enemy.size * 0.34);
    ctx.lineTo(-enemy.size * 0.88, -enemy.size * 0.38);
    ctx.lineTo(-enemy.size * 0.24, enemy.size * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff9aae";
    ctx.beginPath();
    ctx.moveTo(0, enemy.size * 0.54);
    ctx.lineTo(enemy.size * 0.11, -enemy.size * 0.36);
    ctx.lineTo(0, -enemy.size * 0.58);
    ctx.lineTo(-enemy.size * 0.11, -enemy.size * 0.36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffcf79";
    ctx.fillRect(-enemy.size * 0.67, enemy.size * 0.12, enemy.size * 0.14, enemy.size * 0.25);
    ctx.fillRect(enemy.size * 0.53, enemy.size * 0.12, enemy.size * 0.14, enemy.size * 0.25);

    ctx.shadowColor = "#ff476e";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ff647e";
    ctx.fillRect(-enemy.size * 0.1, -enemy.size * 0.77, enemy.size * 0.2, enemy.size * 0.2);
    ctx.restore();
  }

  for (const particle of particles) {
    ctx.globalAlpha = Math.min(1, particle.life * 2);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  drawPlayer();
}

function gameLoop(timestamp) {
  if (!running) return;
  const delta = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;
  update(delta);
  draw();
  if (running) requestAnimationFrame(gameLoop);
}

function setPointerPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  player.x = Math.max(player.width / 2, Math.min(width - player.width / 2, event.clientX - bounds.left));
  player.y = Math.max(player.height / 2, Math.min(height - player.height / 2, event.clientY - bounds.top));
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
  keys.add(event.key);
});
window.addEventListener("keyup", (event) => keys.delete(event.key));
window.addEventListener("blur", () => keys.clear());
window.addEventListener("resize", resizeCanvas);

canvas.addEventListener("pointerdown", (event) => {
  pointerActive = true;
  canvas.setPointerCapture(event.pointerId);
  setPointerPosition(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (pointerActive) setPointerPosition(event);
});
canvas.addEventListener("pointerup", () => {
  pointerActive = false;
});
canvas.addEventListener("pointercancel", () => {
  pointerActive = false;
});

document.querySelectorAll(".touch-controls button").forEach((button) => {
  const key = button.dataset.key;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    keys.add(key);
    button.setPointerCapture(event.pointerId);
  });
  const release = () => keys.delete(key);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

startButton.addEventListener("click", startGame);
resizeCanvas();
draw();

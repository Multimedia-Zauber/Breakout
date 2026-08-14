const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

let running = false;
let paused = false;
let gameOver = false;
let ballLaunched = false;
let last = 0;

let score = 0;
let lives = 3;
let level = 1;
let highScore = Number(localStorage.getItem("neonBreakoutHighScore") || 0);

const paddle = {
  x: canvas.width/2 - 70,
  y: canvas.height - 52,
  w: 140,
  h: 18,
  speed: 620,
  vx: 0
};

const ball = {
  x: canvas.width/2,
  y: paddle.y - 12,
  r: 9,
  vx: 300,
  vy: -360,
  speed: 470
};

let bricks = [];
let powerups = [];
let effects = {
  wideUntil: 0,
  slowUntil: 0
};

const keys = { left:false, right:false };

const palette = ["#42e7ff","#3f7cff","#8d5cff","#ff4fd8","#ff5b72","#ff9b3f"];

function makeBricks(){
  bricks = [];
  const rows = Math.min(8, 5 + level);
  const cols = 11;
  const gap = 8;
  const marginX = 32;
  const top = 70;
  const totalGap = gap * (cols - 1);
  const w = (canvas.width - marginX*2 - totalGap) / cols;
  const h = 26;

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const hp = level >= 4 && r < 2 ? 2 : 1;
      bricks.push({
        x: marginX + c*(w+gap),
        y: top + r*(h+gap),
        w, h,
        hp,
        maxHp: hp,
        color: palette[r % palette.length],
        alive: true
      });
    }
  }
}

function resetBall(){
  ballLaunched = false;
  ball.x = paddle.x + paddle.w/2;
  ball.y = paddle.y - ball.r - 2;

  const dir = Math.random() < .5 ? -1 : 1;
  ball.speed = Math.min(760, 470 + (level-1)*45);
  ball.vx = dir * ball.speed * .55;
  ball.vy = -Math.sqrt(ball.speed*ball.speed - ball.vx*ball.vx);
}

function resetGame(){
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  paused = false;
  running = false;
  paddle.w = 140;
  paddle.x = canvas.width/2 - paddle.w/2;
  powerups = [];
  effects.wideUntil = 0;
  effects.slowUntil = 0;
  makeBricks();
  resetBall();
  updateHud();
  showOverlay("Neon Breakout","Zerstöre alle Blöcke und fang Power-ups.","Start");
}

function showOverlay(title,text,button){
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = button;
  overlay.classList.add("visible");
}

function startGame(){
  if(gameOver) resetGame();
  running = true;
  paused = false;
  overlay.classList.remove("visible");
  last = performance.now();
}

function launchBall(){
  if(!running && !gameOver) startGame();
  if(running && !paused) ballLaunched = true;
}

function togglePause(){
  if(gameOver || !running) return;
  paused = !paused;
  if(paused){
    running = false;
    showOverlay("Pause","Drücke P oder Weiter.","Weiter");
  }else{
    startGame();
  }
}

function updateHud(){
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  livesEl.textContent = lives;
  levelEl.textContent = level;
}

function movePaddle(dt){
  paddle.vx = 0;
  if(keys.left) paddle.vx = -paddle.speed;
  if(keys.right) paddle.vx = paddle.speed;

  paddle.x += paddle.vx * dt;
  paddle.x = Math.max(0, Math.min(canvas.width-paddle.w, paddle.x));

  if(!ballLaunched){
    ball.x = paddle.x + paddle.w/2;
    ball.y = paddle.y - ball.r - 2;
  }
}

function circleRectCollision(cx,cy,r,rect){
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x+rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y+rect.h));
  const dx = cx-nearestX, dy = cy-nearestY;
  return dx*dx + dy*dy <= r*r;
}

function maybeSpawnPowerup(brick){
  if(Math.random() > .16) return;

  const types = ["wide","life","slow"];
  const type = types[Math.floor(Math.random()*types.length)];

  powerups.push({
    type,
    x: brick.x + brick.w/2,
    y: brick.y + brick.h/2,
    vy: 150,
    r: 10
  });
}

function hitBrick(brick){
  brick.hp--;
  score += 25 * level;

  if(brick.hp <= 0){
    brick.alive = false;
    score += 50 * level;
    maybeSpawnPowerup(brick);
  }

  if(score > highScore){
    highScore = score;
    localStorage.setItem("neonBreakoutHighScore", String(highScore));
  }
  updateHud();
}

function updateBall(dt){
  if(!ballLaunched) return;

  let factor = 1;
  if(performance.now() < effects.slowUntil) factor = .72;

  ball.x += ball.vx * dt * factor;
  ball.y += ball.vy * dt * factor;

  if(ball.x-ball.r <= 0){
    ball.x = ball.r;
    ball.vx *= -1;
  }
  if(ball.x+ball.r >= canvas.width){
    ball.x = canvas.width-ball.r;
    ball.vx *= -1;
  }
  if(ball.y-ball.r <= 0){
    ball.y = ball.r;
    ball.vy *= -1;
  }

  if(
    ball.vy > 0 &&
    circleRectCollision(ball.x,ball.y,ball.r,paddle)
  ){
    ball.y = paddle.y-ball.r-1;
    const rel = (ball.x - (paddle.x+paddle.w/2)) / (paddle.w/2);
    const angle = rel * 1.1;
    const spd = Math.min(850, Math.hypot(ball.vx,ball.vy)*1.025);
    ball.vx = Math.sin(angle) * spd;
    ball.vy = -Math.abs(Math.cos(angle) * spd);
  }

  for(const brick of bricks){
    if(!brick.alive) continue;
    if(circleRectCollision(ball.x,ball.y,ball.r,brick)){
      const prevX = ball.x - ball.vx*dt;
      const prevY = ball.y - ball.vy*dt;

      const hitFromSide =
        prevX + ball.r <= brick.x ||
        prevX - ball.r >= brick.x + brick.w;

      if(hitFromSide) ball.vx *= -1;
      else ball.vy *= -1;

      hitBrick(brick);
      break;
    }
  }

  if(ball.y-ball.r > canvas.height){
    lives--;
    updateHud();

    if(lives <= 0){
      gameOver = true;
      running = false;
      showOverlay("Game Over",`Score: ${score} · Level: ${level}`,"Nochmal");
      return;
    }

    resetBall();
  }

  if(bricks.every(b=>!b.alive)){
    level++;
    score += 1000 * level;
    makeBricks();
    powerups = [];
    resetBall();
    updateHud();
    running = false;
    showOverlay(`Level ${level}`,"Neue Blockwand. Der Ball wird schneller.","Weiter");
  }
}

function updatePowerups(dt){
  for(const p of powerups){
    p.y += p.vy*dt;

    if(
      p.y+p.r >= paddle.y &&
      p.y-p.r <= paddle.y+paddle.h &&
      p.x >= paddle.x &&
      p.x <= paddle.x+paddle.w
    ){
      p.collected = true;

      if(p.type==="wide"){
        paddle.w = 200;
        effects.wideUntil = performance.now()+9000;
      }
      if(p.type==="life"){
        lives++;
      }
      if(p.type==="slow"){
        effects.slowUntil = performance.now()+7000;
      }

      updateHud();
    }
  }

  powerups = powerups.filter(p=>!p.collected && p.y-p.r<canvas.height);

  if(paddle.w > 140 && performance.now() > effects.wideUntil){
    const center = paddle.x + paddle.w/2;
    paddle.w = 140;
    paddle.x = Math.max(0,Math.min(canvas.width-paddle.w,center-paddle.w/2));
  }
}

function update(dt){
  if(!running || paused || gameOver) return;
  movePaddle(dt);
  updateBall(dt);
  updatePowerups(dt);
}

function drawBackground(){
  ctx.fillStyle = "#04070b";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = "rgba(90,242,255,.035)";
  ctx.lineWidth = 1;
  for(let x=0;x<canvas.width;x+=45){
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();
  }
  for(let y=0;y<canvas.height;y+=45){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(canvas.width,y);
    ctx.stroke();
  }
}

function drawBricks(){
  for(const b of bricks){
    if(!b.alive) continue;

    ctx.save();
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = b.hp===1 ? 1 : .78;
    ctx.fillRect(b.x,b.y,b.w,b.h);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x+1,b.y+1,b.w-2,b.h-2);

    if(b.hp>1){
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(b.x+5,b.y+5,b.w-10,4);
    }
    ctx.restore();
  }
}

function drawPaddle(){
  ctx.save();
  ctx.fillStyle = "#5af2ff";
  ctx.shadowColor = "#5af2ff";
  ctx.shadowBlur = 18;
  ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);
  ctx.restore();
}

function drawBall(){
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawPowerups(){
  for(const p of powerups){
    const colors = {
      wide:"#42e7ff",
      life:"#6cff54",
      slow:"#ffe600"
    };
    const labels = {
      wide:"W",
      life:"+",
      slow:"S"
    };

    ctx.save();
    ctx.fillStyle = colors[p.type];
    ctx.shadowColor = colors[p.type];
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#071014";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[p.type],p.x,p.y+1);
    ctx.restore();
  }
}

function drawLaunchHint(){
  if(running && !ballLaunched){
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LEERTASTE ZUM STARTEN",canvas.width/2,canvas.height-95);
    ctx.restore();
  }
}

function draw(){
  drawBackground();
  drawBricks();
  drawPowerups();
  drawPaddle();
  drawBall();
  drawLaunchHint();
}

function loop(ts){
  const dt = Math.min((ts-last)/1000 || 0,.033);
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown",e=>{
  const key=e.key.toLowerCase();

  if(key==="arrowleft" || key==="a"){
    e.preventDefault();
    keys.left=true;
  }
  if(key==="arrowright" || key==="d"){
    e.preventDefault();
    keys.right=true;
  }
  if(key===" "){
    e.preventDefault();
    launchBall();
  }
  if(key==="p"){
    e.preventDefault();
    if(paused){
      paused=false;
      startGame();
    }else{
      togglePause();
    }
  }
});

window.addEventListener("keyup",e=>{
  const key=e.key.toLowerCase();
  if(key==="arrowleft" || key==="a") keys.left=false;
  if(key==="arrowright" || key==="d") keys.right=false;
});

document.querySelectorAll("[data-dir]").forEach(btn=>{
  const dir=btn.dataset.dir;

  const on=()=>{
    if(dir==="left") keys.left=true;
    if(dir==="right") keys.right=true;
  };
  const off=()=>{
    if(dir==="left") keys.left=false;
    if(dir==="right") keys.right=false;
  };

  btn.addEventListener("pointerdown",on);
  btn.addEventListener("pointerup",off);
  btn.addEventListener("pointerleave",off);
  btn.addEventListener("pointercancel",off);
});

canvas.addEventListener("pointerdown",e=>{
  if(!running && !gameOver) startGame();
  launchBall();
});

startBtn.addEventListener("click",()=>{
  if(paused){
    paused=false;
    startGame();
  }else{
    startGame();
  }
});

restartBtn.addEventListener("click",resetGame);

resetGame();
requestAnimationFrame(loop);

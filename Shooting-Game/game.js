const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// タッチ対応かどうかを判定（スマホなら true）
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// キャンバスのリサイズ時の動作
window.addEventListener('resize', function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // 自機の水平位置は中央に、垂直位置はレーザーゲージとの重なりを避けるため調整
  spaceship.x = canvas.width / 2 - spaceship.width / 2;
  spaceship.y = canvas.height - spaceship.height - (isMobile ? 120 : 80);
});

// 自機クラス
class Spaceship {
  constructor() {
    this.width = 50;
    this.height = 50;
    this.x = canvas.width / 2 - this.width / 2;
    // モバイルの場合は下部から120px、PCは80px上に配置
    this.y = canvas.height - this.height - (isMobile ? 120 : 80);
    this.speed = 15;
    this.bullets = [];
    this.lives = 3;
    // キーボード操作用のフラグ（PC用）
    this.moveLeft = false;
    this.moveRight = false;
    // スマホ用フリックによる水平速度
    this.vx = 0;
  }

  draw() {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();
  }
  
  updatePosition() {
    if (isMobile) {
      // フリック操作による移動（慣性＋摩擦で減速）
      this.x += this.vx;
      this.vx *= 0.9; // 摩擦による減速
      // 画面外に出ないように補正
      if (this.x < 0) {
        this.x = 0;
        this.vx = 0;
      }
      if (this.x > canvas.width - this.width) {
        this.x = canvas.width - this.width;
        this.vx = 0;
      }
    } else {
      // PCの場合はキーボード操作で左右移動
      if (this.moveLeft && this.x > 0) {
        this.x -= this.speed;
      }
      if (this.moveRight && this.x < canvas.width - this.width) {
        this.x += this.speed;
      }
    }
  }
  
  shoot() {
    this.bullets.push(new Bullet(this.x + this.width / 2, this.y));
  }
  
  updateBullets() {
    this.bullets = this.bullets.filter(bullet => bullet.y > 0);
    this.bullets.forEach(bullet => bullet.update());
  }
}

// 弾クラス
class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 7;
  }
  
  draw() {
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x - 5, this.y, 10, 20);
  }
  
  update() {
    this.y -= this.speed;
    this.draw();
  }
}

// 敵クラス
class Enemy {
  constructor(x, y) {
    this.width = 50;
    this.height = 50;
    this.x = x;
    this.y = y;
    this.speed = 4;
  }
  
  draw() {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  update() {
    this.y += this.speed;
    this.draw();
  }
}

// レーザー関連の変数
let laserReady = true;
let laserActive = false;
let laserCooldown = 10000; // 10秒クールダウン
let laserDuration = 5000;  // 発射持続時間5秒
let laserStartTime = 0;
let startTime = Date.now(); // ゲーム開始時刻
let elapsedTime = 0;
const enemies = [];
let score = 0;

// レーザー発射処理
const drawLaser = () => {
  ctx.fillStyle = 'cyan';
  ctx.fillRect(
    spaceship.x + spaceship.width / 2 - 5,
    0,
    10,
    spaceship.y
  );

  enemies.forEach((enemy, enemyIndex) => {
    if (
      enemy.x + enemy.width > spaceship.x + spaceship.width / 2 - 5 &&
      enemy.x < spaceship.x + spaceship.width / 2 + 5 &&
      enemy.y + enemy.height > 0 &&
      enemy.y < spaceship.y
    ) {
      enemies.splice(enemyIndex, 1);
      score++;
    }
  });
};

// レーザー発射用のゲージとテキスト表示
const drawLaserGauge = () => {
  // PCとスマホでサイズを変更（今回はスマホは幅120px、ゲージ高さ10px）
  const gaugeWidthBase = isMobile ? 120 : 200;
  const gaugeHeight = isMobile ? 10 : 20;
  // スマホの場合はテキストフォントサイズを12px（PCは20px）
  const textFontSize = isMobile ? 12 : 20;
  
  let elapsedTimeForLaser = laserActive ? 0 : Date.now() - laserStartTime;
  let cooldownProgress = Math.min(elapsedTimeForLaser / laserCooldown, 1);
  const currentGaugeWidth = gaugeWidthBase * cooldownProgress;
  
  // ゲージの表示位置（下から10px上）
  let gaugeY = canvas.height - gaugeHeight - 10;
  
  // ゲージの背景（グレー）
  ctx.fillStyle = 'gray';
  ctx.fillRect(10, gaugeY, gaugeWidthBase, gaugeHeight);
  
  // クールダウン進捗（シアン）
  ctx.fillStyle = 'cyan';
  ctx.fillRect(10, gaugeY, currentGaugeWidth, gaugeHeight);
  
  // 発射準備が整っている場合、テキストを表示
  if (laserReady) {
    ctx.fillStyle = 'white';
    ctx.font = `${textFontSize}px Arial`;
    ctx.fillText('Press Z or 2-finger tap to Fire!!', 10 + gaugeWidthBase + 10, gaugeY + gaugeHeight - 2);
  }
};

// 経過時間の描画
const drawElapsedTime = () => {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  ctx.fillText('Time: ' + elapsedTime + 's', 10, 90);
};

const spaceship = new Spaceship();

// 敵生成
const spawnEnemy = () => {
  const x = canvas.width / 2 - 200 + Math.random() * 400;
  const y = -50;
  enemies.push(new Enemy(x, y));
};

const gameLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  spaceship.draw();
  spaceship.updatePosition();
  spaceship.updateBullets();

  // 敵の描画および衝突判定
  enemies.forEach((enemy, enemyIndex) => {
    enemy.update();

    // 弾との衝突判定
    spaceship.bullets.forEach((bullet, bulletIndex) => {
      if (
        bullet.x > enemy.x &&
        bullet.x < enemy.x + enemy.width &&
        bullet.y > enemy.y &&
        bullet.y < enemy.y + enemy.height
      ) {
        enemies.splice(enemyIndex, 1);
        spaceship.bullets.splice(bulletIndex, 1);
        score++;
        
        if (score === 50) {
          let clearTime = Math.floor((Date.now() - startTime) / 1000);
          alert(`Congratulations, you win! Your score: ${score}. Clear Time: ${clearTime} seconds`);
          cancelAnimationFrame(gameLoop);
          return;
        }
      }
    });

    // 自機との衝突判定
    if (
      spaceship.x < enemy.x + enemy.width &&
      spaceship.x + spaceship.width > enemy.x &&
      spaceship.y < enemy.y + enemy.height &&
      spaceship.y + spaceship.height > enemy.y
    ) {
      enemies.splice(enemyIndex, 1);
      spaceship.lives--;
      if (spaceship.lives <= 0) {
        alert("Game Over!");
        window.location.reload();
      }
    }
  });

  // レーザー発射処理
  if (laserActive) {
    drawLaser();
    if (Date.now() - laserStartTime > laserDuration) {
      laserActive = false;
      laserReady = false;
      laserStartTime = Date.now();
    }
  } else if (!laserReady && Date.now() - laserStartTime > laserCooldown) {
    laserReady = true;
  }

  drawLaserGauge();
  drawElapsedTime();

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 10, 30);
  ctx.fillText('Lives: ' + spaceship.lives, 10, 60);

  requestAnimationFrame(gameLoop);
};

// PC用キーボード操作
window.addEventListener('keydown', (e) => {
  if (!isMobile) {  // PCのみ有効
    if (e.key === 'ArrowLeft') {
      spaceship.moveLeft = true;
    }
    if (e.key === 'ArrowRight') {
      spaceship.moveRight = true;
    }
    if (e.key === ' ') {
      spaceship.shoot();
    }
    if (e.key === 'z' || e.key === 'Z') {
      if (laserReady) {
        laserActive = true;
        laserStartTime = Date.now();
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (!isMobile) {  // PCのみ有効
    if (e.key === 'ArrowLeft') {
      spaceship.moveLeft = false;
    }
    if (e.key === 'ArrowRight') {
      spaceship.moveRight = false;
    }
  }
});

// スマホ用の操作：フリック操作で左右移動、タップで発射、2本指でレーザー発射
if (isMobile) {
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      if (laserReady) {
        laserActive = true;
        laserStartTime = Date.now();
      }
      return;
    }
    let touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }, false);
  
  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    // 2本指タッチの場合は既に処理済み
    if (e.changedTouches.length === 0) return;
    let touch = e.changedTouches[0];
    let deltaX = touch.clientX - touchStartX;
    let deltaY = touch.clientY - touchStartY;
    let timeDiff = Date.now() - touchStartTime;
    
    // 小さな動きはタップと判断し、発射を実行
    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
      spaceship.shoot();
    }
    // 横方向の動きが大きい場合はフリックと判断
    else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      // ここではシンプルに固定の速度を与える（右フリックなら +20、左なら -20）
      spaceship.vx = deltaX > 0 ? 20 : -20;
    }
  }, false);
}

setInterval(spawnEnemy, 1000);
gameLoop();

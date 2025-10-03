const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const scoreElement = document.getElementById('scoreValue');
const highScoreElement = document.getElementById('highScoreValue');
const finalScoreElement = document.getElementById('finalScore');
const newRecordElement = document.getElementById('newRecord');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

canvas.width = 400;
canvas.height = 600;

let gameRunning = false;
let score = 0;
let scrollSpeed = 2;
let speedIncreaseTimer = 0;
let highScore = 0;
let collectedCoins = 0;

// アイテム効果の状態管理
let activeEffects = {
    shield: false,
    speedDown: false,
    speedDownTimer: 0,
    scoreMultiplier: 1,
    scoreMultiplierTimer: 0
};

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    radius: 8,
    speed: 5
};

const keys = {
    left: false,
    right: false,
    space: false
};

class CaveSegment {
    constructor(y, prevSegment = null) {
        this.y = y;
        this.height = 40;
        
        const minGap = 100;
        const maxGap = 140;
        this.gapWidth = minGap + Math.random() * (maxGap - minGap);
        
        const margin = 30;
        const minX = margin;
        const maxX = canvas.width - this.gapWidth - margin;
        
        if (prevSegment) {
            const maxShift = 60;
            const prevCenter = prevSegment.gapX + prevSegment.gapWidth / 2;
            const idealX = prevCenter - this.gapWidth / 2;
            const randomShift = (Math.random() - 0.5) * maxShift * 2;
            this.gapX = Math.max(minX, Math.min(maxX, idealX + randomShift));
        } else {
            this.gapX = minX + Math.random() * (maxX - minX);
        }
        
        this.leftWidth = this.gapX;
        this.rightX = this.gapX + this.gapWidth;
        this.rightWidth = canvas.width - this.rightX;
    }
    
    update() {
        this.y += scrollSpeed;
    }
    
    draw() {
        // 洞窟の壁のグラデーション（より岩っぽく）
        const gradient = ctx.createLinearGradient(0, this.y, 0, this.y + this.height);
        gradient.addColorStop(0, '#3a3a3a');
        gradient.addColorStop(0.5, '#2a2a2a');
        gradient.addColorStop(1, '#1a1a1a');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.y, this.leftWidth, this.height);
        ctx.fillRect(this.rightX, this.y, this.rightWidth, this.height);

        // 壁のハイライト（岩の質感）
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.leftWidth, this.y);
        ctx.lineTo(this.leftWidth, this.y + this.height);
        ctx.moveTo(this.rightX, this.y);
        ctx.lineTo(this.rightX, this.y + this.height);
        ctx.stroke();

        // 壁の縁の発光効果
        const edgeGradientLeft = ctx.createLinearGradient(this.leftWidth - 10, this.y, this.leftWidth, this.y);
        edgeGradientLeft.addColorStop(0, 'rgba(100, 100, 150, 0)');
        edgeGradientLeft.addColorStop(1, 'rgba(100, 100, 150, 0.3)');
        ctx.fillStyle = edgeGradientLeft;
        ctx.fillRect(this.leftWidth - 10, this.y, 10, this.height);

        const edgeGradientRight = ctx.createLinearGradient(this.rightX, this.y, this.rightX + 10, this.y);
        edgeGradientRight.addColorStop(0, 'rgba(100, 100, 150, 0.3)');
        edgeGradientRight.addColorStop(1, 'rgba(100, 100, 150, 0)');
        ctx.fillStyle = edgeGradientRight;
        ctx.fillRect(this.rightX, this.y, 10, this.height);
    }
    
    checkCollision(player) {
        // 当たり判定を1pxに縮小（見た目はそのまま）
        const hitboxRadius = 1;
        if (player.y - hitboxRadius < this.y + this.height && 
            player.y + hitboxRadius > this.y) {
            if (player.x - hitboxRadius < this.leftWidth || 
                player.x + hitboxRadius > this.rightX) {
                return true;
            }
        }
        return false;
    }
}

let caveSegments = [];

function loadHighScore() {
    const saved = localStorage.getItem('caveGameHighScore');
    if (saved) {
        highScore = parseInt(saved);
    }
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('caveGameHighScore', Math.floor(highScore));
    }
}

function initGame() {
    score = 0;
    scrollSpeed = 2;
    speedIncreaseTimer = 0;
    collectedCoins = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    caveSegments = [];
    items = [];

    // アイテム効果のリセット
    activeEffects = {
        shield: false,
        speedDown: false,
        speedDownTimer: 0,
        scoreMultiplier: 1,
        scoreMultiplierTimer: 0
    };

    // 画面上部より上から始まるセグメントを生成
    let prevSegment = null;
    for (let i = 0; i < 20; i++) {
        const y = -40 - (i * 40);  // -40, -80, -120... と上に向かって配置
        const segment = new CaveSegment(y, prevSegment);
        caveSegments.push(segment);
        prevSegment = segment;
    }

    loadHighScore();
    updateScore();
}

function updateScore() {
    scoreElement.textContent = Math.floor(score);
    finalScoreElement.textContent = Math.floor(score);
    highScoreElement.textContent = Math.floor(highScore);
}

function handleInput() {
    const currentSpeed = keys.space ? player.speed * 0.5 : player.speed;
    
    if (keys.left && player.x > player.radius) {
        player.x -= currentSpeed;
    }
    if (keys.right && player.x < canvas.width - player.radius) {
        player.x += currentSpeed;
    }
}

function spawnItem() {
    // アイテムの出現確率を調整
    if (Math.random() < 0.02) { // 2%の確率で生成
        // 洞窟の通路内にランダムにアイテムを配置
        const topSegment = caveSegments.reduce((top, seg) =>
            (!top || seg.y < top.y) ? seg : top, null);

        if (topSegment) {
            const gapCenter = topSegment.gapX + topSegment.gapWidth / 2;
            const margin = 30;
            const x = gapCenter + (Math.random() - 0.5) * (topSegment.gapWidth - margin * 2);
            const y = topSegment.y - 20;

            // アイテムタイプをランダムに選択（確率調整）
            const rand = Math.random();
            let type;
            if (rand < 0.5) {
                type = 'coin'; // 50%
            } else if (rand < 0.7) {
                type = 'shield'; // 20%
            } else if (rand < 0.85) {
                type = 'speedDown'; // 15%
            } else {
                type = 'scoreMultiplier'; // 15%
            }

            items.push(new Item(x, y, type));
        }
    }
}

function updateGame() {
    if (!gameRunning) return;

    handleInput();

    // スコア倍率を適用
    score += scrollSpeed * 0.1 * activeEffects.scoreMultiplier;
    updateScore();

    // スピードダウン効果の管理
    let currentScrollSpeed = scrollSpeed;
    if (activeEffects.speedDown) {
        currentScrollSpeed = scrollSpeed * 0.5;
        activeEffects.speedDownTimer--;
        if (activeEffects.speedDownTimer <= 0) {
            activeEffects.speedDown = false;
        }
    }

    // スコア倍率効果の管理
    if (activeEffects.scoreMultiplier > 1) {
        activeEffects.scoreMultiplierTimer--;
        if (activeEffects.scoreMultiplierTimer <= 0) {
            activeEffects.scoreMultiplier = 1;
        }
    }

    speedIncreaseTimer++;
    if (speedIncreaseTimer > 300) {
        scrollSpeed = Math.min(scrollSpeed + 0.2, 8);
        speedIncreaseTimer = 0;
    }

    caveSegments.forEach(segment => segment.update());

    // アイテムの更新と画面外のアイテムを削除
    items.forEach(item => item.update());
    items = items.filter(item => !item.collected && item.y < canvas.height + 50);

    // 新しいアイテムの生成
    spawnItem();

    // アイテムの衝突判定
    for (let item of items) {
        if (!item.collected && item.checkCollision(player)) {
            item.collected = true;

            switch(item.type) {
                case 'coin':
                    collectedCoins++;
                    score += 50; // ボーナススコア
                    break;
                case 'shield':
                    activeEffects.shield = true;
                    break;
                case 'speedDown':
                    activeEffects.speedDown = true;
                    activeEffects.speedDownTimer = 300; // 5秒（60FPS × 5）
                    break;
                case 'scoreMultiplier':
                    activeEffects.scoreMultiplier = 2;
                    activeEffects.scoreMultiplierTimer = 600; // 10秒
                    break;
            }
        }
    }

    // 画面下から出たセグメントを削除
    caveSegments = caveSegments.filter(segment => segment.y < canvas.height + 50);

    // 新しいセグメントを上部に追加
    while (caveSegments.length < 20) {
        let topSegment = null;
        let minY = 0;

        // 最も上にあるセグメントを探す
        for (let segment of caveSegments) {
            if (topSegment === null || segment.y < minY) {
                topSegment = segment;
                minY = segment.y;
            }
        }

        if (topSegment) {
            const newSegment = new CaveSegment(minY - 40, topSegment);
            caveSegments.push(newSegment);
        } else {
            // セグメントがない場合は初期位置から生成
            caveSegments.push(new CaveSegment(-40, null));
        }
    }

    // 壁との衝突判定（シールドがある場合は無効化）
    for (let segment of caveSegments) {
        if (segment.checkCollision(player)) {
            if (activeEffects.shield) {
                activeEffects.shield = false; // シールドを消費
            } else {
                gameOver();
                return;
            }
        }
    }
}

// パーティクルシステム
const particles = [];

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * 1 + 0.5;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, ${165 + Math.random() * 90}, 0, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// アイテムクラス
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'coin', 'shield', 'speedDown', 'scoreMultiplier'
        this.radius = 10;
        this.collected = false;
        this.angle = 0; // アニメーション用
    }

    update() {
        this.y += scrollSpeed;
        this.angle += 0.1;
    }

    draw(ctx) {
        if (this.collected) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        switch(this.type) {
            case 'coin':
                // 金色のコイン
                const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                coinGradient.addColorStop(0, '#ffd700');
                coinGradient.addColorStop(0.5, '#ffed4e');
                coinGradient.addColorStop(1, '#ffa500');
                ctx.fillStyle = coinGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // コインの輝き
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffd700';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.shadowBlur = 0;
                break;

            case 'shield':
                // 青いシールド
                const shieldGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                shieldGradient.addColorStop(0, '#4dd0e1');
                shieldGradient.addColorStop(0.5, '#00bcd4');
                shieldGradient.addColorStop(1, '#0097a7');
                ctx.fillStyle = shieldGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // シールドマーク
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(-5, 0);
                ctx.lineTo(0, 6);
                ctx.lineTo(5, 0);
                ctx.closePath();
                ctx.stroke();
                break;

            case 'speedDown':
                // 緑色のスピードダウン
                const speedGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                speedGradient.addColorStop(0, '#81c784');
                speedGradient.addColorStop(0.5, '#66bb6a');
                speedGradient.addColorStop(1, '#4caf50');
                ctx.fillStyle = speedGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // 下向き矢印
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(0, 4);
                ctx.lineTo(-4, -2);
                ctx.lineTo(4, -2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'scoreMultiplier':
                // 紫色のスコア倍率
                const scoreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                scoreGradient.addColorStop(0, '#ba68c8');
                scoreGradient.addColorStop(0.5, '#ab47bc');
                scoreGradient.addColorStop(1, '#9c27b0');
                ctx.fillStyle = scoreGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // x2マーク
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('x2', 0, 0);
                break;
        }

        ctx.restore();
    }

    checkCollision(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + player.radius;
    }
}

let items = [];

function drawGame() {
    // 深度に応じて背景色を変化
    const depth = Math.floor(score / 100);
    const bgColors = [
        '#0a0a0a', // 0-100m
        '#0a0514', // 100-200m
        '#0a0a1e', // 200-300m
        '#050a1e', // 300-400m
        '#050514'  // 400m+
    ];
    const bgColor = bgColors[Math.min(depth, bgColors.length - 1)];
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // プレイヤー周辺の光源エフェクト（深度に応じて変化）
    const lightRadius = Math.max(80, 150 - depth * 10);
    const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, lightRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    caveSegments.forEach(segment => segment.draw());

    // アイテムの描画
    items.forEach(item => item.draw(ctx));

    // パーティクルの更新と描画
    if (gameRunning && Math.random() < 0.3) {
        particles.push(new Particle(player.x, player.y));
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);

        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // プレイヤー本体（発光エフェクト付き）
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffaa00';
    ctx.fillStyle = '#ffa500';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // プレイヤーの外側の光のオーラ
    const particleGradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 25);
    particleGradient.addColorStop(0, 'rgba(255, 200, 0, 0.6)');
    particleGradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.3)');
    particleGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = particleGradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
    ctx.fill();

    // シールド効果の表示
    if (activeEffects.shield) {
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00bcd4';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // アクティブなエフェクトの表示（画面右上）
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    let effectY = 40;

    if (activeEffects.speedDown) {
        const seconds = Math.ceil(activeEffects.speedDownTimer / 60);
        ctx.fillStyle = '#66bb6a';
        ctx.fillText(`スピードダウン: ${seconds}s`, canvas.width - 10, effectY);
        effectY += 20;
    }

    if (activeEffects.scoreMultiplier > 1) {
        const seconds = Math.ceil(activeEffects.scoreMultiplierTimer / 60);
        ctx.fillStyle = '#ab47bc';
        ctx.fillText(`スコア x${activeEffects.scoreMultiplier}: ${seconds}s`, canvas.width - 10, effectY);
        effectY += 20;
    }

    if (activeEffects.shield) {
        ctx.fillStyle = '#00bcd4';
        ctx.fillText('シールド有効', canvas.width - 10, effectY);
    }

    // コイン収集数の表示
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'left';
    ctx.fillText(`コイン: ${collectedCoins}`, 10, 40);

    ctx.textAlign = 'start';
}

function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    initGame();
    gameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function gameOver() {
    gameRunning = false;
    const isNewRecord = score > highScore;
    saveHighScore();

    if (isNewRecord && score > 0) {
        newRecordElement.classList.remove('hidden');
    } else {
        newRecordElement.classList.add('hidden');
    }

    gameOverScreen.classList.remove('hidden');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        keys.left = true;
        e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
        keys.right = true;
        e.preventDefault();
    }
    if (e.key === ' ') {
        keys.space = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        keys.left = false;
        e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
        keys.right = false;
        e.preventDefault();
    }
    if (e.key === ' ') {
        keys.space = false;
        e.preventDefault();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 初回起動時にハイスコアを読み込んで表示
loadHighScore();
highScoreElement.textContent = Math.floor(highScore);

gameLoop();
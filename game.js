const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const scoreElement = document.getElementById('scoreValue');
const finalScoreElement = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

canvas.width = 400;
canvas.height = 600;

let gameRunning = false;
let score = 0;
let scrollSpeed = 2;
let speedIncreaseTimer = 0;

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
        const gradient = ctx.createLinearGradient(0, this.y, 0, this.y + this.height);
        gradient.addColorStop(0, '#444');
        gradient.addColorStop(1, '#222');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.y, this.leftWidth, this.height);
        ctx.fillRect(this.rightX, this.y, this.rightWidth, this.height);
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.leftWidth, this.y);
        ctx.lineTo(this.leftWidth, this.y + this.height);
        ctx.moveTo(this.rightX, this.y);
        ctx.lineTo(this.rightX, this.y + this.height);
        ctx.stroke();
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

function initGame() {
    score = 0;
    scrollSpeed = 2;
    speedIncreaseTimer = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    caveSegments = [];
    
    // 画面上部より上から始まるセグメントを生成
    let prevSegment = null;
    for (let i = 0; i < 20; i++) {
        const y = -40 - (i * 40);  // -40, -80, -120... と上に向かって配置
        const segment = new CaveSegment(y, prevSegment);
        caveSegments.push(segment);
        prevSegment = segment;
    }
    
    updateScore();
}

function updateScore() {
    scoreElement.textContent = Math.floor(score);
    finalScoreElement.textContent = Math.floor(score);
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

function updateGame() {
    if (!gameRunning) return;
    
    handleInput();
    
    score += scrollSpeed * 0.1;
    updateScore();
    
    speedIncreaseTimer++;
    if (speedIncreaseTimer > 300) {
        scrollSpeed = Math.min(scrollSpeed + 0.2, 8);
        speedIncreaseTimer = 0;
    }
    
    caveSegments.forEach(segment => segment.update());
    
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
    
    for (let segment of caveSegments) {
        if (segment.checkCollision(player)) {
            gameOver();
            return;
        }
    }
}

function drawGame() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 100);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    caveSegments.forEach(segment => segment.draw());
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffff00';
    ctx.fillStyle = '#ffa500';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    const particleGradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 20);
    particleGradient.addColorStop(0, 'rgba(255, 200, 0, 0.5)');
    particleGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = particleGradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    ctx.fill();
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

gameLoop();
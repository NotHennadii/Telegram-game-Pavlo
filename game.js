// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#1a1a2e');
tg.setBackgroundColor('#1a1a2e');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Константы игры
const LANES = 12;
const PAVLO_LOSE_THRESHOLD = 200000;

// Цены токенов
const TOKEN_PRICES = {
    BTC: 110000,
    ETH: 4000,
    SOL: 200,
    USDC: 1,
    USDT: 1
};

// Загрузка изображений
const images = {
    background: new Image(),
    pavlo: new Image(),
    cz: new Image(),
    btc: new Image(),
    eth: new Image(),
    sol: new Image(),
    usdc: new Image(),
    usdt: new Image()
};

// ВАЖНО: Замените эти пути на реальные пути к вашим изображениям
// После загрузки на GitHub Pages
images.background.src = 'background.jpg'; // Ваш фон космоса
images.pavlo.src = 'pavlo.png'; // Ваш персонаж PAVLO (тритон)
images.cz.src = 'cz.png'; // Ваш персонаж CZ (враг)
images.btc.src = 'btc.png'; // Bitcoin logo
images.eth.src = 'eth.png'; // Ethereum logo
images.sol.src = 'sol.png'; // Solana logo
images.usdc.src = 'usdc.png'; // USDC logo
images.usdt.src = 'usdt.png'; // USDT logo

let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

// Проверка загрузки изображений
Object.values(images).forEach(img => {
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            startGame();
        }
    };
    img.onerror = () => {
        console.error('Failed to load image:', img.src);
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            startGame();
        }
    };
});

// Игровое состояние
let gameState = {
    level: 1,
    portfolio: 0,
    targetMoney: 1000000,
    speed: 1,
    czMoney: 0,
    gameOver: false,
    paused: false,
    started: false
};

// Объекты игры
let tokens = [];
let pavlo = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 80,
    height: 80,
    speed: 15
};

// Класс токена
class Token {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type;
        this.x = (canvas.width / LANES) * lane + (canvas.width / LANES / 2);
        this.y = -50;
        this.radius = 30;
        this.price = TOKEN_PRICES[type];
        this.speed = 2 * gameState.speed;
        this.caught = false;
        this.image = images[type.toLowerCase()];
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        // Тень
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Рисуем изображение токена
        if (this.image && this.image.complete) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
                this.image,
                this.x - this.radius,
                this.y - this.radius,
                this.radius * 2,
                this.radius * 2
            );
            ctx.restore();

            // Обводка
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Fallback если изображение не загрузилось
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type, this.x, this.y);
        }
    }

    checkCollision() {
        const distance = Math.sqrt(
            (this.x - pavlo.x) ** 2 + 
            (this.y - pavlo.y) ** 2
        );
        return distance < this.radius + pavlo.width / 2;
    }
}

// Генерация токенов
function spawnToken() {
    if (gameState.gameOver || gameState.paused || !gameState.started) return;

    const lane = Math.floor(Math.random() * LANES);
    const types = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'];
    const weights = [1, 3, 5, 20, 20];
    
    let totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let type = types[0];
    
    for (let i = 0; i < types.length; i++) {
        if (random < weights[i]) {
            type = types[i];
            break;
        }
        random -= weights[i];
    }

    tokens.push(new Token(lane, type));
}

// Отрисовка фона
function drawBackground() {
    if (images.background.complete) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#0f0f1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Отрисовка PAVLO (управляемый персонаж)
function drawPavlo() {
    if (images.pavlo.complete) {
        ctx.drawImage(
            images.pavlo,
            pavlo.x - pavlo.width / 2,
            pavlo.y - pavlo.height / 2,
            pavlo.width,
            pavlo.height
        );
    } else {
        // Fallback
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(pavlo.x, pavlo.y - 20, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#5B9BD5';
        ctx.beginPath();
        ctx.arc(pavlo.x, pavlo.y - 40, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Имя
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAVLO', pavlo.x, pavlo.y + 50);
}

// Отрисовка CZ (внизу экрана)
function drawCZ() {
    const czY = canvas.height - 40;
    const czX = canvas.width / 2;
    
    if (images.cz.complete) {
        ctx.drawImage(images.cz, czX - 40, czY - 40, 80, 80);
    } else {
        // Fallback
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(czX, czY, 30, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Имя
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CZ', czX, czY + 50);
}

// Обновление UI
function updateUI() {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
    document.getElementById('target').textContent = gameState.targetMoney.toLocaleString();
    document.getElementById('speed').textContent = gameState.speed;
    document.getElementById('pavlo-money').textContent = Math.floor(gameState.czMoney).toLocaleString();
    
    // Прогресс бар CZ
    const progress = (gameState.czMoney / PAVLO_LOSE_THRESHOLD) * 100;
    document.getElementById('pavlo-progress').style.width = `${Math.min(progress, 100)}%`;
}

// Проверка победы/поражения
function checkWinLose() {
    if (gameState.czMoney >= PAVLO_LOSE_THRESHOLD) {
        gameState.gameOver = true;
        document.getElementById('final-pavlo').textContent = Math.floor(gameState.czMoney).toLocaleString();
        document.getElementById('final-portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
        document.getElementById('game-over').classList.remove('hidden');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
    
    if (gameState.portfolio >= gameState.targetMoney) {
        gameState.paused = true;
        document.getElementById('level-portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
        document.getElementById('level-up').classList.remove('hidden');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }
}

// Игровой цикл
function gameLoop() {
    if (gameState.gameOver) return;

    // Фон
    drawBackground();

    // Фоновая сетка (линии)
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANES; i++) {
        const x = (canvas.width / LANES) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    drawCZ();
    drawPavlo();

    // Обновление токенов
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        
        if (!gameState.paused) {
            token.update();
        }
        
        token.draw();

        // Проверка поимки PAVLO (игроком)
        if (token.checkCollision() && !token.caught) {
            token.caught = true;
            gameState.portfolio += token.price;
            tokens.splice(i, 1);
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
            continue;
        }

        // Если токен упал вниз - достается CZ
        if (token.y >= canvas.height - 80 && !token.caught) {
            token.caught = true;
            gameState.czMoney += token.price;
            tokens.splice(i, 1);
            continue;
        }

        // Удаление вышедших за экран
        if (token.y > canvas.height + 50) {
            tokens.splice(i, 1);
        }
    }

    updateUI();
    checkWinLose();
    requestAnimationFrame(gameLoop);
}

// Управление
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    pavlo.x = Math.max(40, Math.min(canvas.width - 40, touchX));
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pavlo.x = Math.max(40, Math.min(canvas.width - 40, e.clientX - rect.left));
});

// Кнопки
document.getElementById('restart-btn').addEventListener('click', () => {
    location.reload();
});

document.getElementById('continue-btn').addEventListener('click', () => {
    gameState.level++;
    gameState.targetMoney *= 2;
    gameState.speed += 0.5;
    gameState.paused = false;
    document.getElementById('level-up').classList.add('hidden');
});

// Адаптация при изменении размера
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Запуск игры
function startGame() {
    gameState.started = true;
    tg.ready();
    updateUI();
    gameLoop();
    
    // Генерация токенов с интервалом
    setInterval(() => {
        if (!gameState.gameOver && !gameState.paused && gameState.started) {
            spawnToken();
        }
    }, 1500 / gameState.speed);
}

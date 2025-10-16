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
const CATCH_LINE = canvas.height * 0.85; // 15% от нижней точки
const PAVLO_LOSE_THRESHOLD = 200000;

// Цены токенов
const TOKEN_PRICES = {
    BTC: 110000,
    ETH: 4000,
    SOL: 200,
    USDC: 1,
    USDT: 1
};

// Цвета токенов
const TOKEN_COLORS = {
    BTC: '#F7931A',
    ETH: '#627EEA',
    SOL: '#14F195',
    USDC: '#2775CA',
    USDT: '#26A17B'
};

// Игровое состояние
let gameState = {
    level: 1,
    portfolio: 0,
    targetMoney: 1000000,
    speed: 1,
    pavloMoney: 0,
    gameOver: false,
    paused: false
};

// Объекты игры
let tokens = [];
let basket = {
    x: canvas.width / 2,
    y: canvas.height - 80,
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
        this.radius = 25;
        this.price = TOKEN_PRICES[type];
        this.color = TOKEN_COLORS[type];
        this.speed = 2 * gameState.speed;
        this.caught = false;
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

        // Токен
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Обводка
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Текст
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type, this.x, this.y);
    }

    checkCollision() {
        const distance = Math.sqrt(
            (this.x - basket.x) ** 2 + 
            (this.y - basket.y) ** 2
        );
        return distance < this.radius + basket.width / 2;
    }
}

// Генерация токенов
function spawnToken() {
    if (gameState.gameOver || gameState.paused) return;

    const lane = Math.floor(Math.random() * LANES);
    const types = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'];
    const weights = [1, 3, 5, 20, 20]; // Редкость токенов
    
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

// Отрисовка корзины (Тритон)
function drawBasket() {
    // Простое представление Тритона
    ctx.save();
    
    // Тело
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    ctx.arc(basket.x, basket.y - 20, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Голова
    ctx.fillStyle = '#5B9BD5';
    ctx.beginPath();
    ctx.arc(basket.x, basket.y - 40, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Рот (открытый)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(basket.x, basket.y - 35, 12, 0, Math.PI);
    ctx.fill();
    
    // Глаза
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(basket.x - 10, basket.y - 45, 5, 0, Math.PI * 2);
    ctx.arc(basket.x + 10, basket.y - 45, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(basket.x - 10, basket.y - 45, 2, 0, Math.PI * 2);
    ctx.arc(basket.x + 10, basket.y - 45, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Имя
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', basket.x, basket.y + 10);
    
    ctx.restore();
}

// Отрисовка линии поимки
function drawCatchLine() {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, CATCH_LINE);
    ctx.lineTo(canvas.width, CATCH_LINE);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Обновление UI
function updateUI() {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
    document.getElementById('target').textContent = gameState.targetMoney.toLocaleString();
    document.getElementById('speed').textContent = gameState.speed;
    document.getElementById('pavlo-money').textContent = Math.floor(gameState.pavloMoney).toLocaleString();
    
    // Прогресс бар Pavlo
    const progress = (gameState.pavloMoney / PAVLO_LOSE_THRESHOLD) * 100;
    document.getElementById('pavlo-progress').style.width = `${Math.min(progress, 100)}%`;
}

// Проверка победы/поражения
function checkWinLose() {
    if (gameState.pavloMoney >= PAVLO_LOSE_THRESHOLD) {
        gameState.gameOver = true;
        document.getElementById('final-pavlo').textContent = Math.floor(gameState.pavloMoney).toLocaleString();
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

    // Очистка
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    drawCatchLine();
    drawBasket();

    // Обновление токенов
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        
        if (!gameState.paused) {
            token.update();
        }
        
        token.draw();

        // Проверка поимки игроком
        if (token.checkCollision() && !token.caught) {
            token.caught = true;
            gameState.portfolio += token.price;
            tokens.splice(i, 1);
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
            continue;
        }

        // Проверка достижения линии PAVLO
        if (token.y >= CATCH_LINE && !token.caught) {
            token.caught = true;
            gameState.pavloMoney += token.price;
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
let touchStartX = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    basket.x = Math.max(40, Math.min(canvas.width - 40, touchX));
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    basket.x = Math.max(40, Math.min(canvas.width - 40, e.clientX - rect.left));
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
    document.getElementById('level-up').classList.remove('hidden');
    document.getElementById('level-up').classList.add('hidden');
});

// Адаптация при изменении размера
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Запуск игры
tg.ready();
updateUI();
gameLoop();

// Генерация токенов с интервалом
setInterval(() => {
    if (!gameState.gameOver && !gameState.paused) {
        spawnToken();
    }
}, 1500 / gameState.speed);

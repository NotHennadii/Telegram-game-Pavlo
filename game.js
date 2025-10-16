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
images.background.src = 'background.jpg';
images.pavlo.src = 'pavlo.png';
images.cz.src = 'cz.png';
images.btc.src = 'btc.png';
images.eth.src = 'eth.png';
images.sol.src = 'sol.png';
images.usdc.src = 'usdc.png';
images.usdt.src = 'usdt.png';

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
let pavloPos = {
    x: canvas.width / 2,
    y: 80,
    size: 104
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
            // Fallback
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

    isClicked(clickX, clickY) {
        const distance = Math.sqrt(
            (this.x - clickX) ** 2 + 
            (this.y - clickY) ** 2
        );
        return distance < this.radius;
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

// Функция для удаления белого фона с более гибкими параметрами
function removeWhiteBackground(image, width, height, threshold = 240) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(image, 0, 0, width, height);
    
    try {
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];
            
            // Удаляем белый и светло-серый фон
            if (r > threshold && g > threshold && b > threshold) {
                data[i + 3] = 0;
            }
            // Также удаляем почти прозрачные пиксели
            else if (alpha < 50) {
                data[i + 3] = 0;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
    } catch (e) {
        console.error('Error processing image:', e);
    }
    
    return tempCanvas;
}

// Отрисовка PAVLO (вверху слева)
function drawPavlo() {
    const width = pavloPos.size;
    const height = pavloPos.size;
    
    if (images.pavlo.complete) {
        const processed = removeWhiteBackground(images.pavlo, width, height, 230);
        ctx.drawImage(
            processed,
            pavloPos.x - width / 2,
            pavloPos.y - height / 2
        );
    } else {
        // Fallback
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(pavloPos.x, pavloPos.y, 40, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Имя
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('PAVLO', pavloPos.x, pavloPos.y + 70);
    ctx.shadowBlur = 0;
}

// Отрисовка CZ (внизу)
function drawCZ() {
    const czY = canvas.height - 80;
    const czX = canvas.width / 2;
    const czSize = 104;
    
    if (images.cz.complete) {
        const processed = removeWhiteBackground(images.cz, czSize, czSize, 230);
        ctx.drawImage(processed, czX - czSize / 2, czY - czSize / 2);
    } else {
        // Fallback
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(czX, czY, 40, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Имя
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('CZ', czX, czY + 70);
    ctx.shadowBlur = 0;
}

// Обновление UI
function updateUI() {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
    document.getElementById('target').textContent = gameState.targetMoney.toLocaleString();
    document.getElementById('speed').textContent = gameState.speed.toFixed(1);
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
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANES; i++) {
        const x = (canvas.width / LANES) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    drawPavlo();
    drawCZ();

    // Обновление токенов
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        
        if (!gameState.paused) {
            token.update();
        }
        
        token.draw();

        // Если токен упал вниз - достается CZ
        if (token.y >= canvas.height - 100 && !token.caught) {
            token.caught = true;
            gameState.czMoney += token.price;
            tokens.splice(i, 1);
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning');
            }
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

// Обработка кликов/тапов по токенам
function handleClick(e) {
    if (gameState.gameOver || gameState.paused) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX || e.touches[0].clientX) - rect.left;
    const clickY = (e.clientY || e.touches[0].clientY) - rect.top;
    
    // Проверяем попадание по токенам
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        
        if (!token.caught && token.isClicked(clickX, clickY)) {
            token.caught = true;
            gameState.portfolio += token.price;
            tokens.splice(i, 1);
            
            // Визуальный эффект
            createClickEffect(clickX, clickY, token.type);
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
            break; // Только один токен за клик
        }
    }
}

// Эффект при клике
function createClickEffect(x, y, type) {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText('+$', x, y - 10);
    ctx.restore();
}

// События
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleClick(e);
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

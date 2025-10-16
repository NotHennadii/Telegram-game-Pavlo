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
    started: false,
    combo: 0,
    maxCombo: 0,
    lastClickTime: 0,
    pavloHP: 100,
    czHP: 100
};

// Позиции персонажей
let pavloPos = {
    x: 80,
    y: canvas.height - 100,
    size: 104
};

let czPos = {
    x: canvas.width - 80,
    y: canvas.height - 100,
    size: 104
};

// Объекты игры
let tokens = [];
let particles = [];

// Класс частицы для эффектов
class Particle {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.speedY = -2;
    }

    update() {
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 5;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Класс токена
class Token {
    constructor(lane, type, isTrap = false) {
        this.lane = lane;
        this.type = type;
        this.isTrap = isTrap;
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
            
            // Если ловушка - инвертируем цвета
            if (this.isTrap) {
                ctx.filter = 'invert(1) hue-rotate(180deg)';
            }
            
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

            // Обводка (красная для ловушек)
            ctx.strokeStyle = this.isTrap ? '#FF0000' : '#fff';
            ctx.lineWidth = this.isTrap ? 4 : 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Значок черепа для ловушек
            if (this.isTrap) {
                ctx.fillStyle = '#FF0000';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('☠', this.x, this.y - this.radius - 15);
            }
        } else {
            // Fallback
            ctx.fillStyle = this.isTrap ? '#8B0000' : '#666';
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

    // 20% шанс что токен - ловушка
    const isTrap = Math.random() < 0.2;
    
    tokens.push(new Token(lane, type, isTrap));
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

// Функция для удаления белого фона
function removeWhiteBackground(image, width, height) {
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
            const brightness = (r + g + b) / 3;
            
            if (brightness > 200) {
                data[i + 3] = 0;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
    } catch (e) {
        console.error('Error processing image:', e);
    }
    
    return tempCanvas;
}

// Отрисовка HP-бара (стиль Mortal Kombat)
function drawHealthBar(x, y, width, hp, name, isLeft) {
    const height = 30;
    
    // Фон бара
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, width, height);
    
    // HP бар
    const hpColor = hp > 60 ? '#00FF00' : hp > 30 ? '#FFAA00' : '#FF0000';
    const gradient = ctx.createLinearGradient(x, y, x + width * (hp / 100), y);
    gradient.addColorStop(0, hpColor);
    gradient.addColorStop(1, hpColor + '88');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width * (hp / 100), height);
    
    // Обводка
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Имя
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.fillText(name, isLeft ? x : x + width, y - 5);
    ctx.shadowBlur = 0;
}

// Отрисовка комбо счетчика
function drawCombo() {
    if (gameState.combo > 1) {
        const centerX = canvas.width / 2;
        const centerY = 100;
        
        // Эффект пульсации
        const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        
        // Текст COMBO
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.strokeText(`${gameState.combo} COMBO!`, 0, 0);
        ctx.fillText(`${gameState.combo} COMBO!`, 0, 0);
        
        ctx.restore();
    }
}

// Отрисовка PAVLO (слева внизу)
function drawPavlo() {
    const width = pavloPos.size;
    const height = pavloPos.size;
    
    if (images.pavlo.complete) {
        const processed = removeWhiteBackground(images.pavlo, width, height);
        ctx.drawImage(
            processed,
            pavloPos.x - width / 2,
            pavloPos.y - height / 2
        );
    } else {
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(pavloPos.x, pavloPos.y, 40, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Отрисовка CZ (справа внизу)
function drawCZ() {
    const width = czPos.size;
    const height = czPos.size;
    
    if (images.cz.complete) {
        const processed = removeWhiteBackground(images.cz, width, height);
        ctx.drawImage(
            processed,
            czPos.x - width / 2,
            czPos.y - height / 2
        );
    } else {
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(czPos.x, czPos.y, 40, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Обновление UI
function updateUI() {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
    document.getElementById('target').textContent = gameState.targetMoney.toLocaleString();
    document.getElementById('speed').textContent = gameState.speed.toFixed(1);
    document.getElementById('pavlo-money').textContent = Math.floor(gameState.czMoney).toLocaleString();
    
    const progress = (gameState.czMoney / PAVLO_LOSE_THRESHOLD) * 100;
    document.getElementById('pavlo-progress').style.width = `${Math.min(progress, 100)}%`;
}

// Проверка победы/поражения
function checkWinLose() {
    if (gameState.czHP <= 0 || gameState.czMoney >= PAVLO_LOSE_THRESHOLD) {
        gameState.gameOver = true;
        document.getElementById('final-pavlo').textContent = Math.floor(gameState.czMoney).toLocaleString();
        document.getElementById('final-portfolio').textContent = Math.floor(gameState.portfolio).toLocaleString();
        document.getElementById('game-over').classList.remove('hidden');
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
    
    if (gameState.pavloHP <= 0) {
        gameState.gameOver = true;
        document.getElementById('final-pavlo').textContent = 'PAVLO ПРОИГРАЛ';
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

    drawBackground();

    // Фоновая сетка
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANES; i++) {
        const x = (canvas.width / LANES) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // HP-бары в стиле Mortal Kombat
    drawHealthBar(20, 20, 150, gameState.pavloHP, 'PAVLO', true);
    drawHealthBar(canvas.width - 170, 20, 150, gameState.czHP, 'CZ', false);
    
    // Комбо счетчик
    drawCombo();
    
    drawPavlo();
    drawCZ();

    // Обновление токенов
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        
        if (!gameState.paused) {
            token.update();
        }
        
        token.draw();

        // Если токен упал вниз
        if (token.y >= canvas.height - 100 && !token.caught) {
            token.caught = true;
            
            if (token.isTrap) {
                // Ловушка упала - CZ получает урон
                gameState.czHP = Math.max(0, gameState.czHP - 5);
            } else {
                // Обычный токен упал - CZ получает деньги, PAVLO урон
                gameState.czMoney += token.price;
                gameState.pavloHP = Math.max(0, gameState.pavloHP - 2);
            }
            
            tokens.splice(i, 1);
            gameState.combo = 0; // Сброс комбо
            continue;
        }

        if (token.y > canvas.height + 50) {
            tokens.splice(i, 1);
        }
    }

    // Обновление частиц
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Сброс комбо если долго не кликали
    if (Date.now() - gameState.lastClickTime > 2000) {
        gameState.combo = 0;
    }

    updateUI();
    checkWinLose();
    requestAnimationFrame(gameLoop);
}

// Обработка кликов
function handleClick(e) {
    if (gameState.gameOver || gameState.paused) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX || e.touches[0].clientX) - rect.left;
    const clickY = (e.clientY || e.touches[0].clientY) - rect.top;
    
    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        
        if (!token.caught && token.isClicked(clickX, clickY)) {
            token.caught = true;
            
            if (token.isTrap) {
                // Кликнули на ловушку - минус деньги и урон PAVLO
                gameState.portfolio = Math.max(0, gameState.portfolio - token.price);
                gameState.pavloHP = Math.max(0, gameState.pavloHP - 10);
                particles.push(new Particle(clickX, clickY, `-$${token.price.toLocaleString()}`, '#FF0000'));
                gameState.combo = 0;
                
                if (tg.HapticFeedback) {
                    tg.HapticFeedback.notificationOccurred('error');
                }
            } else {
                // Кликнули на обычный токен - плюс деньги и комбо
                gameState.portfolio += token.price;
                gameState.combo++;
                gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
                gameState.lastClickTime = Date.now();
                
                // Урон CZ от комбо
                const comboDamage = Math.min(gameState.combo * 0.5, 5);
                gameState.czHP = Math.max(0, gameState.czHP - comboDamage);
                
                particles.push(new Particle(clickX, clickY, `+$${token.price.toLocaleString()}`, '#00FF00'));
                
                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                }
            }
            
            tokens.splice(i, 1);
            break;
        }
    }
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleClick(e);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    location.reload();
});

document.getElementById('continue-btn').addEventListener('click', () => {
    gameState.level++;
    gameState.targetMoney *= 2;
    gameState.speed += 0.5;
    gameState.paused = false;
    gameState.pavloHP = 100;
    gameState.czHP = 100;
    document.getElementById('level-up').classList.add('hidden');
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    pavloPos.y = canvas.height - 100;
    czPos.x = canvas.width - 80;
    czPos.y = canvas.height - 100;
});

function startGame() {
    gameState.started = true;
    pavloPos.y = canvas.height - 100;
    czPos.x = canvas.width - 80;
    czPos.y = canvas.height - 100;
    
    tg.ready();
    updateUI();
    gameLoop();
    
    setInterval(() => {
        if (!gameState.gameOver && !gameState.paused && gameState.started) {
            spawnToken();
        }
    }, 1500 / gameState.speed);
}

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Адаптация под размер экрана
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Игровые переменные
let gameState = {
    level: 1,
    stars: 0,
    requiredStars: 100,
    multiplier: 1,
    galaxySize: 30,
    maxGalaxySize: Math.min(canvas.width, canvas.height) * 0.45
};

// Массив звезд для фона
const backgroundStars = [];
for (let i = 0; i < 150; i++) {
    backgroundStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        opacity: Math.random() * 0.5 + 0.5
    });
}

// Частицы при клике
const particles = [];

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
        this.size *= 0.97;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = `hsl(${280 + Math.random() * 40}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Отрисовка фоновых звезд
function drawBackgroundStars() {
    backgroundStars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Отрисовка галактики
function drawGalaxy() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Свечение
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, gameState.galaxySize * 1.5
    );
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.8)');
    gradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.4)');
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, gameState.galaxySize * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Ядро галактики
    const coreGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, gameState.galaxySize
    );
    coreGradient.addColorStop(0, '#FFD700');
    coreGradient.addColorStop(0.3, '#FF69B4');
    coreGradient.addColorStop(0.6, '#8A2BE2');
    coreGradient.addColorStop(1, '#4B0082');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, gameState.galaxySize, 0, Math.PI * 2);
    ctx.fill();
}

// Обновление UI
function updateUI() {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('stars').textContent = gameState.stars;
    document.getElementById('required').textContent = gameState.requiredStars;
    document.getElementById('multiplier').textContent = gameState.multiplier;
}

// Добавление звезд
function addStars(amount) {
    gameState.stars += amount;
    
    // Рост галактики
    const progress = gameState.stars / gameState.requiredStars;
    gameState.galaxySize = 30 + (gameState.maxGalaxySize - 30) * progress;

    // Проверка уровня
    if (gameState.stars >= gameState.requiredStars) {
        levelUp();
    }

    updateUI();
}

// Повышение уровня
function levelUp() {
    gameState.level++;
    gameState.stars = 0;
    gameState.multiplier *= 2;
    gameState.requiredStars *= 4;
    gameState.galaxySize = 30;

    // Эффект взрыва
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(
            canvas.width / 2 + (Math.random() - 0.5) * 100,
            canvas.height / 2 + (Math.random() - 0.5) * 100
        ));
    }

    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
    }

    updateUI();
}

// Обработка кликов
function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    // Проверка клика по галактике
    if (distance <= gameState.galaxySize * 1.5) {
        addStars(gameState.multiplier);

        // Частицы
        for (let i = 0; i < 8; i++) {
            particles.push(new Particle(x, y));
        }

        // Легкая вибрация
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

// Игровой цикл
function gameLoop() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackgroundStars();
    drawGalaxy();

    // Обновление и отрисовка частиц
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(gameLoop);
}

// События
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', handleClick);

// Адаптация при изменении размера
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameState.maxGalaxySize = Math.min(canvas.width, canvas.height) * 0.45;
});

// Запуск
updateUI();
gameLoop();

// Отправка данных в бота (опционально)
tg.ready();

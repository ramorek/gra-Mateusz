document.addEventListener('DOMContentLoaded', () => {
    // --- Konfiguracja i zmienne ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Elementy UI
    const foodCounterEl = document.getElementById('food-counter');
    const gameOverScreen = document.getElementById('game-over-screen');
    const restartButton = document.getElementById('restart-button');

    // Zasoby
    const playerImg = document.getElementById('player-sprite');
    const collectSound = document.getElementById('collect-sound');
    const loseSound = document.getElementById('lose-sound');

    // Ustawienia gry
    const GRAVITY = 0.6;
    const JUMP_STRENGTH = -15;
    const PLAYER_SPEED = 5;
    const FOOD_LIMIT = 10;
    const FOOD_SPAWN_INTERVAL_START = 4000; // ms

    let gameState = {
        score: 0,
        gameOver: false,
        foodItems: [],
        platforms: [],
        foodSpawnTimer: 0,
        foodSpawnInterval: FOOD_SPAWN_INTERVAL_START,
        lastTime: 0,
    };

    const keys = {
        left: false,
        right: false,
        up: false,
    };

    // --- Obiekt gracza ---
    const player = {
        x: 100,
        y: 100,
        width: 50,
        height: 80,
        velocityX: 0,
        velocityY: 0,
        isOnGround: false,
        scaleX: 1, // Skala brzucha
        direction: 'right'
    };

    // --- Inicjalizacja gry ---
    function init() {
        // Dopasowanie canvasu do kontenera
        const container = document.getElementById('game-container');
        canvas.width = 800; // Rozdzielczość wewnętrzna
        canvas.height = 450;

        resetGame();
        
        // Rozpoczęcie pętli gry
        requestAnimationFrame(gameLoop);
    }

    // --- Resetowanie gry ---
    function resetGame() {
        // Reset stanu gracza
        player.x = 100;
        player.y = 100;
        player.velocityX = 0;
        player.velocityY = 0;
        player.isOnGround = false;
        player.scaleX = 1;

        // Reset stanu gry
        gameState.score = 0;
        gameState.gameOver = false;
        gameState.foodItems = [];
        gameState.foodSpawnTimer = 0;
        gameState.foodSpawnInterval = FOOD_SPAWN_INTERVAL_START;
        
        // Tworzenie platform
        gameState.platforms = [
            // Ziemia
            { x: 0, y: canvas.height - 40, width: canvas.width, height: 40 },
            // Losowe platformy
            { x: 150, y: 300, width: 150, height: 20 },
            { x: 400, y: 200, width: 120, height: 20 },
            { x: 600, y: 350, width: 100, height: 20 },
        ];
        
        // Ukrycie ekranu przegranej
        gameOverScreen.classList.add('hidden');
        updateUI();
    }

    // --- Pętla gry ---
    function gameLoop(currentTime) {
        if (gameState.gameOver) return;

        const deltaTime = (currentTime - gameState.lastTime) / 1000; // Czas w sekundach
        gameState.lastTime = currentTime;
        
        update(deltaTime);
        draw();

        requestAnimationFrame(gameLoop);
    }

    // --- Logika aktualizacji stanu gry ---
    function update(deltaTime) {
        // Ruch gracza
        player.velocityX = 0;
        if (keys.left) {
            player.velocityX = -PLAYER_SPEED;
            player.direction = 'left';
        }
        if (keys.right) {
            player.velocityX = PLAYER_SPEED;
            player.direction = 'right';
        }

        // Skok
        if (keys.up && player.isOnGround) {
            player.velocityY = JUMP_STRENGTH;
            player.isOnGround = false;
        }

        // Grawitacja
        player.velocityY += GRAVITY;
        
        // Aktualizacja pozycji
        player.x += player.velocityX;
        player.y += player.velocityY;
        
        // Kolizje z granicami ekranu
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        
        // Kolizje z platformami
        player.isOnGround = false;
        gameState.platforms.forEach(platform => {
            if (
                player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height + player.velocityY
            ) {
                player.velocityY = 0;
                player.y = platform.y - player.height;
                player.isOnGround = true;
            }
        });
        
        // Kolizje z jedzeniem
        gameState.foodItems.forEach((food, index) => {
            if (
                player.x < food.x + food.size &&
                player.x + player.width > food.x &&
                player.y < food.y + food.size &&
                player.y + player.height > food.y
            ) {
                collectFood(index);
            }
        });

        // Spawnowanie jedzenia
        gameState.foodSpawnTimer += deltaTime * 1000;
        if (gameState.foodSpawnTimer > gameState.foodSpawnInterval) {
            spawnFood();
            gameState.foodSpawnTimer = 0;
            // Poziom trudności rośnie - jedzenie pojawia się szybciej
            if (gameState.foodSpawnInterval > 1000) {
                gameState.foodSpawnInterval -= 150;
            }
        }
    }

    function collectFood(index) {
        gameState.score++;
        gameState.foodItems.splice(index, 1);
        player.scaleX += 0.15; // Brzuch rośnie!
        collectSound.currentTime = 0;
        collectSound.play();
        updateUI();

        if (gameState.score > FOOD_LIMIT) {
            endGame();
        }
    }
    
    function spawnFood() {
        const foodEmojis = ['🍕', '🍔', '🍎', '🍗', '🍩'];
        const randomPlatform = gameState.platforms[Math.floor(Math.random() * gameState.platforms.length)];
        
        const food = {
            emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
            size: 30,
            x: randomPlatform.x + Math.random() * (randomPlatform.width - 30),
            y: randomPlatform.y - 35
        };
        gameState.foodItems.push(food);
    }
    
    function endGame() {
        gameState.gameOver = true;
        gameOverScreen.classList.remove('hidden');
        loseSound.currentTime = 0;
        loseSound.play();
    }

    // --- Rysowanie na canvasie ---
    function draw() {
        // Tło
        drawBackground();

        // Platformy
        ctx.fillStyle = '#8B4513'; // Kolor skrzynek/ziemi
        gameState.platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        // Jedzenie
        gameState.foodItems.forEach(food => {
            ctx.font = `${food.size}px Arial`;
            ctx.fillText(food.emoji, food.x, food.y + food.size);
        });

        // Gracz
        drawPlayer();
    }

    function drawBackground() {
        // Niebo
        ctx.fillStyle = '#87CEEB'; // Sky blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Chmurki
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, Math.PI * 2);
        ctx.arc(140, 100, 40, 0, Math.PI * 2);
        ctx.arc(180, 100, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(500, 150, 40, 0, Math.PI * 2);
        ctx.arc(550, 150, 50, 0, Math.PI * 2);
        ctx.arc(600, 150, 40, 0, Math.PI * 2);
        ctx.fill();

        // Góry w tle
        ctx.fillStyle = '#98C9A3';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 40);
        ctx.lineTo(150, 200);
        ctx.lineTo(300, canvas.height - 40);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#6B8E23';
        ctx.beginPath();
        ctx.moveTo(250, canvas.height - 40);
        ctx.lineTo(450, 150);
        ctx.lineTo(650, canvas.height - 40);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlayer() {
        ctx.save();
        
        // Przesunięcie i skalowanie dla efektu rosnącego brzucha i zmiany kierunku
        let drawX = player.x;
        let scaleDirection = player.direction === 'right' ? 1 : -1;
        
        // Translacja do punktu obrotu (środek gracza)
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        // Skalowanie (kierunek i brzuch)
        ctx.scale(scaleDirection * player.scaleX, 1);
        
        // Narysowanie obrazka, przesuwając go z powrotem, aby środek był w (0,0)
        ctx.drawImage(
            playerImg, 
            -player.width / 2, 
            -player.height / 2, 
            player.width, 
            player.height
        );
        
        ctx.restore();
    }

    function updateUI() {
        foodCounterEl.textContent = `JEDZENIE: ${gameState.score}`;
    }

    // --- Obsługa zdarzeń (klawiatura i dotyk) ---
    function handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                break;
            case 'ArrowUp':
            case 'w':
            case ' ':
                keys.up = true;
                break;
        }
    }

    function handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = false;
                break;
            case 'ArrowUp':
            case 'w':
            case ' ':
                keys.up = false;
                break;
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    restartButton.addEventListener('click', resetGame);

    // Obsługa dotyku
    const touchLeft = document.getElementById('touch-left');
    const touchRight = document.getElementById('touch-right');
    const touchJump = document.getElementById('touch-jump');

    touchLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; }, { passive: false });
    touchLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; }, { passive: false });
    
    touchRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; }, { passive: false });
    touchRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; }, { passive: false });

    touchJump.addEventListener('touchstart', (e) => { e.preventDefault(); keys.up = true; }, { passive: false });
    touchJump.addEventListener('touchend', (e) => { e.preventDefault(); keys.up = false; }, { passive: false });
    
    // Uruchomienie gry
    playerImg.onload = init;
});

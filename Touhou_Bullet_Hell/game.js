// 游戏配置
const CONFIG = {
    PLAYER_SPEED: 6,           // 提高玩家移动速度
    BULLET_SPEED: 10,          // 提高玩家子弹速度
    ENEMY_BULLET_SPEED: 1.5,   // 大幅降低敌人弹幕速度
    ENEMY_SPAWN_RATE: 0.05,    // 进一步增加敌人生成频率
    BULLET_COOLDOWN: 5         // 降低射击冷却时间
};

// 游戏状态
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    level: 1,
    stage: 1,
    maxStage: 10,
    kills: 0,
    stageKills: 0,
    stageTarget: 50,  // 大幅增加每关需要击杀的敌人数
    showStageComplete: false,
    lastHealthBuyScore: 0  // 记录上次购买血量时的分数
};

// 玩家升级数据
let playerUpgrades = {
    power: 1,          // 火力等级 1-5
    speed: 1,          // 移动速度倍数
    health: 5,         // 玩家血量固定5
    maxHealth: 5       // 最大血量固定5
};

// Canvas 和 Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏对象数组
let player = null;
let playerBullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];

// 输入处理
const keys = {};
let bulletCooldown = 0;

// 升级消息系统
let upgradeMessage = '';
let upgradeMessageTimer = 0;

// 玩家类
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.color = '#00ff00';
        this.hitboxRadius = 3;
    }
    
    update() {
        const speed = CONFIG.PLAYER_SPEED * playerUpgrades.speed;
        
        // 移动控制
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.x = Math.max(this.width/2, this.x - speed);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.x = Math.min(canvas.width - this.width/2, this.x + speed);
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.y = Math.max(this.height/2, this.y - speed);
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.y = Math.min(canvas.height - this.height/2, this.y + speed);
        }
        
        // 射击 - 根据Power等级
        if (keys[' '] && bulletCooldown <= 0) {
            const power = playerUpgrades.power;
            
            if (power === 1) {
                // Power 1: 单发
                playerBullets.push(new PlayerBullet(this.x, this.y - 15, 0));
            } else if (power === 2) {
                // Power 2: 双发
                playerBullets.push(new PlayerBullet(this.x - 6, this.y - 15, 0));
                playerBullets.push(new PlayerBullet(this.x + 6, this.y - 15, 0));
            } else if (power === 3) {
                // Power 3: 三发
                playerBullets.push(new PlayerBullet(this.x, this.y - 15, 0));
                playerBullets.push(new PlayerBullet(this.x - 8, this.y - 15, -0.2));
                playerBullets.push(new PlayerBullet(this.x + 8, this.y - 15, 0.2));
            } else if (power === 4) {
                // Power 4: 四发扇形
                playerBullets.push(new PlayerBullet(this.x - 4, this.y - 15, -0.1));
                playerBullets.push(new PlayerBullet(this.x + 4, this.y - 15, 0.1));
                playerBullets.push(new PlayerBullet(this.x - 10, this.y - 15, -0.3));
                playerBullets.push(new PlayerBullet(this.x + 10, this.y - 15, 0.3));
            } else if (power >= 5) {
                // Power 5: 五发扇形
                playerBullets.push(new PlayerBullet(this.x, this.y - 15, 0));
                playerBullets.push(new PlayerBullet(this.x - 6, this.y - 15, -0.15));
                playerBullets.push(new PlayerBullet(this.x + 6, this.y - 15, 0.15));
                playerBullets.push(new PlayerBullet(this.x - 12, this.y - 15, -0.35));
                playerBullets.push(new PlayerBullet(this.x + 12, this.y - 15, 0.35));
            }
            
            bulletCooldown = CONFIG.BULLET_COOLDOWN;
        }
        
        if (bulletCooldown > 0) bulletCooldown--;
    }
    
    takeDamage() {
        playerUpgrades.health--;
        if (playerUpgrades.health <= 0) {
            gameOver();
        } else {
            // 受伤闪烁效果
            this.invulnerable = 60;  // 1秒无敌时间
        }
    }
    
    draw() {
        // 绘制玩家飞机
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 受伤时闪烁效果
        if (this.invulnerable && this.invulnerable > 0) {
            ctx.globalAlpha = Math.sin(this.invulnerable * 0.5) * 0.5 + 0.5;
            this.invulnerable--;
        }
        
        // 主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 发光效果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);
        
        // 碰撞箱（调试用）
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.hitboxRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 玩家子弹类
class PlayerBullet {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.width = 8;   // 固定尺寸
        this.height = 16;
        this.color = '#ffff00';
        this.speed = CONFIG.BULLET_SPEED;
        this.angle = angle;
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -Math.cos(angle) * this.speed;
        this.damage = playerUpgrades.power;  // 伤害等于Power等级
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        return this.y > -this.height && this.x > -this.width && this.x < canvas.width + this.width;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        
        // 绘制更大更明显的子弹
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 添加白色核心
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);
        
        ctx.restore();
    }
}

// 敌人类
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.angle = 0;
        this.startX = x;
        this.timer = 0;
        
        // 根据类型设置属性
        this.setupByType(type);
    }
    
    setupByType(type) {
        switch(type) {
            case 'normal':
                this.width = 25;
                this.height = 25;
                this.hp = 2;
                this.color = '#ff6600';
                this.speed = 1.0;          // 降低速度
                this.shootInterval = 120;
                this.movePattern = Math.random() > 0.5 ? 'sine' : 'linear';
                break;
                
            case 'fast':
                this.width = 20;
                this.height = 20;
                this.hp = 1;
                this.color = '#00ffff';
                this.speed = 1.8;          // 大幅降低速度
                this.shootInterval = 80;
                this.movePattern = 'zigzag';
                break;
                
            case 'heavy':
                this.width = 40;
                this.height = 40;
                this.hp = 5;
                this.color = '#ff00ff';
                this.speed = 0.6;          // 降低速度
                this.shootInterval = 60;
                this.movePattern = 'linear';
                break;
                
            case 'sniper':
                this.width = 30;
                this.height = 30;
                this.hp = 3;
                this.color = '#ffff00';
                this.speed = 0.8;          // 降低速度
                this.shootInterval = 180;  // 射击间隔长但精准
                this.movePattern = 'hover';
                break;
                
            case 'bomber':
                this.width = 35;
                this.height = 35;
                this.hp = 4;
                this.color = '#ff4444';
                this.speed = 0.9;          // 降低速度
                this.shootInterval = 90;
                this.movePattern = 'circle';
                break;
                
            case 'boss':
                this.width = 50;
                this.height = 50;
                this.hp = 12;
                this.color = '#ff0000';
                this.speed = 0.6;          // 降低速度
                this.shootInterval = 50;
                this.movePattern = 'boss';
                break;
        }
        
        this.maxHp = this.hp;
        this.shootTimer = Math.random() * this.shootInterval;  // 随机初始射击时间
    }
    
    update() {
        this.timer++;  // 通用计时器
        
        // 根据移动模式更新位置
        switch(this.movePattern) {
            case 'sine':
                this.y += this.speed;
                this.x = this.startX + Math.sin(this.y * 0.02) * 100;
                break;
                
            case 'zigzag':
                this.y += this.speed;
                this.x = this.startX + Math.sin(this.timer * 0.2) * 150;
                break;
                
            case 'circle':
                this.y += this.speed * 0.5;
                this.x = this.startX + Math.cos(this.timer * 0.1) * 80;
                break;
                
            case 'hover':
                // 狙击手悬停模式
                if (this.y > 100) {
                    this.y += this.speed * 0.2;  // 慢速移动
                } else {
                    this.y += this.speed;
                }
                this.x = this.startX + Math.sin(this.timer * 0.05) * 30;
                break;
                
            case 'boss':
                this.y += this.speed * 0.3;
                this.x = this.startX + Math.sin(this.timer * 0.08) * 120;
                break;
                
            default: // linear
                this.y += this.speed;
                break;
        }
        
        this.angle += 0.1;
        
        // 射击
        this.shootTimer++;
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
        
        return this.y < canvas.height + this.height && this.hp > 0;
    }
    
    shoot() {
        switch(this.type) {
            case 'boss':
                // Boss 弹幕模式
                const bulletCount = 8;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (Math.PI * 2 * i) / bulletCount + this.angle;
                    enemyBullets.push(new EnemyBullet(
                        this.x, this.y, 
                        Math.cos(angle) * CONFIG.ENEMY_BULLET_SPEED,
                        Math.sin(angle) * CONFIG.ENEMY_BULLET_SPEED,
                        'circle'
                    ));
                }
                break;
                
            case 'heavy':
                // 重型敌人 - 3发散射
                for (let i = -1; i <= 1; i++) {
                    const playerAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    const angle = playerAngle + (i * 0.3);
                    enemyBullets.push(new EnemyBullet(
                        this.x, this.y,
                        Math.cos(angle) * CONFIG.ENEMY_BULLET_SPEED,
                        Math.sin(angle) * CONFIG.ENEMY_BULLET_SPEED,
                        'heavy'
                    ));
                }
                break;
                
            case 'sniper':
                // 狙击手 - 精准射击
                const sniperAngle = Math.atan2(player.y - this.y, player.x - this.x);
                enemyBullets.push(new EnemyBullet(
                    this.x, this.y,
                    Math.cos(sniperAngle) * CONFIG.ENEMY_BULLET_SPEED * 1.5,
                    Math.sin(sniperAngle) * CONFIG.ENEMY_BULLET_SPEED * 1.5,
                    'sniper'
                ));
                break;
                
            case 'bomber':
                // 轰炸机 - 5发环形射击
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5;
                    enemyBullets.push(new EnemyBullet(
                        this.x, this.y,
                        Math.cos(angle) * CONFIG.ENEMY_BULLET_SPEED,
                        Math.sin(angle) * CONFIG.ENEMY_BULLET_SPEED,
                        'bomb'
                    ));
                }
                break;
                
            case 'fast':
                // 快速敌人 - 双发
                const playerAngle1 = Math.atan2(player.y - this.y, player.x - this.x);
                enemyBullets.push(new EnemyBullet(
                    this.x - 5, this.y,
                    Math.cos(playerAngle1) * CONFIG.ENEMY_BULLET_SPEED,
                    Math.sin(playerAngle1) * CONFIG.ENEMY_BULLET_SPEED,
                    'fast'
                ));
                enemyBullets.push(new EnemyBullet(
                    this.x + 5, this.y,
                    Math.cos(playerAngle1) * CONFIG.ENEMY_BULLET_SPEED,
                    Math.sin(playerAngle1) * CONFIG.ENEMY_BULLET_SPEED,
                    'fast'
                ));
                break;
                
            default: // normal
                const playerAngle = Math.atan2(player.y - this.y, player.x - this.x);
                enemyBullets.push(new EnemyBullet(
                    this.x, this.y,
                    Math.cos(playerAngle) * CONFIG.ENEMY_BULLET_SPEED,
                    Math.sin(playerAngle) * CONFIG.ENEMY_BULLET_SPEED,
                    'normal'
                ));
                break;
        }
    }
    
    takeDamage(damage = 1) {
        this.hp -= damage;
        if (this.hp <= 0) {
            // 创建爆炸粒子
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(this.x, this.y));
            }
            
            const scoreGain = this.type === 'boss' ? 100 : 10;
            gameState.score += scoreGain;
            gameState.kills++;
            gameState.stageKills++;
            
            // 击杀奖励升级
            this.giveKillReward();
            
            return true;
        }
        return false;
    }
    
    giveKillReward() {
        // 每击杀5个敌人获得一次升级
        if (gameState.kills % 5 === 0) {
            if (playerUpgrades.power < 5) {
                playerUpgrades.power++;
                showUpgradeMessage(`Power升级到${playerUpgrades.power}级!`);
            } else {
                // Power满级后给予移速提升
                if (playerUpgrades.speed < 2) {
                    playerUpgrades.speed += 0.2;
                    showUpgradeMessage("移动速度提升!");
                }
            }
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 绘制敌人
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 血条
        if (this.hp < this.maxHp) {
            const barWidth = this.width;
            const barHeight = 4;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-barWidth/2, -this.height/2 - 10, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-barWidth/2, -this.height/2 - 10, barWidth * (this.hp / this.maxHp), barHeight);
        }
        
        // 发光效果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);
        
        ctx.restore();
    }
}

// 敌人子弹类
class EnemyBullet {
    constructor(x, y, vx, vy, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.life = 200;
        
        // 根据类型设置属性
        switch(type) {
            case 'circle':
                this.radius = 6;
                this.color = '#ff00ff';
                break;
            case 'heavy':
                this.radius = 8;
                this.color = '#ff00ff';
                break;
            case 'sniper':
                this.radius = 5;          // 增大最小弹幕
                this.color = '#ffff00';
                this.life = 400;  // 狙击弹生命更长
                break;
            case 'bomb':
                this.radius = 7;
                this.color = '#ff4444';
                break;
            case 'fast':
                this.radius = 5;          // 增大最小弹幕
                this.color = '#00ffff';
                break;
            default: // normal
                this.radius = 5;          // 增大最小弹幕
                this.color = '#ff4444';
                break;
        }
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        return this.x > -this.radius && this.x < canvas.width + this.radius &&
               this.y > -this.radius && this.y < canvas.height + this.radius &&
               this.life > 0;
    }
    
    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(this.x - this.radius/2, this.y - this.radius/2, this.radius, this.radius);
        }
        
        ctx.restore();
    }
}

// 粒子类（爆炸效果）
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 60;
        this.maxLife = 60;
        this.color = `hsl(${Math.random() * 60 + 20}, 100%, 50%)`;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life--;
        
        return this.life > 0;
    }
    
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 碰撞检测
function checkCollision(obj1, obj2, radius1, radius2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius1 + radius2;
}

// 生成敌人 - 根据关卡调整难度
function spawnEnemy() {
    const stageMultiplier = 1 + (gameState.stage - 1) * 0.3;  // 关卡难度递增
    const spawnRate = CONFIG.ENEMY_SPAWN_RATE * stageMultiplier;
    
    if (Math.random() < spawnRate) {
        const x = Math.random() * (canvas.width - 100) + 50;
        
        // 根据关卡决定敌人类型分布
        const rand = Math.random();
        let type = 'normal';
        
        const bossChance = Math.min(0.03 + (gameState.stage - 1) * 0.01, 0.08);
        
        if (rand < bossChance) {
            type = 'boss';
        } else if (rand < bossChance + 0.15) {
            type = 'fast';
        } else if (rand < bossChance + 0.25) {
            type = 'heavy';
        } else if (rand < bossChance + 0.35) {
            type = 'sniper';
        } else if (rand < bossChance + 0.45) {
            type = 'bomber';
        } else {
            type = 'normal';
        }
        
        // 后期关卡增加特殊敌人概率
        if (gameState.stage >= 5) {
            if (Math.random() < 0.1) {
                const specialTypes = ['heavy', 'sniper', 'bomber'];
                type = specialTypes[Math.floor(Math.random() * specialTypes.length)];
            }
        }
        
        enemies.push(new Enemy(x, -50, type));
    }
}

// 显示升级消息
function showUpgradeMessage(message) {
    upgradeMessage = message;
    upgradeMessageTimer = 120;  // 2秒显示时间
}

// 检查积分购买血量
function checkHealthPurchase() {
    const scoreGap = gameState.score - gameState.lastHealthBuyScore;
    if (scoreGap >= 3000 && playerUpgrades.maxHealth < 10) {
        // 每3000分自动购买1点血量，上限10
        playerUpgrades.health++;
        playerUpgrades.maxHealth++;
        gameState.lastHealthBuyScore = gameState.score;
        showUpgradeMessage("积分奖励: 生命值+1!");
    }
}

// 检查关卡完成
function checkStageComplete() {
    if (gameState.stageKills >= gameState.stageTarget) {
        gameState.showStageComplete = true;
        gameState.isRunning = false;
    }
}

// 下一关
function nextStage() {
    if (gameState.stage < gameState.maxStage) {
        gameState.stage++;
        gameState.stageKills = 0;
        gameState.stageTarget = 50 + (gameState.stage - 1) * 15;  // 大幅增加每关需要击杀的敌人数
        gameState.showStageComplete = false;
        gameState.isRunning = true;
        
        // 清空敌人和子弹
        enemies = [];
        enemyBullets = [];
        
        // 关卡间奖励
        giveStageReward();
    } else {
        // 游戏胜利
        gameWin();
    }
}

// 关卡奖励
function giveStageReward() {
    // 每关给予Power升级或移速提升
    if (playerUpgrades.power < 5) {
        playerUpgrades.power++;
        showUpgradeMessage(`关卡奖励: Power升级到${playerUpgrades.power}级!`);
    } else if (playerUpgrades.speed < 2.5) {
        playerUpgrades.speed += 0.3;
        showUpgradeMessage("关卡奖励: 移动速度大幅提升!");
    } else {
        // 如果都满级了，给予血量奖励
        if (playerUpgrades.maxHealth < 10) {
            playerUpgrades.health++;
            playerUpgrades.maxHealth++;
            showUpgradeMessage("关卡奖励: 生命值+1!");
        }
    }
}

// 更新游戏状态
function updateGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // 更新玩家
    player.update();
    
    // 更新玩家子弹
    playerBullets = playerBullets.filter(bullet => bullet.update());
    
    // 更新敌人
    enemies = enemies.filter(enemy => enemy.update());
    
    // 更新敌人子弹
    enemyBullets = enemyBullets.filter(bullet => bullet.update());
    
    // 更新粒子
    particles = particles.filter(particle => particle.update());
    
    // 生成敌人
    spawnEnemy();
    
    // 碰撞检测 - 玩家子弹 vs 敌人
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const bulletRadius = Math.max(bullet.width, bullet.height) / 2;
            if (checkCollision(bullet, enemy, bulletRadius, 15)) {
                playerBullets.splice(i, 1);
                if (enemy.takeDamage(bullet.damage)) {
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }
    
    // 检查关卡完成
    checkStageComplete();
    
    // 碰撞检测 - 敌人子弹 vs 玩家
    if (!player.invulnerable || player.invulnerable <= 0) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            if (checkCollision(bullet, player, bullet.radius, player.hitboxRadius)) {
                enemyBullets.splice(i, 1);
                player.takeDamage();
                break;
            }
        }
        
        // 碰撞检测 - 敌人 vs 玩家
        for (let enemy of enemies) {
            if (checkCollision(enemy, player, 15, player.hitboxRadius)) {
                player.takeDamage();
                break;
            }
        }
    }
    
    // 更新升级消息倒计时
    if (upgradeMessageTimer > 0) {
        upgradeMessageTimer--;
    }
    
    // 检查积分购买血量
    checkHealthPurchase();
    
    // 更新分数显示
    document.getElementById('score').textContent = 
        `第${gameState.stage}关 | 分数: ${gameState.score} | 击杀: ${gameState.stageKills}/${gameState.stageTarget} | 血量: ${playerUpgrades.health}/${playerUpgrades.maxHealth}`;
}

// 渲染游戏
function renderGame() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景星空
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 100; i++) {
        const x = (i * 123) % canvas.width;
        const y = (i * 456 + Date.now() * 0.1) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // 绘制所有游戏对象
    if (player) player.draw();
    
    playerBullets.forEach(bullet => bullet.draw());
    enemies.forEach(enemy => enemy.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    particles.forEach(particle => particle.draw());
    
    // 绘制升级消息
    if (upgradeMessageTimer > 0) {
        const alpha = Math.min(1, upgradeMessageTimer / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(upgradeMessage, canvas.width/2, 100);
        ctx.fillText(upgradeMessage, canvas.width/2, 100);
        ctx.restore();
    }
    
    // 绘制玩家状态信息
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Power: ${playerUpgrades.power}/5`, 10, 30);
    ctx.fillText(`移速: ${playerUpgrades.speed.toFixed(1)}x`, 10, 50);
    
    // 绘制血量条
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = canvas.width - healthBarWidth - 10;
    const healthBarY = 10;
    
    // 血量条背景
    ctx.fillStyle = '#333333';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // 血量条
    const healthPercentage = playerUpgrades.health / playerUpgrades.maxHealth;
    ctx.fillStyle = healthPercentage > 0.6 ? '#00ff00' : 
                   healthPercentage > 0.3 ? '#ffff00' : '#ff0000';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    
    // 血量条边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // 血量文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${playerUpgrades.health}/${playerUpgrades.maxHealth}`, 
                healthBarX + healthBarWidth/2, healthBarY + 15);
    
    // 绘制暂停提示
    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏暂停', canvas.width/2, canvas.height/2);
        ctx.font = '20px Arial';
        ctx.fillText('按 ESC 继续', canvas.width/2, canvas.height/2 + 50);
    }
    
    // 绘制关卡完成界面
    if (gameState.showStageComplete) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`第${gameState.stage}关完成!`, canvas.width/2, canvas.height/2 - 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`击杀: ${gameState.stageKills}/${gameState.stageTarget}`, canvas.width/2, canvas.height/2);
        ctx.fillText(`总分数: ${gameState.score}`, canvas.width/2, canvas.height/2 + 30);
        
        if (gameState.stage < gameState.maxStage) {
            ctx.font = '20px Arial';
            ctx.fillText('按 Enter 进入下一关', canvas.width/2, canvas.height/2 + 80);
        } else {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 36px Arial';
            ctx.fillText('恭喜通关!', canvas.width/2, canvas.height/2 + 80);
        }
    }
}

// 游戏循环
function gameLoop() {
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop);
}

// 开始游戏
function startGame() {
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.stage = 1;
    gameState.kills = 0;
    gameState.stageKills = 0;
    gameState.stageTarget = 50;
    gameState.showStageComplete = false;
    gameState.lastHealthBuyScore = 0;
    
    // 重置升级状态
    playerUpgrades.power = 1;
    playerUpgrades.speed = 1;
    
    // 固定初始血量为5
    playerUpgrades.health = 5;
    playerUpgrades.maxHealth = 5;
    
    // 重置升级消息
    upgradeMessage = '';
    upgradeMessageTimer = 0;
    
    // 初始化玩家
    player = new Player(canvas.width / 2, canvas.height - 50);
    
    // 清空所有数组
    playerBullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    
    // 隐藏游戏结束界面
    document.getElementById('gameOver').style.display = 'none';
    
    // 开始游戏循环
    gameLoop();
}

// 游戏胜利
function gameWin() {
    gameState.isRunning = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').innerHTML = `
        <h2 style="color: #00ff00;">恭喜通关!</h2>
        <p>最终分数: <span id="finalScore">${gameState.score}</span></p>
        <p>总击杀: ${gameState.kills}</p>
        <p>你是真正的弹幕大师!</p>
        <button onclick="restartGame()">重新开始</button>
    `;
    document.getElementById('gameOver').style.display = 'block';
}

// 游戏结束
function gameOver() {
    gameState.isRunning = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').style.display = 'block';
}

// 重新开始游戏
function restartGame() {
    startGame();
}

// 键盘事件处理
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === 'Escape') {
        if (gameState.isRunning) {
            gameState.isPaused = !gameState.isPaused;
        }
    }
    
    if (e.key === 'Enter') {
        if (gameState.showStageComplete) {
            nextStage();
        }
    }
    
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 防止空格键滚动页面
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
    }
});

// 初始化游戏
startGame(); 
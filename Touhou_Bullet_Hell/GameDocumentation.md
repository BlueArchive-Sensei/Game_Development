# 东方弹幕地狱 - 技术文档

## 📁 文件架构

```
Touhou_Bullet_Hell/
├── index.html          # 游戏主页面，包含HTML结构和CSS样式
├── game.js             # 游戏核心逻辑，包含所有类和函数
├── README.md           # 游戏说明文档
└── GameDocumentation.md # 技术文档 (本文件)
```

## 🎮 游戏架构概览

### 主要组件
- **HTML界面层**: 游戏UI和Canvas容器
- **游戏引擎层**: 游戏循环、渲染、更新逻辑
- **游戏对象层**: 玩家、敌人、子弹、粒子等实体
- **系统管理层**: 状态管理、输入处理、碰撞检测

## 📊 核心数据结构

### 1. 游戏配置 (CONFIG)
```javascript
const CONFIG = {
    PLAYER_SPEED: 6,           // 玩家移动速度
    BULLET_SPEED: 10,          // 玩家子弹速度
    ENEMY_BULLET_SPEED: 1.5,   // 敌人弹幕速度
    ENEMY_SPAWN_RATE: 0.05,    // 敌人生成频率
    BULLET_COOLDOWN: 5         // 射击冷却时间
};
```

### 2. 游戏状态 (gameState)
```javascript
let gameState = {
    isRunning: false,          // 游戏运行状态
    isPaused: false,           // 暂停状态
    score: 0,                  // 当前分数
    stage: 1,                  // 当前关卡
    maxStage: 10,              // 最大关卡数
    kills: 0,                  // 总击杀数
    stageKills: 0,             // 本关击杀数
    stageTarget: 50,           // 本关目标击杀数
    showStageComplete: false,  // 是否显示关卡完成
    lastHealthBuyScore: 0      // 上次购买血量时的分数
};
```

### 3. 玩家升级数据 (playerUpgrades)
```javascript
let playerUpgrades = {
    power: 1,          // 火力等级 (1-5)
    speed: 1,          // 移动速度倍数
    health: 5,         // 当前血量
    maxHealth: 5       // 最大血量
};
```

## 🎯 类结构与交互

### 1. Player 类
**职责**: 玩家角色的行为和渲染

#### 属性
```javascript
class Player {
    constructor(x, y) {
        this.x = x;                    // X坐标
        this.y = y;                    // Y坐标
        this.width = 20;               // 宽度
        this.height = 20;              // 高度
        this.color = '#00ff00';        // 颜色
        this.hitboxRadius = 3;         // 碰撞半径
        this.invulnerable = 0;         // 无敌时间
    }
}
```

#### 核心方法
- `update()`: 处理移动和射击逻辑
- `draw()`: 渲染玩家飞机和特效
- `takeDamage()`: 处理受伤逻辑

#### 射击系统
根据Power等级发射不同数量和角度的子弹：
- Power 1: 单发直射
- Power 2: 双发并行
- Power 3-5: 扇形多发

### 2. Enemy 类
**职责**: 敌人的AI行为、移动模式和攻击

#### 敌人类型系统
```javascript
setupByType(type) {
    switch(type) {
        case 'normal':   // 普通敌人
        case 'fast':     // 快速敌人
        case 'heavy':    // 重型敌人
        case 'sniper':   // 狙击手
        case 'bomber':   // 轰炸机
        case 'boss':     // Boss
    }
}
```

#### 移动模式
- `linear`: 直线移动
- `sine`: 正弦波移动
- `zigzag`: Z字形移动
- `circle`: 圆形移动
- `hover`: 悬停模式
- `boss`: Boss特殊移动

#### 射击模式
- 普通射击: 追踪玩家
- 散射射击: 多发散射
- 环形射击: 360度环形弹幕
- Boss弹幕: 旋转弹幕

### 3. PlayerBullet 类
**职责**: 玩家子弹的物理和渲染

```javascript
class PlayerBullet {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;            // 发射角度
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -Math.cos(angle) * this.speed;
        this.damage = playerUpgrades.power;  // 伤害=Power等级
    }
}
```

### 4. EnemyBullet 类
**职责**: 敌人弹幕的行为和视觉效果

#### 弹幕类型
- `normal`: 普通弹幕
- `circle`: 圆形弹幕
- `heavy`: 重型弹幕
- `sniper`: 狙击弹幕
- `bomb`: 爆炸弹幕
- `fast`: 快速弹幕

### 5. Particle 类
**职责**: 爆炸和特效粒子

```javascript
class Particle {
    constructor(x, y) {
        this.vx = (Math.random() - 0.5) * 8;  // 随机速度
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 60;                        // 生命周期
        this.color = `hsl(${Math.random() * 60 + 20}, 100%, 50%)`;
    }
}
```

## 🔄 游戏循环系统

### 主循环 (gameLoop)
```javascript
function gameLoop() {
    updateGame();    // 更新游戏逻辑
    renderGame();    // 渲染游戏画面
    requestAnimationFrame(gameLoop);  // 递归调用
}
```

### 更新流程 (updateGame)
1. 更新玩家状态
2. 更新所有子弹
3. 更新所有敌人
4. 更新粒子效果
5. 生成新敌人
6. 碰撞检测
7. 检查关卡完成
8. 更新UI显示

### 渲染流程 (renderGame)
1. 清空画布
2. 绘制背景星空
3. 绘制所有游戏对象
4. 绘制UI界面
5. 绘制特殊效果

## ⚔️ 碰撞检测系统

### 碰撞函数
```javascript
function checkCollision(obj1, obj2, radius1, radius2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius1 + radius2;
}
```

### 碰撞类型
1. **玩家子弹 vs 敌人**: 造成伤害，获得分数
2. **敌人子弹 vs 玩家**: 扣除血量，触发无敌时间
3. **敌人 vs 玩家**: 直接扣除血量

## 🎮 输入处理系统

### 键盘映射
```javascript
const keys = {};  // 键盘状态存储

// 事件监听
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    // 特殊键处理
    if (e.key === 'Escape') // 暂停
    if (e.key === 'Enter')  // 下一关
});
```

### 支持的输入
- `WASD` / `方向键`: 移动
- `空格键`: 射击
- `ESC`: 暂停/继续
- `Enter`: 确认/下一关

## 🎯 游戏机制系统

### 1. Power升级系统
```javascript
giveKillReward() {
    if (gameState.kills % 5 === 0) {
        if (playerUpgrades.power < 5) {
            playerUpgrades.power++;
        }
    }
}
```

### 2. 血量购买系统
```javascript
checkHealthPurchase() {
    const scoreGap = gameState.score - gameState.lastHealthBuyScore;
    if (scoreGap >= 3000 && playerUpgrades.maxHealth < 10) {
        playerUpgrades.health++;
        playerUpgrades.maxHealth++;
    }
}
```

### 3. 关卡进度系统
- 每关需要击杀指定数量敌人
- 关卡1: 50个敌人
- 关卡2: 65个敌人 (+15)
- 关卡3: 80个敌人 (+15)
- 以此类推...

### 4. 敌人生成系统
```javascript
function spawnEnemy() {
    // 基于关卡的难度递增
    const stageMultiplier = 1 + (gameState.stage - 1) * 0.3;
    const spawnRate = CONFIG.ENEMY_SPAWN_RATE * stageMultiplier;
    
    // 敌人类型概率分布
    // Boss: 3-8%
    // 特殊敌人: 15-45%
    // 普通敌人: 剩余概率
}
```

## 🎨 渲染系统

### Canvas渲染管线
1. **背景层**: 渐变背景 + 星空动画
2. **游戏对象层**: 玩家、敌人、子弹
3. **粒子层**: 爆炸效果、特效
4. **UI层**: 分数、血量、状态信息
5. **覆盖层**: 暂停、关卡完成界面

### 视觉效果
- **发光效果**: `shadowBlur` 和 `shadowColor`
- **透明度**: 受伤闪烁、粒子淡出
- **颜色编码**: 不同敌人类型用不同颜色区分
- **动态UI**: 血量条颜色变化

## 🔧 性能优化

### 对象池管理
- 自动清理屏幕外的子弹
- 限制粒子数量和生命周期
- 敌人生命周期管理

### 渲染优化
- 只绘制可见区域内的对象
- 使用 `requestAnimationFrame` 实现流畅动画
- 合理使用Canvas API避免性能损失

## 🎵 扩展性设计

### 易于扩展的部分
1. **新敌人类型**: 在 `Enemy.setupByType()` 中添加
2. **新弹幕模式**: 在 `Enemy.shoot()` 中扩展
3. **新Power效果**: 在 `Player.update()` 中修改射击逻辑
4. **新关卡机制**: 修改 `nextStage()` 函数

### 模块化设计
- 配置与逻辑分离
- 渲染与更新分离
- 输入处理独立
- 状态管理集中

## 📈 数据流图

```
用户输入 → 输入处理 → 游戏状态更新 → 对象更新 → 碰撞检测 → 渲染显示
    ↑                                                                    ↓
    └─────────────────── 游戏循环 ←──────────────────────────────────────┘
```

## 🐛 调试和测试

### 调试功能
- 玩家碰撞箱可视化 (红色圆圈)
- 控制台输出关键事件
- 分步调试支持

### 测试要点
1. 各种浏览器兼容性
2. 不同屏幕分辨率适配
3. 长时间游戏的内存管理
4. 极端情况下的游戏状态

---

📝 **本技术文档详细描述了游戏的完整实现架构，为后续开发和维护提供参考。** 
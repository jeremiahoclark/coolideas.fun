import React, { useState, useEffect, useCallback, useRef } from 'react';

const CooperativeFlowPuzzle = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [requiredKey, setRequiredKey] = useState('');
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [grid, setGrid] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [paths, setPaths] = useState(new Map());
  const [activePath, setActivePath] = useState(null);
  const [gameWon, setGameWon] = useState(false);
  const [powerTimer, setPowerTimer] = useState(0);
  const [gameMode, setGameMode] = useState('puzzle');
  const [isLoading, setIsLoading] = useState(false);
  const [unsolvableError, setUnsolvableError] = useState(false);
  const [showMicrotransaction, setShowMicrotransaction] = useState(false);
  const [hasPurchasedSkip, setHasPurchasedSkip] = useState(false);
  
  // Platformer states
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [platformerKeys, setPlatformerKeys] = useState({});
  const [platformerGame, setPlatformerGame] = useState({
    score: 0,
    lives: 3,
    level: 1,
    camera: { x: 0, y: 0 },
    gameOver: false,
    timeLimit: 0,
    timeLimitActive: false,
    countdownStarted: false,
    levelEndX: 2000,
    won: false,
    timeUp: false
  });
  const [platformerPlayer, setPlatformerPlayer] = useState({
    x: 100,
    y: 400,
    width: 32,
    height: 32,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpPower: 15,
    onGround: false,
    direction: 1
  });
  const [platforms, setPlatforms] = useState([]);
  const [coins, setCoins] = useState([]);
  const [enemies, setEnemies] = useState([]);
  
  const GRID_SIZE = 6;
  
  // Generate random key for power player (excluding A and D)
  const generateRandomKey = () => {
    const keys = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'S', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'];
    return keys[Math.floor(Math.random() * keys.length)];
  };
  
  // Advanced solvability checker using backtracking
  const isAdvancedSolvable = (grid, endpoints) => {
    if (endpoints.length === 0) return false;
    
    const pairs = [];
    const sources = endpoints.filter(ep => ep.type === 'source');
    sources.forEach(source => {
      const target = endpoints.find(ep => ep.type === 'target' && ep.id === source.id);
      if (target) {
        pairs.push({ 
          id: source.id,
          source: { row: source.row, col: source.col },
          target: { row: target.row, col: target.col }
        });
      }
    });
    
    if (pairs.length === 0) return false;
    
    const usedCells = new Set();
    const foundPaths = new Map();
    
    const findPath = (start, end, blocked) => {
      const visited = new Set();
      const queue = [{ pos: start, path: [start] }];
      
      while (queue.length > 0) {
        const { pos, path } = queue.shift();
        const key = `${pos.row}-${pos.col}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        if (pos.row === end.row && pos.col === end.col) {
          return path;
        }
        
        for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1]]) {
          const newRow = pos.row + dr;
          const newCol = pos.col + dc;
          const newKey = `${newRow}-${newCol}`;
          
          if (newRow >= 0 && newRow < GRID_SIZE && 
              newCol >= 0 && newCol < GRID_SIZE &&
              grid[newRow][newCol] !== -1 &&
              !blocked.has(newKey) &&
              !visited.has(newKey)) {
            
            queue.push({
              pos: { row: newRow, col: newCol },
              path: [...path, { row: newRow, col: newCol }]
            });
          }
        }
      }
      return null;
    };
    
    const backtrack = (pairIndex) => {
      if (pairIndex >= pairs.length) {
        return true;
      }
      
      const pair = pairs[pairIndex];
      const blockedCells = new Set(usedCells);
      
      const path = findPath(pair.source, pair.target, blockedCells);
      
      if (path) {
        const pathKeys = path.map(p => `${p.row}-${p.col}`);
        pathKeys.forEach(key => usedCells.add(key));
        foundPaths.set(pair.id, path);
        
        if (backtrack(pairIndex + 1)) {
          return true;
        }
        
        pathKeys.forEach(key => usedCells.delete(key));
        foundPaths.delete(pair.id);
      }
      
      return false;
    };
    
    return backtrack(0);
  };

  // Check if puzzle is solvable
  const isPuzzleSolvable = (grid, endpoints) => {
    if (endpoints.length === 0) return false;
    
    const pairs = [];
    const sources = endpoints.filter(ep => ep.type === 'source');
    sources.forEach(source => {
      const target = endpoints.find(ep => ep.type === 'target' && ep.id === source.id);
      if (target) {
        pairs.push({ source, target });
      }
    });
    
    if (pairs.length === 0) return false;
    
    if (pairs.length <= 2) {
      for (const pair of pairs) {
        const visited = new Set();
        const queue = [{ row: pair.source.row, col: pair.source.col }];
        let found = false;
        
        while (queue.length > 0 && !found) {
          const { row, col } = queue.shift();
          
          if (row === pair.target.row && col === pair.target.col) {
            found = true;
            break;
          }
          
          const key = `${row}-${col}`;
          if (visited.has(key)) continue;
          visited.add(key);
          
          for (const [dr, dc] of [[-1,0], [1,0], [0,-1], [0,1]]) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
              if (grid[newRow][newCol] !== -1) {
                queue.push({ row: newRow, col: newCol });
              }
            }
          }
        }
        
        if (!found) return false;
      }
      return true;
    } else {
      return isAdvancedSolvable(grid, endpoints);
    }
  };

  // Generate guaranteed solvable puzzle layouts
  const generateSolvableLayout = (level) => {
    const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    
    if (level === 1) {
      return {
        grid,
        endpoints: [
          { row: 0, col: 0, emoji: '⚡', type: 'source', id: 0 },
          { row: 5, col: 5, emoji: '🎯', type: 'target', id: 0 }
        ]
      };
    }
    
    if (level === 2) {
      grid[1][3] = -1;
      grid[3][1] = -1;
      grid[3][4] = -1;
      return {
        grid,
        endpoints: [
          { row: 0, col: 0, emoji: '🔴', type: 'source', id: 0 },
          { row: 2, col: 5, emoji: '🔴', type: 'target', id: 0 },
          { row: 5, col: 0, emoji: '🟢', type: 'source', id: 1 },
          { row: 3, col: 5, emoji: '🟢', type: 'target', id: 1 }
        ]
      };
    }
    
    if (level === 3) {
      // Level 3: Randomized layout each time
      const obstacles = [];
      const usedPositions = new Set();
      
      // Add 3-4 random obstacles
      const numObstacles = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numObstacles; i++) {
        let row, col;
        do {
          row = 1 + Math.floor(Math.random() * 4); // Avoid edges
          col = 1 + Math.floor(Math.random() * 4);
        } while (usedPositions.has(`${row}-${col}`));
        
        grid[row][col] = -1;
        usedPositions.add(`${row}-${col}`);
        obstacles.push({row, col});
      }
      
      // Generate random endpoint positions for 2 pairs
      const endpoints = [];
      const colors = ['🔴', '🟢'];
      
      for (let i = 0; i < 2; i++) {
        let sourceRow, sourceCol, targetRow, targetCol;
        
        // Find random source position
        do {
          sourceRow = Math.floor(Math.random() * GRID_SIZE);
          sourceCol = Math.floor(Math.random() * GRID_SIZE);
        } while (
          grid[sourceRow][sourceCol] === -1 ||
          usedPositions.has(`${sourceRow}-${sourceCol}`)
        );
        usedPositions.add(`${sourceRow}-${sourceCol}`);
        
        // Find random target position
        do {
          targetRow = Math.floor(Math.random() * GRID_SIZE);
          targetCol = Math.floor(Math.random() * GRID_SIZE);
        } while (
          grid[targetRow][targetCol] === -1 ||
          usedPositions.has(`${targetRow}-${targetCol}`) ||
          (targetRow === sourceRow && targetCol === sourceCol) ||
          Math.abs(targetRow - sourceRow) + Math.abs(targetCol - sourceCol) < 3
        );
        usedPositions.add(`${targetRow}-${targetCol}`);
        
        endpoints.push(
          { row: sourceRow, col: sourceCol, emoji: colors[i], type: 'source', id: i },
          { row: targetRow, col: targetCol, emoji: colors[i], type: 'target', id: i }
        );
      }
      
      return {
        grid,
        endpoints
      };
    }
    
    if (level === 4) {
      // Level 4: Specific pattern - green=up down forward down left down forward red=up down left down down left
      grid[2][2] = -1;
      grid[2][3] = -1;
      grid[3][2] = -1;
      return {
        grid,
        endpoints: [
          // Green path: up down forward down left down forward (starting from 5,0)
          { row: 5, col: 0, emoji: '🟢', type: 'source', id: 0 },
          { row: 0, col: 4, emoji: '🟢', type: 'target', id: 0 },
          // Red path: up down left down down left (starting from 5,5)
          { row: 5, col: 5, emoji: '🔴', type: 'source', id: 1 },
          { row: 1, col: 1, emoji: '🔴', type: 'target', id: 1 }
        ]
      };
    }
    
    if (level === 5) {
      // Level 5: Randomized layout each time
      const obstacles = [];
      const usedPositions = new Set();
      
      // Add 3-5 random obstacles
      const numObstacles = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numObstacles; i++) {
        let row, col;
        do {
          row = 1 + Math.floor(Math.random() * 4); // Avoid edges
          col = 1 + Math.floor(Math.random() * 4);
        } while (usedPositions.has(`${row}-${col}`));
        
        grid[row][col] = -1;
        usedPositions.add(`${row}-${col}`);
        obstacles.push({row, col});
      }
      
      // Generate random endpoint positions
      const endpoints = [];
      const colors = ['🔴', '🟢', '🔵'];
      const numPairs = 2 + Math.floor(Math.random() * 2); // 2-3 pairs
      
      for (let i = 0; i < numPairs; i++) {
        let sourceRow, sourceCol, targetRow, targetCol;
        
        // Find random source position
        do {
          sourceRow = Math.floor(Math.random() * GRID_SIZE);
          sourceCol = Math.floor(Math.random() * GRID_SIZE);
        } while (
          grid[sourceRow][sourceCol] === -1 ||
          usedPositions.has(`${sourceRow}-${sourceCol}`)
        );
        usedPositions.add(`${sourceRow}-${sourceCol}`);
        
        // Find random target position
        do {
          targetRow = Math.floor(Math.random() * GRID_SIZE);
          targetCol = Math.floor(Math.random() * GRID_SIZE);
        } while (
          grid[targetRow][targetCol] === -1 ||
          usedPositions.has(`${targetRow}-${targetCol}`) ||
          (targetRow === sourceRow && targetCol === sourceCol) ||
          Math.abs(targetRow - sourceRow) + Math.abs(targetCol - sourceCol) < 2
        );
        usedPositions.add(`${targetRow}-${targetCol}`);
        
        endpoints.push(
          { row: sourceRow, col: sourceCol, emoji: colors[i], type: 'source', id: i },
          { row: targetRow, col: targetCol, emoji: colors[i], type: 'target', id: i }
        );
      }
      
      return {
        grid,
        endpoints
      };
    }
    
    if (level === 6) {
      return {
        grid,
        endpoints: [
          { row: 0, col: 0, emoji: '🔴', type: 'source', id: 0 },
          { row: 1, col: 1, emoji: '🔴', type: 'target', id: 0 }
        ]
      };
    }
    
    return {
      grid,
      endpoints: [
        { row: 0, col: 0, emoji: '🔴', type: 'source', id: 0 },
        { row: 5, col: 5, emoji: '🔴', type: 'target', id: 0 }
      ]
    };
  };

  // Initialize platformer level data
  const initializePlatformerLevel = (level) => {
    const newPlatforms = [];
    const newCoins = [];
    const newEnemies = [];
    let levelEndX = 2000;
    
    if (level === 1) {
      newPlatforms.push(
        { x: 0, y: 550, width: 400, height: 50, color: '#8B4513' },
        { x: 500, y: 550, width: 400, height: 50, color: '#8B4513' },
        { x: 1000, y: 550, width: 400, height: 50, color: '#8B4513' },
        { x: 1500, y: 550, width: 500, height: 50, color: '#8B4513' },
        { x: 300, y: 450, width: 100, height: 20, color: '#CD853F' },
        { x: 600, y: 400, width: 120, height: 20, color: '#CD853F' },
        { x: 800, y: 350, width: 100, height: 20, color: '#CD853F' },
        { x: 1100, y: 450, width: 100, height: 20, color: '#CD853F' },
        { x: 1600, y: 400, width: 100, height: 20, color: '#CD853F' }
      );
      newCoins.push(
        { x: 350, y: 410, collected: false },
        { x: 650, y: 360, collected: false },
        { x: 850, y: 310, collected: false },
        { x: 1150, y: 410, collected: false },
        { x: 1650, y: 360, collected: false }
      );
      newEnemies.push(
        { x: 520, y: 510, width: 24, height: 24, velX: -2, direction: -1, alive: true },
        { x: 1150, y: 410, width: 24, height: 24, velX: -2, direction: -1, alive: true }
      );
      levelEndX = 2000;
    } else if (level === 2) {
      newPlatforms.push(
        { x: 0, y: 550, width: 300, height: 50, color: '#654321' },
        { x: 400, y: 500, width: 200, height: 20, color: '#8B6914' },
        { x: 700, y: 450, width: 150, height: 20, color: '#8B6914' },
        { x: 950, y: 400, width: 150, height: 20, color: '#8B6914' },
        { x: 1200, y: 350, width: 200, height: 20, color: '#8B6914' },
        { x: 1500, y: 300, width: 150, height: 20, color: '#8B6914' },
        { x: 1750, y: 250, width: 200, height: 20, color: '#8B6914' },
        { x: 2050, y: 550, width: 400, height: 50, color: '#654321' }
      );
      newCoins.push(
        { x: 450, y: 460, collected: false },
        { x: 750, y: 410, collected: false },
        { x: 1000, y: 360, collected: false },
        { x: 1250, y: 310, collected: false },
        { x: 1550, y: 260, collected: false },
        { x: 1800, y: 210, collected: false }
      );
      newEnemies.push(
        { x: 450, y: 460, width: 24, height: 24, velX: 3, direction: 1, alive: true },
        { x: 1000, y: 360, width: 24, height: 24, velX: -3, direction: -1, alive: true },
        { x: 1800, y: 210, width: 24, height: 24, velX: 2, direction: 1, alive: true }
      );
      levelEndX = 2450;
    } else {
      newPlatforms.push(
        { x: 0, y: 550, width: 250, height: 50, color: '#2F4F4F' },
        { x: 350, y: 480, width: 100, height: 20, color: '#696969' },
        { x: 550, y: 420, width: 100, height: 20, color: '#696969' },
        { x: 750, y: 360, width: 100, height: 20, color: '#696969' },
        { x: 950, y: 300, width: 100, height: 20, color: '#696969' },
        { x: 1150, y: 240, width: 100, height: 20, color: '#696969' },
        { x: 1350, y: 180, width: 100, height: 20, color: '#696969' },
        { x: 1550, y: 120, width: 100, height: 20, color: '#696969' },
        { x: 1750, y: 180, width: 150, height: 20, color: '#696969' },
        { x: 2000, y: 240, width: 150, height: 20, color: '#696969' },
        { x: 2250, y: 550, width: 300, height: 50, color: '#2F4F4F' }
      );
      newCoins.push(
        { x: 400, y: 440, collected: false },
        { x: 600, y: 380, collected: false },
        { x: 800, y: 320, collected: false },
        { x: 1000, y: 260, collected: false },
        { x: 1200, y: 200, collected: false },
        { x: 1400, y: 140, collected: false },
        { x: 1600, y: 80, collected: false },
        { x: 1825, y: 140, collected: false }
      );
      newEnemies.push(
        { x: 400, y: 440, width: 24, height: 24, velX: -4, direction: -1, alive: true },
        { x: 800, y: 320, width: 24, height: 24, velX: 4, direction: 1, alive: true },
        { x: 1200, y: 200, width: 24, height: 24, velX: -3, direction: -1, alive: true },
        { x: 1825, y: 140, width: 24, height: 24, velX: 3, direction: 1, alive: true }
      );
      levelEndX = 2550;
    }
    
    setPlatforms(newPlatforms);
    setCoins(newCoins);
    setEnemies(newEnemies);
    
    return levelEndX;
  };

  // Initialize platformer level
  const initializePlatformer = useCallback(async (level) => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const platformLevel = level - 6;
    const levelEndX = initializePlatformerLevel(platformLevel);
    
    setPlatformerPlayer({
      x: 100,
      y: 400,
      width: 32,
      height: 32,
      velX: 0,
      velY: 0,
      speed: 3,
      jumpPower: 15,
      onGround: false,
      direction: 1
    });
    
    setPlatformerGame(prev => ({
      ...prev,
      level: platformLevel,
      camera: { x: 0, y: 0 },
      gameOver: false,
      won: false,
      timeUp: false,
      levelEndX: levelEndX
    }));
    
    setGameWon(false);
    setIsLoading(false);
  }, []);

  // Initialize puzzle grid
  const initializePuzzle = useCallback(async (level) => {
    setIsLoading(true);
    setUnsolvableError(false);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (level <= 6) {
      const layout = generateSolvableLayout(level);
      
      const isSolvable = isPuzzleSolvable(layout.grid, layout.endpoints);
      
      if (!isSolvable) {
        setUnsolvableError(true);
        setIsLoading(false);
        return;
      }
      
      setGrid(layout.grid);
      setEndpoints(layout.endpoints);
      setPaths(new Map());
      setActivePath(null);
      setGameWon(false);
    }
    
    setIsLoading(false);
  }, []);

  // Start new game
  const startGame = () => {
    setRequiredKey(generateRandomKey());
    setGameStarted(true);
    setCurrentLevel(1);
    setGameMode('puzzle');
    initializePuzzle(1);
    setPowerTimer(0);
  };

  // Handle keyboard events
  useEffect(() => {
    if (!gameStarted) return;
    
    const handleKeyDown = (event) => {
      if (event.key.toUpperCase() === requiredKey) {
        setIsKeyPressed(true);
      }
      
      if (gameMode === 'platformer') {
        const key = event.key.toLowerCase();
        setPlatformerKeys(prev => ({ ...prev, [key]: true }));
      }
    };
    
    const handleKeyUp = (event) => {
      if (event.key.toUpperCase() === requiredKey) {
        setIsKeyPressed(false);
      }
      
      if (gameMode === 'platformer') {
        const key = event.key.toLowerCase();
        setPlatformerKeys(prev => ({ ...prev, [key]: false }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, requiredKey, gameMode]);

  // Power timer
  useEffect(() => {
    if (!isKeyPressed || !gameStarted || gameWon) return;
    
    const timer = setInterval(() => {
      setPowerTimer(prev => prev + 1);
    }, 100);
    
    return () => clearInterval(timer);
  }, [isKeyPressed, gameStarted, gameWon]);

  // Collision detection for platformer
  const checkCollision = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  // Platformer game loop
  useEffect(() => {
    if (gameMode !== 'platformer' || !gameStarted || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const gameLoop = () => {
      if (platformerGame.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        
        if (platformerGame.won) {
          ctx.fillStyle = '#FFD700';
          ctx.fillText('VICTORY!', canvas.width/2, canvas.height/2 - 100);
          ctx.fillStyle = 'white';
          ctx.font = '32px Arial';
          ctx.fillText('You completed the platformer!', canvas.width/2, canvas.height/2 - 50);
        } else if (platformerGame.timeUp) {
          ctx.fillStyle = '#FF4444';
          ctx.fillText('TIME\'S UP!', canvas.width/2, canvas.height/2 - 100);
        } else {
          ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 50);
        }
        
        ctx.font = '24px Arial';
        ctx.fillText('Final Score: ' + platformerGame.score, canvas.width/2, canvas.height/2);
        ctx.fillText('Press R to Restart at Puzzle Level 1', canvas.width/2, canvas.height/2 + 80);
        
        if (platformerKeys['r']) {
          setCurrentLevel(1);
          setGameMode('puzzle');
          setRequiredKey(generateRandomKey());
          initializePuzzle(1);
        }
        
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      if (isKeyPressed) {
        setPlatformerPlayer(prev => {
          const newPlayer = { ...prev };
          
          if (platformerKeys['a'] || platformerKeys['arrowleft']) {
            newPlayer.velX = -newPlayer.speed;
            newPlayer.direction = -1;
          } else if (platformerKeys['d'] || platformerKeys['arrowright']) {
            newPlayer.velX = newPlayer.speed;
            newPlayer.direction = 1;
          } else {
            newPlayer.velX *= 0.8;
          }
          
          if ((platformerKeys['w'] || platformerKeys['arrowup'] || platformerKeys[' ']) && newPlayer.onGround) {
            newPlayer.velY = -newPlayer.jumpPower;
            newPlayer.onGround = false;
          }
          
          newPlayer.velY += 0.4;
          if (newPlayer.velY > 15) newPlayer.velY = 15;
          
          newPlayer.x += newPlayer.velX;
          newPlayer.y += newPlayer.velY;
          
          newPlayer.onGround = false;
          platforms.forEach(platform => {
            if (checkCollision(newPlayer, platform)) {
              if (newPlayer.velY > 0 && newPlayer.y < platform.y) {
                newPlayer.y = platform.y - newPlayer.height;
                newPlayer.velY = 0;
                newPlayer.onGround = true;
              } else if (newPlayer.velY < 0 && newPlayer.y > platform.y) {
                newPlayer.y = platform.y + platform.height;
                newPlayer.velY = 0;
              } else if (newPlayer.velX > 0 && newPlayer.x < platform.x) {
                newPlayer.x = platform.x - newPlayer.width;
              } else if (newPlayer.velX < 0 && newPlayer.x > platform.x) {
                newPlayer.x = platform.x + platform.width;
              }
            }
          });
          
          if (newPlayer.x < 0) newPlayer.x = 0;
          
          if (newPlayer.y > canvas.height) {
            // Player fell off the world - lose a life
            setPlatformerGame(prev => {
              const newLives = prev.lives - 1;
              if (newLives <= 0) {
                // All lives lost - restart at puzzle level 1
                setCurrentLevel(1);
                setGameMode('puzzle');
                setRequiredKey(generateRandomKey());
                initializePuzzle(1);
                return prev;
              } else {
                // Still have lives - respawn at start of current platformer level
                return { ...prev, lives: newLives };
              }
            });
            // Reset player position
            return {
              ...prev,
              x: 100,
              y: 400,
              velX: 0,
              velY: 0
            };
          }
          
          if (newPlayer.x >= platformerGame.levelEndX) {
            if (platformerGame.level < 3) {
              const nextPlatformerLevel = platformerGame.level + 1;
              const newEndX = initializePlatformerLevel(nextPlatformerLevel);
              setPlatformerGame(prevGame => ({
                ...prevGame,
                level: nextPlatformerLevel,
                levelEndX: newEndX
              }));
              newPlayer.x = 100;
              newPlayer.y = 400;
              newPlayer.velX = 0;
              newPlayer.velY = 0;
            } else {
              setPlatformerGame(prevGame => ({
                ...prevGame,
                gameOver: true,
                won: true
              }));
            }
          }
          
          return newPlayer;
        });
        
        setCoins(prevCoins => {
          return prevCoins.map(coin => {
            if (!coin.collected && 
                Math.abs(platformerPlayer.x - coin.x) < 30 && 
                Math.abs(platformerPlayer.y - coin.y) < 30) {
              setPlatformerGame(prev => ({ ...prev, score: prev.score + 100 }));
              
              if (platformerGame.score + 100 >= 500 && !platformerGame.timeLimitActive) {
                setPlatformerGame(prev => ({
                  ...prev,
                  timeLimitActive: true,
                  timeLimit: 60 * 60
                }));
              }
              
              return { ...coin, collected: true };
            }
            return coin;
          });
        });
        
        setEnemies(prevEnemies => {
          return prevEnemies.map(enemy => {
            if (!enemy.alive) return enemy;
            
            const newEnemy = { ...enemy };
            newEnemy.x += newEnemy.velX;
            
            platforms.forEach(platform => {
              if (newEnemy.x >= platform.x - 20 && newEnemy.x <= platform.x + platform.width + 20 &&
                  newEnemy.y >= platform.y - newEnemy.height && newEnemy.y <= platform.y + 10) {
                if (newEnemy.x <= platform.x || newEnemy.x >= platform.x + platform.width - newEnemy.width) {
                  newEnemy.velX *= -1;
                  newEnemy.direction *= -1;
                }
              }
            });
            
            if (checkCollision(platformerPlayer, newEnemy)) {
              if (platformerPlayer.velY > 0 && platformerPlayer.y < newEnemy.y - 10) {
                newEnemy.alive = false;
                setPlatformerPlayer(prev => ({ ...prev, velY: -8 }));
                setPlatformerGame(prev => ({ ...prev, score: prev.score + 200 }));
              } else {
                setPlatformerGame(prev => {
                  const newLives = prev.lives - 1;
                  if (newLives <= 0) {
                    // All lives lost - restart at puzzle level 1
                    setCurrentLevel(1);
                    setGameMode('puzzle');
                    setRequiredKey(generateRandomKey());
                    initializePuzzle(1);
                    return prev;
                  } else {
                    // Still have lives - respawn player at start of current platformer level
                    setPlatformerPlayer(prevPlayer => ({
                      ...prevPlayer,
                      x: 100,
                      y: 400,
                      velX: 0,
                      velY: 0
                    }));
                    return { ...prev, lives: newLives };
                  }
                });
              }
            }
            
            return newEnemy;
          });
        });
        
        if (platformerGame.timeLimitActive) {
          setPlatformerGame(prev => {
            const newTimeLimit = prev.timeLimit - 1;
            let newCountdown = prev.countdownStarted;
            
            if (newTimeLimit <= 30 * 60 && !newCountdown) {
              newCountdown = true;
            }
            
            if (newTimeLimit <= 0) {
              // Time's up - lose a life
              const newLives = prev.lives - 1;
              if (newLives <= 0) {
                // All lives lost - restart at puzzle level 1
                setCurrentLevel(1);
                setGameMode('puzzle');
                setRequiredKey(generateRandomKey());
                initializePuzzle(1);
                return prev;
              } else {
                // Still have lives - respawn at start of current platformer level with reset timer
                setPlatformerPlayer(prevPlayer => ({
                  ...prevPlayer,
                  x: 100,
                  y: 400,
                  velX: 0,
                  velY: 0
                }));
                return {
                  ...prev,
                  timeLimit: 60 * 60, // Reset timer to 1 minute
                  lives: newLives,
                  timeLimitActive: true,
                  countdownStarted: false
                };
              }
            }
            
            return {
              ...prev,
              timeLimit: newTimeLimit,
              countdownStarted: newCountdown
            };
          });
        }
      }
      
      setPlatformerGame(prev => ({
        ...prev,
        camera: {
          x: Math.max(0, platformerPlayer.x - canvas.width / 2),
          y: 0
        }
      }));
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(0.6, '#87CEEB');
      gradient.addColorStop(0.6, '#90EE90');
      gradient.addColorStop(1, '#90EE90');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 5; i++) {
        let x = (i * 300 + 100) - (platformerGame.camera.x * 0.3);
        let y = 50 + Math.sin(i) * 30;
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 30, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.save();
      ctx.translate(-platformerGame.camera.x, 0);
      
      platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      });
      
      coins.forEach(coin => {
        if (coin.collected) return;
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(coin.x - 3, coin.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      
      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(enemy.x + 6, enemy.y + 8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(enemy.x + 18, enemy.y + 8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'red';
        ctx.fillRect(enemy.x + 8, enemy.y + 16, 8, 2);
      });
      
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(platformerPlayer.x + platformerPlayer.width/2, platformerPlayer.y + platformerPlayer.width/2, platformerPlayer.width/2 - 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(platformerPlayer.x + platformerPlayer.width/2, platformerPlayer.y + platformerPlayer.width/2 - 3, platformerPlayer.width/2 - 4, Math.PI, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(platformerPlayer.x + platformerPlayer.width/2 - 6, platformerPlayer.y + platformerPlayer.width/2 - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(platformerPlayer.x + platformerPlayer.width/2 + 6, platformerPlayer.y + platformerPlayer.width/2 - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.arc(platformerPlayer.x + platformerPlayer.width/2, platformerPlayer.y + platformerPlayer.width/2 + 2, 1, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'red';
      ctx.beginPath();
      if (platformerPlayer.direction === 1) {
        ctx.moveTo(platformerPlayer.x + platformerPlayer.width/2 + 8, platformerPlayer.y + platformerPlayer.width/2);
        ctx.lineTo(platformerPlayer.x + platformerPlayer.width/2 + 12, platformerPlayer.y + platformerPlayer.width/2 - 3);
        ctx.lineTo(platformerPlayer.x + platformerPlayer.width/2 + 12, platformerPlayer.y + platformerPlayer.width/2 + 3);
      } else {
        ctx.moveTo(platformerPlayer.x + platformerPlayer.width/2 - 8, platformerPlayer.y + platformerPlayer.width/2);
        ctx.lineTo(platformerPlayer.x + platformerPlayer.width/2 - 12, platformerPlayer.y + platformerPlayer.width/2 - 3);
        ctx.lineTo(platformerPlayer.x + platformerPlayer.width/2 - 12, platformerPlayer.y + platformerPlayer.width/2 + 3);
      }
      ctx.fill();
      
      ctx.restore();
      
      if (platformerGame.countdownStarted && platformerGame.timeLimitActive) {
        const seconds = Math.ceil(platformerGame.timeLimit / 60);
        
        if (seconds <= 30) {
          const alpha = 0.1 + (Math.sin(platformerGame.timeLimit * 0.3) * 0.1);
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          if (seconds <= 10) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            
            const warningText = seconds.toString();
            ctx.strokeText(warningText, canvas.width/2, canvas.height/2);
            ctx.fillText(warningText, canvas.width/2, canvas.height/2);
            
            if (seconds <= 5) {
              ctx.font = 'bold 32px Arial';
              ctx.fillStyle = '#FFFF00';
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 2;
              ctx.strokeText('HURRY!', canvas.width/2, canvas.height/2 + 80);
              ctx.fillText('HURRY!', canvas.width/2, canvas.height/2 + 80);
            }
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameMode, gameStarted, isKeyPressed, platformerKeys, platformerPlayer, platformerGame, platforms, coins, enemies]);

  // Handle cell clicks for flow puzzle
  const handleCellClick = (row, col) => {
    if (!isKeyPressed || gameWon || grid[row][col] === -1) return;
    
    const cellKey = `${row}-${col}`;
    
    const clickedEndpoint = endpoints.find(ep => ep.row === row && ep.col === col);
    
    if (clickedEndpoint) {
      if (clickedEndpoint.type === 'source') {
        setActivePath(clickedEndpoint.id);
        const newPaths = new Map(paths);
        newPaths.set(clickedEndpoint.id, [cellKey]);
        setPaths(newPaths);
      } else if (clickedEndpoint.type === 'target' && activePath === clickedEndpoint.id) {
        const currentPath = paths.get(activePath) || [];
        const lastCell = currentPath[currentPath.length - 1];
        if (lastCell) {
          const [lastRow, lastCol] = lastCell.split('-').map(Number);
          const isAdjacent = Math.abs(row - lastRow) + Math.abs(col - lastCol) === 1;
          
          if (isAdjacent) {
            const newPaths = new Map(paths);
            newPaths.set(activePath, [...currentPath, cellKey]);
            setPaths(newPaths);
            setActivePath(null);
            
            const requiredPaths = new Set();
            endpoints.forEach(ep => {
              if (ep.type === 'source') requiredPaths.add(ep.id);
            });
            
            if (requiredPaths.size > 0 && [...requiredPaths].every(id => {
              const path = newPaths.get(id);
              return path && path.length > 1;
            })) {
              setGameWon(true);
            }
          }
        }
      }
      return;
    }
    
    if (activePath === null) return;
    
    const currentPath = paths.get(activePath) || [];
    
    const isOccupied = Array.from(paths.entries()).some(([pathId, pathCells]) => {
      return pathId !== activePath && pathCells.includes(cellKey);
    });
    
    if (isOccupied) return;
    
    if (currentPath.includes(cellKey)) {
      const cellIndex = currentPath.indexOf(cellKey);
      const newPath = currentPath.slice(0, cellIndex);
      const newPaths = new Map(paths);
      newPaths.set(activePath, newPath);
      setPaths(newPaths);
    } else if (currentPath.length > 0) {
      const lastCell = currentPath[currentPath.length - 1];
      const [lastRow, lastCol] = lastCell.split('-').map(Number);
      const isAdjacent = Math.abs(row - lastRow) + Math.abs(col - lastCol) === 1;
      
      if (isAdjacent) {
        const newPaths = new Map(paths);
        newPaths.set(activePath, [...currentPath, cellKey]);
        setPaths(newPaths);
      }
    }
  };

  // Next level
  const nextLevel = () => {
    const newLevel = currentLevel + 1;
    setCurrentLevel(newLevel);
    setRequiredKey(generateRandomKey());
    
    // Reset power timer and state for new level
    setPowerTimer(0);
    setIsKeyPressed(false);
    
    if (newLevel >= 7) {
      setGameMode('platformer');
      initializePlatformer(newLevel);
    } else {
      initializePuzzle(newLevel);
    }
  };

  // Get cell appearance
  const getCellClass = (row, col) => {
    const cellKey = `${row}-${col}`;
    const endpoint = endpoints.find(ep => ep.row === row && ep.col === col);
    const isObstacle = grid[row][col] === -1;
    
    let pathId = null;
    let isInActivePath = false;
    
    for (const [id, pathCells] of paths.entries()) {
      if (pathCells.includes(cellKey)) {
        pathId = id;
        if (id === activePath) isInActivePath = true;
        break;
      }
    }
    
    let classes = 'w-12 h-12 border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-lg font-bold ';
    
    if (isObstacle) {
      classes += 'bg-gray-800 border-gray-600 cursor-not-allowed';
    } else if (endpoint) {
      if (endpoint.type === 'source' && activePath === endpoint.id) {
        classes += isKeyPressed 
          ? 'bg-green-400 border-green-600 shadow-lg shadow-green-300 ring-2 ring-blue-400' 
          : 'bg-green-200 border-green-400 ring-2 ring-blue-400';
      } else if (endpoint.type === 'target' && activePath === endpoint.id) {
        classes += isKeyPressed 
          ? 'bg-purple-400 border-purple-600 shadow-lg shadow-purple-300 ring-2 ring-blue-400' 
          : 'bg-purple-200 border-purple-400 ring-2 ring-blue-400';
      } else {
        const pathForEndpoint = paths.get(endpoint.id);
        const isComplete = pathForEndpoint && pathForEndpoint.length > 1;
        if (isComplete) {
          classes += 'bg-green-300 border-green-500 shadow-md';
        } else {
          classes += isKeyPressed 
            ? 'bg-gray-200 border-gray-400 hover:bg-gray-100' 
            : 'bg-gray-100 border-gray-300 opacity-70';
        }
      }
    } else if (pathId !== null) {
      const pathColors = [
        'bg-red-300 border-red-500',
        'bg-green-300 border-green-500', 
        'bg-blue-300 border-blue-500',
        'bg-yellow-300 border-yellow-500'
      ];
      const colorClass = pathColors[pathId % pathColors.length];
      
      if (isInActivePath) {
        classes += isKeyPressed 
          ? `${colorClass} shadow-md ring-1 ring-blue-300` 
          : `${colorClass.replace('300', '200')} ring-1 ring-blue-300`;
      } else {
        classes += isKeyPressed 
          ? `${colorClass} shadow-sm` 
          : `${colorClass.replace('300', '200')}`;
      }
    } else {
      classes += isKeyPressed 
        ? 'bg-white border-gray-300 hover:bg-gray-50' 
        : 'bg-gray-100 border-gray-300 opacity-50';
    }
    
    return classes;
  };
  
  const getCellContent = (row, col) => {
    const endpoint = endpoints.find(ep => ep.row === row && ep.col === col);
    const isObstacle = grid[row][col] === -1;
    
    if (isObstacle) return '■';
    if (endpoint) return endpoint.emoji;
    return '';
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-8">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Cooperative Flow Puzzle</h1>
          <div className="text-gray-600 mb-6 space-y-2">
            <p><strong>Player 1 (Power):</strong> Hold down the assigned key to power the grid</p>
            <p><strong>Player 2 (Solver):</strong> Click cells to create a path from ⚡ to 🎯</p>
            <p className="text-sm text-gray-500">You can only build the path while the power is on!</p>
          </div>
          <button 
            onClick={startGame}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Microtransaction Popup */}
        {showMicrotransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl border-4 border-yellow-400">
              <h3 className="text-2xl font-bold text-yellow-600 mb-4 text-center">💰 Skip Level</h3>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-green-600 mb-2">$0.45</div>
                <p className="text-gray-700 mb-4">
                  Skip this challenging level and advance immediately!
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚡ Instant progression<br/>
                    🎯 No more frustration<br/>
                    🏆 Keep the fun going!
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowMicrotransaction(false);
                    setHasPurchasedSkip(true);
                    // Simulate "purchase" and skip level
                    setTimeout(() => {
                      nextLevel();
                      setHasPurchasedSkip(false);
                    }, 1000);
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                >
                  💳 Purchase & Skip - $0.45
                </button>
                <button 
                  onClick={() => setShowMicrotransaction(false)}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                *This is a demo - no real payment will be processed
              </p>
            </div>
          </div>
        )}

        {/* Purchase Success Animation */}
        {hasPurchasedSkip && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center shadow-xl">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">Purchase Successful!</h3>
              <p className="text-gray-700">Skipping to next level...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mt-4"></div>
            </div>
          </div>
        )}
        {unsolvableError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Testing Alert</h3>
              <p className="text-gray-700 mb-4">
                Puzzle cannot be solved! All pairs cannot be connected without overlap.
              </p>
              <div className="space-x-4">
                <button 
                  onClick={() => {
                    setUnsolvableError(false);
                    initializePuzzle(currentLevel);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => {
                    setUnsolvableError(false);
                    nextLevel();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Skip Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Screen */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-8 text-center shadow-xl">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Level {currentLevel}</h3>
              <p className="text-gray-600">
                {gameMode === 'puzzle' ? 'Generating puzzle...' : 'Building platforms...'}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {gameMode === 'puzzle' ? 'Cooperative Flow Puzzle' : 'Cooperative Platformer'}
          </h1>
          <div className="flex justify-center items-center gap-8 text-sm">
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="font-semibold">Level:</span> {currentLevel}
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="font-semibold">Power Time:</span> {(powerTimer / 10).toFixed(1)}s
            </div>
            <button 
              onClick={() => setShowMicrotransaction(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-md border-2 border-yellow-400"
            >
              💰 Skip Level - $0.45
            </button>
          </div>
        </div>
        
        {/* Power Status */}
        <div className="text-center mb-6">
          <div className={`inline-block px-6 py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
            isKeyPressed 
              ? 'bg-green-400 text-green-800 shadow-lg shadow-green-200' 
              : 'bg-red-100 text-red-800'
          }`}>
            Player 1: {isKeyPressed ? `✅ Powering (${requiredKey} held)` : `❌ Hold "${requiredKey}" key`}
          </div>
        </div>
        
        {gameMode === 'puzzle' ? (
          <>
            {/* Game Grid */}
            <div className="flex justify-center mb-6">
              <div className="grid grid-cols-6 gap-1 bg-gray-300 p-4 rounded-lg shadow-lg">
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className={getCellClass(rowIndex, colIndex)}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      disabled={!isKeyPressed || gameWon}
                    >
                      {getCellContent(rowIndex, colIndex)}
                    </button>
                  ))
                )}
              </div>
            </div>
            
            {/* Instructions */}
            <div className="text-center text-gray-600 mb-4">
              {currentLevel === 1 ? (
                <>
                  <p>Player 2: Click adjacent cells to build a path from ⚡ to 🎯</p>
                  <p className="text-sm">Path only works when Player 1 provides power!</p>
                </>
              ) : (
                <>
                  <p>Player 2: Connect matching emoji pairs with unique paths</p>
                  <p className="text-sm">Click a source emoji to start, then build a path to its matching target</p>
                  <p className="text-sm">Paths cannot overlap! Power required to build.</p>
                  {activePath !== null && (
                    <p className="text-blue-600 font-semibold">
                      Building path for: {endpoints.find(ep => ep.id === activePath && ep.type === 'source')?.emoji}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Advanced Platformer Game */}
            <div className="flex justify-center mb-6">
              <div className="relative border-4 border-gray-800 rounded-lg overflow-hidden bg-gradient-to-b from-sky-200 to-green-200">
                <canvas 
                  ref={canvasRef}
                  width="800" 
                  height="600"
                  className="block bg-gradient-to-b from-sky-200 via-sky-200 to-green-200"
                />
                
                {/* UI Overlay */}
                <div className="absolute top-2 left-2 text-white font-bold text-shadow z-10">
                  <div>Score: <span>{platformerGame.score}</span></div>
                  <div>Lives: <span>{platformerGame.lives}</span></div>
                  <div>Level: <span>{platformerGame.level}</span></div>
                  {platformerGame.timeLimitActive && (
                    <div className={`text-lg font-bold ${platformerGame.countdownStarted ? 'text-red-500' : 'text-red-400'}`}>
                      Time: <span>{Math.ceil(platformerGame.timeLimit / 60)}</span>
                    </div>
                  )}
                </div>
                
                {/* Instructions Overlay */}
                <div className="absolute bottom-2 right-2 text-white text-xs text-shadow z-10">
                  <div>WASD or Arrow Keys + Space to move and jump</div>
                  <div>Collect coins and avoid enemies!</div>
                  <div>Reach 500 points to activate time limit!</div>
                </div>
              </div>
            </div>
            
            {/* Platformer Instructions */}
            <div className="text-center text-gray-600 mb-4">
              <p>Player 1: Hold "{requiredKey}" to give power</p>
              <p>Player 2: Use WASD or Arrow Keys to move, Space to jump</p>
              <p className="text-sm text-red-600">If you fall off or lose all lives, you'll restart at puzzle level 1!</p>
            </div>
          </>
        )}
        
        {/* Win State */}
        {gameWon && (
          <div className="text-center">
            <div className="bg-green-100 border border-green-400 rounded-lg p-4 mb-4 inline-block">
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                {gameMode === 'puzzle' ? '🎉 Level Complete!' : '🎉 Platformer Level Complete!'}
              </h2>
              {gameMode === 'puzzle' && currentLevel === 6 ? (
                <p className="text-green-700">
                  That was easy! But now the real challenge begins... 🎮
                </p>
              ) : gameMode === 'puzzle' ? (
                <p className="text-green-700">
                  Great teamwork! You completed level {currentLevel} in {(powerTimer / 10).toFixed(1)} seconds.
                </p>
              ) : (
                <p className="text-green-700">
                  Excellent coordination! You navigated the platformer challenge successfully.
                </p>
              )}
            </div>
            <div className="space-x-4">
              <button 
                onClick={nextLevel}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                {gameMode === 'puzzle' && currentLevel === 6 ? 'Enter Platformer Mode!' : 'Next Level'}
              </button>
              <button 
                onClick={() => setGameStarted(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CooperativeFlowPuzzle;
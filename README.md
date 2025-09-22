# Cooperative Flow Puzzle Game

A cooperative puzzle and platformer game built with React. Two players work together - one provides power by holding a key, while the other solves puzzles or navigates platformer levels.

## How to Play

- **Player 1 (Power):** Hold down the assigned key to power the grid/game
- **Player 2 (Solver):** Click cells to create paths or use WASD/Arrow keys for platformer mode
- **Objective:** Work together to complete all levels!

## Deployment

This game is deployed as a static website and can be hosted on:

### Netlify
1. Connect your repository to Netlify
2. Deploy settings:
   - Build command: (leave empty - static site)
   - Publish directory: `.` (root)
   - No build process required

### GitHub Pages
1. Go to your repository settings
2. Enable GitHub Pages
3. Select source: Deploy from a branch
4. Choose branch: `main` and folder: `/ (root)`

## Files

- `index.html` - Main game file with embedded React code
- `cooperative_flow_puzzle.tsx` - Original React component source
- `netlify.toml` - Netlify configuration
- `README.md` - This file

## Local Development

Simply open `index.html` in a web browser to play locally.

## Game Features

- 6 puzzle levels with increasing difficulty
- 3 platformer levels after puzzle completion
- Cooperative gameplay requiring teamwork
- Responsive design with Tailwind CSS
- Canvas-based platformer with physics
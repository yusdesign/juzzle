 // ========== C O N F I G U R A T I O N ==========
const CONFIG = {
    BOARD_SIZE: 4,
    CELL_SIZE: 80, // Large for 4×4
    CONNECTOR_STATES: {
        FLAT: 0,    // Disabled: flat side
        KNOB: 1,    // Outer circle enabled (protrusion)
        HOLE: -1    // Inner circle enabled (indentation)
    },
    COLORS: {
        BLACK: '#1a1a1a',
        WHITE: '#ffffff',
        BOARD_BG: '#ffffff',
        GRID_LINE: '#c0c0c0',
        PIECE_BG: '#2a2a2a',
        KNOB_OUTER: '#3a3a3a',
        KNOB_INNER: '#1a1a1a',
        HOLE_OUTER: '#1a1a1a',
        HOLE_INNER: '#ffffff',
        FLAT_LINE: '#666666',
        HINT_VALID: 'rgba(100, 200, 100, 0.4)',
        LOCKED_BORDER: '#ff4444',
        DEFAULT_BORDER: '#404040'
    },
    SHOW_HINTS: true
};

// ========== G L O B A L   S T A T E ==========
let allPieces = [];
let gameBoard = [];
let draggedPiece = null;
let dragOffset = { x: 0, y: 0 };

// ========== P I E C E   G E N E R A T I O N ==========

function generatePieceForPosition(row, col) {
    const isTop = row === 0;
    const isBottom = row === CONFIG.BOARD_SIZE - 1;
    const isLeft = col === 0;
    const isRight = col === CONFIG.BOARD_SIZE - 1;
    
    const piece = {
        id: `piece_${row}_${col}`,
        originalPosition: { row, col },
        color: Math.random() > 0.5 ? CONFIG.COLORS.BLACK : CONFIG.COLORS.WHITE,
        sides: {
            top: getRandomConnector(),
            right: getRandomConnector(),
            bottom: getRandomConnector(),
            left: getRandomConnector()
        },
        isPlaced: false,
        isLocked: false,
        currentPosition: null
    };
    
    // ENFORCE EDGE CONSTRAINTS: Flat sides only on borders
    if (isTop) piece.sides.top = CONFIG.CONNECTOR_STATES.FLAT;
    if (isRight) piece.sides.right = CONFIG.CONNECTOR_STATES.FLAT;
    if (isBottom) piece.sides.bottom = CONFIG.CONNECTOR_STATES.FLAT;
    if (isLeft) piece.sides.left = CONFIG.CONNECTOR_STATES.FLAT;
    
    // CORNERS: Two adjacent flat sides
    if (isTop && isLeft) { // Top-left
        piece.sides.top = CONFIG.CONNECTOR_STATES.FLAT;
        piece.sides.left = CONFIG.CONNECTOR_STATES.FLAT;
    }
    if (isTop && isRight) { // Top-right
        piece.sides.top = CONFIG.CONNECTOR_STATES.FLAT;
        piece.sides.right = CONFIG.CONNECTOR_STATES.FLAT;
    }
    if (isBottom && isLeft) { // Bottom-left
        piece.sides.bottom = CONFIG.CONNECTOR_STATES.FLAT;
        piece.sides.left = CONFIG.CONNECTOR_STATES.FLAT;
    }
    if (isBottom && isRight) { // Bottom-right
        piece.sides.bottom = CONFIG.CONNECTOR_STATES.FLAT;
        piece.sides.right = CONFIG.CONNECTOR_STATES.FLAT;
    }
    
    return piece;
}

function getRandomConnector() {
    // Returns KNOB or HOLE (never FLAT for interior)
    return Math.random() > 0.5 ? 
        CONFIG.CONNECTOR_STATES.KNOB : 
        CONFIG.CONNECTOR_STATES.HOLE;
}

function generateAndValidateBoard() {
    // Generate initial board with correct edge flats
    const board = [];
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            board[row][col] = {
                piece: generatePieceForPosition(row, col),
                isLocked: false
            };
        }
    }
    
    // Validate and fix connections
    let attempts = 0;
    const MAX_ATTEMPTS = 50;
    
    while (attempts < MAX_ATTEMPTS) {
        let hasConflict = false;
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const cell = board[row][col];
                
                // Check right neighbor
                if (col < CONFIG.BOARD_SIZE - 1) {
                    const rightCell = board[row][col + 1];
                    if (!connectorsMatch(cell.piece.sides.right, rightCell.piece.sides.left)) {
                        // Fix conflict by flipping connector types
                        [cell.piece.sides.right, rightCell.piece.sides.left] = 
                            swapConnectorPair(cell.piece.sides.right, rightCell.piece.sides.left);
                        hasConflict = true;
                    }
                }
                
                // Check bottom neighbor
                if (row < CONFIG.BOARD_SIZE - 1) {
                    const bottomCell = board[row + 1][col];
                    if (!connectorsMatch(cell.piece.sides.bottom, bottomCell.piece.sides.top)) {
                        [cell.piece.sides.bottom, bottomCell.piece.sides.top] = 
                            swapConnectorPair(cell.piece.sides.bottom, bottomCell.piece.sides.top);
                        hasConflict = true;
                    }
                }
            }
        }
        
        if (!hasConflict) break; // All connections valid
        attempts++;
    }
    
    if (attempts >= MAX_ATTEMPTS) {
        console.log("Regenerating board (too many conflicts)");
        return generateAndValidateBoard(); // Recursive retry
    }
    
    console.log(`Board validated in ${attempts} attempts`);
    return board;
}

function connectorsMatch(sideA, sideB) {
    // FLAT connects only to FLAT
    if (sideA === CONFIG.CONNECTOR_STATES.FLAT && sideB === CONFIG.CONNECTOR_STATES.FLAT) {
        return true;
    }
    // KNOB connects only to HOLE
    if (sideA === CONFIG.CONNECTOR_STATES.KNOB && sideB === CONFIG.CONNECTOR_STATES.HOLE) {
        return true;
    }
    // HOLE connects only to KNOB
    if (sideA === CONFIG.CONNECTOR_STATES.HOLE && sideB === CONFIG.CONNECTOR_STATES.KNOB) {
        return true;
    }
    return false;
}

function swapConnectorPair(sideA, sideB) {
    // If one is FLAT, both must be FLAT (edges)
    if (sideA === CONFIG.CONNECTOR_STATES.FLAT || sideB === CONFIG.CONNECTOR_STATES.FLAT) {
        return [CONFIG.CONNECTOR_STATES.FLAT, CONFIG.CONNECTOR_STATES.FLAT];
    }
    // Otherwise swap KNOB ↔ HOLE
    if (sideA === CONFIG.CONNECTOR_STATES.KNOB) {
        return [CONFIG.CONNECTOR_STATES.HOLE, CONFIG.CONNECTOR_STATES.KNOB];
    } else {
        return [CONFIG.CONNECTOR_STATES.KNOB, CONFIG.CONNECTOR_STATES.HOLE];
    }
}

// ========== V I S U A L   D R A W I N G ==========

function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    const size = CONFIG.CELL_SIZE * CONFIG.BOARD_SIZE;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
    ctx.fillRect(0, 0, size, size);
    
    // Draw grid (for empty cells)
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= CONFIG.BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, size);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(size, i * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const cell = gameBoard[row][col];
            if (cell.piece && cell.piece.isPlaced) {
                const x = col * CONFIG.CELL_SIZE;
                const y = row * CONFIG.CELL_SIZE;
                drawPiece(ctx, cell.piece, x, y, CONFIG.CELL_SIZE, cell.isLocked);
            }
        }
    }
}

function drawPiece(ctx, piece, x, y, size, isLocked) {
    const radius = size * 0.4; // Rounded square radius
    const connectorRadius = size * 0.12;
    const connectorOffset = size * 0.25;
    
    // Save context for transformations
    ctx.save();
    
    // Draw rounded square background
    ctx.fillStyle = piece.color;
    roundRect(ctx, x, y, size, size, radius);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = isLocked ? CONFIG.COLORS.LOCKED_BORDER : CONFIG.COLORS.DEFAULT_BORDER;
    ctx.lineWidth = isLocked ? 4 : 2;
    roundRect(ctx, x, y, size, size, radius);
    ctx.stroke();
    
    // Draw connectors on each side
    drawConnector(ctx, piece.sides.top, x + size/2, y + connectorOffset, 'top', connectorRadius);
    drawConnector(ctx, piece.sides.right, x + size - connectorOffset, y + size/2, 'right', connectorRadius);
    drawConnector(ctx, piece.sides.bottom, x + size/2, y + size - connectorOffset, 'bottom', connectorRadius);
    drawConnector(ctx, piece.sides.left, x + connectorOffset, y + size/2, 'left', connectorRadius);
    
    // Draw position indicator (small dot)
    if (piece.currentPosition) {
        ctx.fillStyle = isLocked ? '#ff8888' : '#888888';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawConnector(ctx, connectorState, x, y, side, radius) {
    if (connectorState === CONFIG.CONNECTOR_STATES.FLAT) {
        // Draw flat side indicator
        ctx.strokeStyle = CONFIG.COLORS.FLAT_LINE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        switch(side) {
            case 'top':
                ctx.moveTo(x - radius * 1.5, y);
                ctx.lineTo(x + radius * 1.5, y);
                break;
            case 'right':
                ctx.moveTo(x, y - radius * 1.5);
                ctx.lineTo(x, y + radius * 1.5);
                break;
            case 'bottom':
                ctx.moveTo(x - radius * 1.5, y);
                ctx.lineTo(x + radius * 1.5, y);
                break;
            case 'left':
                ctx.moveTo(x, y - radius * 1.5);
                ctx.lineTo(x, y + radius * 1.5);
                break;
        }
        ctx.stroke();
    }
    else if (connectorState === CONFIG.CONNECTOR_STATES.KNOB) {
        // Draw KNOB: outer circle (protrusion)
        ctx.fillStyle = CONFIG.COLORS.KNOB_OUTER;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = CONFIG.COLORS.KNOB_INNER;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (connectorState === CONFIG.CONNECTOR_STATES.HOLE) {
        // Draw HOLE: inner circle (indentation)
        ctx.fillStyle = CONFIG.COLORS.HOLE_OUTER;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Center "depth" indicator
        ctx.fillStyle = CONFIG.COLORS.HOLE_INNER;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ========== D R A G   &   D R O P ==========

function startDrag(e) {
    e.preventDefault();
    
    const element = e.target;
    const pieceId = element.dataset.pieceId;
    draggedPiece = allPieces.find(p => p.id === pieceId);
    
    if (!draggedPiece || draggedPiece.isLocked) return;
    
    const rect = element.getBoundingClientRect();
    dragOffset.x = (e.clientX || e.touches[0].clientX) - rect.left;
    dragOffset.y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    createDragImage(draggedPiece);
    element.style.opacity = '0.3';
    
    // Add event listeners
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', doDragTouch, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    updateDragImage(e.clientX || e.touches[0].clientX, 
                    e.clientY || e.touches[0].clientY);
}

function doDrag(e) {
    if (!draggedPiece) return;
    updateDragImage(e.clientX, e.clientY);
    if (CONFIG.SHOW_HINTS) highlightValidSpots(e.clientX, e.clientY);
}

function doDragTouch(e) {
    if (!draggedPiece) return;
    e.preventDefault();
    updateDragImage(e.touches[0].clientX, e.touches[0].clientY);
    if (CONFIG.SHOW_HINTS) highlightValidSpots(e.touches[0].clientX, e.touches[0].clientY);
}

function endDrag(e) {
    if (!draggedPiece) {
        cleanupDrag();
        return;
    }
    
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    
    const placed = tryPlacePiece(clientX, clientY);
    cleanupDrag();
    
    if (placed) {
        updateDisplay();
        showDragHint(`Piece placed at (${draggedPiece.currentPosition.row}, ${draggedPiece.currentPosition.col})`);
    } else {
        showDragHint("Cannot place here - connectors don't match!");
    }
}

function cleanupDrag() {
    // Remove event listeners
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', doDragTouch);
    document.removeEventListener('touchend', endDrag);
    
    // Remove drag image
    const dragImg = document.getElementById('dragImage');
    if (dragImg) dragImg.remove();
    
    // Reset dragged piece opacity
    if (draggedPiece) {
        const element = document.querySelector(`[data-piece-id="${draggedPiece.id}"]`);
        if (element) element.style.opacity = '1';
    }
    
    // Clear highlights
    clearHighlight();
    draggedPiece = null;
}

function createDragImage(piece) {
    const dragImg = document.createElement('canvas');
    dragImg.id = 'dragImage';
    dragImg.width = CONFIG.CELL_SIZE;
    dragImg.height = CONFIG.CELL_SIZE;
    
    dragImg.style.cssText = `
        position: fixed;
        width: ${CONFIG.CELL_SIZE}px;
        height: ${CONFIG.CELL_SIZE}px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.9;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3));
        border-radius: 16px;
    `;
    
    const ctx = dragImg.getContext('2d');
    drawPiece(ctx, piece, 0, 0, CONFIG.CELL_SIZE, false);
    document.body.appendChild(dragImg);
}

function updateDragImage(x, y) {
    const dragImg = document.getElementById('dragImage');
    if (dragImg) {
        dragImg.style.left = `${x - CONFIG.CELL_SIZE/2}px`;
        dragImg.style.top = `${y - CONFIG.CELL_SIZE/2}px`;
    }
}

function tryPlacePiece(clientX, clientY) {
    if (!draggedPiece) return false;
    
    const canvas = document.getElementById('boardCanvas');
    const rect = canvas.getBoundingClientRect();
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    // Check bounds
    if (row < 0 || row >= CONFIG.BOARD_SIZE || col < 0 || col >= CONFIG.BOARD_SIZE) {
        return false;
    }
    
    // Check if cell is empty
    if (gameBoard[row][col].piece && gameBoard[row][col].piece.isPlaced) {
        return false;
    }
    
    // Validate connectors match neighbors
    if (!validatePlacement(draggedPiece, row, col)) {
        return false;
    }
    
    // Place the piece
    draggedPiece.isPlaced = true;
    draggedPiece.currentPosition = { row, col };
    gameBoard[row][col].piece = draggedPiece;
    
    return true;
}

function validatePlacement(piece, row, col) {
    // Check all four neighbors
    const checks = [
        { checkRow: row - 1, checkCol: col, 
          ourSide: 'top', theirSide: 'bottom' },    // Top neighbor
        { checkRow: row, checkCol: col + 1, 
          ourSide: 'right', theirSide: 'left' },    // Right neighbor
        { checkRow: row + 1, checkCol: col, 
          ourSide: 'bottom', theirSide: 'top' },    // Bottom neighbor
        { checkRow: row, checkCol: col - 1, 
          ourSide: 'left', theirSide: 'right' }     // Left neighbor
    ];
    
    for (const check of checks) {
        if (check.checkRow >= 0 && check.checkRow < CONFIG.BOARD_SIZE &&
            check.checkCol >= 0 && check.checkCol < CONFIG.BOARD_SIZE) {
            
            const neighborCell = gameBoard[check.checkRow][check.checkCol];
            if (neighborCell.piece && neighborCell.piece.isPlaced) {
                const ourConnector = piece.sides[check.ourSide];
                const theirConnector = neighborCell.piece.sides[check.theirSide];
                
                if (!connectorsMatch(ourConnector, theirConnector)) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

function highlightValidSpots(clientX, clientY) {
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    clearHighlight();
    
    if (!draggedPiece) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    // Highlight all valid positions
    for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
        for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
            if (!gameBoard[r][c].piece || !gameBoard[r][c].piece.isPlaced) {
                const isValid = validatePlacement(draggedPiece, r, c);
                
                if (isValid) {
                    ctx.save();
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = CONFIG.COLORS.HINT_VALID;
                    ctx.fillRect(c * CONFIG.CELL_SIZE, r * CONFIG.CELL_SIZE, 
                                CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
                    ctx.restore();
                }
            }
        }
    }
}

function clearHighlight() {
    // Redraw board to clear highlights
    drawBoard();
}

// ========== G A M E   C O N T R O L S ==========

function newGame() {
    gameBoard = generateAndValidateBoard();
    allPieces = [];
    
    // Collect all pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            allPieces.push(gameBoard[row][col].piece);
            gameBoard[row][col].piece.isPlaced = false;
            gameBoard[row][col].piece.isLocked = false;
            gameBoard[row][col].piece.currentPosition = null;
        }
    }
    
    // Shuffle pieces
    allPieces.sort(() => Math.random() - 0.5);
    
    updateDisplay();
    showDragHint("New 4×4 puzzle generated! Drag pieces to board.");
}

function addLockedPieces() {
    const lockCount = Math.floor(Math.random() * 3) + 2; // 2-4 locked pieces
    
    for (let i = 0; i < lockCount; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 20) {
            const row = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            const col = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            
            const cell = gameBoard[row][col];
            if (!cell.isLocked && cell.piece && !cell.piece.isPlaced) {
                cell.piece.isPlaced = true;
                cell.piece.isLocked = true;
                cell.piece.currentPosition = { row, col };
                cell.isLocked = true;
                placed = true;
                
                // Place this piece in the board
                gameBoard[row][col].piece = cell.piece;
            }
            attempts++;
        }
    }
    
    updateDisplay();
    showDragHint(`${lockCount} pieces locked (like 0h h1 starting positions)`);
}

function showSolution() {
    // Temporarily show all valid placements for current dragged piece
    if (draggedPiece) {
        highlightValidSpots(window.innerWidth/2, window.innerHeight/2);
        setTimeout(clearHighlight, 2000);
    }
}

function resetBoard() {
    // Remove all placed pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            if (gameBoard[row][col].piece) {
                gameBoard[row][col].piece.isPlaced = false;
                gameBoard[row][col].piece.isLocked = false;
                gameBoard[row][col].piece.currentPosition = null;
            }
            gameBoard[row][col].isLocked = false;
        }
    }
    
    updateDisplay();
    showDragHint("Board cleared! All pieces back in bank.");
}

// ========== U I   U P D A T E S ==========

function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const unplacedPieces = allPieces.filter(p => !p.isPlaced);
    
    if (unplacedPieces.length === 0) {
        container.innerHTML = '<div style="grid-column:1/5;text-align:center;padding:20px;color:#666;font-style:italic">Puzzle Complete! 🎉</div>';
        return;
    }
    
    unplacedPieces.forEach(piece => {
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        canvas.className = 'piece-canvas';
        canvas.dataset.pieceId = piece.id;
        canvas.title = `Original: (${piece.originalPosition.row}, ${piece.originalPosition.col})`;
        
        const ctx = canvas.getContext('2d');
        drawPiece(ctx, piece, 0, 0, 60, false);
        
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('touchstart', startDrag, { passive: false });
        
        container.appendChild(canvas);
    });
    
    // Update bank counter
    document.getElementById('bankCounter').textContent = unplacedPieces.length;
}

function updateStats() {
    const placed = allPieces.filter(p => p.isPlaced).length;
    const locked = allPieces.filter(p => p.isLocked).length;
    
    document.getElementById('placedCount').textContent = placed;
    document.getElementById('lockedCount').textContent = locked;
}

function updateDisplay() {
    displayPieces();
    drawBoard();
    updateStats();
}

// ========== I N I T I A L I Z A T I O N ==========

function initGame() {
    // Setup canvas for touch
    const canvas = document.getElementById('boardCanvas');
    if (canvas) {
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
    
    // Start new game
    newGame();
    
    console.log("Juzzle 4×4 Prototype Loaded");
    console.log("Mathematical System:");
    console.log("- 3 states per side: FLAT (0), KNOB (1), HOLE (-1)");
    console.log("- FLAT sides only on puzzle edges");
    console.log("- KNOB ↔ HOLE connection rule");
    console.log("- 4 corners: 2 adjacent FLAT sides");
    console.log("- 4 edge pieces: 1 FLAT side");
    console.log("- 4 center pieces: 0 FLAT sides");
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);

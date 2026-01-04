// ========== C O N F I G U R A T I O N ==========
const CONFIG = {
    BOARD_SIZE: 4,
    CELL_SIZE: 100, // Larger for classic puzzle shapes
    CONNECTOR_STATES: {
        FLAT: 0,    // Disabled: flat side
        KNOB: 1,    // Outer circle enabled (protrusion)
        HOLE: -1    // Inner circle enabled (indentation)
    },
    COLORS: {
        PIECE_BLACK: '#1a1a1a',
        PIECE_WHITE: '#ffffff',
        PIECE_GRAY: '#888888',
        BOARD_BG: '#f0f0f0',
        GRID_LINE: '#cccccc',
        KNOB_OUTER: '#3a3a3a',
        KNOB_INNER: '#1a1a1a',
        HOLE_OUTER: '#1a1a1a',
        HOLE_INNER: '#ffffff',
        FLAT_LINE: '#666666',
        HINT_VALID: 'rgba(100, 200, 100, 0.5)',
        LOCKED_BORDER: '#ff4444',
        DEFAULT_BORDER: '#404040',
        DRAG_SHADOW: 'rgba(0, 0, 0, 0.3)'
    }
};

// ========== G L O B A L   S T A T E ==========
let gameState = {
    pieces: [],          // All 16 puzzle pieces
    board: [],           // 4x4 board state
    bank: [],            // Pieces not yet placed
    draggedPiece: null,  // Currently dragged piece
    dragOffset: { x: 0, y: 0 },
    moveHistory: [],     // For UNDO functionality
    showHints: true
};

// ========== P I E C E   T E M P L A T E   S Y S T E M ==========

// Classic puzzle piece shapes with tabs and blanks
const PIECE_TEMPLATES = {
    // Corner pieces (2 adjacent flats)
    CORNER: {
        path: (ctx, x, y, size) => {
            const half = size / 2;
            const tabSize = size * 0.25;
            
            ctx.beginPath();
            // Start at top-left (flat side)
            ctx.moveTo(x, y + tabSize);
            
            // Top edge (flat)
            ctx.lineTo(x + size - tabSize, y);
            
            // Right edge (tab)
            ctx.quadraticCurveTo(
                x + size, y + tabSize * 0.5,
                x + size - tabSize, y + tabSize
            );
            ctx.lineTo(x + size, y + half);
            
            // Bottom edge (blank)
            ctx.quadraticCurveTo(
                x + size - tabSize, y + half + tabSize * 0.5,
                x + size - tabSize * 1.5, y + half
            );
            ctx.lineTo(x + tabSize, y + size);
            
            // Left edge (flat)
            ctx.lineTo(x, y + size - tabSize);
            
            ctx.closePath();
        }
    },
    
    // Edge pieces (1 flat side)
    EDGE: {
        path: (ctx, x, y, size) => {
            const half = size / 2;
            const tabSize = size * 0.25;
            
            ctx.beginPath();
            // Start
            ctx.moveTo(x + tabSize, y);
            
            // Top edge (tab or blank)
            ctx.quadraticCurveTo(
                x + half, y - tabSize * 0.5,
                x + size - tabSize, y
            );
            
            // Right edge (connector)
            ctx.lineTo(x + size, y + tabSize);
            
            // Bottom edge (connector)
            ctx.quadraticCurveTo(
                x + size - tabSize * 0.5, y + half,
                x + size, y + size - tabSize
            );
            
            // Left edge (flat)
            ctx.lineTo(x + tabSize, y + size);
            
            // Close to start
            ctx.quadraticCurveTo(
                x + tabSize * 0.5, y + half,
                x + tabSize, y
            );
            
            ctx.closePath();
        }
    },
    
    // Center pieces (no flats)
    CENTER: {
        path: (ctx, x, y, size) => {
            const quarter = size / 4;
            
            ctx.beginPath();
            // Start at top-left
            ctx.moveTo(x + quarter, y);
            
            // Top edge (tab)
            ctx.quadraticCurveTo(
                x + size / 2, y - quarter * 0.7,
                x + size - quarter, y
            );
            
            // Right edge (blank)
            ctx.lineTo(x + size, y + quarter);
            ctx.quadraticCurveTo(
                x + size - quarter * 0.7, y + size / 2,
                x + size, y + size - quarter
            );
            
            // Bottom edge (tab)
            ctx.lineTo(x + size - quarter, y + size);
            ctx.quadraticCurveTo(
                x + size / 2, y + size + quarter * 0.7,
                x + quarter, y + size
            );
            
            // Left edge (blank)
            ctx.lineTo(x, y + size - quarter);
            ctx.quadraticCurveTo(
                x + quarter * 0.7, y + size / 2,
                x, y + quarter
            );
            
            ctx.closePath();
        }
    }
};

// ========== P I E C E   G E N E R A T I O N ==========

function generatePieceForPosition(row, col) {
    const isTop = row === 0;
    const isBottom = row === CONFIG.BOARD_SIZE - 1;
    const isLeft = col === 0;
    const isRight = col === CONFIG.BOARD_SIZE - 1;
    
    // Determine piece type
    let pieceType;
    if ((isTop && isLeft) || (isTop && isRight) || 
        (isBottom && isLeft) || (isBottom && isRight)) {
        pieceType = 'CORNER';
    } else if (isTop || isBottom || isLeft || isRight) {
        pieceType = 'EDGE';
    } else {
        pieceType = 'CENTER';
    }
    
    // Generate connectors
    const sides = {
        top: getRandomConnector(),
        right: getRandomConnector(),
        bottom: getRandomConnector(),
        left: getRandomConnector()
    };
    
    // Apply edge constraints
    if (isTop) sides.top = CONFIG.CONNECTOR_STATES.FLAT;
    if (isRight) sides.right = CONFIG.CONNECTOR_STATES.FLAT;
    if (isBottom) sides.bottom = CONFIG.CONNECTOR_STATES.FLAT;
    if (isLeft) sides.left = CONFIG.CONNECTOR_STATES.FLAT;
    
    // For corners, ensure two adjacent flats
    if (isTop && isLeft) {
        sides.top = CONFIG.CONNECTOR_STATES.FLAT;
        sides.left = CONFIG.CONNECTOR_STATES.FLAT;
    }
    if (isTop && isRight) {
        sides.top = CONFIG.CONNECTOR_STATES.FLAT;
        sides.right = CONFIG.CONNECTOR_STATES.FLAT;
    }
    if (isBottom && isLeft) {
        sides.bottom = CONFIG.CONNECTOR_STATES.FLAT;
        sides.left = CONFIG.CONNECTOR_STATES.FLAT;
    }
    if (isBottom && isRight) {
        sides.bottom = CONFIG.CONNECTOR_STATES.FLAT;
        sides.right = CONFIG.CONNECTOR_STATES.FLAT;
    }
    
    return {
        id: `piece_${row}_${col}_${Date.now()}`,
        originalPosition: { row, col },
        type: pieceType,
        sides: sides,
        color: Math.random() > 0.5 ? CONFIG.COLORS.PIECE_BLACK : CONFIG.COLORS.PIECE_WHITE,
        isPlaced: false,
        isLocked: false,
        currentPosition: null
    };
}

function getRandomConnector() {
    return Math.random() > 0.5 ? 
        CONFIG.CONNECTOR_STATES.KNOB : 
        CONFIG.CONNECTOR_STATES.HOLE;
}

function generateValidBoard() {
    const board = [];
    
    // Phase 1: Generate pieces with correct edge flats
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            board[row][col] = {
                piece: null,
                isLocked: false
            };
        }
    }
    
    // Generate all pieces
    const allPieces = [];
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            allPieces.push(generatePieceForPosition(row, col));
        }
    }
    
    // Phase 2: Simple connection validation (for 4x4, brute force is fine)
    let validBoardFound = false;
    let attempts = 0;
    
    while (!validBoardFound && attempts < 100) {
        // Shuffle pieces
        const shuffledPieces = [...allPieces].sort(() => Math.random() - 0.5);
        
        // Try to place each piece
        let validPlacement = true;
        
        for (let row = 0; row < CONFIG.BOARD_SIZE && validPlacement; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE && validPlacement; col++) {
                const pieceIndex = row * CONFIG.BOARD_SIZE + col;
                const piece = shuffledPieces[pieceIndex];
                
                // Check if piece can be placed here
                if (canPieceGoHere(piece, row, col, board)) {
                    board[row][col].piece = piece;
                    piece.currentPosition = { row, col };
                } else {
                    validPlacement = false;
                    // Reset board
                    for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
                        for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
                            if (board[r][c].piece) {
                                board[r][c].piece.currentPosition = null;
                                board[r][c].piece = null;
                            }
                        }
                    }
                }
            }
        }
        
        if (validPlacement) {
            validBoardFound = true;
        }
        
        attempts++;
    }
    
    if (!validBoardFound) {
        console.warn("Could not generate valid board after 100 attempts");
        // Fallback: place pieces without validation (for debugging)
        let pieceIndex = 0;
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const piece = allPieces[pieceIndex++];
                board[row][col].piece = piece;
                piece.currentPosition = { row, col };
                piece.isPlaced = true;
            }
        }
    }
    
    return { board, pieces: allPieces };
}

function canPieceGoHere(piece, row, col, board) {
    // Check top neighbor
    if (row > 0 && board[row-1][col].piece) {
        const topPiece = board[row-1][col].piece;
        if (!connectorsMatch(piece.sides.top, topPiece.sides.bottom)) {
            return false;
        }
    }
    
    // Check left neighbor
    if (col > 0 && board[row][col-1].piece) {
        const leftPiece = board[row][col-1].piece;
        if (!connectorsMatch(piece.sides.left, leftPiece.sides.right)) {
            return false;
        }
    }
    
    // Check if position matches piece's original edge requirements
    const isTop = row === 0;
    const isBottom = row === CONFIG.BOARD_SIZE - 1;
    const isLeft = col === 0;
    const isRight = col === CONFIG.BOARD_SIZE - 1;
    
    if (isTop && piece.sides.top !== CONFIG.CONNECTOR_STATES.FLAT) return false;
    if (isBottom && piece.sides.bottom !== CONFIG.CONNECTOR_STATES.FLAT) return false;
    if (isLeft && piece.sides.left !== CONFIG.CONNECTOR_STATES.FLAT) return false;
    if (isRight && piece.sides.right !== CONFIG.CONNECTOR_STATES.FLAT) return false;
    
    return true;
}

function connectorsMatch(sideA, sideB) {
    if (sideA === CONFIG.CONNECTOR_STATES.FLAT && sideB === CONFIG.CONNECTOR_STATES.FLAT) return true;
    if (sideA === CONFIG.CONNECTOR_STATES.KNOB && sideB === CONFIG.CONNECTOR_STATES.HOLE) return true;
    if (sideA === CONFIG.CONNECTOR_STATES.HOLE && sideB === CONFIG.CONNECTOR_STATES.KNOB) return true;
    return false;
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
    
    // Draw grid
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    
    for (let i = 1; i < CONFIG.BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, size);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(size, i * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw placed pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const cell = gameState.board[row][col];
            if (cell.piece && cell.piece.isPlaced) {
                const x = col * CONFIG.CELL_SIZE;
                const y = row * CONFIG.CELL_SIZE;
                drawPiece(ctx, cell.piece, x, y, CONFIG.CELL_SIZE, cell.isLocked);
            }
        }
    }
}

function drawPiece(ctx, piece, x, y, size, isLocked) {
    // Save context
    ctx.save();
    
    // Draw classic puzzle piece shape
    const template = PIECE_TEMPLATES[piece.type];
    if (template) {
        template.path(ctx, x, y, size);
        
        // Fill piece
        ctx.fillStyle = piece.color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = isLocked ? CONFIG.COLORS.LOCKED_BORDER : CONFIG.COLORS.DEFAULT_BORDER;
        ctx.lineWidth = isLocked ? 4 : 2;
        ctx.stroke();
    } else {
        // Fallback: simple rounded square
        ctx.fillStyle = piece.color;
        roundRect(ctx, x, y, size, size, size * 0.1);
        ctx.fill();
        
        ctx.strokeStyle = isLocked ? CONFIG.COLORS.LOCKED_BORDER : CONFIG.COLORS.DEFAULT_BORDER;
        ctx.lineWidth = isLocked ? 4 : 2;
        roundRect(ctx, x, y, size, size, size * 0.1);
        ctx.stroke();
    }
    
    // Draw connectors
    const connectorSize = size * 0.15;
    const offset = size * 0.25;
    
    drawConnector(ctx, piece.sides.top, 
                 x + size/2, y + offset, 
                 connectorSize);
    drawConnector(ctx, piece.sides.right, 
                 x + size - offset, y + size/2, 
                 connectorSize);
    drawConnector(ctx, piece.sides.bottom, 
                 x + size/2, y + size - offset, 
                 connectorSize);
    drawConnector(ctx, piece.sides.left, 
                 x + offset, y + size/2, 
                 connectorSize);
    
    // Restore context
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

function drawConnector(ctx, state, x, y, size) {
    const radius = size / 2;
    
    if (state === CONFIG.CONNECTOR_STATES.FLAT) {
        // Flat side: short line
        ctx.strokeStyle = CONFIG.COLORS.FLAT_LINE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.stroke();
    }
    else if (state === CONFIG.CONNECTOR_STATES.KNOB) {
        // Knob: outer filled circle
        ctx.fillStyle = CONFIG.COLORS.KNOB_OUTER;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = CONFIG.COLORS.KNOB_INNER;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (state === CONFIG.CONNECTOR_STATES.HOLE) {
        // Hole: filled circle with center dot
        ctx.fillStyle = CONFIG.COLORS.HOLE_OUTER;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Center "depth" indicator
        ctx.fillStyle = CONFIG.COLORS.HOLE_INNER;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ========== D R A G   &   D R O P   (F I X E D) ==========

function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const element = e.target.closest('.piece-canvas');
    if (!element) return;
    
    const pieceId = element.dataset.pieceId;
    const piece = gameState.pieces.find(p => p.id === pieceId);
    
    if (!piece || piece.isLocked) return;
    
    // Remove from bank
    const bankIndex = gameState.bank.indexOf(piece);
    if (bankIndex > -1) {
        gameState.bank.splice(bankIndex, 1);
    }
    
    gameState.draggedPiece = piece;
    
    const rect = element.getBoundingClientRect();
    gameState.dragOffset.x = (e.clientX || e.touches[0].clientX) - rect.left;
    gameState.dragOffset.y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    createDragImage(piece);
    element.style.display = 'none'; // Hide original instead of opacity
    
    // Add event listeners
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', doDragTouch, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    updateDragImage(e.clientX || e.touches[0].clientX, 
                    e.clientY || e.touches[0].clientY);
}

function doDrag(e) {
    if (!gameState.draggedPiece) return;
    e.preventDefault();
    updateDragImage(e.clientX, e.clientY);
    if (gameState.showHints) highlightValidSpots(e.clientX, e.clientY);
}

function doDragTouch(e) {
    if (!gameState.draggedPiece) return;
    e.preventDefault();
    updateDragImage(e.touches[0].clientX, e.touches[0].clientY);
    if (gameState.showHints) highlightValidSpots(e.touches[0].clientX, e.touches[0].clientY);
}

function endDrag(e) {
    if (!gameState.draggedPiece) {
        cleanupDrag();
        return;
    }
    
    e.preventDefault();
    
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    
    const placed = tryPlacePiece(clientX, clientY);
    
    if (!placed) {
        // Return piece to bank
        if (!gameState.bank.includes(gameState.draggedPiece)) {
            gameState.bank.push(gameState.draggedPiece);
        }
        showDragHint("Cannot place here - connectors don't match!");
    }
    
    cleanupDrag();
    updateDisplay();
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
    
    // Show original element again
    if (gameState.draggedPiece) {
        const element = document.querySelector(`[data-piece-id="${gameState.draggedPiece.id}"]`);
        if (element) {
            element.style.display = 'block';
        }
    }
    
    clearHighlight();
    gameState.draggedPiece = null;
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
        filter: drop-shadow(0 8px 20px rgba(0,0,0,0.4));
        border-radius: 10px;
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
    if (!gameState.draggedPiece) return false;
    
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
    if (gameState.board[row][col].piece && gameState.board[row][col].piece.isPlaced) {
        return false;
    }
    
    // Save to history for UNDO
    gameState.moveHistory.push({
        piece: gameState.draggedPiece,
        from: null, // Was in bank
        to: { row, col },
        timestamp: Date.now()
    });
    
    // Place the piece
    gameState.draggedPiece.isPlaced = true;
    gameState.draggedPiece.currentPosition = { row, col };
    gameState.board[row][col].piece = gameState.draggedPiece;
    
    showDragHint(`Piece placed at (${row}, ${col})`);
    updateUndoButton();
    
    return true;
}

// ========== U N D O   S Y S T E M ==========

function undoLastMove() {
    if (gameState.moveHistory.length === 0) return;
    
    const lastMove = gameState.moveHistory.pop();
    const piece = lastMove.piece;
    
    if (lastMove.to) {
        // Remove from board
        const cell = gameState.board[lastMove.to.row][lastMove.to.col];
        if (cell.piece === piece) {
            cell.piece = null;
        }
        
        piece.isPlaced = false;
        piece.currentPosition = null;
        
        // Return to bank
        if (!gameState.bank.includes(piece)) {
            gameState.bank.push(piece);
        }
    }
    
    updateDisplay();
    updateUndoButton();
    showDragHint("Undo: Piece returned to bank");
}

// ========== G A M E   C O N T R O L S ==========

function newGame() {
    const result = generateValidBoard();
    gameState.board = result.board;
    gameState.pieces = result.pieces;
    
    // All pieces start in bank
    gameState.bank = [...gameState.pieces];
    gameState.pieces.forEach(p => {
        p.isPlaced = false;
        p.isLocked = false;
        p.currentPosition = null;
    });
    
    // Clear board
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            gameState.board[row][col].piece = null;
            gameState.board[row][col].isLocked = false;
        }
    }
    
    gameState.moveHistory = [];
    
    updateDisplay();
    updateUndoButton();
    showDragHint("New 4×4 puzzle generated! Drag pieces to board.");
}

function addLockedPieces() {
    const lockCount = Math.floor(Math.random() * 3) + 2; // 2-4 locked pieces
    
    for (let i = 0; i < lockCount; i++) {
        if (gameState.bank.length === 0) break;
        
        // Take a random piece from bank
        const pieceIndex = Math.floor(Math.random() * gameState.bank.length);
        const piece = gameState.bank[pieceIndex];
        
        // Find its original position
        const { row, col } = piece.originalPosition;
        
        // Place and lock it
        piece.isPlaced = true;
        piece.isLocked = true;
        piece.currentPosition = { row, col };
        
        gameState.board[row][col].piece = piece;
        gameState.board[row][col].isLocked = true;
        
        // Remove from bank
        gameState.bank.splice(pieceIndex, 1);
        
        // Add to history
        gameState.moveHistory.push({
            piece: piece,
            from: null,
            to: { row, col },
            locked: true,
            timestamp: Date.now()
        });
    }
    
    updateDisplay();
    updateUndoButton();
    showDragHint(`${lockCount} pieces locked in starting positions`);
}

function showValidSpots() {
    if (!gameState.draggedPiece) {
        showDragHint("Drag a piece first to see valid spots");
        return;
    }
    
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    
    // Highlight all valid positions
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            if (!gameState.board[row][col].piece || !gameState.board[row][col].piece.isPlaced) {
                const isValid = canPieceGoHere(gameState.draggedPiece, row, col, gameState.board);
                
                if (isValid) {
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = CONFIG.COLORS.HINT_VALID;
                    ctx.fillRect(col * CONFIG.CELL_SIZE, row * CONFIG.CELL_SIZE, 
                                CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
                    ctx.restore();
                }
            }
        }
    }
    
    setTimeout(() => drawBoard(), 2000);
}

function resetBoard() {
    // Return all placed pieces to bank
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const cell = gameState.board[row][col];
            if (cell.piece && cell.piece.isPlaced) {
                const piece = cell.piece;
                piece.isPlaced = false;
                piece.isLocked = false;
                piece.currentPosition = null;
                
                if (!gameState.bank.includes(piece)) {
                    gameState.bank.push(piece);
                }
                
                cell.piece = null;
                cell.isLocked = false;
            }
        }
    }
    
    gameState.moveHistory = [];
    
    updateDisplay();
    updateUndoButton();
    showDragHint("Board cleared! All pieces returned to bank.");
}

// ========== U I   U P D A T E S ==========

function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (gameState.bank.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/3;text-align:center;padding:30px;color:#666;">
                <div style="font-size:24px;margin-bottom:10px;">🎉</div>
                <div style="font-weight:500;margin-bottom:5px;">Puzzle Complete!</div>
                <div style="font-size:12px;color:#888;">All pieces placed correctly</div>
            </div>
        `;
        return;
    }
    
    gameState.bank.forEach(piece => {
        const slot = document.createElement('div');
        slot.className = 'piece-slot has-piece';
        
        const canvas = document.createElement('canvas');
        canvas.width = 70;
        canvas.height = 70;
        canvas.className = 'piece-canvas';
        canvas.dataset.pieceId = piece.id;
        canvas.title = `Drag to board\nOriginal position: (${piece.originalPosition.row}, ${piece.originalPosition.col})`;
        
        const ctx = canvas.getContext('2d');
        drawPiece(ctx, piece, 0, 0, 70, false);
        
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('touchstart', startDrag, { passive: false });
        
        slot.appendChild(canvas);
        container.appendChild(slot);
    });
    
    // Update bank counter
    document.getElementById('bankCounter').textContent = gameState.bank.length;
}

function updateStats() {
    const placed = gameState.pieces.filter(p => p.isPlaced).length;
    const locked = gameState.pieces.filter(p => p.isLocked).length;
    
    document.getElementById('placedCount').textContent = placed;
    document.getElementById('lockedCount').textContent = locked;
}

function updateDisplay() {
    displayPieces();
    drawBoard();
    updateStats();
}

function highlightValidSpots(clientX, clientY) {
    if (!gameState.draggedPiece) return;
    
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    // Highlight cell under cursor if valid
    if (row >= 0 && row < CONFIG.BOARD_SIZE && 
        col >= 0 && col < CONFIG.BOARD_SIZE) {
        
        if (!gameState.board[row][col].piece || !gameState.board[row][col].piece.isPlaced) {
            const isValid = canPieceGoHere(gameState.draggedPiece, row, col, gameState.board);
            
            if (isValid) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = CONFIG.COLORS.HINT_VALID;
                ctx.fillRect(col * CONFIG.CELL_SIZE, row * CONFIG.CELL_SIZE, 
                            CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
                ctx.restore();
            }
        }
    }
}

function clearHighlight() {
    drawBoard();
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
    
    // Global undo button update
    window.updateUndoButton = function() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = gameState.moveHistory.length === 0;
        }
    };
    
    // Global drag hint
    window.showDragHint = showDragHint;
    
    console.log("Juzzle 4×4 with Classic Shapes Loaded");
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame); 

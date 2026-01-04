 // ========== CONFIG ==========
const CONFIG = {
    BOARD_SIZE: 12,
    CELL_SIZE: 36,
    EDGE_TYPES: { JACK: 1, NEST: -1, FLAT: 0 },
    SHOW_HINTS: true, // Simple single-color hints
    COLORS: {
        BLACK: '#1a1a1a',
        WHITE: '#ffffff',
        BOARD_BG: '#ffffff',
        GRID_LINE: '#d0d0d0',
        PIECE_BG: '#2a2a2a',
        JACK: '#3a3a3a',
        NEST: '#1a1a1a',
        HINT: 'rgba(100, 150, 255, 0.3)' // Single blue tint for hints
    }
};

// ========== STATE ==========
let allPieces = [];
let gameBoard = [];
let draggedPiece = null;
let dragOffset = { x: 0, y: 0 };

// ========== PIECE GENERATION ==========

function generatePiece(type, id) {
    const piece = {
        id: `piece_${id}`,
        type: type,
        color: Math.random() > 0.5 ? 1 : 2, // 1=black, 2=white
        rotations: [],
        isPlaced: false,
        isLocked: false
    };
    
    const baseShape = new Array(4).fill(CONFIG.EDGE_TYPES.FLAT);
    
    switch(type) {
        case 'corner':
            // Corners: FLAT on two adjacent sides (board edges)
            // Connectors face inward
            baseShape[0] = CONFIG.EDGE_TYPES.FLAT;    // Top (board edge)
            baseShape[1] = Math.random() > 0.5 ? CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
            baseShape[2] = Math.random() > 0.5 ? CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
            baseShape[3] = CONFIG.EDGE_TYPES.FLAT;    // Left (board edge)
            break;
            
        case 'border':
            // Border: 1 FLAT side (board edge), 3 connectors
            const flatSide = Math.floor(Math.random() * 4);
            baseShape[flatSide] = CONFIG.EDGE_TYPES.FLAT;
            
            for (let i = 0; i < 4; i++) {
                if (i !== flatSide) {
                    baseShape[i] = Math.random() > 0.5 ? 
                        CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
                }
            }
            break;
            
        case 'field':
            // Field: All 4 connectors
            for (let i = 0; i < 4; i++) {
                baseShape[i] = Math.random() > 0.5 ? 
                    CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
            }
            break;
    }
    
    // Store only one rotation (no rotation feature)
    piece.rotations = [{
        shape: baseShape,
        visual: baseShape.map(e => e === CONFIG.EDGE_TYPES.JACK ? 'J' : 
                                 e === CONFIG.EDGE_TYPES.NEST ? 'N' : '-').join('')
    }];
    
    return piece;
}

function generateAllPieces() {
    allPieces = [];
    let id = 0;
    
    // Generate all 144 pieces
    const counts = { corner: 4, border: 40, field: 100 };
    
    for (const [type, count] of Object.entries(counts)) {
        for (let i = 0; i < count; i++) {
            allPieces.push(generatePiece(type, id++));
        }
    }
    
    return allPieces;
}

// ========== BOARD ==========

function createEmptyBoard() {
    gameBoard = [];
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            gameBoard[row][col] = { piece: null, isLocked: false };
        }
    }
    return gameBoard;
}

// ========== DRAWING (Circles & Lines) ==========

function drawPiece(ctx, piece, x, y, size, isLocked) {
    const edges = piece.rotations[0].shape;
    const half = size / 2;
    const quarter = size / 4;
    
    // Piece background (black or white)
    ctx.fillStyle = piece.color === 1 ? CONFIG.COLORS.BLACK : CONFIG.COLORS.WHITE;
    ctx.fillRect(x, y, size, size);
    
    // Outline
    ctx.strokeStyle = isLocked ? '#ff0000' : '#404040';
    ctx.lineWidth = isLocked ? 3 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    
    // Draw edge connectors (circles & lines)
    drawEdgeConnector(ctx, edges[0], x + half, y + quarter, 'top');
    drawEdgeConnector(ctx, edges[1], x + size - quarter, y + half, 'right');
    drawEdgeConnector(ctx, edges[2], x + half, y + size - quarter, 'bottom');
    drawEdgeConnector(ctx, edges[3], x + quarter, y + half, 'left');
}

function drawEdgeConnector(ctx, edgeType, x, y, position) {
    const r = 4; // Circle radius
    
    if (edgeType === CONFIG.EDGE_TYPES.JACK) {
        // Jack: Filled circle
        ctx.fillStyle = CONFIG.COLORS.JACK;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    } 
    else if (edgeType === CONFIG.EDGE_TYPES.NEST) {
        // Nest: Circle outline
        ctx.strokeStyle = CONFIG.COLORS.NEST;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    else if (edgeType === CONFIG.EDGE_TYPES.FLAT) {
        // Flat edge: Short line
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        switch(position) {
            case 'top':
                ctx.moveTo(x - 6, y);
                ctx.lineTo(x + 6, y);
                break;
            case 'right':
                ctx.moveTo(x, y - 6);
                ctx.lineTo(x, y + 6);
                break;
            case 'bottom':
                ctx.moveTo(x - 6, y);
                ctx.lineTo(x + 6, y);
                break;
            case 'left':
                ctx.moveTo(x, y - 6);
                ctx.lineTo(x, y + 6);
                break;
        }
        ctx.stroke();
    }
}

function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    
    const size = CONFIG.CELL_SIZE * CONFIG.BOARD_SIZE;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    
    // Clear board
    ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
    ctx.fillRect(0, 0, size, size);
    
    // Draw placed pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const cell = gameBoard[row][col];
            if (cell.piece) {
                const x = col * CONFIG.CELL_SIZE;
                const y = row * CONFIG.CELL_SIZE;
                drawPiece(ctx, cell.piece, x, y, CONFIG.CELL_SIZE, cell.isLocked);
            }
        }
    }
}

// ========== DRAG & DROP ==========

function startDrag(e) {
    e.preventDefault();
    
    const element = e.target;
    const pieceId = element.dataset.pieceId;
    draggedPiece = allPieces.find(p => p.id === pieceId);
    
    if (!draggedPiece) return;
    
    const rect = element.getBoundingClientRect();
    dragOffset.x = (e.clientX || e.touches[0].clientX) - rect.left;
    dragOffset.y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    createDragImage(draggedPiece, e.clientX || e.touches[0].clientX, 
                    e.clientY || e.touches[0].clientY);
    
    element.style.opacity = '0.5';
    document.getElementById('dragHint').classList.add('visible');
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', doDragTouch, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function doDrag(e) {
    if (!draggedPiece) return;
    updateDragImage(e.clientX, e.clientY);
    if (CONFIG.SHOW_HINTS) highlightCell(e.clientX, e.clientY);
}

function doDragTouch(e) {
    if (!draggedPiece) return;
    e.preventDefault();
    updateDragImage(e.touches[0].clientX, e.touches[0].clientY);
    if (CONFIG.SHOW_HINTS) highlightCell(e.touches[0].clientX, e.touches[0].clientY);
}

function endDrag(e) {
    if (!draggedPiece) {
        cleanupDrag();
        return;
    }
    
    const x = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const y = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    
    if (tryPlacePiece(x, y)) {
        updateDisplay();
    }
    
    cleanupDrag();
}

function cleanupDrag() {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', doDragTouch);
    document.removeEventListener('touchend', endDrag);
    
    const dragImg = document.getElementById('dragImage');
    if (dragImg) dragImg.remove();
    
    if (draggedPiece) {
        const element = document.querySelector(`[data-piece-id="${draggedPiece.id}"]`);
        if (element) element.style.opacity = '1';
    }
    
    document.getElementById('dragHint').classList.remove('visible');
    clearHighlight();
    draggedPiece = null;
}

// ========== PLACEMENT LOGIC ==========

function edgesCompatible(edge1, edge2) {
    return (edge1 === CONFIG.EDGE_TYPES.JACK && edge2 === CONFIG.EDGE_TYPES.NEST) ||
           (edge1 === CONFIG.EDGE_TYPES.NEST && edge2 === CONFIG.EDGE_TYPES.JACK);
}

function canPlacePiece(piece, row, col) {
    if (gameBoard[row][col].piece) return false;
    
    const edges = piece.rotations[0].shape;
    
    // Check borders
    if (row === 0 && edges[0] !== CONFIG.EDGE_TYPES.FLAT) return false;
    if (col === CONFIG.BOARD_SIZE-1 && edges[1] !== CONFIG.EDGE_TYPES.FLAT) return false;
    if (row === CONFIG.BOARD_SIZE-1 && edges[2] !== CONFIG.EDGE_TYPES.FLAT) return false;
    if (col === 0 && edges[3] !== CONFIG.EDGE_TYPES.FLAT) return false;
    
    // Check neighbors
    const neighbors = [
        [row-1, col, edges[0], 2], // Top
        [row, col+1, edges[1], 3], // Right
        [row+1, col, edges[2], 0], // Bottom
        [row, col-1, edges[3], 1]  // Left
    ];
    
    for (const [nRow, nCol, myEdge, theirIdx] of neighbors) {
        if (nRow < 0 || nRow >= CONFIG.BOARD_SIZE || 
            nCol < 0 || nCol >= CONFIG.BOARD_SIZE) continue;
        
        const neighbor = gameBoard[nRow][nCol].piece;
        if (neighbor) {
            const theirEdge = neighbor.rotations[0].shape[theirIdx];
            if (!edgesCompatible(myEdge, theirEdge)) return false;
        }
    }
    
    return true;
}

function tryPlacePiece(clientX, clientY) {
    if (!draggedPiece) return false;
    
    const canvas = document.getElementById('boardCanvas');
    const rect = canvas.getBoundingClientRect();
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    if (row < 0 || row >= CONFIG.BOARD_SIZE || 
        col < 0 || col >= CONFIG.BOARD_SIZE) {
        return false;
    }
    
    if (!canPlacePiece(draggedPiece, row, col)) {
        return false;
    }
    
    draggedPiece.isPlaced = true;
    gameBoard[row][col].piece = draggedPiece;
    return true;
}

// ========== VISUAL FEEDBACK ==========

function createDragImage(piece, x, y) {
    const dragImg = document.createElement('canvas');
    dragImg.id = 'dragImage';
    dragImg.width = CONFIG.CELL_SIZE;
    dragImg.height = CONFIG.CELL_SIZE;
    
    dragImg.style.cssText = `
        position: fixed;
        left: ${x - CONFIG.CELL_SIZE/2}px;
        top: ${y - CONFIG.CELL_SIZE/2}px;
        width: ${CONFIG.CELL_SIZE}px;
        height: ${CONFIG.CELL_SIZE}px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.9;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
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

function highlightCell(clientX, clientY) {
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    clearHighlight();
    
    if (!draggedPiece) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    if (row >= 0 && row < CONFIG.BOARD_SIZE && 
        col >= 0 && col < CONFIG.BOARD_SIZE) {
        
        const isValid = canPlacePiece(draggedPiece, row, col);
        
        ctx.save();
        ctx.fillStyle = CONFIG.COLORS.HINT;
        ctx.fillRect(col * CONFIG.CELL_SIZE, row * CONFIG.CELL_SIZE, 
                    CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        ctx.restore();
    }
}

function clearHighlight() {
    // Just redraw the board
    drawBoard();
}

// ========== UI UPDATES ==========

function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const unplacedPieces = allPieces.filter(p => !p.isPlaced);
    
    if (unplacedPieces.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;font-style:italic">All pieces placed!</div>';
        return;
    }
    
    unplacedPieces.forEach(piece => {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        canvas.className = 'piece-canvas';
        canvas.dataset.pieceId = piece.id;
        
        const ctx = canvas.getContext('2d');
        drawPiece(ctx, piece, 0, 0, 50, false);
        
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('touchstart', startDrag, { passive: false });
        
        container.appendChild(canvas);
    });
}

function updateCounters() {
    const placed = allPieces.filter(p => p.isPlaced).length;
    const counter = document.getElementById('counter');
    if (counter) {
        counter.textContent = `Pieces: ${placed}/144`;
    }
}

function updateDisplay() {
    displayPieces();
    drawBoard();
    updateCounters();
}

// ========== GAME CONTROLS ==========

function generatePieces() {
    generateAllPieces();
    createEmptyBoard();
    displayPieces();
    drawBoard();
    updateCounters();
}

function placeLockedPieces() {
    // Clear existing locks
    allPieces.forEach(p => p.isLocked = false);
    gameBoard.forEach(row => row.forEach(cell => cell.isLocked = false));
    
    // Place 12-15 locked pieces
    const numLocked = 12 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numLocked; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            attempts++;
            const row = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            const col = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            
            if (gameBoard[row][col].piece) continue;
            
            const pieceType = (row === 0 || row === CONFIG.BOARD_SIZE-1 || 
                              col === 0 || col === CONFIG.BOARD_SIZE-1) ? 
                              (Math.random() > 0.3 ? 'border' : 'field') : 'field';
            
            const availablePieces = allPieces.filter(p => 
                !p.isPlaced && p.type === pieceType
            );
            
            if (availablePieces.length > 0) {
                const piece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
                piece.isPlaced = true;
                piece.isLocked = true;
                
                gameBoard[row][col].piece = piece;
                gameBoard[row][col].isLocked = true;
                placed = true;
            }
        }
    }
    
    updateDisplay();
}

function clearBoard() {
    createEmptyBoard();
    allPieces.forEach(p => {
        p.isPlaced = false;
        p.isLocked = false;
    });
    updateDisplay();
}

function toggleHints() {
    CONFIG.SHOW_HINTS = !CONFIG.SHOW_HINTS;
    const btn = document.getElementById('toggleHints');
    if (btn) {
        btn.innerHTML = `<i class="fas fa-lightbulb"></i> Hints: ${CONFIG.SHOW_HINTS ? 'ON' : 'OFF'}`;
    }
}

// ========== INIT ==========

function initGame() {
    // Setup canvas for touch
    const canvas = document.getElementById('boardCanvas');
    if (canvas) {
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
    
    // Start game
    generatePieces();
    
    // Collapse controls by default
    document.getElementById('controls').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', initGame);

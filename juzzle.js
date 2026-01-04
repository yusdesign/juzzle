// ========== GLOBAL CONFIGURATION ==========
const CONFIG = {
    BOARD_SIZE: 12,
    CELL_SIZE: 36, // Slightly smaller for better fit
    EDGE_TYPES: { JACK: 1, NEST: -1, FLAT: 0 },
    ROTATION_ENABLED: false,
    SHOW_HINTS: false, // Hints disabled by default
    COLORS: {
        BLACK: '#1a1a1a',
        WHITE: '#ffffff',
        BOARD_BG: '#f0f0f0',
        PAGE_BG: '#e8e8e8',
        GRID_LINE: '#d0d0d0',
        LOCKED_BLACK: '#1a1a1a',
        LOCKED_WHITE: '#ffffff',
        PIECE_BG: '#2a2a2a',
        PIECE_OUTLINE: '#404040',
        JACK: '#3a3a3a',
        NEST: '#1a1a1a',
        HIGHLIGHT_VALID: 'rgba(100, 200, 100, 0.3)',
        HIGHLIGHT_INVALID: 'rgba(200, 100, 100, 0.3)'
    }
};

// ========== GLOBAL STATE ==========
let allPieces = [];
let gameBoard = [];
let pieceBank = [];
let draggedPiece = null;
let dragOffset = { x: 0, y: 0 };
let currentRotation = 0;
let showControls = false; // Controls collapsed by default

// ========== CORE PIECE GENERATION ==========

function generatePiece(type, id) {
    const piece = {
        id: `piece_${id}`,
        type: type,
        color: Math.random() > 0.5 ? 1 : 2, // 1=black, 2=white
        rotations: [],
        isPlaced: false,
        isLocked: false,
        currentRotation: 0,
        // Puzzle piece shape properties
        tabType: null, // For visual shape
        blankType: null // For visual shape
    };
    
    const baseShape = [CONFIG.EDGE_TYPES.FLAT, CONFIG.EDGE_TYPES.FLAT, 
                       CONFIG.EDGE_TYPES.FLAT, CONFIG.EDGE_TYPES.FLAT];
    
    switch(type) {
        case 'corner':
            // Corners: 1 Jack & 1 Nest facing inward
            baseShape[0] = CONFIG.EDGE_TYPES.FLAT;    // Top (board edge)
            baseShape[1] = CONFIG.EDGE_TYPES.JACK;    // Right (inward)
            baseShape[2] = CONFIG.EDGE_TYPES.NEST;    // Bottom (inward)
            baseShape[3] = CONFIG.EDGE_TYPES.FLAT;    // Left (board edge)
            
            // Visual shape for corners
            piece.tabType = Math.floor(Math.random() * 3);
            piece.blankType = Math.floor(Math.random() * 3);
            break;
            
        case 'border':
            // Border: 1 Flat (board edge), 3 connectors inward
            const flatSide = Math.floor(Math.random() * 4);
            baseShape[flatSide] = CONFIG.EDGE_TYPES.FLAT;
            
            for (let i = 0; i < 4; i++) {
                if (i !== flatSide) {
                    baseShape[i] = Math.random() > 0.5 ? 
                        CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
                }
            }
            
            // Visual shape for borders
            piece.tabType = Math.floor(Math.random() * 4);
            piece.blankType = Math.floor(Math.random() * 4);
            break;
            
        case 'field':
            // Field: 4 random connectors
            for (let i = 0; i < 4; i++) {
                baseShape[i] = Math.random() > 0.5 ? 
                    CONFIG.EDGE_TYPES.JACK : CONFIG.EDGE_TYPES.NEST;
            }
            
            // Visual shape for field pieces
            piece.tabType = Math.floor(Math.random() * 6);
            piece.blankType = Math.floor(Math.random() * 6);
            break;
    }
    
    // Generate rotations
    for (let rot = 0; rot < 4; rot++) {
        const rotatedShape = [];
        for (let i = 0; i < 4; i++) {
            rotatedShape[i] = baseShape[(i + rot) % 4];
        }
        
        piece.rotations.push({
            rotation: rot,
            shape: rotatedShape
        });
    }
    
    return piece;
}

function generateAllPieces() {
    allPieces = [];
    let id = 0;
    
    // 4 corners
    for (let i = 0; i < 4; i++) {
        allPieces.push(generatePiece('corner', id++));
    }
    
    // 40 border pieces
    for (let i = 0; i < 40; i++) {
        allPieces.push(generatePiece('border', id++));
    }
    
    // 100 field pieces
    for (let i = 0; i < 100; i++) {
        allPieces.push(generatePiece('field', id++));
    }
    
    return allPieces;
}

// ========== BOARD MANAGEMENT ==========

function createEmptyBoard() {
    gameBoard = [];
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            gameBoard[row][col] = {
                piece: null,
                color: 0,
                isLocked: false
            };
        }
    }
    return gameBoard;
}

// ========== JIGSAW PIECE DRAWING ==========

function drawJigsawPiece(ctx, piece, x, y, size, rotation, isLocked) {
    const centerX = x + size/2;
    const centerY = y + size/2;
    const edgeSize = size * 0.15; // Size of tabs/blanks
    
    // Save context
    ctx.save();
    
    // Move to center and rotate
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation * Math.PI / 2);
    ctx.translate(-centerX, -centerY);
    
    // Piece color (black/white)
    const pieceColor = piece.color === 1 ? CONFIG.COLORS.BLACK : CONFIG.COLORS.WHITE;
    const outlineColor = piece.color === 1 ? CONFIG.COLORS.WHITE : CONFIG.COLORS.BLACK;
    
    // Draw piece shape with puzzle-like edges
    ctx.beginPath();
    
    // Start at top-left corner
    ctx.moveTo(x, y + edgeSize);
    
    // Top edge with tab/blank
    drawPuzzleEdge(ctx, x, y, size, edgeSize, piece.tabType, 0);
    
    // Right edge
    drawPuzzleEdge(ctx, x, y, size, edgeSize, piece.blankType, 1);
    
    // Bottom edge
    drawPuzzleEdge(ctx, x, y, size, edgeSize, piece.tabType, 2);
    
    // Left edge
    drawPuzzleEdge(ctx, x, y, size, edgeSize, piece.blankType, 3);
    
    ctx.closePath();
    
    // Fill piece
    ctx.fillStyle = pieceColor;
    ctx.fill();
    
    // Draw outline
    ctx.lineWidth = isLocked ? 3 : 1.5;
    ctx.strokeStyle = isLocked ? outlineColor : CONFIG.COLORS.PIECE_OUTLINE;
    ctx.stroke();
    
    // Restore context
    ctx.restore();
}

function drawPuzzleEdge(ctx, x, y, size, edgeSize, edgeType, side) {
    const quarter = size / 4;
    
    switch(side) {
        case 0: // Top edge
            if (edgeType === 0) { // Tab out
                ctx.lineTo(x + quarter, y);
                ctx.lineTo(x + quarter + edgeSize, y - edgeSize);
                ctx.lineTo(x + 3*quarter - edgeSize, y - edgeSize);
                ctx.lineTo(x + 3*quarter, y);
                ctx.lineTo(x + size, y);
            } else if (edgeType === 1) { // Tab in
                ctx.lineTo(x + quarter, y);
                ctx.lineTo(x + quarter + edgeSize, y + edgeSize);
                ctx.lineTo(x + 3*quarter - edgeSize, y + edgeSize);
                ctx.lineTo(x + 3*quarter, y);
                ctx.lineTo(x + size, y);
            } else { // Straight
                ctx.lineTo(x + size, y);
            }
            break;
            
        case 1: // Right edge
            if (edgeType === 0) { // Tab out
                ctx.lineTo(x + size, y + quarter);
                ctx.lineTo(x + size + edgeSize, y + quarter + edgeSize);
                ctx.lineTo(x + size + edgeSize, y + 3*quarter - edgeSize);
                ctx.lineTo(x + size, y + 3*quarter);
                ctx.lineTo(x + size, y + size);
            } else if (edgeType === 1) { // Tab in
                ctx.lineTo(x + size, y + quarter);
                ctx.lineTo(x + size - edgeSize, y + quarter + edgeSize);
                ctx.lineTo(x + size - edgeSize, y + 3*quarter - edgeSize);
                ctx.lineTo(x + size, y + 3*quarter);
                ctx.lineTo(x + size, y + size);
            } else { // Straight
                ctx.lineTo(x + size, y + size);
            }
            break;
            
        case 2: // Bottom edge
            if (edgeType === 0) { // Tab out
                ctx.lineTo(x + 3*quarter, y + size);
                ctx.lineTo(x + 3*quarter - edgeSize, y + size + edgeSize);
                ctx.lineTo(x + quarter + edgeSize, y + size + edgeSize);
                ctx.lineTo(x + quarter, y + size);
                ctx.lineTo(x, y + size);
            } else if (edgeType === 1) { // Tab in
                ctx.lineTo(x + 3*quarter, y + size);
                ctx.lineTo(x + 3*quarter - edgeSize, y + size - edgeSize);
                ctx.lineTo(x + quarter + edgeSize, y + size - edgeSize);
                ctx.lineTo(x + quarter, y + size);
                ctx.lineTo(x, y + size);
            } else { // Straight
                ctx.lineTo(x, y + size);
            }
            break;
            
        case 3: // Left edge
            if (edgeType === 0) { // Tab out
                ctx.lineTo(x, y + 3*quarter);
                ctx.lineTo(x - edgeSize, y + 3*quarter - edgeSize);
                ctx.lineTo(x - edgeSize, y + quarter + edgeSize);
                ctx.lineTo(x, y + quarter);
                ctx.lineTo(x, y);
            } else if (edgeType === 1) { // Tab in
                ctx.lineTo(x, y + 3*quarter);
                ctx.lineTo(x + edgeSize, y + 3*quarter - edgeSize);
                ctx.lineTo(x + edgeSize, y + quarter + edgeSize);
                ctx.lineTo(x, y + quarter);
                ctx.lineTo(x, y);
            } else { // Straight
                ctx.lineTo(x, y);
            }
            break;
    }
}

// ========== PLACEMENT & VALIDATION ==========

function edgesCompatible(edge1, edge2) {
    return (edge1 === CONFIG.EDGE_TYPES.JACK && edge2 === CONFIG.EDGE_TYPES.NEST) ||
           (edge1 === CONFIG.EDGE_TYPES.NEST && edge2 === CONFIG.EDGE_TYPES.JACK);
}

function canPlacePiece(piece, row, col, rotation) {
    if (gameBoard[row][col].piece) return false;
    
    const edges = piece.rotations[rotation].shape;
    
    // Check borders
    if (row === 0 && edges[0] !== CONFIG.EDGE_TYPES.FLAT) return false;
    if (col === CONFIG.BOARD_SIZE-1 && edges[1] !== CONFIG.EDGE_TYPES.FLAT) return false;
    if (row === CONFIG.BOARD_SIZE-1 && edges[2] !== CONFIG.EDGE_TYPES.FLAT) return false;
    if (col === 0 && edges[3] !== CONFIG.EDGE_TYPES.FLAT) return false;
    
    const neighbors = [
        { nRow: row-1, nCol: col, myEdge: edges[0], theirEdgeIdx: 2 },
        { nRow: row, nCol: col+1, myEdge: edges[1], theirEdgeIdx: 3 },
        { nRow: row+1, nCol: col, myEdge: edges[2], theirEdgeIdx: 0 },
        { nRow: row, nCol: col-1, myEdge: edges[3], theirEdgeIdx: 1 }
    ];
    
    for (const n of neighbors) {
        if (n.nRow < 0 || n.nRow >= CONFIG.BOARD_SIZE || 
            n.nCol < 0 || n.nCol >= CONFIG.BOARD_SIZE) {
            continue;
        }
        
        const neighbor = gameBoard[n.nRow][n.nCol];
        if (neighbor.piece) {
            const theirEdges = neighbor.piece.rotations[neighbor.piece.currentRotation].shape;
            const theirEdge = theirEdges[n.theirEdgeIdx];
            
            if (n.myEdge === CONFIG.EDGE_TYPES.FLAT || theirEdge === CONFIG.EDGE_TYPES.FLAT) {
                return false;
            }
            
            if (!edgesCompatible(n.myEdge, theirEdge)) {
                return false;
            }
        }
    }
    
    return true;
}

// ========== DRAG & DROP ==========

function startDrag(e) {
    e.preventDefault();
    
    const element = e.target;
    const pieceId = element.dataset.pieceId;
    draggedPiece = allPieces.find(p => p.id === pieceId);
    
    if (!draggedPiece) return;
    
    const rect = element.getBoundingClientRect();
    if (e.type === 'mousedown') {
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
    } else if (e.touches) {
        dragOffset.x = e.touches[0].clientX - rect.left;
        dragOffset.y = e.touches[0].clientY - rect.top;
    }
    
    createDragImage(draggedPiece, 
        e.clientX || e.touches[0].clientX, 
        e.clientY || e.touches[0].clientY);
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', doDragTouch, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    element.style.opacity = '0.5';
}

function doDrag(e) {
    if (!draggedPiece) return;
    updateDragImage(e.clientX, e.clientY);
    if (CONFIG.SHOW_HINTS) highlightValidCells(e.clientX, e.clientY);
}

function doDragTouch(e) {
    if (!draggedPiece) return;
    e.preventDefault();
    updateDragImage(e.touches[0].clientX, e.touches[0].clientY);
    if (CONFIG.SHOW_HINTS) highlightValidCells(e.touches[0].clientX, e.touches[0].clientY);
}

function endDrag(e) {
    if (!draggedPiece) {
        cleanupDrag();
        return;
    }
    
    let clientX, clientY;
    if (e.type === 'mouseup') {
        clientX = e.clientX;
        clientY = e.clientY;
    } else if (e.type === 'touchend' && e.changedTouches) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }
    
    const success = tryPlacePiece(clientX, clientY);
    cleanupDrag();
    
    if (success) updateDisplay();
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
    
    draggedPiece = null;
    clearHighlights();
}

// ========== VISUAL FEEDBACK ==========

function createDragImage(piece, x, y) {
    const dragImg = document.createElement('canvas');
    dragImg.id = 'dragImage';
    dragImg.width = CONFIG.CELL_SIZE * 1.5;
    dragImg.height = CONFIG.CELL_SIZE * 1.5;
    
    dragImg.style.cssText = `
        position: fixed;
        left: ${x - CONFIG.CELL_SIZE * 0.75}px;
        top: ${y - CONFIG.CELL_SIZE * 0.75}px;
        width: ${CONFIG.CELL_SIZE * 1.5}px;
        height: ${CONFIG.CELL_SIZE * 1.5}px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.9;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
    `;
    
    const ctx = dragImg.getContext('2d');
    drawJigsawPiece(ctx, piece, 0, 0, CONFIG.CELL_SIZE * 1.5, 
                   CONFIG.ROTATION_ENABLED ? currentRotation : 0, false);
    document.body.appendChild(dragImg);
}

function updateDragImage(x, y) {
    const dragImg = document.getElementById('dragImage');
    if (dragImg) {
        dragImg.style.left = `${x - CONFIG.CELL_SIZE * 0.75}px`;
        dragImg.style.top = `${y - CONFIG.CELL_SIZE * 0.75}px`;
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
    
    if (row < 0 || row >= CONFIG.BOARD_SIZE || 
        col < 0 || col >= CONFIG.BOARD_SIZE) {
        return false;
    }
    
    const rotation = CONFIG.ROTATION_ENABLED ? currentRotation : 0;
    
    if (!canPlacePiece(draggedPiece, row, col, rotation)) {
        return false;
    }
    
    draggedPiece.isPlaced = true;
    draggedPiece.currentRotation = rotation;
    gameBoard[row][col].piece = draggedPiece;
    
    // Check if piece should be locked (color rule from 0h h1)
    if (Math.random() < 0.3) { // 30% chance for demo
        gameBoard[row][col].isLocked = true;
        draggedPiece.isLocked = true;
    }
    
    return true;
}

// ========== DISPLAY FUNCTIONS ==========

function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    
    const displaySize = CONFIG.CELL_SIZE * CONFIG.BOARD_SIZE;
    canvas.width = displaySize;
    canvas.height = displaySize;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Board background
    ctx.fillStyle = CONFIG.COLORS.BOARD_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= CONFIG.BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(canvas.width, i * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed pieces
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const cell = gameBoard[row][col];
            if (cell.piece) {
                const x = col * CONFIG.CELL_SIZE;
                const y = row * CONFIG.CELL_SIZE;
                drawJigsawPiece(ctx, cell.piece, x, y, CONFIG.CELL_SIZE, 
                              cell.piece.currentRotation, cell.isLocked);
            }
        }
    }
}

function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const unplacedPieces = allPieces.filter(p => !p.isPlaced);
    
    if (unplacedPieces.length === 0) {
        container.innerHTML = '<div class="empty-bank">All pieces placed!</div>';
        return;
    }
    
    const isMobile = window.innerWidth < 768;
    const cols = isMobile ? 5 : 8;
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    unplacedPieces.forEach(piece => {
        const canvas = document.createElement('canvas');
        const size = isMobile ? 35 : 45;
        canvas.width = size;
        canvas.height = size;
        canvas.className = 'piece-canvas';
        canvas.dataset.pieceId = piece.id;
        canvas.title = `${piece.type} piece`;
        
        const ctx = canvas.getContext('2d');
        drawJigsawPiece(ctx, piece, 0, 0, size, 0, false);
        
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('touchstart', startDrag, { passive: false });
        
        container.appendChild(canvas);
    });
}

// ========== GAME CONTROLS ==========

function generatePieces() {
    generateAllPieces();
    createEmptyBoard();
    displayPieces();
    drawBoard();
    pieceBank = [...allPieces.filter(p => !p.isPlaced)];
    updateCounters();
}

function placeLockedPieces() {
    // Place random locked pieces (like 0h h1 starting positions)
    const numLocked = 15;
    
    for (let i = 0; i < numLocked; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 50) {
            attempts++;
            const row = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            const col = Math.floor(Math.random() * CONFIG.BOARD_SIZE);
            
            if (gameBoard[row][col].piece) continue;
            
            const pieceType = (row === 0 || row === CONFIG.BOARD_SIZE-1 || 
                              col === 0 || col === CONFIG.BOARD_SIZE-1) ? 
                              (Math.random() > 0.5 ? 'border' : 'field') : 'field';
            
            const availablePieces = allPieces.filter(p => 
                !p.isPlaced && p.type === pieceType
            );
            
            if (availablePieces.length > 0) {
                const piece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
                piece.isPlaced = true;
                piece.isLocked = true;
                piece.currentRotation = 0;
                
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
        p.currentRotation = 0;
    });
    pieceBank = [...allPieces];
    updateDisplay();
}

function toggleRotation() {
    CONFIG.ROTATION_ENABLED = !CONFIG.ROTATION_ENABLED;
    const btn = document.getElementById('toggleRotation');
    if (btn) {
        btn.textContent = `↻ ${CONFIG.ROTATION_ENABLED ? 'ON' : 'OFF'}`;
        btn.style.background = CONFIG.COLORS.PIECE_OUTLINE;
    }
}

function toggleHints() {
    CONFIG.SHOW_HINTS = !CONFIG.SHOW_HINTS;
    const btn = document.getElementById('toggleHints');
    if (btn) {
        btn.textContent = `💡 ${CONFIG.SHOW_HINTS ? 'ON' : 'OFF'}`;
        btn.style.background = CONFIG.COLORS.PIECE_OUTLINE;
    }
}

function toggleControls() {
    showControls = !showControls;
    const controls = document.getElementById('controls');
    const toggleBtn = document.getElementById('toggleControls');
    
    if (controls) {
        controls.style.display = showControls ? 'flex' : 'none';
    }
    if (toggleBtn) {
        toggleBtn.textContent = showControls ? '▲ Controls' : '▼ Controls';
    }
}

// ========== HELPER FUNCTIONS ==========

function highlightValidCells(clientX, clientY) {
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    clearHighlights();
    
    if (!draggedPiece) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor(x / CONFIG.CELL_SIZE);
    const row = Math.floor(y / CONFIG.CELL_SIZE);
    
    if (row >= 0 && row < CONFIG.BOARD_SIZE && 
        col >= 0 && col < CONFIG.BOARD_SIZE) {
        
        const rotation = CONFIG.ROTATION_ENABLED ? currentRotation : 0;
        const isValid = canPlacePiece(draggedPiece, row, col, rotation);
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = isValid ? CONFIG.COLORS.HIGHLIGHT_VALID : 
                                 CONFIG.COLORS.HIGHLIGHT_INVALID;
        ctx.fillRect(col * CONFIG.CELL_SIZE, row * CONFIG.CELL_SIZE, 
                    CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        ctx.restore();
    }
}

function clearHighlights() {
    drawBoard();
}

function updateCounters() {
    const placed = allPieces.filter(p => p.isPlaced).length;
    const locked = allPieces.filter(p => p.isLocked).length;
    
    const counter = document.getElementById('counter');
    if (counter) {
        counter.textContent = `${placed}/144`;
    }
}

function updateDisplay() {
    displayPieces();
    drawBoard();
    updateCounters();
}

// ========== INITIALIZATION ==========

function initGame() {
    // Setup control buttons
    const rotationBtn = document.getElementById('toggleRotation');
    const hintsBtn = document.getElementById('toggleHints');
    const controlsBtn = document.getElementById('toggleControls');
    
    if (rotationBtn) {
        rotationBtn.addEventListener('click', toggleRotation);
        rotationBtn.textContent = `↻ ${CONFIG.ROTATION_ENABLED ? 'ON' : 'OFF'}`;
        rotationBtn.style.background = CONFIG.COLORS.PIECE_OUTLINE;
    }
    
    if (hintsBtn) {
        hintsBtn.addEventListener('click', toggleHints);
        hintsBtn.textContent = `💡 ${CONFIG.SHOW_HINTS ? 'ON' : 'OFF'}`;
        hintsBtn.style.background = CONFIG.COLORS.PIECE_OUTLINE;
    }
    
    if (controlsBtn) {
        controlsBtn.addEventListener('click', toggleControls);
        controlsBtn.textContent = '▼ Controls';
    }
    
    // Setup board canvas
    const canvas = document.getElementById('boardCanvas');
    if (canvas) {
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
    
    // Start game
    generatePieces();
    toggleControls(); // Start with controls collapsed
}

window.addEventListener('DOMContentLoaded', initGame);

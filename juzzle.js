// juzzle.js a puzzle game script
// ========== CONSTANTS ==========
const EDGE_TYPES = {
    JACK: 1,    // Male connector
    NEST: -1,   // Female connector  
    FLAT: 0     // Border edge
};

const BOARD_SIZE = 12;
const CELL_SIZE = 50;

// ========== GLOBAL STATE ==========
let allPieces = [];
let gameBoard = [];
let pieceBank = [];

// ========== CORE FUNCTIONS ==========

// 1. Generate a single piece
function generatePiece(type, id) {
    const piece = {
        id: `piece_${id}`,
        type: type,
        color: 0,
        rotations: [],
        isPlaced: false,
        isLocked: false
    };
    
    // Start with all flat edges
    const baseShape = [EDGE_TYPES.FLAT, EDGE_TYPES.FLAT, EDGE_TYPES.FLAT, EDGE_TYPES.FLAT];
    
    // Apply edge rules based on type
    switch(type) {
        case 'corner':
            // Corners: 1 Jack & 1 Nest on adjacent sides
            const jackSide = Math.floor(Math.random() * 4);
            const nestSide = (jackSide + 1) % 4; // Next side (adjacent)
            
            baseShape[jackSide] = EDGE_TYPES.JACK;
            baseShape[nestSide] = EDGE_TYPES.NEST;
            break;
            
        case 'border':
            // Border: 1 Flat, 3 random connectors
            const flatSide = Math.floor(Math.random() * 4);
            baseShape[flatSide] = EDGE_TYPES.FLAT;
            
            for (let i = 0; i < 4; i++) {
                if (i !== flatSide) {
                    baseShape[i] = Math.random() > 0.5 ? EDGE_TYPES.JACK : EDGE_TYPES.NEST;
                }
            }
            break;
            
        case 'field':
            // Field: All 4 random connectors
            for (let i = 0; i < 4; i++) {
                baseShape[i] = Math.random() > 0.5 ? EDGE_TYPES.JACK : EDGE_TYPES.NEST;
            }
            break;
    }
    
    // Generate 4 rotations
    for (let rot = 0; rot < 4; rot++) {
        const rotatedShape = [];
        for (let i = 0; i < 4; i++) {
            rotatedShape[i] = baseShape[(i + rot) % 4];
        }
        
        piece.rotations.push({
            rotation: rot,
            shape: rotatedShape,
            visualCode: rotatedShape.map(e => 
                e === EDGE_TYPES.JACK ? 'J' : 
                e === EDGE_TYPES.NEST ? 'N' : '-'
            ).join('')
        });
    }
    
    return piece;
}

// 2. Generate ALL pieces for the board
function generateAllPieces() {
    allPieces = [];
    let id = 0;
    
    // 4 corners
    for (let i = 0; i < 4; i++) {
        allPieces.push(generatePiece('corner', id++));
    }
    
    // 40 border pieces (12*4 - 8 corners)
    for (let i = 0; i < 40; i++) {
        allPieces.push(generatePiece('border', id++));
    }
    
    // 100 field pieces (10x10 interior)
    for (let i = 0; i < 100; i++) {
        allPieces.push(generatePiece('field', id++));
    }
    
    // Total: 144 pieces for 12x12 board
    return allPieces;
}

// 3. Create empty board
function createEmptyBoard() {
    gameBoard = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            gameBoard[row][col] = {
                piece: null,
                color: 0,
                isLocked: false
            };
        }
    }
    return gameBoard;
}

// 4. Display pieces in the grid
function displayPieces() {
    const container = document.getElementById('pieceContainer');
    if (!container) return;
    
    container.innerHTML = '<h3>Piece Bank (Drag to board)</h3>';
    
    // Filter to show only unplaced pieces
    const unplacedPieces = allPieces.filter(p => !p.isPlaced);
    
    if (unplacedPieces.length === 0) {
        container.innerHTML += '<p>No pieces left in bank!</p>';
        return;
    }
    
    unplacedPieces.forEach((piece) => {
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        canvas.className = 'piece-canvas draggable';
        canvas.dataset.pieceId = piece.id;
        canvas.title = `Drag me! ${piece.type} - ${piece.id}\nClick to rotate`;
        
        // Draw the piece
        const ctx = canvas.getContext('2d');
        drawPieceOnCanvas(ctx, piece, 0, 0, 60, 0, false);
        
        // Add drag events
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('click', (e) => {
            e.stopPropagation();
            rotatePieceInBank(piece);
            displayPieces(); // Refresh display
        });
        
        container.appendChild(canvas);
    });
}

// Helper: Draw piece on any canvas
function drawPieceOnCanvas(ctx, piece, x, y, size, rotation = 0, isLocked = false) {
    // Background
    ctx.fillStyle = isLocked ? '#495057' : 
                   piece.type === 'corner' ? '#ffeaa7' :
                   piece.type === 'border' ? '#a29bfe' : '#fd79a8';
    ctx.fillRect(x, y, size, size);
    
    // Border
    ctx.strokeStyle = isLocked ? '#212529' : '#495057';
    ctx.lineWidth = isLocked ? 2 : 1;
    ctx.strokeRect(x, y, size, size);
    
    // Edge connectors
    if (piece.rotations[rotation]) {
        drawEdgeConnectors(ctx, x, y, size, piece.rotations[rotation].shape, isLocked);
    }
    
    // ID text
    ctx.fillStyle = isLocked ? '#ffffff' : '#212529';
    ctx.font = `${Math.max(8, size/8)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(piece.id.replace('piece_', ''), 
                 x + size/2, 
                 y + size/2);
}

// 5. Draw the game board
// Enhanced drawBoard function with visible Jacks & Nests
function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, BOARD_SIZE * CELL_SIZE);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(BOARD_SIZE * CELL_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed pieces
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = gameBoard[row][col];
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            
            if (cell.piece) {
                // Draw piece background (darker for locked pieces)
                ctx.fillStyle = cell.isLocked ? '#495057' : '#adb5bd';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Highlight locked pieces with a border
                if (cell.isLocked) {
                    ctx.strokeStyle = '#212529';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                }
                
                // Get the piece's current rotation (default to 0 for now)
                const rotation = cell.piece.currentRotation || 0;
                const edges = cell.piece.rotations[rotation];
                
                if (edges) {
                    // Draw edge connectors for locked pieces
                    drawEdgeConnectors(ctx, x, y, CELL_SIZE, edges.shape, cell.isLocked);
                    
                    // Draw piece ID (smaller for locked pieces)
                    ctx.fillStyle = cell.isLocked ? '#ffffff' : '#212529';
                    ctx.font = cell.isLocked ? '9px Arial' : '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(cell.piece.id.replace('piece_', ''), 
                        x + CELL_SIZE/2, 
                        y + CELL_SIZE/2);
                    
                    // Draw edge code for debugging
                    if (cell.isLocked) {
                        ctx.font = '8px monospace';
                        ctx.fillStyle = '#ffd8a8';
                        ctx.fillText(edges.visualCode, 
                            x + CELL_SIZE/2, 
                            y + CELL_SIZE/2 + 10);
                    }
                }
            }
        }
    }
}

// New function to draw edge connectors
function drawEdgeConnectors(ctx, x, y, size, edges, isLocked = false) {
    const connectorSize = size / 5;
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Draw each edge connector
    // Top edge (index 0)
    if (edges[0] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d'; // Orange for Jack
        ctx.beginPath();
        ctx.arc(centerX, y + connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[0] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc'; // Blue for Nest
        ctx.beginPath();
        ctx.arc(centerX, y + connectorSize/2, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        // Draw ring for nest
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, y + connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Right edge (index 1)
    if (edges[1] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(x + size - connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[1] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(x + size - connectorSize/2, centerY, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + size - connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Bottom edge (index 2)
    if (edges[2] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(centerX, y + size - connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[2] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(centerX, y + size - connectorSize/2, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, y + size - connectorSize/2, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Left edge (index 3)
    if (edges[3] === EDGE_TYPES.JACK) {
        ctx.fillStyle = isLocked ? '#ff922b' : '#ffa94d';
        ctx.beginPath();
        ctx.arc(x + connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else if (edges[3] === EDGE_TYPES.NEST) {
        ctx.fillStyle = isLocked ? '#4dabf7' : '#74c0fc';
        ctx.beginPath();
        ctx.arc(x + connectorSize/2, centerY, connectorSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLocked ? '#1c7ed6' : '#339af0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + connectorSize/2, centerY, connectorSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw flat edges (for border pieces)
    edges.forEach((edge, index) => {
        if (edge === EDGE_TYPES.FLAT) {
            ctx.strokeStyle = isLocked ? '#868e96' : '#adb5bd';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            switch(index) {
                case 0: // Top
                    ctx.moveTo(x + size/3, y);
                    ctx.lineTo(x + 2*size/3, y);
                    break;
                case 1: // Right
                    ctx.moveTo(x + size, y + size/3);
                    ctx.lineTo(x + size, y + 2*size/3);
                    break;
                case 2: // Bottom
                    ctx.moveTo(x + size/3, y + size);
                    ctx.lineTo(x + 2*size/3, y + size);
                    break;
                case 3: // Left
                    ctx.moveTo(x, y + size/3);
                    ctx.lineTo(x, y + 2*size/3);
                    break;
            }
            ctx.stroke();
        }
    });
}
// 6. Place random locked pieces
function placeLockedPieces() {
    const numLocked = 18; // ~1.5 per row
    
    for (let i = 0; i < numLocked; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 50) {
            attempts++;
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            
            // Skip if already occupied
            if (gameBoard[row][col].piece) continue;
            
            // Determine piece type based on position
            let pieceType;
            if ((row === 0 || row === BOARD_SIZE-1) && 
                (col === 0 || col === BOARD_SIZE-1)) {
                pieceType = 'corner';
            } else if (row === 0 || row === BOARD_SIZE-1 || 
                       col === 0 || col === BOARD_SIZE-1) {
                pieceType = 'border';
            } else {
                pieceType = 'field';
            }
            
            // Find an unplaced piece of this type
            const availablePieces = allPieces.filter(p => 
                !p.isPlaced && p.type === pieceType
            );
            
            if (availablePieces.length > 0) {
                const piece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
                piece.isPlaced = true;
                
                gameBoard[row][col].piece = piece;
                gameBoard[row][col].isLocked = true;
                placed = true;
            }
        }
    }
    
    // Update piece bank (unplaced pieces)
    pieceBank = allPieces.filter(p => !p.isPlaced);
    
    // Update displays
    drawBoard();
    updateCounters();
}

// 7. Update counters display
function updateCounters() {
    const placedCount = allPieces.filter(p => p.isPlaced).length;
    const lockedCount = allPieces.filter(p => p.isLocked).length;
    const bankCount = pieceBank.length;
    
    console.log(`Placed: ${placedCount}, Locked: ${lockedCount}, Bank: ${bankCount}`);
}

// ========== CONTROL FUNCTIONS ==========

function generatePieces() {
    generateAllPieces();
    createEmptyBoard();
    displayPieces();
    drawBoard();
    pieceBank = [...allPieces]; // Start with all pieces in bank
    updateCounters();
    console.log("Generated 144 pieces");
}

function clearBoard() {
    createEmptyBoard();
    allPieces.forEach(p => {
        p.isPlaced = false;
        p.isLocked = false;
    });
    pieceBank = [...allPieces];
    drawBoard();
    updateCounters();
    console.log("Board cleared");
}

function startDrag(e) {
    const canvas = e.target;
    const pieceId = canvas.dataset.pieceId;
    draggedPiece = allPieces.find(p => p.id === pieceId);
    
    if (!draggedPiece) return;
    
    // Calculate offset from mouse to piece center
    const rect = canvas.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Create floating drag image
    createDragImage(draggedPiece, e.clientX, e.clientY);
    
    // Add global listeners
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    
    e.preventDefault();
}

function createDragImage(piece, x, y) {
    // Remove existing drag image
    const old = document.getElementById('dragImage');
    if (old) old.remove();
    
    // Create new drag image
    const dragImg = document.createElement('canvas');
    dragImg.id = 'dragImage';
    dragImg.width = CELL_SIZE;
    dragImg.height = CELL_SIZE;
    dragImg.style.cssText = `
        position: fixed;
        left: ${x - CELL_SIZE/2}px;
        top: ${y - CELL_SIZE/2}px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.8;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    `;
    
    // Draw piece on drag image
    const ctx = dragImg.getContext('2d');
    drawPieceOnCanvas(ctx, piece, 0, 0, CELL_SIZE, currentRotation, false);
    
    document.body.appendChild(dragImg);
}

function doDrag(e) {
    if (!draggedPiece) return;
    
    const dragImg = document.getElementById('dragImage');
    if (dragImg) {
        dragImg.style.left = `${e.clientX - CELL_SIZE/2}px`;
        dragImg.style.top = `${e.clientY - CELL_SIZE/2}px`;
    }
    
    // Highlight valid drop targets
    highlightValidCells(e.clientX, e.clientY);
}

function endDrag(e) {
    if (!draggedPiece) return;
    
    // Try to place the piece
    const success = tryPlacePiece(e.clientX, e.clientY);
    
    // Clean up
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', endDrag);
    
    const dragImg = document.getElementById('dragImage');
    if (dragImg) dragImg.remove();
    
    clearHighlights();
    
    if (success) {
        // Update displays
        displayPieces();
        drawBoard();
        updateCounters();
    }
    
    draggedPiece = null;
    currentRotation = 0;
}

function edgesCompatible(edge1, edge2) {
    // Jack connects only to Nest, and vice versa
    return (edge1 === EDGE_TYPES.JACK && edge2 === EDGE_TYPES.NEST) ||
           (edge1 === EDGE_TYPES.NEST && edge2 === EDGE_TYPES.JACK);
}

function canPlacePiece(piece, row, col, rotation) {
    // Check if cell is empty
    if (gameBoard[row][col].piece) return false;
    
    const edges = piece.rotations[rotation].shape;
    
    // Check all 4 neighbors
    const neighbors = [
        { dir: 'top', row: row-1, col: col, myEdge: edges[0], theirEdge: 'bottom' },
        { dir: 'right', row: row, col: col+1, myEdge: edges[1], theirEdge: 'left' },
        { dir: 'bottom', row: row+1, col: col, myEdge: edges[2], theirEdge: 'top' },
        { dir: 'left', row: row, col: col-1, myEdge: edges[3], theirEdge: 'right' }
    ];
    
    for (const n of neighbors) {
        const { row: nRow, col: nCol, myEdge, theirEdge } = n;
        
        // Check borders
        if (nRow < 0 || nRow >= BOARD_SIZE || nCol < 0 || nCol >= BOARD_SIZE) {
            // At border: my edge must be FLAT
            if (myEdge !== EDGE_TYPES.FLAT) return false;
            continue;
        }
        
        const neighborCell = gameBoard[nRow][nCol];
        
        if (neighborCell.piece) {
            // Get neighbor's edge
            const neighborPiece = neighborCell.piece;
            const neighborRotation = neighborPiece.currentRotation || 0;
            const neighborEdges = neighborPiece.rotations[neighborRotation].shape;
            
            const neighborEdgeIndex = ['top', 'right', 'bottom', 'left'].indexOf(theirEdge);
            const theirEdgeType = neighborEdges[neighborEdgeIndex];
            
            // Both edges must be connectors (not FLAT) and compatible
            if (myEdge === EDGE_TYPES.FLAT || theirEdgeType === EDGE_TYPES.FLAT) {
                return false;
            }
            
            if (!edgesCompatible(myEdge, theirEdgeType)) {
                return false;
            }
        }
    }
    
    return true;
}

function tryPlacePiece(mouseX, mouseY) {
    if (!draggedPiece) return false;
    
    const canvas = document.getElementById('boardCanvas');
    const rect = canvas.getBoundingClientRect();
    
    // Convert mouse to grid coordinates
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;
    
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    
    // Validate coordinates
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        console.log("Outside board");
        return false;
    }
    
    // Check if placement is valid
    if (!canPlacePiece(draggedPiece, row, col, currentRotation)) {
        console.log("Cannot place here - edges don't match!");
        return false;
    }
    
    // Place the piece
    draggedPiece.isPlaced = true;
    draggedPiece.currentRotation = currentRotation;
    draggedPiece.placedAt = { row, col };
    
    gameBoard[row][col].piece = draggedPiece;
    gameBoard[row][col].color = 0; // Will be determined by 0h h1 rules later
    
    console.log(`Placed ${draggedPiece.id} at (${row}, ${col}) rotation ${currentRotation * 90}°`);
    return true;
}

function rotatePieceInBank(piece) {
    // Just update rotation for next drag
    currentRotation = (currentRotation + 1) % 4;
    console.log(`Piece ${piece.id} rotation: ${currentRotation * 90}°`);
}

function highlightValidCells(mouseX, mouseY) {
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Clear previous highlights
    clearHighlights();
    
    // Check each cell
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            
            // Check if mouse is over this cell
            const inCell = (
                mouseX >= rect.left + x &&
                mouseX <= rect.left + x + CELL_SIZE &&
                mouseY >= rect.top + y &&
                mouseY <= rect.top + y + CELL_SIZE
            );
            
            if (inCell && draggedPiece) {
                // Check if placement here would be valid
                const isValid = canPlacePiece(draggedPiece, row, col, currentRotation);
                
                // Draw highlight
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = isValid ? '#51cf66' : '#ff6b6b';
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Draw rotation indicator
                ctx.globalAlpha = 1;
                ctx.fillStyle = isValid ? '#2b8a3e' : '#c92a2a';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${currentRotation * 90}°`, x + CELL_SIZE/2, y + CELL_SIZE/2);
                ctx.restore();
            }
        }
    }
}

function clearHighlights() {
    // Redraw the board to clear highlights
    drawBoard();
}

// ========== INITIALIZATION ==========
window.onload = function() {
    console.log("Page loaded - initializing...");
    generatePieces();
};

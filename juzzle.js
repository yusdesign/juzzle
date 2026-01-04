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
    
    container.innerHTML = '';
    
    allPieces.forEach((piece, index) => {
        const div = document.createElement('div');
        div.className = `piece ${piece.type}`;
        div.title = `ID: ${piece.id}, Type: ${piece.type}`;
        
        // Show visual code for first rotation
        if (piece.rotations && piece.rotations[0]) {
            div.textContent = piece.rotations[0].visualCode;
        }
        
        // Color code by type
        div.style.backgroundColor = 
            piece.type === 'corner' ? '#ffeaa7' :
            piece.type === 'border' ? '#a29bfe' : '#fd79a8';
        
        container.appendChild(div);
    });
}

// 5. Draw the game board
function drawBoard() {
    const canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#ddd';
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
            
            if (cell.piece) {
                // Draw piece background
                ctx.fillStyle = cell.isLocked ? '#333' : '#666';
                ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                
                // Draw piece ID
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(cell.piece.id, 
                    col * CELL_SIZE + CELL_SIZE/2, 
                    row * CELL_SIZE + CELL_SIZE/2);
            }
        }
    }
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

// ========== INITIALIZATION ==========
window.onload = function() {
    console.log("Page loaded - initializing...");
    generatePieces();
};

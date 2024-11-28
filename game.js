class TycerineGame {
    constructor() {
        this.board = Array(9).fill().map(() => Array(7).fill(null));
        this.currentPlayer = 'X';
        this.moveHistory = [];
        this.PIECE_TYPES = {
            PAWN: { name: 'Pawn', ap: 1, dp: 1 },
            DEFENDER: { name: 'Defender', ap: 2, dp: 4 },
            HOPPER: { name: 'Hopper', ap: 3, dp: 3 },
            FORTRESS_X: { name: 'Fortress_X', ap: 3, dp: 3, symbol: '✱' },
            FORTRESS_O: { name: 'Fortress_O', ap: 3, dp: 3, symbol: '⊕' }
        };
        this.fusionMode = false;
        this.selectedPiece = null;
        this.selectedHopper = null;
        this.hopperMoving = false;
        this.roomNumber = null; // 存储房间号码
        this.initialize();
    }

    initialize() {
        this.createBoard();
        this.setupEventListeners();
        this.setInitialState();
    }

    createBoard() {
        const boardElement = document.getElementById('board');
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row + 1;
                cell.dataset.col = String.fromCharCode(65 + col);
                boardElement.appendChild(cell);
            }
        }
    }

    setInitialState() {
        // 清除所有格子的状态
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active');
            cell.innerHTML = '';
        });
        
        // 放置堡垒
        this.placePiece(9, 'D', 'X', 'FORTRESS_X');  // 蓝方堡垒在底部
        this.placePiece(1, 'D', 'O', 'FORTRESS_O');  // 红方堡垒在顶部
        
        // 根据当前玩家设置初始活动格子
        const activeCells = this.getActiveCellsForPlayer(this.currentPlayer);
        this.setActiveCells(activeCells);
        
        document.getElementById('turn-indicator').textContent = `${this.currentPlayer}'s turn`;
    }

    setActiveCells(positions) {
        positions.forEach(([row, col]) => {
            const cell = document.querySelector(
                `.cell[data-row="${row}"][data-col="${col}"]`
            );
            if (cell) {
                cell.classList.add('active');
            }
        });
    }

    placePiece(row, colLetter, player, type = 'PAWN') {
        const cell = document.querySelector(
            `.cell[data-row="${row}"][data-col="${colLetter}"]`
        );
        if (cell) {
            // 清除现有内容
            cell.innerHTML = '';
            
            // 创建棋子元素
            const piece = document.createElement('div');
            
            // 根据类型设置类名
            if (type.includes('FORTRESS')) {
                piece.className = `piece fortress player-${player.toLowerCase()}`;
            } else {
                piece.className = `piece ${type.toLowerCase()} player-${player.toLowerCase()}`;
            }
            
            cell.appendChild(piece);
            
            const colIndex = colLetter.charCodeAt(0) - 65;
            this.board[row-1][colIndex] = {
                player: player,
                type: type
            };
        }
    }

    setupEventListeners() {
        document.getElementById('board').addEventListener('click', (e) => {
            let targetCell;
            if (e.target.classList.contains('piece')) {
                // 如果点击的是棋子，获取其父元素（格子）
                targetCell = e.target.parentElement;
            } else if (e.target.classList.contains('cell')) {
                targetCell = e.target;
            }

            if (targetCell) {
                const row = parseInt(targetCell.dataset.row);
                const col = targetCell.dataset.col;
                const piece = this.getPieceAt(row, col);

                if (this.hopperMoving && piece?.type === 'HOPPER' && piece?.player === this.currentPlayer) {
                    // 退出Hopper移动状态
                    this.hopperMoving = false;
                    this.updateActiveCells(); // 恢复可放置状态
                } else if (this.hopperMoving) {
                    // 移动Hopper
                    if (targetCell.classList.contains('active')) {
                        this.moveHopper(targetCell);
                    }
                } else if (piece?.type === 'HOPPER' && piece?.player === this.currentPlayer) {
                    // 选择Hopper进入移动状态
                    this.selectedHopper = { row, col };
                    this.hopperMoving = true;
                    this.showHopperMoves(row, col);
                } else if (targetCell.classList.contains('active')) {
                    // 处理其他棋子的放置
                    this.handleMove(targetCell);
                }
            }
        });

        document.getElementById('new-game').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('undo').addEventListener('click', () => {
            this.undoMove();
        });

        document.getElementById('forfeit').addEventListener('click', () => {
            this.forfeitGame();
        });

        document.getElementById('fusion').addEventListener('click', () => {
            this.toggleFusionMode();
        });

        // 添加制作信息按钮事件监听器
        document.getElementById('credits').addEventListener('click', () => {
            document.getElementById('creditsModal').style.display = 'block';
        });

        // 添加关闭模态框的事件监听器
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('creditsModal').style.display = 'none';
        });

        // 点击模态框外部关闭模态框
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('creditsModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // 创建房间按钮事件监听器
        document.getElementById('create-room').addEventListener('click', () => {
            this.createRoom();
        });

        // 加入房间按钮事件监听器
        document.getElementById('join-room').addEventListener('click', () => {
            this.showRoomModal();
        });

        // 创建房间逻辑
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.createRoom();
        });

        // 加入房间逻辑
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.joinRoom();
        });

        // 关闭房间模态框
        document.getElementById('closeRoomModal').addEventListener('click', () => {
            document.getElementById('roomModal').style.display = 'none';
        });

        // 点击模态框外部关闭模态框
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('roomModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    handleMove(cell) {
        const row = parseInt(cell.dataset.row);
        const col = cell.dataset.col;
        
        if (this.fusionMode) {
            if (cell.classList.contains('active')) {
                if (!this.selectedPiece) {
                    // 第一次点击：选择合成中心
                    if (this.checkDefenderFusion(row, col) || this.checkHopperFusion(row, col)) {
                        this.selectedPiece = {row, col};
                        this.highlightFusionTargets(row, col);
                    }
                } else {
                    // 第二次点击：执行合成并结束回合
                    // 检查目标位置是否在中心棋子的九宫格范围内
                    const centerRow = this.selectedPiece.row;
                    const centerCol = this.selectedPiece.col.charCodeAt(0) - 65;
                    const targetColIndex = col.charCodeAt(0) - 65;
                    
                    if (Math.abs(row - centerRow) <= 1 && Math.abs(targetColIndex - centerCol) <= 1) {
                        if (this.checkDefenderFusion(this.selectedPiece.row, this.selectedPiece.col)) {
                            this.fuseToDefender(this.selectedPiece.row, this.selectedPiece.col, row, col);
                        } else if (this.checkHopperFusion(this.selectedPiece.row, this.selectedPiece.col)) {
                            this.fuseToHopper(this.selectedPiece.row, this.selectedPiece.col, row, col);
                        }
                        
                        // 结束合成模式并切换玩家
                        this.fusionMode = false;
                        document.getElementById('fusion').style.backgroundColor = '';
                        this.selectedPiece = null;
                        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
                        document.getElementById('turn-indicator').textContent = 
                            `${this.currentPlayer}'s turn`;
                        this.updateActiveCells();
                    }
                }
            }
        } else {
            if (this.isValidMove(row, col)) {
                this.addLog(`${this.currentPlayer}方在${col}${row}放置了一个Pawn`, `player-${this.currentPlayer.toLowerCase()}`);
                
                // 保存移动前的完整棋盘状态
                this.moveHistory.push({
                    board: this.board.map(row => [...row]),
                    player: this.currentPlayer,
                    moveType: 'place',
                    position: {row, col}
                });
                
                this.placePiece(row, col, this.currentPlayer, 'PAWN');
                
                // 检查是否可以立即合
                let fusionExecuted = false;
                if (this.checkDefenderFusion(row, col)) {
                    const shouldFuse = confirm('可以合成 Defender，是否立即合成？');
                    if (shouldFuse) {
                        // 使用记录的合成中心点
                        this.fuseToDefender(
                            this.fusionCenter.row,
                            this.fusionCenter.col,
                            this.fusionCenter.row,
                            this.fusionCenter.col
                        );
                        fusionExecuted = true;
                    }
                }
                if (!fusionExecuted && this.checkHopperFusion(row, col)) {
                    const shouldFuse = confirm('可以合成 Hopper，是否立即合成？');
                    if (shouldFuse) {
                        // 在当前位置合成Hopper
                        this.fuseToHopper(row, col, row, col);
                        fusionExecuted = true;
                    }
                }
                
                if (!fusionExecuted) {
                    // 如果没有执行合成，则检查战斗
                    this.checkForBattle(row, col);
                } else {
                    // 如果执行了合成，直接切换玩家
                    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
                    document.getElementById('turn-indicator').textContent = 
                        `${this.currentPlayer}'s turn`;
                    this.updateActiveCells();
                }
            }
        }
    }

    isValidMove(row, col) {
        const colIndex = col.charCodeAt(0) - 65;
        return this.board[row-1][colIndex] === null && 
               document.querySelector(
                   `.cell[data-row="${row}"][data-col="${col}"]`
               ).classList.contains('active');
    }

    updateActiveCells(lastRow, lastCol) {
        // 清除所有活动状态
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active');
        });
        
        // 获取所有当前玩家的棋子位置
        const playerPieces = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 7; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === this.currentPlayer) {
                    playerPieces.push({
                        row: row + 1,
                        col: String.fromCharCode(65 + col),
                        type: piece.type
                    });
                }
            }
        }

        // 收集所有可放置位置
        const validPositions = new Set();
        
        playerPieces.forEach(piece => {
            // 获取行军位置（前方）
            const marchPositions = this.getFrontPositions(piece.row, piece.col);
            marchPositions.forEach(pos => {
                validPositions.add(`${pos[0]},${pos[1]}`);
            });
            
            // 获取筑防位置（后方和左右）
            const fortifyPositions = this.getFortifyPositions(piece.row, piece.col);
            fortifyPositions.forEach(pos => {
                validPositions.add(`${pos[0]},${pos[1]}`);
            });
        });

        // 设置活动格子
        validPositions.forEach(posStr => {
            const [row, col] = posStr.split(',');
            const cell = document.querySelector(
                `.cell[data-row="${row}"][data-col="${col}"]`
            );
            if (cell) {
                cell.classList.add('active');
            }
        });
    }

    resetGame() {
        this.board = Array(9).fill().map(() => Array(7).fill(null));
        this.currentPlayer = 'X';
        this.moveHistory = [];
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.className = 'cell';
        });
        
        this.setInitialState();
    }

    undoMove() {
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory.pop();
            
            // 检查最后一步是否为合成操作
            if (lastMove.moveType === 'fusion') {
                const { from, to } = lastMove;
                const centerPiece = this.getPieceAt(from.row, from.col);
                const targetPiece = this.getPieceAt(to.row, to.col);
                
                // 归还被合成的棋子
                if (centerPiece) {
                    this.placePiece(from.row, from.col, centerPiece.player, centerPiece.type);
                }
                if (targetPiece) {
                    this.placePiece(to.row, to.col, targetPiece.player, targetPiece.type);
                }
                
                // 恢复当前玩家为合成操作的玩家
                this.currentPlayer = lastMove.player;
                document.getElementById('turn-indicator').textContent = 
                    `${this.currentPlayer}'s turn`;
                
                // 更新可用格子
                this.updateActiveCells();
            } else {
                // 处理其他类型的撤销（如移动）
                this.board = lastMove.board.map(row => [...row]);
                document.querySelectorAll('.cell').forEach(cell => {
                    cell.innerHTML = '';
                    const row = parseInt(cell.dataset.row);
                    const col = cell.dataset.col;
                    const piece = this.getPieceAt(row, col);
                    if (piece) {
                        this.placePiece(row, col, piece.player, piece.type);
                    }
                });
                
                // 恢复当前玩家
                this.currentPlayer = lastMove.player;
                document.getElementById('turn-indicator').textContent = 
                    `${this.currentPlayer}'s turn`;
                
                // 更新可用格子
                this.updateActiveCells();
            }
        }
    }

    forfeitGame() {
        const winner = this.currentPlayer === 'X' ? 'O' : 'X';
        alert(`${winner} wins by forfeit!`);
        this.resetGame();
    }

    move(fromPiece, type) {
        const row = parseInt(fromPiece.dataset.row);
        const col = fromPiece.dataset.col;
        
        // 根据类型获取有效位置
        const validPositions = type === 'march' ? this.getFrontPositions(row, col) : this.getFortifyPositions(row, col);
        this.setActiveCells(validPositions);
    }

    march(fromPiece) {
        this.move(fromPiece, 'march');
    }

    fortify(fromPiece) {
        this.move(fromPiece, 'fortify');
    }

    getFrontPositions(row, col) {
        const positions = [];
        const colIndex = col.charCodeAt(0) - 65;
        const direction = this.currentPlayer === 'X' ? 1 : -1; // X向上，O向下
        
        // 只检查正前方的九宫格位置
        const targetRow = row + direction;
        
        // 确保目标行在棋盘范围内
        if (targetRow > 0 && targetRow <= 9) {
            // 检查九宫格范围（左中右三格）
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (c >= 0 && c < 7 && !this.board[targetRow-1][c]) {
                    positions.push([targetRow, String.fromCharCode(65 + c)]);
                }
            }
        }
        
        return positions;
    }

    getFortifyPositions(row, col) {
        const positions = [];
        const colIndex = col.charCodeAt(0) - 65;
        const direction = this.currentPlayer === 'X' ? -1 : 1; // 与行军相反方向
        
        // 检查后方的九宫格位置
        const targetRow = row + direction;
        
        // 确保目标行在棋盘范围内
        if (targetRow > 0 && targetRow <= 9) {
            // 检查九宫格范围（左中右三格）
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (c >= 0 && c < 7 && !this.board[targetRow-1][c]) {
                    positions.push([targetRow, String.fromCharCode(65 + c)]);
                }
            }
        }
        
        // 检查左右位置（当前行）
        [-1, 1].forEach(offset => {
            const newCol = colIndex + offset;
            if (newCol >= 0 && newCol < 7 && !this.board[row-1][newCol]) {
                positions.push([row, String.fromCharCode(65 + newCol)]);
            }
        });
        
        return positions;
    }

    checkDefenderFusion(row, col) {
        const colIndex = col.charCodeAt(0) - 65;
        
        // 检查当前位置是否为新放置的棋子
        const currentPiece = this.getPieceAt(row, col);
        if (!currentPiece || currentPiece.type !== 'PAWN' || currentPiece.player !== this.currentPlayer) {
            return false;
        }
        
        // 检查十字形状
        const directions = [
            [0, 0],   // 中心
            [-1, 0],  // 上
            [1, 0],   // 下
            [0, -1],  // 左
            [0, 1]    // 右
        ];
        
        // 检查每个可能的十字位置
        for (let centerRow = row - 1; centerRow <= row + 1; centerRow++) {
            for (let centerCol = colIndex - 1; centerCol <= colIndex + 1; centerCol++) {
                let validCross = true;
                let pawnsCount = 0;
                
                // 检查从这个中心点出发的十字形状
                for (const [dr, dc] of directions) {
                    const checkRow = centerRow + dr;
                    const checkCol = centerCol + dc;
                    
                    if (checkRow >= 0 && checkRow < 9 && checkCol >= 0 && checkCol < 7) {
                        const piece = this.board[checkRow][checkCol];
                        if (piece?.type === 'PAWN' && piece?.player === this.currentPlayer) {
                            pawnsCount++;
                        } else {
                            validCross = false;
                            break;
                        }
                    } else {
                        validCross = false;
                        break;
                    }
                }
                
                if (validCross && pawnsCount === 5) {
                    // 记录合成中心点
                    this.fusionCenter = {
                        row: centerRow + 1,
                        col: String.fromCharCode(65 + centerCol)
                    };
                    return true;
                }
            }
        }
        return false;
    }

    checkHopperFusion(row, col) {
        const colIndex = col.charCodeAt(0) - 65;
        
        // 检查中心是否为当前玩家 Defender
        const centerPiece = this.board[row-1][colIndex];
        if (centerPiece?.type !== 'DEFENDER' || centerPiece?.player !== this.currentPlayer) {
            return false;
        }
        
        // 检查周围8个位置是否都是当前玩家的 Pawn
        let pawnsCount = 0;
        for (let r = row - 2; r <= row; r++) {  // row-2 到 row 对应实际的 row-1 到 row+1
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                // 跳过中心位置
                if (r === row-1 && c === colIndex) continue;
                
                // 检查边界
                if (r >= 0 && r < 9 && c >= 0 && c < 7) {
                    const piece = this.board[r][c];
                    if (piece?.type === 'PAWN' && piece?.player === this.currentPlayer) {
                        pawnsCount++;
                    }
                }
            }
        }
        
        // 需要正好8个 Pawn 围绕 Defender
        return pawnsCount === 8;
    }

    endGame(winner) {
        alert(`游戏结束！${winner} 获胜！`);
        this.resetGame();
    }

    toggleFusionMode() {
        this.fusionMode = !this.fusionMode;
        const fusionBtn = document.getElementById('fusion');
        
        if (this.fusionMode) {
            fusionBtn.style.backgroundColor = '#aaf';
            this.highlightFusionCandidates();
        } else {
            fusionBtn.style.backgroundColor = '';
            this.selectedPiece = null;
            this.updateActiveCells();
        }
    }

    highlightFusionCandidates() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active');
        });

        for (let row = 1; row <= 9; row++) {
            for (let col = 0; col < 7; col++) {
                const colLetter = String.fromCharCode(65 + col);
                if (this.checkDefenderFusion(row, colLetter) || 
                    this.checkHopperFusion(row, colLetter)) {
                    const cell = document.querySelector(
                        `.cell[data-row="${row}"][data-col="${colLetter}"]`
                    );
                    if (cell) {
                        cell.classList.add('active');
                    }
                }
            }
        }
    }

    highlightFusionTargets(row, col) {
        // 清除所有活动状态
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active');
        });

        // 高亮显示中心棋子九宫格范围内的所有位置（包括有棋子的位置）
        const colIndex = col.charCodeAt(0) - 65;
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (r > 0 && r <= 9 && c >= 0 && c < 7) {
                    const cell = document.querySelector(
                        `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                    );
                    if (cell) {
                        cell.classList.add('active');
                    }
                }
            }
        }
    }

    fuseToDefender(centerRow, centerCol, targetRow, targetCol) {
        const centerColIndex = centerCol.charCodeAt(0) - 65;
        const directions = [[0,0], [-1,0], [1,0], [0,-1], [0,1]];
        
        // 移除构成十字的所有 Pawn
        directions.forEach(([dr, dc]) => {
            const newRow = centerRow + dr;
            const newCol = centerColIndex + dc;
            if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 7) {
                const cell = document.querySelector(
                    `.cell[data-row="${newRow}"][data-col="${String.fromCharCode(65 + newCol)}"]`
                );
                if (cell) {
                    cell.innerHTML = '';
                    this.board[newRow-1][newCol] = null;
                }
            }
        });
        
        // 在目标位置放置 Defender
        this.placePiece(targetRow, targetCol, this.currentPlayer, 'DEFENDER');
        this.addLog(`${this.currentPlayer}方执行了Defender合成`, `player-${this.currentPlayer.toLowerCase()}`);
    }

    fuseToHopper(centerRow, centerCol, targetRow, targetCol) {
        const centerColIndex = centerCol.charCodeAt(0) - 65;
        
        // 移除九宫格内的所有棋子
        for (let r = centerRow - 1; r <= centerRow + 1; r++) {
            for (let c = centerColIndex - 1; c <= centerColIndex + 1; c++) {
                if (r >= 0 && r < 9 && c >= 0 && c < 7) {
                    const cell = document.querySelector(
                        `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                    );
                    if (cell) {
                        cell.innerHTML = '';
                        this.board[r-1][c] = null;
                    }
                }
            }
        }
        
        // 在目标位置放置 Hopper
        this.placePiece(targetRow, targetCol, this.currentPlayer, 'HOPPER');
        this.addLog(`${this.currentPlayer}方执行了Hopper合成`, `player-${this.currentPlayer.toLowerCase()}`);
    }

    // 获取指定位置的棋子
    getPieceAt(row, col) {
        const colIndex = col.charCodeAt(0) - 65;
        return this.board[row-1][colIndex];
    }

    // 选择Hopper
    selectHopper(cell) {
        const row = parseInt(cell.dataset.row);
        const col = cell.dataset.col;
        this.selectedHopper = {row, col};
        
        // 显示Hopper九宫格可移动范围
        this.showHopperMoves(row, col);
    }

    // 显示Hopper的可移动范围
    showHopperMoves(row, col) {
        // 清除所有活动状态
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active');
        });

        const colIndex = col.charCodeAt(0) - 65;
        // 显示九宫格范围内的空格子
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (r > 0 && r <= 9 && c >= 0 && c < 7) {
                    const cell = document.querySelector(
                        `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                    );
                    if (cell) {
                        cell.classList.add('active');
                    }
                }
            }
        }
    }

    // 移动Hopper
    moveHopper(targetCell) {
        const targetRow = parseInt(targetCell.dataset.row);
        const targetCol = targetCell.dataset.col;
        const sourceRow = this.selectedHopper.row;
        const sourceCol = this.selectedHopper.col;

        // 保存移动前的完整棋盘状态
        this.moveHistory.push({
            board: this.board.map(row => [...row]),
            player: this.currentPlayer,
            moveType: 'hopper',
            from: {row: sourceRow, col: sourceCol},
            to: {row: targetRow, col: targetCol}
        });

        // 移动Hopper
        const piece = this.getPieceAt(sourceRow, sourceCol);
        this.board[sourceRow-1][sourceCol.charCodeAt(0)-65] = null;
        document.querySelector(
            `.cell[data-row="${sourceRow}"][data-col="${sourceCol}"]`
        ).innerHTML = '';
        
        // 检查目标格子是否有棋子
        const targetPiece = this.getPieceAt(targetRow, targetCol);
        if (targetPiece) {
            // 交换位置
            this.board[targetRow - 1][targetCol.charCodeAt(0) - 65] = piece;
            this.board[sourceRow - 1][sourceCol.charCodeAt(0) - 65] = targetPiece;
            this.placePiece(targetRow, targetCol, this.currentPlayer, 'HOPPER');
            this.placePiece(sourceRow, sourceCol, targetPiece.player, targetPiece.type);
        } else {
            // 直接移动
            this.placePiece(targetRow, targetCol, this.currentPlayer, 'HOPPER');
        }

        // 重置Hopper选择状态
        this.selectedHopper = null;
        this.hopperMoving = false;

        // 检查是否发生战斗
        this.checkForBattle(targetRow, targetCol);
    }

    getActiveCellsForPlayer(player) {
        const positions = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 7; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === player) {
                    // 获取行军位置（前方）
                    positions.push(...this.getFrontPositions(row + 1, String.fromCharCode(65 + col)));
                    // 获取筑防位置（后方和左右）
                    positions.push(...this.getFortifyPositions(row + 1, String.fromCharCode(65 + col)));
                }
            }
        }
        return positions;
    }

    // 检查是否发生战斗
    checkForBattle(row, col) {
        const colIndex = col.charCodeAt(0) - 65;
        const attackerPiece = this.getPieceAt(row, col);
        
        // 收集所有被攻击的棋子位置（只检查上下左右）
        const defenders = [];
        const directions = [
            [-1, 0], // 上
            [1, 0],  // 下
            [0, -1], // 左
            [0, 1]   // 右
        ];

        // 检查四个方向是否有敌方棋子
        directions.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = colIndex + dc;

            if (newRow >= 1 && newRow <= 9 && newCol >= 0 && newCol < 7) {
                const defenderPiece = this.getPieceAt(newRow, String.fromCharCode(65 + newCol));
                if (defenderPiece && defenderPiece.player !== attackerPiece.player) {
                    defenders.push({
                        row: newRow,
                        col: String.fromCharCode(65 + newCol)
                    });
                }
            }
        });

        if (defenders.length > 0) {
            // 发生战斗
            this.resolveBattle({row, col}, defenders);
        } else {
            // 没有发生战斗，切换玩家
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            document.getElementById('turn-indicator').textContent = 
                `${this.currentPlayer}'s turn`;
            this.updateActiveCells();
        }
    }

    // 处理战斗
    resolveBattle(attacker, defenders) {
        const attackPower = this.calculateAttackPower(attacker);
        const defensePower = this.calculateDefensePower(defenders);
        
        this.addLog(`战斗发生！`, 'battle');
        this.addLog(`攻击方(${this.currentPlayer})攻击力: ${attackPower}`, `player-${this.currentPlayer.toLowerCase()}`);
        this.addLog(`防守方防御力: ${defensePower}`, `player-${this.currentPlayer === 'X' ? 'o' : 'x'}`);

        if (attackPower === defensePower) {
            this.addLog('双方势均力敌，所有相关棋子被移除', 'battle');
            // 移除所有相关棋子
            this.removeNineGridPieces(attacker);
            defenders.forEach(defender => {
                this.removeNineGridPieces(defender);
            });
        } else if (attackPower > defensePower) {
            this.addLog('攻击方胜利，防守方棋子被移除', 'battle');
            // 只移除防守方的棋子，保留攻击方的棋子
            defenders.forEach(defender => {
                this.removeNineGridPiecesExceptAttacker(defender, attacker);
            });
        } else {
            this.addLog('防守方胜利，攻击方棋子被移除', 'battle');
            // 移除攻击方的棋子，保留防守方的棋子
            this.removeNineGridPiecesExceptDefenders(attacker, defenders);
        }

        // 战斗结束后切换玩家
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        document.getElementById('turn-indicator').textContent = 
            `${this.currentPlayer}'s turn`;
        this.updateActiveCells();
    }

    // 计算攻击力（不包括中心棋子）
    calculateAttackPower(attacker) {
        let power = 0;
        const row = attacker.row;
        const colIndex = attacker.col.charCodeAt(0) - 65;

        // 遍历九宫格
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                // 跳过中心棋子
                if (r === row && c === colIndex) continue;
                
                if (r >= 1 && r <= 9 && c >= 0 && c < 7) {
                    const piece = this.getPieceAt(r, String.fromCharCode(65 + c));
                    if (piece && piece.player === this.currentPlayer) {
                        console.log(`Found attacking piece at ${r},${String.fromCharCode(65 + c)}: ${piece.type}`);
                        power += this.PIECE_TYPES[piece.type].ap;
                    }
                }
            }
        }
        console.log(`Total attack power: ${power}`);
        return power;
    }

    // 计算防御力（不包括中心棋子，避免重复计算）
    calculateDefensePower(defenders) {
        let power = 0;
        const countedPieces = new Set();
        const oppositePlayer = this.currentPlayer === 'X' ? 'O' : 'X';

        defenders.forEach(defender => {
            const row = defender.row;
            const colIndex = defender.col.charCodeAt(0) - 65;

            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                    // 跳过中心棋子
                    if (r === row && c === colIndex) continue;
                    
                    // 跳过其他防守中心棋子
                    if (defenders.some(d => 
                        d.row === r && 
                        d.col.charCodeAt(0) - 65 === c)) continue;

                    if (r >= 1 && r <= 9 && c >= 0 && c < 7) {
                        const pieceKey = `${r},${c}`;
                        if (!countedPieces.has(pieceKey)) {
                            const piece = this.getPieceAt(r, String.fromCharCode(65 + c));
                            if (piece && piece.player === oppositePlayer) {
                                console.log(`Found defending piece at ${r},${String.fromCharCode(65 + c)}: ${piece.type}`);
                                power += this.PIECE_TYPES[piece.type].dp;
                                countedPieces.add(pieceKey);
                            }
                        }
                    }
                }
            }
        });
        console.log(`Total defense power: ${power}`);
        return power;
    }

    // 移除九宫格内的所有棋子
    removeNineGridPieces(center) {
        const row = center.row;
        const colIndex = center.col.charCodeAt(0) - 65;

        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (r >= 1 && r <= 9 && c >= 0 && c < 7) {
                    const piece = this.getPieceAt(r, String.fromCharCode(65 + c));
                    if (piece?.type.includes('FORTRESS')) {
                        // 如果是堡垒，游戏结束
                        const winner = piece.player === 'X' ? 'O' : 'X';
                        this.endGame(winner);
                        return;
                    }
                    
                    this.board[r-1][c] = null;
                    const cell = document.querySelector(
                        `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                    );
                    if (cell) {
                        cell.innerHTML = '';
                    }
                }
            }
        }
        this.addLog(`移除${center.col}${center.row}周围的棋子`, 'battle');
    }

    // 新增方法：移除九宫格内的棋子，但保留攻击方棋子
    removeNineGridPiecesExceptAttacker(center, attacker) {
        const row = center.row;
        const colIndex = center.col.charCodeAt(0) - 65;

        // 移除防守方的棋子，保留攻击方的棋子
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (r >= 1 && r <= 9 && c >= 0 && c < 7) {
                    // 跳过攻击方中心棋子的位置
                    if (r === attacker.row && c === attacker.col.charCodeAt(0) - 65) continue;

                    const piece = this.getPieceAt(r, String.fromCharCode(65 + c));
                    if (piece) {
                        // 只移除防守方的棋子
                        if (piece.player !== this.currentPlayer) {
                            if (piece.type.includes('FORTRESS')) {
                                const winner = piece.player === 'X' ? 'O' : 'X';
                                this.endGame(winner);
                                return;
                            }
                            
                            this.board[r-1][c] = null;
                            const cell = document.querySelector(
                                `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                            );
                            if (cell) {
                                cell.innerHTML = '';
                            }
                        }
                    }
                }
            }
        }
        this.addLog(`移除${center.col}${center.row}周围的防守方棋子`, 'battle');
    }

    // 新增方法：移除九宫格内的棋子，但保留防守方中心棋子
    removeNineGridPiecesExceptDefenders(center, defenders) {
        const row = center.row;
        const colIndex = center.col.charCodeAt(0) - 65;

        // 移除攻击方的中心棋子和九宫格内的攻击方棋子
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (r >= 1 && r <= 9 && c >= 0 && c < 7) {
                    const piece = this.getPieceAt(r, String.fromCharCode(65 + c));
                    if (piece) {
                        // 只移除攻击方的棋子
                        if (piece.player === this.currentPlayer) {
                            if (piece.type.includes('FORTRESS')) {
                                const winner = piece.player === 'X' ? 'O' : 'X';
                                this.endGame(winner);
                                return;
                            }
                            
                            this.board[r-1][c] = null;
                            const cell = document.querySelector(
                                `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                            );
                            if (cell) {
                                cell.innerHTML = '';
                            }
                        }
                    }
                }
            }
        }
        this.addLog(`移除${center.col}${center.row}周围的攻击方棋子`, 'battle');
    }

    // 在TycerineGame类中添加日志方法
    addLog(message, type = 'normal') {
        const logEntries = document.getElementById('logEntries');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        logEntries.appendChild(entry);
        
        // 检查是否在底部
        const isScrolledToBottom = logEntries.scrollHeight - logEntries.clientHeight <= logEntries.scrollTop + 1;
        
        if (isScrolledToBottom) {
            logEntries.scrollTop = logEntries.scrollHeight;
        }
    }

    // 添加标记被移除的棋子位置的方法
    markRemovedPiece(row, col, player) {
        const cell = document.querySelector(
            `.cell[data-row="${row}"][data-col="${String.fromCharCode(65 + col)}"]`
        );
        if (cell) {
            const marker = document.createElement('div');
            marker.className = `removed-marker player-${player.toLowerCase()}`;
            cell.appendChild(marker);
        }
    }

    // 在移除棋子时添加标记
    removeNineGridPieces(center) {
        const row = center.row;
        const colIndex = center.col.charCodeAt(0) - 65;

        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = colIndex - 1; c <= colIndex + 1; c++) {
                if (r >= 1 && r <= 9 && c >= 0 && c < 7) {
                    const piece = this.getPieceAt(r, String.fromCharCode(65 + c));
                    if (piece) {
                        const player = piece.player;
                        this.board[r-1][c] = null;
                        const cell = document.querySelector(
                            `.cell[data-row="${r}"][data-col="${String.fromCharCode(65 + c)}"]`
                        );
                        if (cell) {
                            cell.innerHTML = '';
                            this.markRemovedPiece(r, c, player);
                        }
                    }
                }
            }
        }
        this.addLog(`移除${center.col}${center.row}周围的棋子`, 'battle');
    }

    // 在回合开始时清除所有标记
    updateActiveCells() {
        // 清除所有移除标记
        document.querySelectorAll('.removed-marker').forEach(marker => {
            marker.remove();
        });
        
        // 清除所有活动状态
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('active');
        });
        
        // 获取所有当前玩家的棋子位置
        const playerPieces = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 7; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === this.currentPlayer) {
                    playerPieces.push({
                        row: row + 1,
                        col: String.fromCharCode(65 + col),
                        type: piece.type
                    });
                }
            }
        }

        // 收集所有可放置位置
        const validPositions = new Set();
        
        playerPieces.forEach(piece => {
            // 获取行军位置（前方）
            const marchPositions = this.getFrontPositions(piece.row, piece.col);
            marchPositions.forEach(pos => {
                validPositions.add(`${pos[0]},${pos[1]}`);
            });
            
            // 获取筑防位置（后方和左右）
            const fortifyPositions = this.getFortifyPositions(piece.row, piece.col);
            fortifyPositions.forEach(pos => {
                validPositions.add(`${pos[0]},${pos[1]}`);
            });
        });

        // 设置活动格子
        validPositions.forEach(posStr => {
            const [row, col] = posStr.split(',');
            const cell = document.querySelector(
                `.cell[data-row="${row}"][data-col="${col}"]`
            );
            if (cell) {
                cell.classList.add('active');
            }
        });
    }

    showRoomModal() {
        document.getElementById('roomModal').style.display = 'block';
    }

    createRoom() {
        // 生成一个6位数的房间号码
        this.roomNumber = Math.floor(100000 + Math.random() * 900000);
        document.getElementById('roomNumber').textContent = this.roomNumber;
        alert(`房间创建成功！房间号码: ${this.roomNumber}`);
    }

    joinRoom() {
        const roomInput = document.getElementById('roomInput').value;
        if (roomInput === this.roomNumber.toString()) {
            alert('成功加入房间！');
            // 这里可以添加进入房间后的逻辑
        } else {
            alert('房间号码错误，请重试。');
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new TycerineGame();
}); 
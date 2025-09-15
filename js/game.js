/**
 * Main Game Controller for MemoryMind AI
 * Orchestrates game logic, AI, and UI interactions
 */
class MemoryGame {
    constructor() {
        this.ui = new GameUI();
        this.ai = new MemoryAI('beginner');
        
        // Game state
        this.gameState = {
            cards: [],
            flippedCards: [],
            matchedPairs: [],
            currentPlayer: 'player', // 'player' or 'ai'
            playerScore: 0,
            aiScore: 0,
            moves: 0,
            isGameActive: false,
            difficulty: 'beginner'
        };

        // Game configuration
        this.config = GameUtils.GAME_CONSTANTS.DIFFICULTIES.beginner;
        this.totalPairs = (this.config.rows * this.config.cols) / 2;

        this.bindGameEvents();
        this.loadSettings();
    }

    /**
     * Initialize the game
     */
    init() {
        this.setupNewGame();
        this.ui.updateStatusMessage('Welcome to MemoryMind AI! Click two cards to start.');
    }

    /**
     * Bind game-specific events
     */
    bindGameEvents() {
        GameUtils.eventEmitter.on('cardClicked', (cardIndex) => {
            this.handleCardClick(cardIndex);
        });

        GameUtils.eventEmitter.on('restartGame', () => {
            this.setupNewGame();
        });

        GameUtils.eventEmitter.on('difficultyChanged', (difficulty) => {
            this.changeDifficulty(difficulty);
        });
    }

    /**
     * Load saved settings from localStorage
     */
    loadSettings() {
        const savedDifficulty = GameUtils.storage.load(
            GameUtils.GAME_CONSTANTS.STORAGE_KEYS.difficulty, 
            'beginner'
        );
        
        if (savedDifficulty !== this.gameState.difficulty) {
            this.changeDifficulty(savedDifficulty);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        GameUtils.storage.save(
            GameUtils.GAME_CONSTANTS.STORAGE_KEYS.difficulty, 
            this.gameState.difficulty
        );
    }

    /**
     * Setup a new game
     */
    setupNewGame() {
        // Reset game state
        this.gameState = {
            ...this.gameState,
            cards: [],
            flippedCards: [],
            matchedPairs: [],
            currentPlayer: 'player',
            playerScore: 0,
            aiScore: 0,
            moves: 0,
            isGameActive: true
        };

        // Reset AI
        this.ai.reset();

        // Generate cards
        this.generateCards();

        // Reset UI
        this.ui.reset();
        this.ui.createGameBoard(this.config.rows, this.config.cols, this.gameState.cards);
        this.ui.updateTurnIndicator(this.gameState.currentPlayer);
        this.ui.updateStats({
            moves: 0,
            matches: 0,
            totalPairs: this.totalPairs,
            difficulty: this.gameState.difficulty
        });
        this.ui.updateAIStatus(this.ai.getStats());

        // Start timer
        this.ui.startTimer();

        console.log('New game started:', {
            difficulty: this.gameState.difficulty,
            gridSize: `${this.config.rows}x${this.config.cols}`,
            totalPairs: this.totalPairs
        });
    }

    /**
     * Generate cards for the game
     */
    generateCards() {
        const symbols = GameUtils.GAME_CONSTANTS.SYMBOLS;
        const symbolNames = GameUtils.GAME_CONSTANTS.SYMBOL_NAMES;
        const totalCards = this.config.rows * this.config.cols;
        const pairsNeeded = totalCards / 2;

        // Create pairs of cards
        const cardPairs = [];
        for (let i = 0; i < pairsNeeded; i++) {
            const symbolIndex = i % symbols.length;
            const symbol = symbols[symbolIndex];
            const symbolName = symbolNames[symbolIndex];

            // Add two cards with the same symbol
            cardPairs.push(
                { symbol, symbolName, pairId: i },
                { symbol, symbolName, pairId: i }
            );
        }

        // Shuffle the cards
        this.gameState.cards = GameUtils.shuffleArray(cardPairs);
        this.totalPairs = pairsNeeded;
    }

    /**
     * Handle card click events
     * @param {number} cardIndex - Index of clicked card
     */
    async handleCardClick(cardIndex) {
        // Validate click
        if (!this.isValidCardClick(cardIndex)) {
            return;
        }

        // Start game if not active
        if (!this.gameState.isGameActive) {
            this.gameState.isGameActive = true;
        }

        // Handle player move
        await this.makePlayerMove(cardIndex);
    }

    /**
     * Check if card click is valid
     * @param {number} cardIndex - Card index to validate
     * @returns {boolean} - Whether click is valid
     */
    isValidCardClick(cardIndex) {
        // Check if it's player's turn
        if (this.gameState.currentPlayer !== 'player') {
            return false;
        }

        // Check if game is active
        if (!this.gameState.isGameActive) {
            return false;
        }

        // Check if card is already flipped or matched
        if (this.gameState.flippedCards.includes(cardIndex) || 
            this.isCardMatched(cardIndex)) {
            return false;
        }

        // Check if already have 2 cards flipped
        if (this.gameState.flippedCards.length >= 2) {
            return false;
        }

        return true;
    }

    /**
     * Check if a card is already matched
     * @param {number} cardIndex - Card index to check
     * @returns {boolean} - Whether card is matched
     */
    isCardMatched(cardIndex) {
        return this.gameState.matchedPairs.some(pair => pair.includes(cardIndex));
    }

    /**
     * Make a player move
     * @param {number} cardIndex - Card index
     */
    async makePlayerMove(cardIndex) {
        // Flip the card
        await this.flipCard(cardIndex);

        // Add to flipped cards
        this.gameState.flippedCards.push(cardIndex);

        // Observe card for AI
        const card = this.gameState.cards[cardIndex];
        this.ai.observeCard(cardIndex, card.symbol, true);

        // Check if we have two cards flipped
        if (this.gameState.flippedCards.length === 2) {
            await this.evaluateMove();
        }
    }

    /**
     * Make an AI move
     */
    async makeAIMove() {
        if (this.gameState.currentPlayer !== 'ai') {
            return;
        }

        // Get available cards
        const availableCards = this.getAvailableCards();
        
        if (availableCards.length < 2) {
            console.warn('Not enough cards available for AI move');
            return;
        }

        // Get AI decision
        const [firstCard, secondCard] = await this.ai.makeMove(availableCards);

        // Make the moves
        await this.flipCard(firstCard);
        this.gameState.flippedCards.push(firstCard);
        
        await GameUtils.delay(500); // Brief pause between cards
        
        await this.flipCard(secondCard);
        this.gameState.flippedCards.push(secondCard);

        // Observe cards for AI memory
        const card1 = this.gameState.cards[firstCard];
        const card2 = this.gameState.cards[secondCard];
        this.ai.observeCard(firstCard, card1.symbol, false);
        this.ai.observeCard(secondCard, card2.symbol, false);

        // Evaluate the move
        await this.evaluateMove();
    }

    /**
     * Get available cards for moves
     * @returns {Array} - Array of available card indices
     */
    getAvailableCards() {
        const available = [];
        for (let i = 0; i < this.gameState.cards.length; i++) {
            if (!this.gameState.flippedCards.includes(i) && !this.isCardMatched(i)) {
                available.push(i);
            }
        }
        return available;
    }

    /**
     * Flip a card
     * @param {number} cardIndex - Card index to flip
     */
    async flipCard(cardIndex) {
        await this.ui.flipCard(cardIndex);
    }

    /**
     * Evaluate the current move (two flipped cards)
     */
    async evaluateMove() {
        const [card1Index, card2Index] = this.gameState.flippedCards;
        const card1 = this.gameState.cards[card1Index];
        const card2 = this.gameState.cards[card2Index];

        this.gameState.moves++;
        this.ui.updateStats({
            moves: this.gameState.moves,
            matches: this.gameState.matchedPairs.length,
            totalPairs: this.totalPairs,
            difficulty: this.gameState.difficulty
        });

        // Check if cards match
        const isMatch = card1.pairId === card2.pairId;

        if (isMatch) {
            await this.handleMatch(card1Index, card2Index);
        } else {
            await this.handleMismatch(card1Index, card2Index);
        }

        // Record move result for AI learning
        this.ai.recordMoveResult(
            [card1Index, card2Index], 
            isMatch, 
            [card1.symbol, card2.symbol]
        );

        // Update AI status
        this.ui.updateAIStatus(this.ai.getStats());

        // Clear flipped cards
        this.gameState.flippedCards = [];

        // Check for game end
        if (this.isGameComplete()) {
            await this.endGame();
            return;
        }

        // Continue with next turn or same player if match
        if (!isMatch) {
            this.switchTurn();
        }

        // If it's AI's turn, make AI move
        if (this.gameState.currentPlayer === 'ai') {
            await GameUtils.delay(1000); // Brief pause before AI move
            await this.makeAIMove();
        }
    }

    /**
     * Handle matching cards
     * @param {number} card1Index - First card index
     * @param {number} card2Index - Second card index
     */
    async handleMatch(card1Index, card2Index) {
        // Add to matched pairs
        this.gameState.matchedPairs.push([card1Index, card2Index]);

        // Update score
        if (this.gameState.currentPlayer === 'player') {
            this.gameState.playerScore++;
        } else {
            this.gameState.aiScore++;
        }

        // Update UI
        await this.ui.markCardsAsMatched([card1Index, card2Index]);
        this.ui.updateScore(this.gameState.playerScore, this.gameState.aiScore);
        
        const matchesFound = this.gameState.matchedPairs.length;
        this.ui.updateStats({
            moves: this.gameState.moves,
            matches: matchesFound,
            totalPairs: this.totalPairs,
            difficulty: this.gameState.difficulty
        });

        // Update status message
        const currentPlayerName = this.gameState.currentPlayer === 'player' ? 'You' : 'AI';
        this.ui.updateStatusMessage(`${currentPlayerName} found a match! ${currentPlayerName} get${this.gameState.currentPlayer === 'player' ? '' : 's'} another turn.`, 'success');
    }

    /**
     * Handle mismatched cards
     * @param {number} card1Index - First card index
     * @param {number} card2Index - Second card index
     */
    async handleMismatch(card1Index, card2Index) {
        // Wait a moment to let player see the cards
        await GameUtils.delay(1500);

        // Flip cards back
        await this.ui.flipCardBack(card1Index);
        await this.ui.flipCardBack(card2Index);

        // Update status message
        const currentPlayerName = this.gameState.currentPlayer === 'player' ? 'You' : 'AI';
        this.ui.updateStatusMessage(`No match. ${currentPlayerName === 'You' ? 'Your' : 'AI\'s'} turn is over.`, 'info');
    }

    /**
     * Switch turn between player and AI
     */
    switchTurn() {
        this.gameState.currentPlayer = this.gameState.currentPlayer === 'player' ? 'ai' : 'player';
        this.ui.updateTurnIndicator(this.gameState.currentPlayer);
    }

    /**
     * Check if game is complete
     * @returns {boolean} - Whether all pairs are matched
     */
    isGameComplete() {
        return this.gameState.matchedPairs.length === this.totalPairs;
    }

    /**
     * End the game and show results
     */
    async endGame() {
        this.gameState.isGameActive = false;
        const gameTime = this.ui.stopTimer();

        // Determine winner
        let winner = 'tie';
        if (this.gameState.playerScore > this.gameState.aiScore) {
            winner = 'player';
        } else if (this.gameState.aiScore > this.gameState.playerScore) {
            winner = 'ai';
        }

        // Prepare game result
        const gameResult = {
            winner,
            playerScore: this.gameState.playerScore,
            aiScore: this.gameState.aiScore,
            totalMoves: this.gameState.moves,
            gameTime,
            difficulty: this.gameState.difficulty
        };

        // Save game statistics
        this.saveGameStats(gameResult);

        // Show game over modal
        this.ui.showGameOverModal(gameResult);

        // Update final status message
        let statusMessage = '';
        if (winner === 'player') {
            statusMessage = '🎉 Congratulations! You beat the AI!';
        } else if (winner === 'ai') {
            statusMessage = '🤖 AI wins this round! Try again?';
        } else {
            statusMessage = '🤝 It\'s a tie! Great game!';
        }
        this.ui.updateStatusMessage(statusMessage, winner === 'player' ? 'success' : 'info');

        console.log('Game ended:', gameResult);
    }

    /**
     * Save game statistics
     * @param {Object} gameResult - Game result data
     */
    saveGameStats(gameResult) {
        const existingStats = GameUtils.storage.load(
            GameUtils.GAME_CONSTANTS.STORAGE_KEYS.gameStats, 
            { gamesPlayed: 0, wins: 0, losses: 0, ties: 0 }
        );

        existingStats.gamesPlayed++;
        if (gameResult.winner === 'player') {
            existingStats.wins++;
        } else if (gameResult.winner === 'ai') {
            existingStats.losses++;
        } else {
            existingStats.ties++;
        }

        GameUtils.storage.save(
            GameUtils.GAME_CONSTANTS.STORAGE_KEYS.gameStats, 
            existingStats
        );
    }

    /**
     * Change game difficulty
     * @param {string} difficulty - New difficulty level
     */
    changeDifficulty(difficulty) {
        if (!GameUtils.GAME_CONSTANTS.DIFFICULTIES[difficulty]) {
            console.warn('Invalid difficulty:', difficulty);
            return;
        }

        this.gameState.difficulty = difficulty;
        this.config = GameUtils.GAME_CONSTANTS.DIFFICULTIES[difficulty];
        this.ai.setDifficulty(difficulty);
        
        // Save setting
        this.saveSettings();

        // Update UI
        this.ui.selectDifficulty(difficulty);

        // Start new game with new difficulty
        this.setupNewGame();

        console.log('Difficulty changed to:', difficulty);
    }

    /**
     * Get current game statistics
     * @returns {Object} - Current game stats
     */
    getGameStats() {
        return {
            ...this.gameState,
            totalPairs: this.totalPairs,
            gameTime: this.ui.gameStartTime ? 
                Math.floor((Date.now() - this.ui.gameStartTime) / 1000) : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemoryGame;
}

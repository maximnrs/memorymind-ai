/**
 * AI Player for MemoryMind AI Game
 * Implements intelligent decision-making with adaptive difficulty
 */
class MemoryAI {
    constructor(difficulty = 'beginner') {
        this.difficulty = difficulty;
        this.memory = new Map(); // Stores known card positions
        this.probabilityMatrix = new Map(); // Probability estimates for unknown cards
        this.playerPatterns = []; // Track player behavior patterns
        this.gameHistory = []; // Store game moves for learning
        this.thinkingTime = 1500; // Base thinking time in milliseconds
        
        // AI configuration based on difficulty
        this.config = GameUtils.GAME_CONSTANTS.DIFFICULTIES[difficulty];
        this.memoryAccuracy = this.config.aiAccuracy;
        this.explorationRate = 0.3; // How often AI explores vs exploits
        
        this.reset();
    }

    /**
     * Reset AI state for new game
     */
    reset() {
        this.memory.clear();
        this.probabilityMatrix.clear();
        this.playerPatterns = [];
        this.gameHistory = [];
        this.knownPairs = new Set();
        this.revealedCards = new Map();
        this.moveCount = 0;
    }

    /**
     * Update AI memory when a card is revealed
     * @param {number} cardIndex - Index of the revealed card
     * @param {string} symbol - Symbol on the card
     * @param {boolean} isPlayerMove - Whether this was a player move
     */
    observeCard(cardIndex, symbol, isPlayerMove = false) {
        // Store in memory with accuracy based on difficulty
        if (Math.random() < this.memoryAccuracy) {
            this.memory.set(cardIndex, symbol);
            this.revealedCards.set(cardIndex, {
                symbol,
                moveNumber: this.moveCount,
                isPlayerMove
            });
        }

        // Update probability matrix
        this.updateProbabilities(symbol);

        // Track player patterns if it's a player move
        if (isPlayerMove) {
            this.trackPlayerPattern(cardIndex);
        }

        this.moveCount++;
    }

    /**
     * Update probability estimates for unknown cards
     * @param {string} revealedSymbol - Symbol that was just revealed
     */
    updateProbabilities(revealedSymbol) {
        // Count how many of each symbol we've seen
        const symbolCounts = new Map();
        for (const symbol of this.memory.values()) {
            symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
        }

        // Update probabilities based on remaining symbols
        const totalCards = this.config.rows * this.config.cols;
        const symbolsPerType = totalCards / GameUtils.GAME_CONSTANTS.SYMBOLS.length;
        
        for (let i = 0; i < totalCards; i++) {
            if (!this.memory.has(i)) {
                const probabilities = {};
                for (const symbol of GameUtils.GAME_CONSTANTS.SYMBOLS) {
                    const seen = symbolCounts.get(symbol) || 0;
                    const remaining = symbolsPerType - seen;
                    probabilities[symbol] = Math.max(0, remaining / (totalCards - this.memory.size));
                }
                this.probabilityMatrix.set(i, probabilities);
            }
        }
    }

    /**
     * Track player behavior patterns
     * @param {number} cardIndex - Card index chosen by player
     */
    trackPlayerPattern(cardIndex) {
        this.playerPatterns.push({
            cardIndex,
            timestamp: Date.now(),
            moveNumber: this.moveCount
        });

        // Keep only recent patterns (last 20 moves)
        if (this.playerPatterns.length > 20) {
            this.playerPatterns.shift();
        }
    }

    /**
     * Analyze player patterns to predict behavior
     * @returns {Object} - Pattern analysis results
     */
    analyzePlayerPatterns() {
        if (this.playerPatterns.length < 3) {
            return { predictedAreas: [], confidence: 0 };
        }

        // Analyze spatial preferences
        const areaPreferences = new Map();
        const gridCols = this.config.cols;
        
        for (const pattern of this.playerPatterns) {
            const row = Math.floor(pattern.cardIndex / gridCols);
            const col = pattern.cardIndex % gridCols;
            const area = `${Math.floor(row / 2)}-${Math.floor(col / 2)}`;
            areaPreferences.set(area, (areaPreferences.get(area) || 0) + 1);
        }

        // Find most preferred areas
        const sortedAreas = Array.from(areaPreferences.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        return {
            predictedAreas: sortedAreas.map(([area]) => area),
            confidence: sortedAreas.length > 0 ? sortedAreas[0][1] / this.playerPatterns.length : 0
        };
    }

    /**
     * Make AI move decision
     * @param {Array} availableCards - Array of available card indices
     * @returns {Promise<Array>} - Promise resolving to [firstCard, secondCard] indices
     */
    async makeMove(availableCards) {
        // Show thinking animation
        GameUtils.eventEmitter.emit('aiThinking', true);
        
        // Add realistic thinking delay
        const thinkingDelay = this.calculateThinkingTime();
        await GameUtils.delay(thinkingDelay);

        let move;

        // Strategy 1: Look for known matching pairs
        move = this.findKnownPairs(availableCards);
        if (move) {
            GameUtils.eventEmitter.emit('aiThinking', false);
            return move;
        }

        // Strategy 2: Use probability-based exploration
        move = this.probabilityBasedMove(availableCards);
        if (move) {
            GameUtils.eventEmitter.emit('aiThinking', false);
            return move;
        }

        // Strategy 3: Random exploration with pattern awareness
        move = this.explorationMove(availableCards);
        
        GameUtils.eventEmitter.emit('aiThinking', false);
        return move;
    }

    /**
     * Calculate thinking time based on game state and difficulty
     * @returns {number} - Thinking time in milliseconds
     */
    calculateThinkingTime() {
        const baseTime = this.thinkingTime;
        const complexity = this.memory.size / (this.config.rows * this.config.cols);
        const difficultyMultiplier = {
            beginner: 0.8,
            intermediate: 1.0,
            advanced: 1.2,
            expert: 1.5
        }[this.difficulty];

        return Math.floor(baseTime * (1 + complexity) * difficultyMultiplier);
    }

    /**
     * Find known matching pairs in memory
     * @param {Array} availableCards - Available card indices
     * @returns {Array|null} - [firstCard, secondCard] or null
     */
    findKnownPairs(availableCards) {
        const availableMemory = availableCards.filter(index => this.memory.has(index));
        
        for (let i = 0; i < availableMemory.length; i++) {
            for (let j = i + 1; j < availableMemory.length; j++) {
                const card1 = availableMemory[i];
                const card2 = availableMemory[j];
                
                if (this.memory.get(card1) === this.memory.get(card2)) {
                    return [card1, card2];
                }
            }
        }
        
        return null;
    }

    /**
     * Make probability-based move
     * @param {Array} availableCards - Available card indices
     * @returns {Array|null} - [firstCard, secondCard] or null
     */
    probabilityBasedMove(availableCards) {
        // Look for cards with high probability of matching known cards
        for (const [knownIndex, knownSymbol] of this.memory.entries()) {
            if (!availableCards.includes(knownIndex)) continue;

            // Find unknown cards with high probability of matching
            const candidates = availableCards
                .filter(index => !this.memory.has(index))
                .map(index => ({
                    index,
                    probability: this.probabilityMatrix.get(index)?.[knownSymbol] || 0
                }))
                .filter(card => card.probability > 0.3)
                .sort((a, b) => b.probability - a.probability);

            if (candidates.length > 0) {
                return [knownIndex, candidates[0].index];
            }
        }

        return null;
    }

    /**
     * Make exploration move with pattern awareness
     * @param {Array} availableCards - Available card indices
     * @returns {Array} - [firstCard, secondCard]
     */
    explorationMove(availableCards) {
        const unknownCards = availableCards.filter(index => !this.memory.has(index));
        
        if (unknownCards.length < 2) {
            // Fallback to random available cards
            return [
                GameUtils.randomChoice(availableCards),
                GameUtils.randomChoice(availableCards.filter(index => index !== availableCards[0]))
            ];
        }

        // Analyze player patterns to avoid or target certain areas
        const patternAnalysis = this.analyzePlayerPatterns();
        
        if (patternAnalysis.confidence > 0.4 && Math.random() < 0.3) {
            // Sometimes block player's preferred areas
            const gridCols = this.config.cols;
            const blockedCards = unknownCards.filter(index => {
                const row = Math.floor(index / gridCols);
                const col = index % gridCols;
                const area = `${Math.floor(row / 2)}-${Math.floor(col / 2)}`;
                return patternAnalysis.predictedAreas.includes(area);
            });

            if (blockedCards.length >= 2) {
                return [
                    GameUtils.randomChoice(blockedCards),
                    GameUtils.randomChoice(blockedCards.filter(index => index !== blockedCards[0]))
                ];
            }
        }

        // Default exploration: pick two random unknown cards
        const firstCard = GameUtils.randomChoice(unknownCards);
        const secondCard = GameUtils.randomChoice(unknownCards.filter(index => index !== firstCard));
        
        return [firstCard, secondCard];
    }

    /**
     * Record the result of a move for learning
     * @param {Array} cards - [firstCard, secondCard] indices
     * @param {boolean} wasMatch - Whether the cards matched
     * @param {Array} symbols - [firstSymbol, secondSymbol]
     */
    recordMoveResult(cards, wasMatch, symbols) {
        this.gameHistory.push({
            cards,
            wasMatch,
            symbols,
            moveNumber: this.moveCount
        });

        if (wasMatch) {
            this.knownPairs.add(symbols[0]);
        }

        // Learn from the move
        this.learnFromMove(cards, wasMatch, symbols);
    }

    /**
     * Learn from move results to improve future decisions
     * @param {Array} cards - Card indices
     * @param {boolean} wasMatch - Whether cards matched
     * @param {Array} symbols - Card symbols
     */
    learnFromMove(cards, wasMatch, symbols) {
        // Update memory accuracy based on performance
        if (wasMatch) {
            this.memoryAccuracy = Math.min(0.99, this.memoryAccuracy + 0.01);
        } else {
            // Slightly decrease accuracy on misses (simulate forgetting)
            this.memoryAccuracy = Math.max(this.config.aiAccuracy * 0.8, this.memoryAccuracy - 0.005);
        }

        // Adjust exploration rate based on game progress
        const gameProgress = this.knownPairs.size / (GameUtils.GAME_CONSTANTS.SYMBOLS.length);
        this.explorationRate = Math.max(0.1, 0.5 - gameProgress * 0.4);
    }

    /**
     * Get AI statistics for display
     * @returns {Object} - AI statistics
     */
    getStats() {
        return {
            memoryAccuracy: Math.round(this.memoryAccuracy * 100),
            knownCards: this.memory.size,
            knownPairs: this.knownPairs.size,
            explorationRate: Math.round(this.explorationRate * 100),
            difficulty: this.difficulty
        };
    }

    /**
     * Update AI difficulty
     * @param {string} newDifficulty - New difficulty level
     */
    setDifficulty(newDifficulty) {
        this.difficulty = newDifficulty;
        this.config = GameUtils.GAME_CONSTANTS.DIFFICULTIES[newDifficulty];
        this.memoryAccuracy = this.config.aiAccuracy;
        this.reset();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemoryAI;
}


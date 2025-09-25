/**
 * UI Controller for MemoryMind AI Game
 * Handles all user interface interactions and visual updates
 */
class GameUI {
    constructor() {
        this.elements = {};
        this.isAnimating = false;
        this.gameTimer = null;
        this.gameStartTime = null;
        
        this.initializeElements();
        this.bindEvents();
        this.setupAccessibility();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Game board and cards
            gameBoard: document.getElementById('game-board'),
            
            // Score display
            playerScore: document.getElementById('player-score'),
            aiScore: document.getElementById('ai-score'),
            
            // Turn indicator
            turnIndicator: document.getElementById('turn-indicator'),
            currentTurn: document.getElementById('current-turn'),
            
            // Statistics
            movesCount: document.getElementById('moves-count'),
            gameTime: document.getElementById('game-time'),
            totalMatches: document.getElementById('total-matches'),
            difficultyLevel: document.getElementById('difficulty-level'),
            
            // AI status
            aiThinking: document.getElementById('ai-thinking'),
            aiAccuracy: document.getElementById('ai-accuracy'),
            
            // Status message
            statusMessage: document.getElementById('status-message'),
            
            // Control buttons
            restartBtn: document.getElementById('restart-btn'),
            difficultyBtn: document.getElementById('difficulty-btn'),
            helpBtn: document.getElementById('help-btn'),
            
            // Modals
            difficultyModal: document.getElementById('difficulty-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            modalClose: document.getElementById('modal-close'),
            
            // Difficulty options
            difficultyOptions: document.querySelectorAll('.difficulty-option'),
            
            // Game over elements
            gameResultTitle: document.getElementById('game-result-title'),
            finalPlayerScore: document.getElementById('final-player-score'),
            finalAiScore: document.getElementById('final-ai-score'),
            finalMoves: document.getElementById('final-moves'),
            finalTime: document.getElementById('final-time'),
            playAgainBtn: document.getElementById('play-again-btn'),
            changeDifficultyBtn: document.getElementById('change-difficulty-btn')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Control buttons
        this.elements.restartBtn?.addEventListener('click', () => {
            GameUtils.eventEmitter.emit('restartGame');
        });

        this.elements.difficultyBtn?.addEventListener('click', () => {
            this.showDifficultyModal();
        });

        this.elements.helpBtn?.addEventListener('click', () => {
            this.showHelpMessage();
        });

        // Modal events
        this.elements.modalClose?.addEventListener('click', () => {
            this.hideDifficultyModal();
        });

        // Difficulty selection
        this.elements.difficultyOptions?.forEach(option => {
            option.addEventListener('click', () => {
                const difficulty = option.dataset.difficulty;
                this.selectDifficulty(difficulty);
                GameUtils.eventEmitter.emit('difficultyChanged', difficulty);
                this.hideDifficultyModal();
            });
        });

        // Game over modal buttons
        this.elements.playAgainBtn?.addEventListener('click', () => {
            this.hideGameOverModal();
            GameUtils.eventEmitter.emit('restartGame');
        });

        this.elements.changeDifficultyBtn?.addEventListener('click', () => {
            this.hideGameOverModal();
            this.showDifficultyModal();
        });

        // Close modals on outside click
        this.elements.difficultyModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.difficultyModal) {
                this.hideDifficultyModal();
            }
        });

        this.elements.gameOverModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.gameOverModal) {
                this.hideGameOverModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardInput(e);
        });

        // Custom game events
        GameUtils.eventEmitter.on('aiThinking', (isThinking) => {
            this.showAIThinking(isThinking);
        });

        // Window resize handler
        window.addEventListener('resize', GameUtils.debounce(() => {
            this.handleResize();
        }, 250));
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Add ARIA labels
        if (this.elements.gameBoard) {
            this.elements.gameBoard.setAttribute('role', 'grid');
            this.elements.gameBoard.setAttribute('aria-label', 'Memory game board');
        }

        // Add live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'game-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        document.body.appendChild(liveRegion);
        this.elements.liveRegion = liveRegion;
    }

    /**
     * Create and render the game board
     * @param {number} rows - Number of rows
     * @param {number} cols - Number of columns
     * @param {Array} cards - Array of card data
     */
    createGameBoard(rows, cols, cards) {
        if (!this.elements.gameBoard) return;

        // Clear existing board
        this.elements.gameBoard.innerHTML = '';
        
        // Set grid layout
        this.elements.gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        this.elements.gameBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        // Create cards
        cards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            this.elements.gameBoard.appendChild(cardElement);
        });

        // Announce board creation
        this.announce(`Game board created with ${rows} rows and ${cols} columns`);
    }

    /**
     * Create a single card element
     * @param {Object} card - Card data
     * @param {number} index - Card index
     * @returns {HTMLElement} - Card element
     */
    createCardElement(card, index) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardIndex = index;
        cardElement.dataset.symbol = card.symbol;
        cardElement.setAttribute('role', 'button');
        cardElement.setAttribute('tabindex', '0');
        cardElement.setAttribute('aria-label', `Card ${index + 1}, hidden`);

        // Create card faces
        const cardBack = document.createElement('div');
        cardBack.className = 'card-face card-back';
        
        const cardFront = document.createElement('div');
        cardFront.className = `card-face card-front ${card.symbolName}`;
        cardFront.textContent = card.symbol;
        cardFront.setAttribute('aria-hidden', 'true');

        cardElement.appendChild(cardBack);
        cardElement.appendChild(cardFront);

        // Add click handler
        cardElement.addEventListener('click', () => {
            this.handleCardClick(index);
        });

        // Add keyboard handler
        cardElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleCardClick(index);
            }
        });

        return cardElement;
    }

    /**
     * Handle card click events
     * @param {number} cardIndex - Index of clicked card
     */
    handleCardClick(cardIndex) {
        if (this.isAnimating) return;
        
        const cardElement = this.getCardElement(cardIndex);
        if (!cardElement || cardElement.classList.contains('flipped') || 
            cardElement.classList.contains('matched') || 
            cardElement.classList.contains('disabled')) {
            return;
        }

        GameUtils.eventEmitter.emit('cardClicked', cardIndex);
    }

    /**
     * Flip a card to show its face
     * @param {number} cardIndex - Index of card to flip
     * @param {boolean} animate - Whether to animate the flip
     */
    async flipCard(cardIndex, animate = true) {
        const cardElement = this.getCardElement(cardIndex);
        if (!cardElement) return;

        if (animate) {
            this.isAnimating = true;
        }

        cardElement.classList.add('flipped');
        const symbol = cardElement.dataset.symbol;
        const symbolName = GameUtils.GAME_CONSTANTS.SYMBOLS.indexOf(symbol);
        
        cardElement.setAttribute('aria-label', 
            `Card ${cardIndex + 1}, showing ${GameUtils.GAME_CONSTANTS.SYMBOL_NAMES[symbolName]}`);

        if (animate) {
            await GameUtils.delay(GameUtils.GAME_CONSTANTS.ANIMATION_DURATIONS.cardFlip);
            this.isAnimating = false;
        }

        this.announce(`Card ${cardIndex + 1} flipped, showing ${GameUtils.GAME_CONSTANTS.SYMBOL_NAMES[symbolName]}`);
    }

    /**
     * Flip a card back to hide its face
     * @param {number} cardIndex - Index of card to flip back
     * @param {boolean} animate - Whether to animate the flip
     */
    async flipCardBack(cardIndex, animate = true) {
        const cardElement = this.getCardElement(cardIndex);
        if (!cardElement) return;

        if (animate) {
            // Add shake animation for wrong matches
            await GameUtils.animateElement(cardElement, 'shake', 
                GameUtils.GAME_CONSTANTS.ANIMATION_DURATIONS.cardShake);
        }

        cardElement.classList.remove('flipped');
        cardElement.setAttribute('aria-label', `Card ${cardIndex + 1}, hidden`);
    }

    /**
     * Mark cards as matched
     * @param {Array} cardIndices - Array of card indices
     */
    async markCardsAsMatched(cardIndices) {
        this.isAnimating = true;

        for (const cardIndex of cardIndices) {
            const cardElement = this.getCardElement(cardIndex);
            if (cardElement) {
                cardElement.classList.add('flipped');
                cardElement.setAttribute('aria-label', `Card ${cardIndex + 1}, matched`);
                
                // Add pulse animation
                await GameUtils.animateElement(cardElement, 
                    GameUtils.GAME_CONSTANTS.ANIMATION_DURATIONS.cardMatch);
            }
        }

        this.isAnimating = false;
        this.announce(`Cards matched! ${cardIndices.length} cards removed from play.`);
    }

    /**
     * Enable or disable cards
     * @param {Array} cardIndices - Array of card indices
     * @param {boolean} disabled - Whether to disable the cards
     */
    setCardsDisabled(cardIndices, disabled) {
        cardIndices.forEach(cardIndex => {
            const cardElement = this.getCardElement(cardIndex);
            if (cardElement) {
                if (disabled) {
                    cardElement.classList.add('disabled');
                    cardElement.setAttribute('tabindex', '-1');
                } else {
                    cardElement.classList.remove('disabled');
                    cardElement.setAttribute('tabindex', '0');
                }
            }
        });
    }

    /**
     * Update the score display
     * @param {number} playerScore - Player's score
     * @param {number} aiScore - AI's score
     */
    updateScore(playerScore, aiScore) {
        if (this.elements.playerScore) {
            this.elements.playerScore.textContent = playerScore;
        }
        if (this.elements.aiScore) {
            this.elements.aiScore.textContent = aiScore;
        }
    }

    /**
     * Update the turn indicator
     * @param {string} currentPlayer - 'player' or 'ai'
     */
    updateTurnIndicator(currentPlayer) {
        if (this.elements.currentTurn) {
            this.elements.currentTurn.textContent = currentPlayer === 'player' ? 'Player' : 'AI';
        }

        if (this.elements.turnIndicator) {
            this.elements.turnIndicator.className = `turn-indicator ${currentPlayer}-turn`;
        }

        this.announce(`It's ${currentPlayer === 'player' ? 'your' : 'AI\'s'} turn`);
    }

    /**
     * Update game statistics
     * @param {Object} stats - Game statistics
     */
    updateStats(stats) {
        if (this.elements.movesCount) {
            this.elements.movesCount.textContent = stats.moves || 0;
        }

        if (this.elements.totalMatches) {
            this.elements.totalMatches.textContent = `${stats.matches || 0}/${stats.totalPairs || 8}`;
        }

        if (this.elements.difficultyLevel) {
            this.elements.difficultyLevel.textContent = 
                stats.difficulty ? stats.difficulty.charAt(0).toUpperCase() + stats.difficulty.slice(1) : 'Beginner';
        }
    }

    /**
     * Update AI status display
     * @param {Object} aiStats - AI statistics
     */
    updateAIStatus(aiStats) {
        if (this.elements.aiAccuracy) {
            this.elements.aiAccuracy.textContent = `${aiStats.memoryAccuracy || 70}%`;
        }
    }

    /**
     * Show or hide AI thinking indicator
     * @param {boolean} isThinking - Whether AI is thinking
     */
    showAIThinking(isThinking) {
        if (this.elements.aiThinking) {
            this.elements.aiThinking.style.display = isThinking ? 'flex' : 'none';
        }

        if (isThinking) {
            this.announce('AI is thinking...');
        }
    }

    /**
     * Start the game timer
     */
    startTimer() {
        this.gameStartTime = Date.now();
        this.gameTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
            if (this.elements.gameTime) {
                this.elements.gameTime.textContent = GameUtils.formatTime(elapsed);
            }
        }, 1000);
    }

    /**
     * Stop the game timer
     * @returns {number} - Elapsed time in seconds
     */
    stopTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        if (this.gameStartTime) {
            return Math.floor((Date.now() - this.gameStartTime) / 1000);
        }
        return 0;
    }

    /**
     * Update status message
     * @param {string} message - Message to display
     * @param {string} type - Message type ('info', 'success', 'error')
     */
    updateStatusMessage(message, type = 'info') {
        if (this.elements.statusMessage) {
            this.elements.statusMessage.textContent = message;
            this.elements.statusMessage.className = `status-message ${type}`;
        }
        
        this.announce(message);
    }

    /**
     * Show difficulty selection modal
     */
    showDifficultyModal() {
        if (this.elements.difficultyModal) {
            this.elements.difficultyModal.classList.add('show');
            this.elements.difficultyModal.style.display = 'flex';
            
            // Focus first difficulty option
            const firstOption = this.elements.difficultyModal.querySelector('.difficulty-option');
            if (firstOption) {
                GameUtils.accessibility.focus(firstOption, 100);
            }
        }
    }

    /**
     * Hide difficulty selection modal
     */
    hideDifficultyModal() {
        if (this.elements.difficultyModal) {
            this.elements.difficultyModal.classList.remove('show');
            setTimeout(() => {
                this.elements.difficultyModal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Select difficulty option
     * @param {string} difficulty - Selected difficulty
     */
    selectDifficulty(difficulty) {
        this.elements.difficultyOptions?.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.difficulty === difficulty) {
                option.classList.add('selected');
            }
        });
    }

    /**
     * Show game over modal
     * @param {Object} gameResult - Game result data
     */
    showGameOverModal(gameResult) {
        if (!this.elements.gameOverModal) return;

        // Update result title
        if (this.elements.gameResultTitle) {
            let title = 'Game Over';
            if (gameResult.winner === 'player') {
                title = '🎉 You Won!';
            } else if (gameResult.winner === 'ai') {
                title = '🤖 AI Wins!';
            } else {
                title = '🤝 It\'s a Tie!';
            }
            this.elements.gameResultTitle.textContent = title;
        }

        // Update final scores
        if (this.elements.finalPlayerScore) {
            this.elements.finalPlayerScore.textContent = gameResult.playerScore || 0;
        }
        if (this.elements.finalAiScore) {
            this.elements.finalAiScore.textContent = gameResult.aiScore || 0;
        }
        if (this.elements.finalMoves) {
            this.elements.finalMoves.textContent = gameResult.totalMoves || 0;
        }
        if (this.elements.finalTime) {
            this.elements.finalTime.textContent = GameUtils.formatTime(gameResult.gameTime || 0);
        }

        // Show modal
        this.elements.gameOverModal.classList.add('show');
        this.elements.gameOverModal.style.display = 'flex';

        // Focus play again button
        if (this.elements.playAgainBtn) {
            GameUtils.accessibility.focus(this.elements.playAgainBtn, 100);
        }

        // Announce result
        this.announce(`Game over! ${gameResult.winner === 'player' ? 'You won' : 
            gameResult.winner === 'ai' ? 'AI won' : 'It\'s a tie'}!`);
    }

    /**
     * Hide game over modal
     */
    hideGameOverModal() {
        if (this.elements.gameOverModal) {
            this.elements.gameOverModal.classList.remove('show');
            setTimeout(() => {
                this.elements.gameOverModal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Show help message
     */
    showHelpMessage() {
        const helpText = `
            MemoryMind AI - How to Play:
            
            1. Click two cards to flip them over
            2. If they match, you get a point and another turn
            3. If they don't match, they flip back over
            4. Try to remember where each symbol is located
            5. The player with the most pairs wins!
            
            The AI opponent will learn from your moves and adapt its strategy.
            Choose different difficulty levels to challenge yourself!
        `;
        
        this.updateStatusMessage('Check the browser console for help information', 'info');
        console.log(helpText);
        this.announce('Help information displayed in console');
    }

    /**
     * Handle keyboard input for accessibility
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardInput(event) {
        // Close modals with Escape key
        if (event.key === 'Escape') {
            if (this.elements.difficultyModal?.classList.contains('show')) {
                this.hideDifficultyModal();
            }
            if (this.elements.gameOverModal?.classList.contains('show')) {
                this.hideGameOverModal();
            }
        }

        // Restart game with R key
        if (event.key === 'r' || event.key === 'R') {
            if (!event.ctrlKey && !event.metaKey) {
                GameUtils.eventEmitter.emit('restartGame');
            }
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Adjust card sizes if needed
        // This could be expanded for more responsive behavior
    }

    /**
     * Get card element by index
     * @param {number} cardIndex - Card index
     * @returns {HTMLElement|null} - Card element
     */
    getCardElement(cardIndex) {
        return this.elements.gameBoard?.querySelector(`[data-card-index="${cardIndex}"]`);
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    announce(message) {
        if (this.elements.liveRegion) {
            this.elements.liveRegion.textContent = message;
        }
    }

    /**
     * Reset UI to initial state
     */
    reset() {
        this.stopTimer();
        this.isAnimating = false;
        
        // Reset scores
        this.updateScore(0, 0);
        
        // Reset timer display
        if (this.elements.gameTime) {
            this.elements.gameTime.textContent = '00:00';
        }
        
        // Reset status message
        this.updateStatusMessage('Click two cards to find matching pairs!');
        
        // Hide AI thinking
        this.showAIThinking(false);
        
        // Clear game board
        if (this.elements.gameBoard) {
            this.elements.gameBoard.innerHTML = '';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameUI;
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MappableGames
 * @dev Contract for gaming interactions that emit events for tracking
 */
contract MappableGames {
    event GameStarted(address indexed player, uint256 indexed gameId, uint256 betAmount);
    event GameCompleted(address indexed player, uint256 indexed gameId, bool won, uint256 reward);

    mapping(uint256 => address) public gamePlayer;
    mapping(address => uint256) public playerGamesCount;
    uint256 public totalGames;
    uint256 public gameCounter;

    /**
     * @dev Start a new game
     * @param gameId The unique game identifier
     */
    function startGame(uint256 gameId) external payable {
        require(msg.value > 0, "Must bet something");
        require(gamePlayer[gameId] == address(0), "Game already started");

        gamePlayer[gameId] = msg.sender;
        playerGamesCount[msg.sender]++;
        totalGames++;
        gameCounter++;

        emit GameStarted(msg.sender, gameId, msg.value);
    }

    /**
     * @dev Complete a game and distribute rewards
     * @param gameId The game identifier
     * @param won Whether the player won
     */
    function completeGame(uint256 gameId, bool won) external {
        require(gamePlayer[gameId] == msg.sender, "Not your game");
        
        address player = msg.sender;
        uint256 reward = won ? address(this).balance / 2 : 0;
        
        if (won && reward > 0) {
            payable(player).transfer(reward);
        }

        emit GameCompleted(player, gameId, won, reward);
    }
}


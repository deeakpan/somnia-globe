// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MappableNFTs
 * @dev Contract for NFT interactions that emit events for tracking
 */
contract MappableNFTs {
    event NFTMinted(address indexed user, uint256 indexed tokenId, string tokenURI);
    event NFTTransferred(address indexed from, address indexed to, uint256 indexed tokenId);

    mapping(uint256 => address) public tokenOwner;
    mapping(address => uint256) public userNFTCount;
    uint256 public totalSupply;

    /**
     * @dev Mint a new NFT
     * @param tokenURI The URI of the NFT metadata
     */
    function mintNFT(string memory tokenURI) external {
        uint256 tokenId = totalSupply + 1;
        tokenOwner[tokenId] = msg.sender;
        userNFTCount[msg.sender]++;
        totalSupply++;

        emit NFTMinted(msg.sender, tokenId, tokenURI);
    }

    /**
     * @dev Transfer an NFT to another address
     * @param to The address to transfer to
     * @param tokenId The token ID to transfer
     */
    function transferNFT(address to, uint256 tokenId) external {
        require(tokenOwner[tokenId] == msg.sender, "Not the owner");
        require(to != address(0), "Invalid address");

        address from = msg.sender;
        tokenOwner[tokenId] = to;
        userNFTCount[from]--;
        userNFTCount[to]++;

        emit NFTTransferred(from, to, tokenId);
    }
}


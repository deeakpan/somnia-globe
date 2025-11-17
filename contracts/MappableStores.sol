// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MappableStores
 * @dev Contract for store/e-commerce interactions that emit events for tracking
 */
contract MappableStores {
    event PurchaseMade(address indexed buyer, uint256 indexed itemId, uint256 amount, uint256 price);
    event ItemListed(address indexed seller, uint256 indexed itemId, uint256 price, string itemName);

    struct Item {
        address seller;
        uint256 price;
        string name;
        bool exists;
    }

    mapping(uint256 => Item) public items;
    mapping(address => uint256) public userPurchaseCount;
    uint256 public totalItems;
    uint256 public itemCounter;

    /**
     * @dev List a new item for sale
     * @param itemName The name of the item
     * @param price The price in wei
     */
    function listItem(string memory itemName, uint256 price) external {
        require(price > 0, "Price must be greater than 0");
        
        uint256 itemId = itemCounter + 1;
        items[itemId] = Item({
            seller: msg.sender,
            price: price,
            name: itemName,
            exists: true
        });
        
        itemCounter++;
        totalItems++;

        emit ItemListed(msg.sender, itemId, price, itemName);
    }

    /**
     * @dev Purchase an item
     * @param itemId The item identifier
     * @param amount The quantity to purchase
     */
    function purchaseItem(uint256 itemId, uint256 amount) external payable {
        require(items[itemId].exists, "Item does not exist");
        require(msg.value >= items[itemId].price * amount, "Insufficient payment");

        address buyer = msg.sender;
        userPurchaseCount[buyer] += amount;
        
        // Transfer payment to seller
        payable(items[itemId].seller).transfer(msg.value);

        emit PurchaseMade(buyer, itemId, amount, items[itemId].price);
    }
}


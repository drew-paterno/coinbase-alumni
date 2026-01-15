// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestMembershipNFT
 * @notice Simple ERC1155 for testing group membership on testnet.
 * Owner can mint tokens to any address.
 */
contract TestMembershipNFT is ERC1155, Ownable {
    string public name;
    
    constructor(string memory name_, string memory uri_) 
        ERC1155(uri_) 
        Ownable(msg.sender) 
    {
        name = name_;
    }

    /**
     * @notice Mint tokens to an address. Only owner can call.
     * @param to Recipient address
     * @param id Token ID
     * @param amount Number of tokens to mint
     */
    function mint(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");
    }

    /**
     * @notice Mint tokens to multiple addresses. Only owner can call.
     * @param recipients Array of recipient addresses
     * @param id Token ID
     * @param amount Number of tokens per recipient
     */
    function mintBatch(address[] calldata recipients, uint256 id, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], id, amount, "");
        }
    }
}


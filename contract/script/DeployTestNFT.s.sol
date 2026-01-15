// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TestMembershipNFT} from "../src/TestMembershipNFT.sol";

/**
 * Deploy TestMembershipNFT and mint tokens to yourself:
 * 
 * forge script DeployTestNFT --rpc-url https://sepolia.base.org --account dev --broadcast -vvvv
 */
contract DeployTestNFT is Script {
    function run() public {
        vm.startBroadcast();

        // Deploy the test NFT
        TestMembershipNFT nft = new TestMembershipNFT(
            "Coinbase Alumni Membership",
            "https://example.com/metadata/{id}.json"
        );

        console.log("TestMembershipNFT deployed at:", address(nft));

        // Mint token ID 1 to the deployer (yourself)
        nft.mint(msg.sender, 1, 1);
        console.log("Minted token ID 1 to:", msg.sender);

        vm.stopBroadcast();
    }
}


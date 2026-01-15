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
            "Kohl's Alumni",
            "https://example.com/metadata/{id}.json"
        );

        console.log("TestMembershipNFT deployed at:", address(nft));

        // Mint token ID 1 to the deployer (yourself)
        nft.mint(address(0x12eAC257a267BA0B70360b114cf9c1154Bf139D4), 1, 1);
        nft.mint(address(0x078AD59A7497820531936055b4a90A3aa2dA69EA), 1, 1);
        console.log("Minted token ID 1 to:", address(0x12eAC257a267BA0B70360b114cf9c1154Bf139D4), address(0x078AD59A7497820531936055b4a90A3aa2dA69EA));

        vm.stopBroadcast();
    }
}


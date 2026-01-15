// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {GatedSocialEscrow} from "../src/GatedSocialEscrow.sol";

/**
 * Deploy to Base Sepolia:
 * forge script Deploy --rpc-url "https://sepolia.base.org" --account dev --sender $SENDER --broadcast -vvvv --verify --verifier-url "https://api-sepolia.basescan.org/api" --etherscan-api-key $BASESCAN_API_KEY
 *
 * Deploy to Base Mainnet:
 * forge script Deploy --rpc-url "https://mainnet.base.org" --account dev --sender $SENDER --broadcast -vvvv --verify --verifier-url "https://api.basescan.org/api" --etherscan-api-key $BASESCAN_API_KEY
 */
contract Deploy is Script {
    function run() public {
        vm.startBroadcast();

        // new GatedSocialEscrow();

        vm.stopBroadcast();
    }
}

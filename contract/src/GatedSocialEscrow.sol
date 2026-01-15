// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal interface for ERC1155 balance checking.
 */
interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title GatedSocialEscrow
 * @notice Multi-group NFT-gated social posts.
 * - Protocol can add/remove groups, each backed by an ERC1155 NFT contract + token ID.
 * - Only holders of a group's NFT token can create posts in that group.
 * - Posts are stored per-group and associated with the author.
 */
contract GatedSocialEscrow {
    // --- Config ---
    address public protocolRecipient; // protocol admin wallet

    // --- Data ---
    enum Status { None, Pending, Active, Removed, Refunded, Completed }

    struct Post {
        address author;
        string cid;
        uint64 createdAt;
        Status status;
    }

    struct Group {
        uint256 tokenId;
        string name;
        bool isActive;
        address membershipNft;
    }

    mapping(address => Post[]) public posts;
    mapping(address => Group) public groups;
    address[] public groupAddresses;

    // --- Events ---
    event PostCreated(uint256 indexed postId, address indexed author, string cid, uint256 createdAt);
    event GroupAdded(address indexed membershipNft, uint256 indexed tokenId, string groupName);
    event GroupRemoved(address indexed membershipNft);

    // --- Modifiers ---
    modifier onlyMembers(address membershipNft) {
        require(groups[membershipNft].isActive, "group does not exist or is inactive");
        require(
            IERC1155(membershipNft).balanceOf(msg.sender, groups[membershipNft].tokenId) > 0,
            "Not a member"
        );
        _;
    }

    modifier onlyProtocol() {
        require(msg.sender == protocolRecipient, "Only protocol");
        _;
    }

    constructor(
        address protocolRecipient_
    ) {
        require(protocolRecipient_ != address(0), "protocol=0");
        protocolRecipient = protocolRecipient_;
    }

    // -- GROUP FUNCTIONS --

    // -- Add group to supported groups --
    function addGroup(string calldata groupName, address membershipNft, uint256 membershipTokenId_) external onlyProtocol {
        require(groups[membershipNft].isActive == false, "group already exists");
        groups[membershipNft] = Group({
            isActive: true,
            tokenId: membershipTokenId_,
            name: groupName,
            membershipNft: membershipNft
        });
        groupAddresses.push(membershipNft);
        // Note: posts[membershipNft] is already an empty array by default
        emit GroupAdded(membershipNft, membershipTokenId_, groupName);
    }

    // --- Remove Group from supported groups ---
    function removeGroup(address membershipNft) external onlyProtocol {
        require(groups[membershipNft].isActive == true, "group does not exist or is inactive");
        groups[membershipNft].isActive = false;

        emit GroupRemoved(membershipNft);
    }

    function getGroups(uint256 offset, uint256 limit) external view returns (Group[] memory) {
        uint256 total = groupAddresses.length;
        
        // Return empty if offset is past the end
        if (offset >= total) {
            return new Group[](0);
        }
        
        // Calculate actual count to return
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 count = end - offset;
        
        // Build result array
        Group[] memory result = new Group[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = groups[groupAddresses[offset + i]];
        }
        return result;
    }

    // -- MEMBERSHIP FUNCTIONS --
    function isMember(address membershipNft, address user) external view returns (bool) {
        if (!groups[membershipNft].isActive) return false;
        return IERC1155(membershipNft).balanceOf(user, groups[membershipNft].tokenId) > 0;
    }

    // -- POST FUNCTIONS --
    /**
     * @notice Author creates a post by providing a CID and paying the fee.
     * Only accessible by holders of the required ERC1155 token ID.
     */
    function createPost(string calldata cid, address membershipnft) external onlyMembers(membershipnft) returns (uint256 postId) {
        require(bytes(cid).length > 0 && bytes(cid).length < 128, "Bad CID len");

        postId = posts[membershipnft].length;
        
        posts[membershipnft].push(Post({
            author: msg.sender,
            cid: cid,
            createdAt: uint64(block.timestamp),
            status: Status.Active
        }));

        emit PostCreated(postId, msg.sender, cid, block.timestamp);
    }

    function getPosts(address membershipnft) external view returns (Post[] memory) {
        return posts[membershipnft];
    }
}

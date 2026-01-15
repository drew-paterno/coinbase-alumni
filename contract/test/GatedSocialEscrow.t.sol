// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {GatedSocialEscrow} from "../src/GatedSocialEscrow.sol";

/**
 * @dev Mock ERC1155 for testing membership checks
 */
contract MockERC1155 {
    mapping(address => mapping(uint256 => uint256)) private _balances;

    function setBalance(address account, uint256 id, uint256 amount) external {
        _balances[account][id] = amount;
    }

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _balances[account][id];
    }
}

contract GatedSocialEscrowTest is Test {
    GatedSocialEscrow public escrow;
    MockERC1155 public mockNft;

    address public protocolRecipient = address(0x1);
    address public submitter = address(0x2);
    address public author = address(0x3);
    address public nonMember = address(0x4);

    uint256 public constant TOKEN_ID = 1;
    string public constant GROUP_NAME = "Test Group";

    event GroupAdded(address indexed membershipNft, uint256 indexed tokenId, string groupName);
    event GroupRemoved(address indexed membershipNft);

    function setUp() public {
        // Deploy mock NFT
        mockNft = new MockERC1155();

        // Deploy escrow contract as protocol recipient
        vm.prank(protocolRecipient);
        escrow = new GatedSocialEscrow(protocolRecipient);

        // Give author a membership token
        mockNft.setBalance(author, TOKEN_ID, 1);
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsProtocolRecipient() public view {
        assertEq(escrow.protocolRecipient(), protocolRecipient);
    }

    function test_Constructor_RevertsOnZeroAddress() public {
        vm.expectRevert("protocol=0");
        new GatedSocialEscrow(address(0));
    }

    // ============ Add Group Tests ============

    function test_AddGroup_Success() public {
        vm.prank(protocolRecipient);
        
        vm.expectEmit(true, true, false, true);
        emit GroupAdded(address(mockNft), TOKEN_ID, GROUP_NAME);
        
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Verify group was added
        (uint256 tokenId, string memory name, bool isActive, address nftAddr) = escrow.groups(address(mockNft));
        assertEq(tokenId, TOKEN_ID);
        assertEq(name, GROUP_NAME);
        assertTrue(isActive);
        assertEq(nftAddr, address(mockNft));
    }

    function test_AddGroup_RevertsIfNotProtocol() public {
        vm.prank(author);
        vm.expectRevert("Only protocol");
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);
    }

    function test_AddGroup_RevertsIfGroupExists() public {
        // Add group first
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Try to add again
        vm.prank(protocolRecipient);
        vm.expectRevert("group already exists");
        escrow.addGroup("Another Name", address(mockNft), TOKEN_ID);
    }

    function test_AddGroup_MultipleGroups() public {
        MockERC1155 mockNft2 = new MockERC1155();
        MockERC1155 mockNft3 = new MockERC1155();

        vm.startPrank(protocolRecipient);
        escrow.addGroup("Group 1", address(mockNft), 1);
        escrow.addGroup("Group 2", address(mockNft2), 2);
        escrow.addGroup("Group 3", address(mockNft3), 3);
        vm.stopPrank();

        // Verify all groups
        (uint256 tokenId1,, bool isActive1,) = escrow.groups(address(mockNft));
        (uint256 tokenId2,, bool isActive2,) = escrow.groups(address(mockNft2));
        (uint256 tokenId3,, bool isActive3,) = escrow.groups(address(mockNft3));

        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(tokenId3, 3);
        assertTrue(isActive1);
        assertTrue(isActive2);
        assertTrue(isActive3);
    }

    // ============ Remove Group Tests ============

    function test_RemoveGroup_Success() public {
        // Add group first
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Remove group
        vm.prank(protocolRecipient);
        
        vm.expectEmit(true, false, false, false);
        emit GroupRemoved(address(mockNft));
        
        escrow.removeGroup(address(mockNft));

        // Verify group is inactive
        (,, bool isActive,) = escrow.groups(address(mockNft));
        assertFalse(isActive);
    }

    function test_RemoveGroup_RevertsIfNotProtocol() public {
        // Add group first
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Try to remove as non-protocol
        vm.prank(author);
        vm.expectRevert("Only protocol");
        escrow.removeGroup(address(mockNft));
    }

    function test_RemoveGroup_RevertsIfGroupDoesNotExist() public {
        vm.prank(protocolRecipient);
        vm.expectRevert("group does not exist or is inactive");
        escrow.removeGroup(address(mockNft));
    }

    function test_RemoveGroup_RevertsIfAlreadyRemoved() public {
        // Add then remove group
        vm.startPrank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);
        escrow.removeGroup(address(mockNft));

        // Try to remove again
        vm.expectRevert("group does not exist or is inactive");
        escrow.removeGroup(address(mockNft));
        vm.stopPrank();
    }

    // ============ Get Groups Tests ============

    function test_GetGroups_ReturnsEmpty_WhenNoGroups() public view {
        GatedSocialEscrow.Group[] memory groups = escrow.getGroups(0, 10);
        assertEq(groups.length, 0);
    }

    function test_GetGroups_ReturnsAllGroups() public {
        MockERC1155 mockNft2 = new MockERC1155();

        vm.startPrank(protocolRecipient);
        escrow.addGroup("Group 1", address(mockNft), 1);
        escrow.addGroup("Group 2", address(mockNft2), 2);
        vm.stopPrank();

        GatedSocialEscrow.Group[] memory groups = escrow.getGroups(0, 10);
        assertEq(groups.length, 2);
        assertEq(groups[0].tokenId, 1);
        assertEq(groups[1].tokenId, 2);
    }

    function test_GetGroups_Pagination_FirstPage() public {
        // Add 5 groups
        _addMultipleGroups(5);

        GatedSocialEscrow.Group[] memory groups = escrow.getGroups(0, 2);
        assertEq(groups.length, 2);
        assertEq(groups[0].tokenId, 0);
        assertEq(groups[1].tokenId, 1);
    }

    function test_GetGroups_Pagination_MiddlePage() public {
        // Add 5 groups
        _addMultipleGroups(5);

        GatedSocialEscrow.Group[] memory groups = escrow.getGroups(2, 2);
        assertEq(groups.length, 2);
        assertEq(groups[0].tokenId, 2);
        assertEq(groups[1].tokenId, 3);
    }

    function test_GetGroups_Pagination_LastPage() public {
        // Add 5 groups
        _addMultipleGroups(5);

        GatedSocialEscrow.Group[] memory groups = escrow.getGroups(4, 10);
        assertEq(groups.length, 1);
        assertEq(groups[0].tokenId, 4);
    }

    function test_GetGroups_Pagination_OffsetPastEnd() public {
        // Add 5 groups
        _addMultipleGroups(5);

        GatedSocialEscrow.Group[] memory groups = escrow.getGroups(100, 10);
        assertEq(groups.length, 0);
    }

    // ============ isMember Tests ============

    function test_IsMember_ReturnsTrue_WhenHoldsToken() public {
        // Add group
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Check membership for author (who has the token)
        bool isMember = escrow.isMember(address(mockNft), author);
        assertTrue(isMember);
    }

    function test_IsMember_ReturnsFalse_WhenNoToken() public {
        // Add group
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Check membership for nonMember (who doesn't have the token)
        bool isMember = escrow.isMember(address(mockNft), nonMember);
        assertFalse(isMember);
    }

    function test_IsMember_ReturnsFalse_WhenGroupNotActive() public {
        // Don't add group - isMember should return false for inactive group
        bool isMember = escrow.isMember(address(mockNft), author);
        assertFalse(isMember);
    }

    function test_IsMember_ReturnsFalse_WhenGroupRemoved() public {
        // Add then remove group
        vm.startPrank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);
        escrow.removeGroup(address(mockNft));
        vm.stopPrank();

        // Should return false even if user has the token
        bool isMember = escrow.isMember(address(mockNft), author);
        assertFalse(isMember);
    }

    // ============ createPost Tests ============

    event PostCreated(uint256 indexed postId, address indexed author, string cid, uint256 createdAt);

    function test_CreatePost_Success() public {
        // Add group
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        string memory testCid = "QmYwAPJzv5CZsnAzt8auVZRn4yMA9jZZovYk9fY8q3WPQA";
        
        vm.prank(author);
        vm.expectEmit(true, true, false, true);
        emit PostCreated(0, author, testCid, block.timestamp);
        
        uint256 postId = escrow.createPost(testCid, address(mockNft));
        
        assertEq(postId, 0);
        
        GatedSocialEscrow.Post[] memory posts = escrow.getPosts(address(mockNft));
        assertEq(posts.length, 1);
        assertEq(posts[0].author, author);
        assertEq(posts[0].cid, testCid);
    }

    function test_CreatePost_ReturnsCorrectPostIds() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        vm.startPrank(author);
        uint256 id1 = escrow.createPost("QmCid1", address(mockNft));
        uint256 id2 = escrow.createPost("QmCid2", address(mockNft));
        uint256 id3 = escrow.createPost("QmCid3", address(mockNft));
        vm.stopPrank();

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(id3, 2);
    }

    function test_CreatePost_RevertsIfNotMember() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        vm.prank(nonMember);
        vm.expectRevert("Not a member");
        escrow.createPost("QmTest123", address(mockNft));
    }

    function test_CreatePost_RevertsIfGroupInactive() public {
        // Group not added
        vm.prank(author);
        vm.expectRevert("group does not exist or is inactive");
        escrow.createPost("QmTest123", address(mockNft));
    }

    function test_CreatePost_RevertsIfGroupRemoved() public {
        vm.startPrank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);
        escrow.removeGroup(address(mockNft));
        vm.stopPrank();

        vm.prank(author);
        vm.expectRevert("group does not exist or is inactive");
        escrow.createPost("QmTest123", address(mockNft));
    }

    function test_CreatePost_RevertsIfCidEmpty() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        vm.prank(author);
        vm.expectRevert("Bad CID len");
        escrow.createPost("", address(mockNft));
    }

    function test_CreatePost_RevertsIfCidTooLong() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        // Create a CID that's 128+ characters
        bytes memory longCid = new bytes(128);
        for (uint i = 0; i < 128; i++) {
            longCid[i] = "a";
        }

        vm.prank(author);
        vm.expectRevert("Bad CID len");
        escrow.createPost(string(longCid), address(mockNft));
    }

    function test_CreatePost_MultiplePosts() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        vm.startPrank(author);
        escrow.createPost("QmCid1", address(mockNft));
        escrow.createPost("QmCid2", address(mockNft));
        escrow.createPost("QmCid3", address(mockNft));
        vm.stopPrank();

        GatedSocialEscrow.Post[] memory posts = escrow.getPosts(address(mockNft));
        assertEq(posts.length, 3);
        assertEq(posts[0].cid, "QmCid1");
        assertEq(posts[1].cid, "QmCid2");
        assertEq(posts[2].cid, "QmCid3");
    }

    function test_CreatePost_PostsIsolatedByGroup() public {
        MockERC1155 mockNft2 = new MockERC1155();
        mockNft2.setBalance(author, 2, 1);

        vm.startPrank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);
        escrow.addGroup("Group 2", address(mockNft2), 2);
        vm.stopPrank();

        vm.startPrank(author);
        escrow.createPost("QmGroup1Post", address(mockNft));
        escrow.createPost("QmGroup2Post", address(mockNft2));
        vm.stopPrank();

        GatedSocialEscrow.Post[] memory posts1 = escrow.getPosts(address(mockNft));
        GatedSocialEscrow.Post[] memory posts2 = escrow.getPosts(address(mockNft2));

        assertEq(posts1.length, 1);
        assertEq(posts2.length, 1);
        assertEq(posts1[0].cid, "QmGroup1Post");
        assertEq(posts2[0].cid, "QmGroup2Post");
    }

    // ============ getPosts Tests ============

    function test_GetPosts_ReturnsEmptyForNewGroup() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        GatedSocialEscrow.Post[] memory posts = escrow.getPosts(address(mockNft));
        assertEq(posts.length, 0);
    }

    function test_GetPosts_ReturnsEmptyForNonExistentGroup() public view {
        GatedSocialEscrow.Post[] memory posts = escrow.getPosts(address(mockNft));
        assertEq(posts.length, 0);
    }

    // ============ getGroupPostCount Tests ============

    function test_GetGroupPostCount_ReturnsZeroForNewGroup() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        uint256 count = escrow.getGroupPostCount(address(mockNft));
        assertEq(count, 0);
    }

    function test_GetGroupPostCount_ReturnsZeroForNonExistentGroup() public view {
        uint256 count = escrow.getGroupPostCount(address(mockNft));
        assertEq(count, 0);
    }

    function test_GetGroupPostCount_ReturnsCorrectCount() public {
        vm.prank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);

        vm.startPrank(author);
        escrow.createPost("QmCid1", address(mockNft));
        escrow.createPost("QmCid2", address(mockNft));
        escrow.createPost("QmCid3", address(mockNft));
        vm.stopPrank();

        uint256 count = escrow.getGroupPostCount(address(mockNft));
        assertEq(count, 3);
    }

    function test_GetGroupPostCount_IsolatedByGroup() public {
        MockERC1155 mockNft2 = new MockERC1155();
        mockNft2.setBalance(author, 2, 1);

        vm.startPrank(protocolRecipient);
        escrow.addGroup(GROUP_NAME, address(mockNft), TOKEN_ID);
        escrow.addGroup("Group 2", address(mockNft2), 2);
        vm.stopPrank();

        vm.startPrank(author);
        escrow.createPost("QmCid1", address(mockNft));
        escrow.createPost("QmCid2", address(mockNft));
        escrow.createPost("QmCid3", address(mockNft2));
        vm.stopPrank();

        assertEq(escrow.getGroupPostCount(address(mockNft)), 2);
        assertEq(escrow.getGroupPostCount(address(mockNft2)), 1);
    }

    // ============ Helper Functions ============

    function _addMultipleGroups(uint256 count) internal {
        vm.startPrank(protocolRecipient);
        for (uint256 i = 0; i < count; i++) {
            MockERC1155 nft = new MockERC1155();
            escrow.addGroup(
                string(abi.encodePacked("Group ", vm.toString(i))),
                address(nft),
                i
            );
        }
        vm.stopPrank();
    }
}


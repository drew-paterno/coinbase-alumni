// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal interface for ERC1155 balance checking.
 */
interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title GatedSocialEscrow (ERC1155 Version)
 * @notice NFT-gated social posts with linear escrow streaming.
 * - Poster pays ETH = protocolCut + escrow.
 * - Submitter ACKs pinning -> receives setup payout immediately.
 * - Remaining escrow streams linearly over 365 days to submitter.
 * - Author can cancel anytime and reclaim unvested escrow.
 */
contract GatedSocialEscrow {
    // --- Config ---
    IERC1155 public immutable membership;
    uint256  public immutable membershipTokenId;

    address public protocolRecipient; // your royalty wallet
    address public submitter;         // central submitter node wallet

    uint256 public postFeeWei;        // total fee paid by poster
    uint16  public protocolBps;       // share of total fee to protocol (0..10000)
    uint16  public setupBpsOfEscrow;  // share of ESCROW paid immediately on ACK (0..10000)

    uint256 public ackTimeout;        // seconds after createPost for submitter to ACK
    uint256 public constant STREAM_DURATION = 365 days;

    // --- Data ---
    enum Status { None, Pending, Active, Removed, Refunded, Completed }

    struct Post {
        address author;
        string cid;
        uint64 createdAt;
        uint64 ackedAt;
        uint64 removedAt;
        Status status;
        uint256 escrowTotal;     // total escrow locked (after protocol cut)
        uint256 setupPaid;       // amount paid at ACK
        uint256 streamPaid;      // amount paid so far from streaming
    }

    struct Group {
        uint256 tokenId;
        string name;
        bool isActive;
    }

    uint256 public nextPostId = 1;
    mapping(uint256 => Post) public posts;
    mapping(address => Group) public groups;
    address[] public groupAddresses;

    // --- Events ---
    event PostCreated(uint256 indexed postId, address indexed author, string cid, uint256 escrowTotal, uint256 createdAt);
    event PostAcked(uint256 indexed postId, address indexed submitter, uint256 setupPaid, uint256 ackedAt);
    event PostSettled(uint256 indexed postId, address indexed submitter, uint256 paid, uint256 totalStreamPaid);
    event PostRemoved(uint256 indexed postId, address indexed author, uint256 refund, uint256 removedAt);
    event PostRefundedUnacked(uint256 indexed postId, address indexed author, uint256 refund, uint256 refundedAt);
    event GroupAdded(address indexed membershipNft, uint256 indexed tokenId, string groupName);
    event GroupRemoved(address indexed membershipNft);

    // --- Modifiers ---
    modifier onlyMembers(address membershipnft) {
        // Updated for ERC1155 logic
        require(groups[membershipnft].isActive == true, "group does not exist or is inactive");
        require(membership.balanceOf(msg.sender, groups[membershipnft].tokenId) > 0, "Not a member of specific token ID");
        _;
    }

    modifier onlySubmitter() {
        require(msg.sender == submitter, "Only submitter");
        _;
    }

    modifier onlyProtocol() {
        require(msg.sender == protocolRecipient, "Only protocol");
        _;
    }

    constructor(
        address protocolRecipient_,
        address submitter_,
        uint256 postFeeWei_,
        uint16 protocolBps_,
        uint16 setupBpsOfEscrow_,
        uint256 ackTimeoutSeconds_
    ) {
        require(protocolRecipient_ != address(0), "protocol=0");
        require(submitter_ != address(0), "submitter=0");
        require(protocolBps_ <= 10_000, "protocolBps");
        require(setupBpsOfEscrow_ <= 10_000, "setupBps");
        require(postFeeWei_ > 0, "fee=0");

        protocolRecipient = protocolRecipient_;
        submitter = submitter_;

        postFeeWei = postFeeWei_;
        protocolBps = protocolBps_;
        setupBpsOfEscrow = setupBpsOfEscrow_;

        ackTimeout = ackTimeoutSeconds_;
    }

    // -- Add group to supported groups --
    function addGroup(string calldata groupName, address membershipNft, uint256 membershipTokenId_) external onlyProtocol {
        require(groups[membershipNft].isActive == false, "group already exists");
        groups[membershipNft] = Group({
            isActive: true,
            tokenId: membershipTokenId_,
            name: groupName
        });
        groupAddresses.push(membershipNft);
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

    // --- Admin Functions ---
    function setRecipients(address protocolRecipient_, address submitter_) external onlyProtocol {
        require(protocolRecipient_ != address(0), "protocol=0");
        require(submitter_ != address(0), "submitter=0");
        protocolRecipient = protocolRecipient_;
        submitter = submitter_;
    }

    function setEconomics(uint256 postFeeWei_, uint16 protocolBps_, uint16 setupBpsOfEscrow_) external onlyProtocol {
        require(postFeeWei_ > 0, "fee=0");
        require(protocolBps_ <= 10_000, "protocolBps");
        require(setupBpsOfEscrow_ <= 10_000, "setupBps");

        postFeeWei = postFeeWei_;
        protocolBps = protocolBps_;
        setupBpsOfEscrow = setupBpsOfEscrow_;
    }

    function setAckTimeout(uint256 ackTimeoutSeconds_) external onlyProtocol {
        ackTimeout = ackTimeoutSeconds_;
    }

    // --- Core Flow ---

    /**
     * @notice Author creates a post by providing a CID and paying the fee.
     * Only accessible by holders of the required ERC1155 token ID.
     */
    function createPost(string calldata cid, address membershipnft) external payable onlyMembers(membershipnft) returns (uint256 postId) {
        require(msg.value == postFeeWei, "Wrong fee");
        require(bytes(cid).length > 0 && bytes(cid).length < 128, "Bad CID len");

        uint256 protocolCut = (msg.value * protocolBps) / 10_000;
        uint256 escrow = msg.value - protocolCut;

        if (protocolCut > 0) {
            (bool okP, ) = protocolRecipient.call{value: protocolCut}("");
            require(okP, "protocol pay fail");
        }

        postId = nextPostId++;
        Post storage p = posts[postId];
        p.author = msg.sender;
        p.cid = cid;
        p.createdAt = uint64(block.timestamp);
        p.status = Status.Pending;
        p.escrowTotal = escrow;

        emit PostCreated(postId, msg.sender, cid, escrow, block.timestamp);
    }

    /**
     * @notice Submitter triggers this once the content is pinned.
     * Releases the setup fee and begins the streaming period.
     */
    function ackPinned(uint256 postId) external onlySubmitter {
        Post storage p = posts[postId];
        require(p.status == Status.Pending, "Not pending");

        if (ackTimeout > 0) {
            require(block.timestamp <= uint256(p.createdAt) + ackTimeout, "ACK timeout");
        }

        p.ackedAt = uint64(block.timestamp);
        p.status = Status.Active;

        uint256 setupPay = (p.escrowTotal * setupBpsOfEscrow) / 10_000;
        p.setupPaid = setupPay;

        if (setupPay > 0) {
            (bool okS, ) = submitter.call{value: setupPay}("");
            require(okS, "setup pay fail");
        }

        emit PostAcked(postId, msg.sender, setupPay, block.timestamp);
    }

    /**
     * @notice Releases all ETH currently vested in the linear stream.
     */
    function settle(uint256 postId) external {
        Post storage p = posts[postId];
        require(p.status == Status.Active, "Not active");

        uint256 payableNow = _streamPayableNow(p);
        require(payableNow > 0, "Nothing to pay");

        p.streamPaid += payableNow;

        (bool ok, ) = submitter.call{value: payableNow}("");
        require(ok, "stream pay fail");

        if (p.setupPaid + p.streamPaid >= p.escrowTotal) {
            p.status = Status.Completed;
        }

        emit PostSettled(postId, submitter, payableNow, p.streamPaid);
    }

    /**
     * @notice If the submitter fails to ACK in time, author reclaims escrow.
     */
    function refundUnacked(uint256 postId) external {
        Post storage p = posts[postId];
        require(p.status == Status.Pending, "Not pending");
        require(msg.sender == p.author, "Not author");
        require(ackTimeout > 0, "No timeout set");
        require(block.timestamp > uint256(p.createdAt) + ackTimeout, "Too early");

        p.status = Status.Refunded;
        uint256 refund = p.escrowTotal;
        p.escrowTotal = 0;

        (bool ok, ) = p.author.call{value: refund}("");
        require(ok, "refund fail");

        emit PostRefundedUnacked(postId, p.author, refund, block.timestamp);
    }

    /**
     * @notice Author cancels the service.
     * Submitter keeps what has vested; Author reclaims the unvested remainder.
     */
    function removePost(uint256 postId) external {
        Post storage p = posts[postId];
        require(msg.sender == p.author, "Not author");

        if (p.status == Status.Pending) {
            p.status = Status.Removed;
            p.removedAt = uint64(block.timestamp);
            uint256 refundPending = p.escrowTotal;
            p.escrowTotal = 0;
            (bool okP, ) = p.author.call{value: refundPending}("");
            require(okP, "refund pending fail");
            emit PostRemoved(postId, p.author, refundPending, block.timestamp);
            return;
        }

        require(p.status == Status.Active, "Not removable");
        p.status = Status.Removed;
        p.removedAt = uint64(block.timestamp);

        uint256 vestedStream = _streamVested(p);
        uint256 totalVested = p.setupPaid + vestedStream;

        uint256 refundable;
        if (totalVested >= p.escrowTotal) {
            refundable = 0;
        } else {
            refundable = p.escrowTotal - totalVested;
        }

        uint256 bal = address(this).balance;
        if (refundable > bal) refundable = bal;

        if (refundable > 0) {
            (bool ok, ) = p.author.call{value: refundable}("");
            require(ok, "refund fail");
        }

        emit PostRemoved(postId, p.author, refundable, block.timestamp);
    }

    // --- View Helpers ---
    function streamRemaining(uint256 postId) external view returns (uint256) {
        Post storage p = posts[postId];
        if (p.status != Status.Active) return 0;
        uint256 vested = _streamVested(p);
        uint256 streamTotal = p.escrowTotal - p.setupPaid;
        if (vested >= streamTotal) return 0;
        return streamTotal - vested;
    }

    function streamPayableNow(uint256 postId) external view returns (uint256) {
        Post storage p = posts[postId];
        if (p.status != Status.Active) return 0;
        return _streamPayableNow(p);
    }

    // --- Internal streaming math ---
    function _streamVested(Post storage p) internal view returns (uint256) {
        if (p.ackedAt == 0) return 0;
        uint256 streamTotal = p.escrowTotal - p.setupPaid;
        if (streamTotal == 0) return 0;

        uint256 elapsed = block.timestamp - uint256(p.ackedAt);
        if (elapsed >= STREAM_DURATION) return streamTotal;

        return (streamTotal * elapsed) / STREAM_DURATION;
    }

    function _streamPayableNow(Post storage p) internal view returns (uint256) {
        uint256 vested = _streamVested(p);
        if (vested <= p.streamPaid) return 0;
        return vested - p.streamPaid;
    }

    receive() external payable {}
}

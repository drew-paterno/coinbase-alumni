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

    uint256 public nextPostId = 1;
    mapping(uint256 => Post) public posts;

    // --- Events ---
    event PostCreated(uint256 indexed postId, address indexed author, string cid, uint256 escrowTotal, uint256 createdAt);
    event PostAcked(uint256 indexed postId, address indexed submitter, uint256 setupPaid, uint256 ackedAt);
    event PostSettled(uint256 indexed postId, address indexed submitter, uint256 paid, uint256 totalStreamPaid);
    event PostRemoved(uint256 indexed postId, address indexed author, uint256 refund, uint256 removedAt);
    event PostRefundedUnacked(uint256 indexed postId, address indexed author, uint256 refund, uint256 refundedAt);

    // --- Modifiers ---
    modifier onlyMembers() {
        // Updated for ERC1155 logic
        require(membership.balanceOf(msg.sender, membershipTokenId) > 0, "Not a member of specific token ID");
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
        address membershipNft,
        uint256 membershipTokenId_,
        address protocolRecipient_,
        address submitter_,
        uint256 postFeeWei_,
        uint16 protocolBps_,
        uint16 setupBpsOfEscrow_,
        uint256 ackTimeoutSeconds_
    ) {
        require(membershipNft != address(0), "membership=0");
        require(protocolRecipient_ != address(0), "protocol=0");
        require(submitter_ != address(0), "submitter=0");
        require(protocolBps_ <= 10_000, "protocolBps");
        require(setupBpsOfEscrow_ <= 10_000, "setupBps");
        require(postFeeWei_ > 0, "fee=0");

        membership = IERC1155(membershipNft);
        membershipTokenId = membershipTokenId_;

        protocolRecipient = protocolRecipient_;
        submitter = submitter_;

        postFeeWei = postFeeWei_;
        protocolBps = protocolBps_;
        setupBpsOfEscrow = setupBpsOfEscrow_;

        ackTimeout = ackTimeoutSeconds_;
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
    function createPost(string calldata cid) external payable onlyMembers returns (uint256 postId) {
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

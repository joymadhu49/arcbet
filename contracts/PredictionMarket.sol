// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITreasury {
    function depositFee(uint256 amount) external;
    function feeBps() external view returns (uint256);
}

/// @title PredictionMarket
/// @notice Binary (YES/NO) prediction market settled in USDC
contract PredictionMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── State ──────────────────────────────────────────────
    enum Outcome { UNRESOLVED, YES, NO, CANCELLED }

    struct Market {
        string  question;
        string  description;
        string  category;
        string  imageUrl;
        uint256 resolutionTime;
        uint256 totalYes;    // USDC in YES pool
        uint256 totalNo;     // USDC in NO pool
        Outcome outcome;
        bool    resolved;
    }

    IERC20     public immutable usdc;
    ITreasury  public immutable treasury;
    address    public immutable factory;

    Market public market;

    // user => side => shares
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;
    mapping(address => bool)    public claimed;

    // ── Events ─────────────────────────────────────────────
    event BetPlaced(address indexed user, bool isYes, uint256 amount, uint256 fee);
    event MarketResolved(Outcome outcome);
    event WinningsClaimed(address indexed user, uint256 amount);
    event MarketCancelled();

    // ── Errors ─────────────────────────────────────────────
    error MarketClosed();
    error AlreadyResolved();
    error NotResolved();
    error AlreadyClaimed();
    error ZeroAmount();
    error NotFactory();

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor(
        address _usdc,
        address _treasury,
        address _factory,
        string memory _question,
        string memory _description,
        string memory _category,
        string memory _imageUrl,
        uint256 _resolutionTime
    ) {
        usdc     = IERC20(_usdc);
        treasury = ITreasury(_treasury);
        factory  = _factory;

        market = Market({
            question:       _question,
            description:    _description,
            category:       _category,
            imageUrl:       _imageUrl,
            resolutionTime: _resolutionTime,
            totalYes:       0,
            totalNo:        0,
            outcome:        Outcome.UNRESOLVED,
            resolved:       false
        });
    }

    // ── Betting ────────────────────────────────────────────

    /// @notice Place a bet. USDC must be approved first.
    /// @param isYes   true = YES side, false = NO side
    /// @param amount  gross USDC amount (fee deducted from this)
    function placeBet(bool isYes, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (market.resolved || block.timestamp >= market.resolutionTime) revert MarketClosed();

        // pull full amount from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // deduct platform fee
        uint256 feeBps  = treasury.feeBps();
        uint256 fee     = (amount * feeBps) / 10_000;
        uint256 netBet  = amount - fee;

        // approve treasury to pull fee (forceApprove handles non-standard ERC20s safely)
        usdc.forceApprove(address(treasury), fee);
        treasury.depositFee(fee);

        // credit shares
        if (isYes) {
            yesShares[msg.sender] += netBet;
            market.totalYes       += netBet;
        } else {
            noShares[msg.sender]  += netBet;
            market.totalNo        += netBet;
        }

        emit BetPlaced(msg.sender, isYes, netBet, fee);
    }

    // ── Resolution ─────────────────────────────────────────

    /// @notice Resolve the market (called by factory/admin)
    function resolve(bool yesWon) external onlyFactory {
        if (market.resolved) revert AlreadyResolved();
        market.resolved = true;
        market.outcome  = yesWon ? Outcome.YES : Outcome.NO;
        emit MarketResolved(market.outcome);
    }

    /// @notice Cancel market and refund all bets
    function cancel() external onlyFactory {
        if (market.resolved) revert AlreadyResolved();
        market.resolved = true;
        market.outcome  = Outcome.CANCELLED;
        emit MarketCancelled();
    }

    // ── Claiming ───────────────────────────────────────────

    /// @notice Claim winnings after resolution
    function claimWinnings() external nonReentrant {
        if (!market.resolved) revert NotResolved();
        if (claimed[msg.sender]) revert AlreadyClaimed();
        claimed[msg.sender] = true;

        uint256 payout = _calculatePayout(msg.sender);
        require(payout > 0, "No winnings");

        usdc.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(msg.sender, payout);
    }

    // ── Views ──────────────────────────────────────────────

    function getMarket() external view returns (Market memory) {
        return market;
    }

    function getUserShares(address user) external view returns (uint256 yes, uint256 no) {
        return (yesShares[user], noShares[user]);
    }

    /// @notice Estimate payout for a user
    function previewPayout(address user) external view returns (uint256) {
        return _calculatePayout(user);
    }

    /// @notice Current YES odds (scaled to 1e18 = 100%)
    function yesOdds() external view returns (uint256) {
        uint256 total = market.totalYes + market.totalNo;
        if (total == 0) return 0.5e18;
        return (market.totalYes * 1e18) / total;
    }

    function noOdds() external view returns (uint256) {
        uint256 total = market.totalYes + market.totalNo;
        if (total == 0) return 0.5e18;
        return (market.totalNo * 1e18) / total;
    }

    function totalPool() external view returns (uint256) {
        return market.totalYes + market.totalNo;
    }

    // ── Internal ───────────────────────────────────────────

    function _calculatePayout(address user) internal view returns (uint256) {
        Outcome o = market.outcome;

        if (o == Outcome.CANCELLED) {
            // full refund of both sides
            return yesShares[user] + noShares[user];
        }

        if (o == Outcome.YES) {
            if (yesShares[user] == 0) return 0;
            uint256 total = market.totalYes + market.totalNo;
            return (yesShares[user] * total) / market.totalYes;
        }

        if (o == Outcome.NO) {
            if (noShares[user] == 0) return 0;
            uint256 total = market.totalYes + market.totalNo;
            return (noShares[user] * total) / market.totalNo;
        }

        return 0; // UNRESOLVED
    }
}

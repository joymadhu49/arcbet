// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface ITreasury {
    function depositFee(uint256 amount) external;
    function feeBps() external view returns (uint256);
}

/// @title PredictionMarket (FPMM — Fixed-Product Market Maker)
/// @notice Binary YES/NO prediction market with a Polymarket-style CPMM:
///         users can buy AND sell shares at any time before resolution.
///
///         Mechanics (analogous to Polymarket FPMM):
///         - Pool holds `yesReserve` YES shares + `noReserve` NO shares; invariant yesReserve*noReserve = k.
///         - 1 YES + 1 NO = 1 USDC (conditional-token split/merge).
///         - BUY YES with X USDC: split X USDC → X YES + X NO; deposit all NO to pool;
///           swap pool NO→YES through CPMM; user receives `X + Δy` YES.
///         - SELL `sharesIn` YES for USDC: solve a quadratic to find amountOut such that
///           swapping YES→NO plus merging paired YES+NO yields exactly amountOut USDC.
///         - At RESOLVE: winning shares redeem for 1 USDC each; losing shares → 0.
///           Residual USDC (from the pool's winning-side reserve) belongs to the LP (treasury).
///         - FEES: a percentage of every buy/sell `amountIn`/`amountOut` is routed to treasury.
contract PredictionMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ── State ──────────────────────────────────────────────
    enum Outcome { UNRESOLVED, YES, NO, CANCELLED }

    struct Market {
        string  question;
        string  description;
        string  category;
        string  imageUrl;
        uint256 resolutionTime;
        uint256 seedLiquidity;  // `L` — initial USDC seeded by LP (treasury)
        Outcome outcome;
        bool    resolved;
    }

    IERC20     public immutable usdc;
    ITreasury  public immutable treasury;
    address    public immutable factory;

    Market public market;

    /// CPMM pool reserves, in USDC base units (6 decimals).
    uint256 public yesReserve;
    uint256 public noReserve;

    /// USDC collateral locked against outstanding shares (net of pool reserves).
    /// Increments on buy, decrements on sell, drains on resolve/claim.
    uint256 public totalCollateral;

    // user => side => shares
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;
    mapping(address => bool)    public claimed;

    /// Minimum bet/sell size (0.01 USDC) so fees never round to zero.
    uint256 public constant MIN_AMOUNT = 10_000;

    // ── Events ─────────────────────────────────────────────
    event BetBought(address indexed user, bool isYes, uint256 amountIn, uint256 sharesOut, uint256 fee);
    event BetSold(address indexed user, bool isYes, uint256 sharesIn, uint256 amountOut, uint256 fee);
    event MarketResolved(Outcome outcome);
    event WinningsClaimed(address indexed user, uint256 amount);
    event MarketCancelled();

    // ── Errors ─────────────────────────────────────────────
    error MarketClosed();
    error AlreadyResolved();
    error NotResolved();
    error AlreadyClaimed();
    error ZeroAmount();
    error BetTooSmall();
    error NotFactory();
    error InsufficientShares();
    error Slippage();
    error SellExceedsLiquidity();

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
        uint256 _resolutionTime,
        uint256 _seedLiquidity
    ) {
        require(_seedLiquidity >= MIN_AMOUNT, "seed too small");
        usdc     = IERC20(_usdc);
        treasury = ITreasury(_treasury);
        factory  = _factory;

        market = Market({
            question:       _question,
            description:    _description,
            category:       _category,
            imageUrl:       _imageUrl,
            resolutionTime: _resolutionTime,
            seedLiquidity:  _seedLiquidity,
            outcome:        Outcome.UNRESOLVED,
            resolved:       false
        });

        // Factory MUST transfer `_seedLiquidity` USDC to this contract before/during construction.
        yesReserve      = _seedLiquidity;
        noReserve       = _seedLiquidity;
        totalCollateral = _seedLiquidity;
    }

    // ── Buy ────────────────────────────────────────────────

    /// @notice Buy `isYes` shares with `amountIn` USDC. Reverts if slippage exceeds `minSharesOut`.
    function buy(bool isYes, uint256 amountIn, uint256 minSharesOut)
        external
        nonReentrant
        returns (uint256 sharesOut)
    {
        if (amountIn < MIN_AMOUNT) revert BetTooSmall();
        if (market.resolved || block.timestamp >= market.resolutionTime) revert MarketClosed();

        usdc.safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 feeBps = treasury.feeBps();
        uint256 fee    = (amountIn * feeBps) / 10_000;
        uint256 net    = amountIn - fee;

        usdc.forceApprove(address(treasury), fee);
        treasury.depositFee(fee);

        // CPMM swap: split `net` USDC into `net` YES + `net` NO; deposit the opposite side
        // to the pool; pull the desired side out to keep invariant yesReserve*noReserve = k.
        uint256 yOld = yesReserve;
        uint256 nOld = noReserve;
        uint256 k    = yOld * nOld;

        if (isYes) {
            uint256 nNew = nOld + net;
            // Round yNew UP so yNew*nNew >= k → pool never loses value; user gets slightly fewer shares.
            uint256 yNew = Math.ceilDiv(k, nNew);
            sharesOut    = net + (yOld - yNew);
            yesReserve   = yNew;
            noReserve    = nNew;
            yesShares[msg.sender] += sharesOut;
        } else {
            uint256 yNew = yOld + net;
            uint256 nNew = Math.ceilDiv(k, yNew);
            sharesOut    = net + (nOld - nNew);
            yesReserve   = yNew;
            noReserve    = nNew;
            noShares[msg.sender] += sharesOut;
        }

        totalCollateral += net;
        if (sharesOut < minSharesOut) revert Slippage();

        emit BetBought(msg.sender, isYes, amountIn, sharesOut, fee);
    }

    // ── Sell ───────────────────────────────────────────────

    /// @notice Sell `sharesIn` of the `isYes` side for USDC at the current AMM price.
    ///         Reverts if slippage pushes `amountOut` below `minAmountOut`.
    function sell(bool isYes, uint256 sharesIn, uint256 minAmountOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (sharesIn == 0) revert ZeroAmount();
        if (market.resolved || block.timestamp >= market.resolutionTime) revert MarketClosed();
        if (sharesIn < MIN_AMOUNT) revert BetTooSmall();

        if (isYes) {
            if (yesShares[msg.sender] < sharesIn) revert InsufficientShares();
        } else {
            if (noShares[msg.sender]  < sharesIn) revert InsufficientShares();
        }

        // Solve for amountOut (pre-fee) from the quadratic:
        //   A^2 - A·(Y + N + sharesIn) + sharesIn·oppositeReserve = 0
        //   A = [(Y+N+sharesIn) - sqrt((Y+N+sharesIn)^2 - 4·sharesIn·oppositeReserve)] / 2
        uint256 grossOut = _computeSellOut(isYes, sharesIn);
        if (grossOut == 0) revert ZeroAmount();
        if (grossOut >= noReserve || grossOut >= yesReserve) revert SellExceedsLiquidity();

        // Apply fee on payout (symmetric with buy-side fee).
        uint256 feeBps = treasury.feeBps();
        uint256 fee    = (grossOut * feeBps) / 10_000;
        amountOut      = grossOut - fee;

        if (amountOut < minAmountOut) revert Slippage();

        // Burn user's shares; update pool; pay treasury + user.
        if (isYes) {
            yesShares[msg.sender] -= sharesIn;
            yesReserve            += (sharesIn - grossOut);  // swap-in YES minus burned YES
            noReserve             -= grossOut;
        } else {
            noShares[msg.sender]  -= sharesIn;
            noReserve             += (sharesIn - grossOut);
            yesReserve            -= grossOut;
        }
        totalCollateral -= grossOut;

        usdc.forceApprove(address(treasury), fee);
        treasury.depositFee(fee);
        usdc.safeTransfer(msg.sender, amountOut);

        emit BetSold(msg.sender, isYes, sharesIn, amountOut, fee);
    }

    /// @notice Preview sell output (pre-fee) for UI slippage estimation.
    function previewSell(bool isYes, uint256 sharesIn) external view returns (uint256 grossOut) {
        if (sharesIn == 0) return 0;
        grossOut = _computeSellOut(isYes, sharesIn);
    }

    function _computeSellOut(bool isYes, uint256 sharesIn) internal view returns (uint256) {
        uint256 Y = yesReserve;
        uint256 N = noReserve;
        uint256 oppReserve = isYes ? N : Y;
        uint256 b = Y + N + sharesIn;                 // quadratic middle coeff
        uint256 disc = b * b - 4 * sharesIn * oppReserve;
        // Feasibility: disc must be non-negative (always true when sharesIn < Y+N).
        uint256 root = Math.sqrt(disc);
        // Choose minus branch: A = (b - sqrt(disc)) / 2
        return (b - root) / 2;
    }

    // ── Resolution ─────────────────────────────────────────

    function resolve(bool yesWon) external onlyFactory {
        if (market.resolved) revert AlreadyResolved();
        market.resolved = true;
        market.outcome  = yesWon ? Outcome.YES : Outcome.NO;
        emit MarketResolved(market.outcome);
    }

    function cancel() external onlyFactory {
        if (market.resolved) revert AlreadyResolved();
        market.resolved = true;
        market.outcome  = Outcome.CANCELLED;
        emit MarketCancelled();
    }

    // ── Claiming ───────────────────────────────────────────

    /// @notice After resolution, winners claim 1 USDC per winning share.
    ///         On cancel, both sides get their shares refunded 1:1.
    function claimWinnings() external nonReentrant {
        if (!market.resolved) revert NotResolved();
        if (claimed[msg.sender]) revert AlreadyClaimed();
        claimed[msg.sender] = true;

        uint256 payout = _calculatePayout(msg.sender);
        require(payout > 0, "No winnings");

        usdc.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(msg.sender, payout);
    }

    /// @notice LP (treasury) can withdraw its share of residual USDC after resolution
    ///         (= the pool's winning-side reserve).  Only callable by factory.
    function withdrawResidual(address to) external onlyFactory returns (uint256 amount) {
        if (!market.resolved) revert NotResolved();
        Outcome o = market.outcome;

        if (o == Outcome.YES) {
            amount = yesReserve;
            yesReserve = 0;
        } else if (o == Outcome.NO) {
            amount = noReserve;
            noReserve = 0;
        } else {
            // CANCELLED: LP gets nothing beyond what users refund-claim; seed already returned via claims.
            amount = 0;
        }
        if (amount > 0) {
            usdc.safeTransfer(to, amount);
        }
    }

    // ── Views ──────────────────────────────────────────────

    function getMarket() external view returns (Market memory) {
        return market;
    }

    function getUserShares(address user) external view returns (uint256 yes, uint256 no) {
        return (yesShares[user], noShares[user]);
    }

    function previewPayout(address user) external view returns (uint256) {
        return _calculatePayout(user);
    }

    /// @notice Current YES odds (scaled to 1e18 = 100%) from CPMM spot: N / (Y + N).
    function yesOdds() external view returns (uint256) {
        uint256 total = yesReserve + noReserve;
        if (total == 0) return 0.5e18;
        return (noReserve * 1e18) / total;
    }

    function noOdds() external view returns (uint256) {
        uint256 total = yesReserve + noReserve;
        if (total == 0) return 0.5e18;
        return (yesReserve * 1e18) / total;
    }

    /// @notice Quote how many shares `amountIn` USDC buys (net of fee), for UI.
    function previewBuy(bool isYes, uint256 amountIn) external view returns (uint256 sharesOut) {
        if (amountIn < MIN_AMOUNT) return 0;
        uint256 feeBps = treasury.feeBps();
        uint256 net    = amountIn - (amountIn * feeBps) / 10_000;
        uint256 k      = yesReserve * noReserve;
        if (isYes) {
            uint256 nNew = noReserve + net;
            uint256 yNew = Math.ceilDiv(k, nNew);
            sharesOut = net + (yesReserve - yNew);
        } else {
            uint256 yNew = yesReserve + net;
            uint256 nNew = Math.ceilDiv(k, yNew);
            sharesOut = net + (noReserve - nNew);
        }
    }

    /// @notice Total AMM liquidity (YES + NO reserves).  Used by UI for "pool size".
    function totalPool() external view returns (uint256) {
        return yesReserve + noReserve;
    }

    // ── Internal ───────────────────────────────────────────

    function _calculatePayout(address user) internal view returns (uint256) {
        Outcome o = market.outcome;

        if (o == Outcome.CANCELLED) {
            return yesShares[user] + noShares[user];
        }
        if (o == Outcome.YES) {
            return yesShares[user];                // 1 USDC per YES share
        }
        if (o == Outcome.NO) {
            return noShares[user];
        }
        return 0;
    }
}

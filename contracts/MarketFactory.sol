// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PredictionMarket.sol";
import "./Treasury.sol";

/// @title MarketFactory
/// @notice Deploys FPMM-style prediction markets, seeded from the treasury.
contract MarketFactory is Ownable {
    using SafeERC20 for IERC20;

    Treasury public immutable treasury;
    IERC20   public immutable usdc;

    /// Default LP seed per market (USDC base units, 6 decimals).  Admin tunable.
    uint256 public defaultSeedLiquidity = 100 * 10**6; // 100 USDC
    uint256 public constant MIN_SEED = 1 * 10**6;      // 1 USDC floor
    uint256 public constant MAX_SEED = 100_000 * 10**6; // 100k USDC ceiling

    address[] public allMarkets;

    event MarketCreated(
        address indexed market,
        string  question,
        string  category,
        uint256 resolutionTime,
        uint256 seedLiquidity
    );
    event MarketResolved(address indexed market, bool yesWon);
    event MarketCancelled(address indexed market);
    event SeedLiquidityUpdated(uint256 oldValue, uint256 newValue);
    event ResidualReclaimed(address indexed market, uint256 amount);

    error SeedOutOfBounds();

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc     = IERC20(_usdc);
        treasury = new Treasury(_usdc, _owner, address(this));
    }

    // ── Admin ──────────────────────────────────────────────

    function setDefaultSeedLiquidity(uint256 newSeed) external onlyOwner {
        if (newSeed < MIN_SEED || newSeed > MAX_SEED) revert SeedOutOfBounds();
        emit SeedLiquidityUpdated(defaultSeedLiquidity, newSeed);
        defaultSeedLiquidity = newSeed;
    }

    // ── Market Creation ────────────────────────────────────

    function createMarket(
        string memory question,
        string memory description,
        string memory category,
        string memory imageUrl,
        uint256       resolutionTime
    ) external onlyOwner returns (address) {
        return _createMarket(question, description, category, imageUrl, resolutionTime, defaultSeedLiquidity);
    }

    function createMarketWithSeed(
        string memory question,
        string memory description,
        string memory category,
        string memory imageUrl,
        uint256       resolutionTime,
        uint256       seedLiquidity
    ) external onlyOwner returns (address) {
        if (seedLiquidity < MIN_SEED || seedLiquidity > MAX_SEED) revert SeedOutOfBounds();
        return _createMarket(question, description, category, imageUrl, resolutionTime, seedLiquidity);
    }

    function _createMarket(
        string memory question,
        string memory description,
        string memory category,
        string memory imageUrl,
        uint256       resolutionTime,
        uint256       seedLiquidity
    ) internal returns (address) {
        require(resolutionTime > block.timestamp, "Resolution must be in future");

        // Pull seed from treasury into this factory.
        treasury.fundMarket(seedLiquidity);

        // Deploy the market — constructor records metadata + reserves, but doesn't touch USDC yet.
        PredictionMarket m = new PredictionMarket(
            address(usdc),
            address(treasury),
            address(this),
            question,
            description,
            category,
            imageUrl,
            resolutionTime,
            seedLiquidity
        );

        // Transfer the seed USDC into the new market so reserves are backed.
        usdc.safeTransfer(address(m), seedLiquidity);

        allMarkets.push(address(m));
        emit MarketCreated(address(m), question, category, resolutionTime, seedLiquidity);
        return address(m);
    }

    // ── Resolution ─────────────────────────────────────────

    function resolveMarket(address market, bool yesWon) external onlyOwner {
        PredictionMarket(market).resolve(yesWon);
        emit MarketResolved(market, yesWon);
    }

    function cancelMarket(address market) external onlyOwner {
        PredictionMarket(market).cancel();
        emit MarketCancelled(market);
    }

    /// @notice After resolution, reclaim the pool's winning-side reserve
    ///         (the LP's "profit + seed return") back into treasury.
    function reclaimResidual(address market) external onlyOwner {
        uint256 amount = PredictionMarket(market).withdrawResidual(address(this));
        if (amount > 0) {
            usdc.forceApprove(address(treasury), amount);
            treasury.receiveLPResidual(market, amount);
        }
        emit ResidualReclaimed(market, amount);
    }

    // ── Views ──────────────────────────────────────────────

    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    function getMarketsPaginated(uint256 offset, uint256 limit)
        external view returns (address[] memory)
    {
        uint256 total = allMarkets.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 size = end - offset;
        address[] memory result = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = allMarkets[offset + i];
        }
        return result;
    }
}

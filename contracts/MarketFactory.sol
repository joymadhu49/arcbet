// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PredictionMarket.sol";
import "./Treasury.sol";

/// @title MarketFactory
/// @notice Deploys and manages prediction markets
contract MarketFactory is Ownable {

    Treasury public immutable treasury;
    address  public immutable usdc;

    address[] public allMarkets;

    struct MarketInfo {
        address market;
        string  question;
        string  category;
        uint256 resolutionTime;
        bool    resolved;
    }

    event MarketCreated(
        address indexed market,
        string  question,
        string  category,
        uint256 resolutionTime
    );
    event MarketResolved(address indexed market, bool yesWon);
    event MarketCancelled(address indexed market);

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc     = _usdc;
        treasury = new Treasury(_usdc, _owner);
    }

    // ── Market Creation ────────────────────────────────────

    function createMarket(
        string memory question,
        string memory description,
        string memory category,
        string memory imageUrl,
        uint256       resolutionTime
    ) external onlyOwner returns (address) {
        require(resolutionTime > block.timestamp, "Resolution must be in future");

        PredictionMarket m = new PredictionMarket(
            usdc,
            address(treasury),
            address(this),
            question,
            description,
            category,
            imageUrl,
            resolutionTime
        );

        allMarkets.push(address(m));

        emit MarketCreated(address(m), question, category, resolutionTime);
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

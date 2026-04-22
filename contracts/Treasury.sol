// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Treasury
/// @notice Collects platform fees AND seeds FPMM liquidity for new markets.
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    IERC20  public immutable usdc;
    address public immutable factory;

    // fee basis points (100 = 1%)
    uint256 public feeBps = 150; // 1.5%
    uint256 public constant MAX_FEE_BPS = 500; // 5% max

    uint256 public totalCollected;       // lifetime fees received from markets
    uint256 public totalSeededOut;       // lifetime USDC sent to markets as LP seed
    uint256 public totalReturnedFromLPs; // residual USDC returned from resolved markets

    event FeeReceived(address indexed market, uint256 amount);
    event FeeUpdated(uint256 oldBps, uint256 newBps);
    event Withdrawn(address indexed to, uint256 amount);
    event MarketFunded(address indexed factory, uint256 amount);
    event LPResidualReceived(address indexed market, uint256 amount);

    error NotFactory();

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor(address _usdc, address _owner, address _factory) Ownable(_owner) {
        usdc    = IERC20(_usdc);
        factory = _factory;
    }

    /// @notice Markets call this to deposit their fees.
    function depositFee(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalCollected += amount;
        emit FeeReceived(msg.sender, amount);
    }

    /// @notice Factory calls this at market-creation to pull LP seed.
    function fundMarket(uint256 amount) external onlyFactory {
        totalSeededOut += amount;
        usdc.safeTransfer(factory, amount);
        emit MarketFunded(factory, amount);
    }

    /// @notice Factory returns a market's residual USDC after resolution.
    function receiveLPResidual(address market, uint256 amount) external onlyFactory {
        usdc.safeTransferFrom(factory, address(this), amount);
        totalReturnedFromLPs += amount;
        emit LPResidualReceived(market, amount);
    }

    /// @notice Update platform fee (bounded by MAX_FEE_BPS).
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    /// @notice Withdraw surplus USDC to owner.
    ///         Ops should leave enough behind to seed future markets.
    function withdraw(uint256 amount) external onlyOwner {
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Total USDC held by the treasury (fees + LP capital pool + returns).
    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}

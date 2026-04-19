// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Treasury
/// @notice Collects platform fees from all prediction markets
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    // fee basis points (100 = 1%)
    uint256 public feeBps = 150; // 1.5%
    uint256 public constant MAX_FEE_BPS = 500; // 5% max

    uint256 public totalCollected;

    event FeeReceived(address indexed market, uint256 amount);
    event FeeUpdated(uint256 oldBps, uint256 newBps);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc = IERC20(_usdc);
    }

    /// @notice Called by markets to deposit fees
    function depositFee(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalCollected += amount;
        emit FeeReceived(msg.sender, amount);
    }

    /// @notice Update platform fee
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    /// @notice Withdraw collected fees to owner
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= totalCollected, "Exceeds collected");
        totalCollected -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Get treasury USDC balance
    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}

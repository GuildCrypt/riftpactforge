pragma solidity ^0.4.25;

import "ownership/Ownable.sol";
import "RiftPact.sol";
import "IERC721.sol";

contract RiftPactForge is Ownable {

  bool public isPaused;
  address public minter;
  address public parentToken;

  mapping(uint256 => address) public rfts;
  uint256 public rftsCount;

  constructor(address _parentToken) public {
    minter = msg.sender;
    parentToken = _parentToken;
  }

  function mint(
    address to,
    uint256 parentTokenId,
    uint256 totalSupply,
    address currency,
    uint256 auctionAllowedAt,
    uint256 minAuctionCompleteWait,
    uint256 minBidDeltaPermille
  ) public returns(uint256, address) {

    require(!isPaused);
    require(msg.sender == minter);

    address rft = new RiftPact(
      parentToken,
      parentTokenId,
      totalSupply,
      currency,
      auctionAllowedAt,
      minAuctionCompleteWait,
      minBidDeltaPermille
    );

    //transfer parentToken to rft
    IERC721(parentToken).transferFrom(to, rft, parentTokenId);

    //transfer totalSupply to rft tokens to msg.sender
    RiftPact(rft).transfer(to, totalSupply);

    rfts[rftsCount] = rft;
    rftsCount += 1;

    return (rftsCount - 1, rft);
  }

  function setIsPaused(bool _isPaused) onlyOwner() public {
    isPaused = _isPaused;
  }

  function setMinter(address _minter) onlyOwner() public {
    minter = _minter;
  }

  function setIsBlacklisted(address rft, address to, bool isBlacklisted) onlyOwner() public {
    RiftPact(rft).setIsBlacklisted(to, isBlacklisted);
  }
}

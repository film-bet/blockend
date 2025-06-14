// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FilmBet is Ownable {
    IERC20 public token;
    uint256 public feeBasisPoints = 200;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public totalFeesCollected;

    enum BetOutcome {
        Undecided,
        Yes,
        No
    }

    struct BetDetail {
        uint256 amount;
        bool choice;
        bool claimed;
    }

    struct BetPool {
        uint256 id;
        string question;
        uint256 movieId;
        uint256 endTime;
        uint256 totalYesStake;
        uint256 totalNoStake;
        BetOutcome outcome;
        bool resolved;
        mapping(address => BetDetail) userBets;
    }

    uint256 public betPoolCount;
    mapping(uint256 => BetPool) public betPools;

    event BetPoolCreated(
        uint256 indexed poolId,
        string question,
        uint256 movieId,
        uint256 endTime
    );
    event BetPlaced(
        uint256 indexed poolId,
        address indexed user,
        bool choice,
        uint256 amount
    );
    event BetResolved(uint256 indexed poolId, BetOutcome outcome);
    event WinningsClaimed(
        uint256 indexed poolId,
        address indexed user,
        uint256 amount
    );
    event FeesWithdrawn(uint256 amount);
    event FeeUpdated(uint256 basisPoints);

    constructor(address _tokenAddress) Ownable(msg.sender) {
        token = IERC20(_tokenAddress);
    }

    function createBetPool(
        string memory _question,
        uint256 _movieId,
        uint256 _endTime
    ) external returns (uint256) {
        require(_endTime > block.timestamp, "End time must be in the future");

        betPoolCount++;
        BetPool storage pool = betPools[betPoolCount];
        pool.id = betPoolCount;
        pool.question = _question;
        pool.movieId = _movieId;
        pool.endTime = _endTime;

        emit BetPoolCreated(betPoolCount, _question, _movieId, _endTime);
        return betPoolCount;
    }

    function placeBet(uint256 _poolId, bool _choice, uint256 _amount) external {
        BetPool storage pool = betPools[_poolId];
        require(block.timestamp < pool.endTime, "Betting closed");
        require(pool.userBets[msg.sender].amount == 0, "Already placed bet");

        token.transferFrom(msg.sender, address(this), _amount);

        BetDetail memory bet = BetDetail({
            amount: _amount,
            choice: _choice,
            claimed: false
        });

        pool.userBets[msg.sender] = bet;

        if (_choice) {
            pool.totalYesStake += _amount;
        } else {
            pool.totalNoStake += _amount;
        }

        emit BetPlaced(_poolId, msg.sender, _choice, _amount);
    }

    function resolveBetPool(uint256 _poolId, bool _outcome) external {
        BetPool storage pool = betPools[_poolId];
        require(!pool.resolved, "Already resolved");
        require(block.timestamp >= pool.endTime, "Betting still active");

        pool.outcome = _outcome ? BetOutcome.Yes : BetOutcome.No;
        pool.resolved = true;

        emit BetResolved(_poolId, pool.outcome);
    }

    function claimWinnings(uint256 _poolId) external {
        BetPool storage pool = betPools[_poolId];
        require(pool.resolved, "Bet not resolved");

        BetDetail storage userBet = pool.userBets[msg.sender];
        require(!userBet.claimed, "Already claimed");
        require(userBet.amount > 0, "No bet placed");

        bool won = (pool.outcome == BetOutcome.Yes && userBet.choice) ||
            (pool.outcome == BetOutcome.No && !userBet.choice);
        require(won, "You did not win");

        uint256 totalWinningStake = pool.outcome == BetOutcome.Yes
            ? pool.totalYesStake
            : pool.totalNoStake;

        uint256 totalPool = pool.totalYesStake + pool.totalNoStake;

        uint256 userShare = (userBet.amount * totalPool) / totalWinningStake;

        uint256 fee = (userShare * feeBasisPoints) / BASIS_POINTS;
        uint256 payout = userShare - fee;

        totalFeesCollected += fee;
        token.transfer(msg.sender, payout);
        userBet.claimed = true;

        emit WinningsClaimed(_poolId, msg.sender, payout);
    }

    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Max fee is 10%");
        feeBasisPoints = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        token.transfer(to, amount);
        emit FeesWithdrawn(amount);
    }

    function getUserBet(
        uint256 _poolId,
        address user
    ) external view returns (BetDetail memory) {
        return betPools[_poolId].userBets[user];
    }

    function getPool(
        uint256 _poolId
    )
        external
        view
        returns (
            string memory question,
            uint256 movieId,
            uint256 endTime,
            uint256 totalYes,
            uint256 totalNo,
            BetOutcome outcome,
            bool resolved
        )
    {
        BetPool storage pool = betPools[_poolId];
        return (
            pool.question,
            pool.movieId,
            pool.endTime,
            pool.totalYesStake,
            pool.totalNoStake,
            pool.outcome,
            pool.resolved
        );
    }

    function getTokenAddress() external view returns (address) {
        return address(token);
    }
}

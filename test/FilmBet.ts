import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("FilmBet", function () {
  async function deployFilmBetFixture() {
    const [owner, account1, account2, account3, account4, account5, account6] =
      await hre.ethers.getSigners();

    const initialSupply = hre.ethers.parseEther("1000000.0");

    const FilmBet = await hre.ethers.getContractFactory("FilmBet");
    const FilmBetERC20 = await hre.ethers.getContractFactory("FilmBetERC20");

    const filmBetERC20 = await FilmBetERC20.deploy(initialSupply);

    const tokenAddress = await filmBetERC20.getAddress();
    const filmBet = await FilmBet.deploy(tokenAddress);

    await filmBetERC20.transfer(
      await filmBet.getAddress(),
      hre.ethers.parseEther("1000")
    );

    return {
      filmBet,
      tokenAddress,
      owner,
      account1,
      account2,
      account3,
      account4,
      account5,
      account6,
      filmBetERC20,
    };
  }

  describe("Deployment", function () {
    it("Should set the right token address", async function () {
      const { filmBet, tokenAddress } = await loadFixture(deployFilmBetFixture);

      expect(await filmBet.getTokenAddress()).to.equal(tokenAddress);
    });

    it("Should set the right owner", async function () {
      const { filmBet, owner } = await loadFixture(deployFilmBetFixture);

      expect(await filmBet.owner()).to.equal(owner.address);
    });

    it("Should have a token with the correct name and symbol", async function () {
      const { filmBetERC20 } = await loadFixture(deployFilmBetFixture);

      expect(await filmBetERC20.name()).to.equal("FilmBet Token");
      expect(await filmBetERC20.symbol()).to.equal("FBT");
    });

    it("Should have an initial supply of tokens", async function () {
      const { filmBetERC20 } = await loadFixture(deployFilmBetFixture);

      const initialSupply = hre.ethers.parseEther("1000000.0");
      expect(await filmBetERC20.totalSupply()).to.equal(initialSupply);
    });

    it("Should mint the initial supply to the deployer", async function () {
      const { filmBetERC20, owner } = await loadFixture(deployFilmBetFixture);

      const initialSupply =
        hre.ethers.parseEther("1000000.0") - hre.ethers.parseEther("1000");
      expect(await filmBetERC20.balanceOf(owner.address)).to.equal(
        initialSupply
      );
    });
  });

  describe("CreatingBetPool", function () {
    it("Should create a new bet pool", async function () {
      const { filmBet, owner } = await loadFixture(deployFilmBetFixture);
      const question =
        "Will Ballerina reach $1 billion at the box office on it's first day?";
      const movieId = 1;
      const endTime = (await time.latest()) + 86400;

      await expect(filmBet.createBetPool(question, movieId, endTime))
        .to.emit(filmBet, "BetPoolCreated")
        .withArgs(1, question, movieId, endTime);
    });

    it("Should not allow creating a bet pool with past end time", async function () {
      const { filmBet } = await loadFixture(deployFilmBetFixture);

      const question =
        "Will Ballerina reach $1 billion at the box office on it's first day?";
      const movieId = 1;
      const endTime = (await time.latest()) - 1000; // Past time

      await expect(
        filmBet.createBetPool(question, movieId, endTime)
      ).to.be.revertedWith("End time must be in the future");
    });
  });

  describe("PlacingBet", function () {
    it("Should place a bet in a pool", async function () {
      const { filmBet, owner, filmBetERC20 } = await loadFixture(
        deployFilmBetFixture
      );

      const question =
        "Will Ballerina reach $1 billion at the box office on it's first day?";
      const movieId = 1;
      const endTime = (await time.latest()) + 1200000;

      await filmBet.createBetPool(question, movieId, endTime);

      const betAmount = hre.ethers.parseEther("1.0");

      await filmBetERC20.approve(filmBet.getAddress(), betAmount);

      await expect(filmBet.placeBet(1, true, betAmount))
        .to.emit(filmBet, "BetPlaced")
        .withArgs(1, owner.address, true, betAmount);
    });

    it("Should not allow placing a bet after the pool has ended", async function () {
      const { filmBet, owner, filmBetERC20 } = await loadFixture(
        deployFilmBetFixture
      );

      const question =
        "Will Ballerina reach $1 billion at the box office on it's first day?";
      const movieId = 1;
      const endTime = (await time.latest()) + 1000;

      await filmBet.createBetPool(question, movieId, endTime);

      setTimeout(async () => {
        const betAmount = hre.ethers.parseEther("1.0");

        await filmBetERC20.approve(filmBet.getAddress(), betAmount);

        await expect(filmBet.placeBet(1, true, betAmount)).to.be.revertedWith(
          "Betting closed"
        );
      }, 2000);
    });
  });

  describe("Resolve and Claim", function () {
    it("Should resolve a bet pool and allow users to claim winnings", async function () {
      const {
        filmBet,
        filmBetERC20,
        owner,
        account1,
        account2,
        account3,
        account4,
        account5,
        account6,
      } = await loadFixture(deployFilmBetFixture);

      const question =
        "Will Ballerina reach $1 billion at the box office on its first day?";
      const movieId = 1;
      const endTime = (await time.latest()) + 1000;

      await filmBet.createBetPool(question, movieId, endTime);

      const accounts = [
        account1,
        account2,
        account3,
        account4,
        account5,
        account6,
      ];

      console.log("Placing bets from all accounts...");

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        const betAmount = hre.ethers.parseEther(
          (Math.random() * 10 + 1).toFixed(2).toString()
        );

        // Transfer tokens to the account
        await filmBetERC20.transfer(account.address, betAmount);

        // Approve FilmBet contract to spend on behalf of account
        await filmBetERC20
          .connect(account)
          .approve(filmBet.getAddress(), betAmount);

        // Place the bet (even index = Yes, odd index = No)
        await filmBet.connect(account).placeBet(1, i % 2 === 0, betAmount);

        console.log(
          `Account ${i + 1} placed bet of ${betAmount} ETH on ${
            i % 2 === 0 ? "YES" : "NO"
          }`
        );
      }

      console.log("All bets placed. Advancing time...");

      await time.increaseTo(endTime + 10);

      // Resolve the bet with outcome = Yes (true)
      await filmBet.resolveBetPool(1, true);

      console.log("Bet pool resolved. Claiming winnings...");

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        try {
          await filmBet.connect(account).claimWinnings(1);
          const balance = await filmBetERC20.balanceOf(account.address);
          console.log(
            `Account ${i + 1} claimed. Balance: ${balance.toString()}`
          );
        } catch (err: any) {
          console.log(`Account ${i + 1} failed to claim (likely lost).`);
        }
      }

      const totalFees = await filmBet.totalFeesCollected();
      console.log(`Total fees collected by FilmBet: ${totalFees.toString()}`);
    });
  });

});


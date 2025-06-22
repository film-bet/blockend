import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";

const FilmBetERC20Module = buildModule("FilmBetERC20Module", (m) => {
  const initialSupply = hre.ethers.parseEther("1000000.0");

  const FilmBetERC20 = m.contract("FilmBetERC20", [initialSupply], {});

  return { FilmBetERC20 };
});

export default FilmBetERC20Module;

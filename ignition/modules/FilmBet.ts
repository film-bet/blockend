import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";

const FilmBetModule = buildModule("FilmBetModule", (m) => {
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const FilmBet = m.contract("FilmBet", [tokenAddress], {});

  return { FilmBet };
});

export default FilmBetModule;

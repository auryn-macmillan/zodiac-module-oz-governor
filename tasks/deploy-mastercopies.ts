import { task } from "hardhat/config"
import { deployMastercopy, readMastercopies } from "@gnosis-guild/zodiac-core"
import { createEIP1193 } from "./create-EIP1193"

import { Deployer } from "@matterlabs/hardhat-zksync-deploy"
import { Wallet } from "zksync-ethers"
import { AbiCoder, BytesLike, ethers } from "ethers"

task(
  "deploy:mastercopies",
  "For every version entry on the artifacts file, deploys a mastercopy into the current network",
).setAction(async (_, hre) => {
  const isZkSync = hre.network.config.zksync === true

  let deployer

  if (isZkSync) {
    const zkWallet = new Wallet(process.env.PRIVATE_KEY!)
    const deployerZkSync = new Deployer(hre, zkWallet)

    for (const mastercopy of readMastercopies()) {
      const { contractName, contractVersion, constructorArgs } = mastercopy

      const artifact = await deployerZkSync.loadArtifact(contractName)

      const constructorArgsValues = constructorArgs?.values || []

      console.log(`⏳ ${contractName}@${contractVersion}: Deployment starting...`)

      const deployedContract = await deployerZkSync.deploy(artifact, constructorArgsValues, "create2")

      console.log(`🚀 ${contractName}@${contractVersion}: Deployed at ${deployedContract.address}`)
    }
  } else {
    const [signer] = await hre.ethers.getSigners()
    const provider = createEIP1193(hre.network.provider, signer)
    for (const mastercopy of readMastercopies()) {
      const { contractName, contractVersion, factory, bytecode, constructorArgs, salt } = mastercopy

      const { address, noop } = await deployMastercopy({
        factory,
        bytecode,
        constructorArgs,
        salt,
        provider,
        onStart: () => {
          console.log(`⏳ ${contractName}@${contractVersion}: Deployment starting...`)
        },
      })

      if (noop) {
        console.log(`🔄 ${contractName}@${contractVersion}: Already deployed at ${address}`)
      } else {
        console.log(`🚀 ${contractName}@${contractVersion}: Successfully deployed at ${address}`)
      }
    }
  }
})

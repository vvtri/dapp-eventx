const { writeFileSync } = require('fs')
const { ethers } = require('hardhat')

async function deployContract() {
  const servicePct = 5
  const contract = await ethers.deployContract('DappEventX', [servicePct])
  contract.waitForDeployment()

  await saveContractAddress(contract)
}

async function saveContractAddress(contract) {
  console.log('contract.target', contract.target)
  const contractAddress = JSON.stringify({ dappEventXContract: contract.target })

  writeFileSync('./contracts/contractAddress.json', contractAddress)
}

async function main() {
  await deployContract()
}

main().catch((err) => {
  console.log('err', err)
  process.exit(1)
})

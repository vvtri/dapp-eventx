const { expect } = require('chai')
const { ethers } = require('hardhat')

const etherToWei = (ether) => {
  return ethers.parseUnits(ether.toString(), 'ether')
}
const weiToEther = (wei) => ethers.formatUnits(wei, 'ether')

describe('DappEventX', () => {
  let contract, result, deployer, owner, buyer1, buyer2
  const servicePct = 5
  const eventId = 1
  const title = 'event 1'
  const description = 'desc event1'
  const imageUrl = 'https://linktoimg.jpg'
  const capacity = 10
  const ticketCost = 0.01
  const startsAt = Date.now() - 10 * 60 * 1000
  const endsAt = Date.now() + 10 * 60 * 1000
  const numOfTickets = 1

  beforeEach(async () => {
    ;[deployer, owner, buyer1, buyer2] = await ethers.getSigners()

    contract = await ethers.deployContract('DappEventX', [servicePct], deployer)
    await contract.waitForDeployment()
  })

  describe('Event CRUD', () => {
    beforeEach(async () => {
      await contract
        .connect(owner)
        .createEvent(
          title,
          description,
          imageUrl,
          capacity,
          etherToWei(ticketCost),
          startsAt,
          endsAt
        )
    })

    it('should confirm event creation', async () => {
      result = await contract.getEvents()
      expect(result).to.have.lengthOf(1)

      result = await contract.connect(owner).getMyEvents()
      expect(result).to.have.lengthOf(1)
    })

    it('should confirm event updating', async () => {
      result = await contract.getSingleEvent(eventId)
      expect(result.title).to.be.equal(title)

      const newTitle = 'my new title'
      await contract
        .connect(owner)
        .updateEvent(
          eventId,
          newTitle,
          description,
          imageUrl,
          capacity,
          etherToWei(ticketCost),
          startsAt,
          endsAt
        )
      result = await contract.getSingleEvent(eventId)
      expect(result.title).to.be.equal(newTitle)
    })

    it('should confirm event deletion', async () => {
      result = await contract.getEvents()
      expect(result).to.be.lengthOf(1)

      result = await contract.getSingleEvent(eventId)
      expect(result.deleted).to.be.equal(false)
      expect(result.refunded).to.be.equal(false)

      await contract.connect(owner).deleteEvent(eventId)
      result = await contract.getSingleEvent(eventId)
      expect(result.deleted).to.be.equal(true)
      expect(result.refunded).to.be.equal(true)

      result = await contract.getEvents()
      expect(result).to.be.lengthOf(0)
    })
  })

  describe('Ticket CRUD', () => {
    beforeEach(async () => {
      await contract
        .connect(owner)
        .createEvent(
          title,
          description,
          imageUrl,
          capacity,
          etherToWei(ticketCost),
          startsAt,
          endsAt
        )

      await contract
        .connect(buyer1)
        .buyTicket(eventId, numOfTickets, { value: etherToWei(ticketCost * numOfTickets) })
    })

    it('should confirm ticket purchased', async () => {
      result = await contract.getTickets(eventId)
      expect(result).to.have.lengthOf(numOfTickets)

      result = await contract.balance()
      expect(result).to.be.equal(etherToWei(ticketCost * numOfTickets))

      await contract
        .connect(buyer2)
        .buyTicket(eventId, numOfTickets, { value: etherToWei(ticketCost * numOfTickets) })

      result = await contract.getTickets(eventId)
      expect(result).to.have.lengthOf(numOfTickets * 2)

      result = await contract.balance()
      expect(result).to.be.equal(etherToWei(ticketCost * numOfTickets * 2))
    })

    it('should confirm event payout', async () => {
      const balance = await contract.balance()
      expect(balance).to.be.equal(etherToWei(numOfTickets * ticketCost))

      await contract.connect(owner).payout(eventId)
      result = await contract.getSingleEvent(eventId)
      const revenue = weiToEther(result.ticketCost) * Number(result.seats)

      result = await contract.balance()
      expect(weiToEther(result)).to.be.equal(weiToEther(weiToEther(balance) - revenue))

      result = await contract.getSingleEvent(eventId)
      expect(result.paidOut).to.be.equal(true)
    })
  })
})

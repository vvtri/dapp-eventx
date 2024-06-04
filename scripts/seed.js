const { ethers } = require('hardhat')
const contractAddress = require('../contracts/contractAddress.json')
const { faker } = require('@faker-js/faker')

const dataCount = 5
const maxTicketCost = 2

function generateEventData(count) {
  const events = []

  for (let i = 0; i < count; i++) {
    const startDate = new Date(Date.now() + 10 * 60 * 1000).getTime()
    const event = {
      id: i + 1,
      title: faker.lorem.words(5),
      description: faker.lorem.paragraph(),
      imageUrl: faker.image.urlPicsumPhotos(),
      owner: faker.string.hexadecimal({
        length: { min: 42, max: 42 },
        prefix: '0x',
      }),
      sales: faker.number.int({ min: 1, max: 20 }),
      seats: faker.number.int({ min: 1, max: 20 }),
      capacity: faker.number.int({ min: 20, max: 40 }),
      ticketCost: faker.number.float({ min: 0.01, max: maxTicketCost }),
      startsAt: startDate,
      endsAt: new Date(startDate + 10 * 24 * 60 * 60 * 1000).getTime(),
      timestamp: faker.date.past().getTime(),
      deleted: faker.datatype.boolean(),
      paidOut: faker.datatype.boolean(),
      refunded: faker.datatype.boolean(),
      minted: faker.datatype.boolean(),
    }
    events.push(event)
  }

  return events
}

async function createEvents(contract, event) {
  const tx = await contract.createEvent(
    event.title,
    event.description,
    event.imageUrl,
    event.capacity,
    ethers.parseUnits(event.ticketCost.toString(), 'ether'),
    event.startsAt,
    event.endsAt
  )
  await tx.wait()
}

async function buyTickets(contract, eventId, numberOfTickets) {
  const event = await contract.getSingleEvent(eventId)
  const tx = await contract.buyTicket(eventId, numberOfTickets, {
    value: event.ticketCost * BigInt(numberOfTickets),
  })
  await tx.wait()
}

async function getEvents(contract) {
  const events = await contract.getEvents()
  console.log('events', events)
}

async function getTickets(contract, eventId) {
  const tickets = await contract.getTickets(eventId)
  console.log('tickets', tickets)
}

async function main() {
  const contract = await ethers.getContractAt('DappEventX', contractAddress.dappEventXContract)

  await Promise.all(
    generateEventData(dataCount).map(async (event) => {
      await createEvents(contract, event)
    })
  )

  await Promise.all(
    new Array(dataCount).fill(0).map(async (_, i) => {
      const randomCount = faker.number.int({ min: 1, max: 2 })

      await Promise.all(
        new Array(randomCount).fill(0).map(async () => {
          await buyTickets(contract, i + 1, 1)
        })
      )
    })
  )

  await getEvents(contract)
  await getTickets(contract, 1)
}

main()

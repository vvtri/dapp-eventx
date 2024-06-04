import { ethers } from 'ethers'
import DappEventX from '../artifacts/contracts/DappEventX.sol/DappEventX.json'
import contractAddress from '../contracts/contractAddress.json'
import { EventParams, EventStruct, TicketStruct } from '@/utils/type.dt'

let ethereum: Window['ethereum']
let tx: any

if (typeof window !== 'undefined') ethereum = window.ethereum

export const getEthereumContracts = async () => {
  const accounts = await ethereum?.request?.({ method: 'eth_accounts' })

  if (accounts?.length! > 0) {
    const provider = new ethers.BrowserProvider(ethereum!)
    const signer = await provider.getSigner()
    const contract = new ethers.Contract(contractAddress.dappEventXContract, DappEventX.abi, signer)
    return contract
  } else {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
    const wallet = ethers.Wallet.createRandom()
    const signer = wallet.connect(provider)
    const contract = new ethers.Contract(contractAddress.dappEventXContract, DappEventX.abi, signer)
    return contract
  }
}

export const createEvent = async (params: EventParams) => {
  if (!ethereum) throw new Error('Browser provider not installed')

  const contract = await getEthereumContracts()
  tx = await contract.createEvent(
    params.title,
    params.description,
    params.imageUrl,
    params.capacity,
    ethers.parseUnits(params.ticketCost.toString(), 'ether'),
    params.startsAt,
    params.endsAt
  )
  await tx.wait()
  return tx
}

export const updateEvent = async (params: EventParams) => {
  if (!ethereum) throw new Error('Browser provider not installed')

  const contract = await getEthereumContracts()
  tx = await contract.updateEvent(
    params.id,
    params.title,
    params.description,
    params.imageUrl,
    params.capacity,
    ethers.parseUnits(params.ticketCost.toString(), 'ether'),
    params.startsAt,
    params.endsAt
  )
  await tx.wait()
  return tx
}

export const deleteEvent = async (eventId: string) => {
  if (!ethereum) throw new Error('Browser provider not installed')

  const contract = await getEthereumContracts()

  const tx = await contract.deleteEvent(eventId)
  await tx.wait()

  return tx
}

export const getEvents = async () => {
  const contract = await getEthereumContracts()

  const events = await contract.getEvents()

  return structureEvent(events)
}

export const getMyEvents = async () => {
  const contract = await getEthereumContracts()

  const events = await contract.getMyEvents()

  return structureEvent(events)
}

export const getEvent = async (eventId: string) => {
  const contract = await getEthereumContracts()

  const event = await contract.getSingleEvent(eventId)

  return structureEvent([event])[0]
}

export const getTickets = async (eventId: string) => {
  const contract = await getEthereumContracts()

  const tickets = await contract.getTickets(eventId)

  return structuredTicket(tickets)
}

const structureEvent = (events: EventStruct[]): EventStruct[] =>
  events
    .map((event) => ({
      id: Number(event.id),
      title: event.title,
      imageUrl: event.imageUrl,
      description: event.description,
      owner: event.owner,
      sales: Number(event.sales),
      ticketCost: parseFloat(ethers.formatUnits(event.ticketCost, 'ether')),
      capacity: Number(event.capacity),
      seats: Number(event.seats),
      startsAt: Number(event.startsAt),
      endsAt: Number(event.endsAt),
      timestamp: Number(event.timestamp),
      deleted: event.deleted,
      paidOut: event.paidOut,
      refunded: event.refunded,
      minted: event.minted,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)

const structuredTicket = (tickets: TicketStruct[]): TicketStruct[] =>
  tickets
    .map((ticket) => ({
      id: Number(ticket.id),
      eventId: Number(ticket.eventId),
      owner: ticket.owner,
      ticketCost: parseFloat(ethers.formatUnits(ticket.ticketCost, 'ether')),
      timestamp: Number(ticket.timestamp),
      refunded: ticket.refunded,
      minted: ticket.minted,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)

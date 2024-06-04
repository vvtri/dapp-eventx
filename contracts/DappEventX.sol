// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract DappEventX is Ownable, ReentrancyGuard, ERC721 {
  using Counters for Counters.Counter;
  Counters.Counter private _totalEvents;
  Counters.Counter private _totalTokens;

  struct EventStruct {
    uint256 id;
    string title;
    string imageUrl;
    string description;
    address owner;
    uint256 sales;
    uint256 ticketCost;
    uint256 capacity;
    uint256 seats;
    uint256 startsAt;
    uint256 endsAt;
    uint256 timestamp;
    bool deleted;
    bool paidOut;
    bool refunded;
    bool minted;
  }

  struct TicketStruct {
    uint256 id;
    uint256 eventId;
    address owner;
    uint256 ticketCost;
    uint256 timestamp;
    bool refunded;
    bool minted;
  }

  uint256 public balance;
  uint256 public servicePct;

  mapping(uint256 => EventStruct) events;
  mapping(uint256 => TicketStruct[]) tickets;
  mapping(uint256 => bool) eventExists;

  constructor(uint256 _pct) ERC721('EventX', 'ETX') {
    servicePct = _pct;
  }

  function createEvent(
    string memory title,
    string memory description,
    string memory imageUrl,
    uint256 capacity,
    uint256 ticketCost,
    uint256 startsAt,
    uint256 endsAt
  ) public {
    require(ticketCost > 0, 'TicketCost>0');
    require(capacity > 0, 'capacity > 0');
    require(bytes(title).length > 0, 'bytes(title).length > 0');
    require(bytes(description).length > 0, 'bytes(description).length > 0');
    require(bytes(imageUrl).length > 0, 'bytes(imageUrl).length > 0');
    require(startsAt > 0, 'startsAt > 0');
    require(endsAt > startsAt, 'endsAt > startsAt');

    _totalEvents.increment();
    EventStruct memory eventX;

    eventX.id = _totalEvents.current();
    eventX.title = title;
    eventX.description = description;
    eventX.imageUrl = imageUrl;
    eventX.capacity = capacity;
    eventX.ticketCost = ticketCost;
    eventX.startsAt = startsAt;
    eventX.endsAt = endsAt;
    eventX.owner = msg.sender;
    eventX.timestamp = currentTime();

    eventExists[eventX.id] = true;
    events[eventX.id] = eventX;
  }

  function updateEvent(
    uint256 eventId,
    string memory title,
    string memory description,
    string memory imageUrl,
    uint256 capacity,
    uint256 ticketCost,
    uint256 startsAt,
    uint256 endsAt
  ) public {
    require(events[eventId].owner == msg.sender, 'eventX.owner == msg.sender');
    require(eventExists[eventId], 'eventExists[eventId]');
    require(ticketCost > 0, 'TicketCost>0');
    require(capacity > 0, 'capacity > 0');
    require(bytes(title).length > 0, 'bytes(title).length > 0');
    require(bytes(description).length > 0, 'bytes(description).length > 0');
    require(bytes(imageUrl).length > 0, 'bytes(imageUrl).length > 0');
    require(startsAt > 0, 'startsAt > 0');
    require(endsAt > startsAt, 'endsAt > startsAt');

    EventStruct storage eventX = events[eventId];

    eventX.title = title;
    eventX.description = description;
    eventX.imageUrl = imageUrl;
    eventX.startsAt = startsAt;
    eventX.endsAt = endsAt;
    eventX.capacity = capacity;
    eventX.ticketCost = ticketCost;
  }

  function deleteEvent(uint256 eventId) public nonReentrant {
    require(eventExists[eventId], 'eventExists[eventId]');
    require(
      events[eventId].owner == msg.sender || msg.sender == owner(),
      'eventX.owner == msg.sender'
    );
    require(!events[eventId].paidOut, '!events[eventId].paidOut');
    require(!events[eventId].refunded, '!events[eventId].refunded');
    require(refundTickets(eventId), 'Event failed to refund');
    events[eventId].deleted = true;
  }

  function getEvents() public view returns (EventStruct[] memory Events) {
    uint256 available;

    for (uint256 i = 1; i <= _totalEvents.current(); i++) {
      if (!events[i].deleted) available++;
    }

    Events = new EventStruct[](available);

    uint256 resultIdx;
    for (uint256 i = 1; i <= _totalEvents.current(); i++) {
      if (!events[i].deleted) {
        Events[resultIdx] = events[i];
      }
    }
  }

  function getMyEvents() public view returns (EventStruct[] memory Events) {
    uint256 available;

    for (uint256 i = 1; i <= _totalEvents.current(); i++) {
      if (!events[i].deleted && events[i].owner == msg.sender) available++;
    }

    Events = new EventStruct[](available);

    uint256 resultIdx;
    for (uint256 i = 1; i <= _totalEvents.current(); i++) {
      if (!events[i].deleted && events[i].owner == msg.sender) {
        Events[resultIdx] = events[i];
      }
    }
  }

  function getSingleEvent(uint256 eventId) public view returns (EventStruct memory) {
    return events[eventId];
  }

  function buyTicket(uint256 eventId, uint256 numOfTicket) public payable {
    require(eventExists[eventId], 'eventExists[eventId]');
    require(numOfTicket >= 0 && numOfTicket <= 3, 'numOfTicket >= 0 && numOfTicket<= 3');
    require(
      msg.value == events[eventId].ticketCost * numOfTicket,
      'msg.value == events[eventId].ticketCost * numOfTicket'
    );
    require(
      numOfTicket + events[eventId].seats <= events[eventId].capacity,
      'numOfTicket + events[eventId].seats <= events[eventId].capacity'
    );

    for (uint256 i = 0; i < numOfTicket; i++) {
      TicketStruct memory ticket;
      ticket.id = tickets[eventId].length;
      ticket.eventId = eventId;
      ticket.owner = msg.sender;
      ticket.refunded = false;
      ticket.ticketCost = events[eventId].ticketCost;
      ticket.timestamp = currentTime();

      tickets[eventId].push(ticket);
    }

    events[eventId].seats += numOfTicket;
    balance += msg.value;
  }

  function getTickets(uint256 eventId) public view returns (TicketStruct[] memory) {
    return tickets[eventId];
  }

  function refundTickets(uint256 eventId) internal returns (bool) {
    for (uint256 i = 0; i < tickets[eventId].length; i++) {
      tickets[eventId][i].refunded = true;
      balance -= tickets[eventId][i].ticketCost;
      payTo(tickets[eventId][i].owner, tickets[eventId][i].ticketCost);
    }
    events[eventId].refunded = true;
    return true;
  }

  function payout(uint256 eventId) public nonReentrant {
    require(eventExists[eventId], 'eventExists[eventId]');
    require(
      events[eventId].owner == msg.sender || msg.sender == owner(),
      'events[eventId].owner == msg.sender || msg.sender == owner()'
    );
    require(!events[eventId].paidOut, '!events[eventId].paidOut');
    // require(currentTime() > events[eventId].endsAt, 'currentTime() > events[eventId].endAt');

    require(mintTickets(eventId), 'mintTickets(eventId)');

    uint256 revenue = events[eventId].ticketCost * events[eventId].seats;
    uint256 fee = (revenue * servicePct) / 100;

    payTo(events[eventId].owner, revenue - fee);
    payTo(owner(), fee);
    events[eventId].paidOut = true;
    balance -= revenue;
  }

  function mintTickets(uint256 eventId) internal returns (bool) {
    for (uint256 i = 0; i < tickets[eventId].length; i++) {
      _totalTokens.increment();
      tickets[eventId][i].minted = true;
      _safeMint(tickets[eventId][i].owner, _totalTokens.current());
    }

    events[eventId].minted = true;
    return true;
  }

  function currentTime() internal view returns (uint256) {
    return (block.timestamp * 1000) + 1000;
  }

  function payTo(address receiver, uint256 amount) internal {
    (bool success, ) = receiver.call{ value: amount }('');
    require(success);
  }
}

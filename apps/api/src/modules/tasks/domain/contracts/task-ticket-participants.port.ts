/** Do two people work on the same open ticket (as sender, assignee or desk manager)? Personal tickets never count. */
export abstract class TaskTicketParticipants {
  abstract shareOpenTicket(userA: string, userB: string): Promise<boolean>;
}

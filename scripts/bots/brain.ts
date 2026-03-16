/**
 * Re-export from canonical location in src/lib/bots/.
 * This file exists so scripts/bots/ imports keep working.
 */
export {
  generateReply,
  decideCardVote,
  shouldReply,
} from "../../src/lib/bots/brain";
export type {
  MessageContext,
  CardVoteDecision,
} from "../../src/lib/bots/brain";

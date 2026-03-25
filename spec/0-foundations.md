# Foundations — Coordination Theory

> Analytical results that inform Mesh's design. Definitions, principles, and the taxonomy of coordination problems Mesh solves. User-facing labels may differ from the terms here — see [1-terminology.md](1-terminology.md) for canonical UI terms.

---

## 1. Coordination and Negotiation

**Coordination instance.** A set of dimensions {who, when, where, what, how many, ...} that must be resolved for an activity to occur. Every coordination instance involves at least one dimension; most involve 3–5.

**Negotiation dimension.** An independent variable within a coordination instance. Dimensions interact — changing "when" may change "who" can participate, which may change "what" is feasible.

**Resolution.** A dimension is resolved when all parties have enough information and commitment to act. Resolution may be explicit (agreement) or implicit (deadline passes, default applies).

Every activity — from a coffee to a semester-long project — is a coordination instance. The difference between them is which dimensions dominate and how many resolution rounds are needed, not a categorical type distinction.

---

## 2. Communication Patterns

A **communication pattern** is a shape of information flow between parties. Each has structural and social properties that determine its efficiency for resolving coordination dimensions.

### The patterns

| Pattern                | Flow              | Response              | Example                                  |
| ---------------------- | ----------------- | --------------------- | ---------------------------------------- |
| **Broadcast**          | 1 → N             | none                  | "Dinner is at 19:00"                     |
| **Poll**               | 1 → N → 1         | constrained (options) | "Friday or Saturday?"                    |
| **Commitment request** | 1 → N → 1         | binary (yes/no)       | "Friday 19:00, are you in?"              |
| **Sequential probe**   | 1 → 1 → 1...      | binary per step       | Asking people one by one                 |
| **Negotiation**        | 1 ↔ N             | unconstrained         | "When works?" / "Thursday?" / "Can't..." |
| **Conditional reveal** | 1 → 1 (triggered) | none                  | Address shared after commitment          |

### Social properties

Each pattern has social properties that affect whether and how people use it — independently of its information-theoretic efficiency.

**Visibility.** Who sees each party's response. In group messaging, all responses are visible to all. This creates social dependency — people wait to see what others say, hedge their answers, or avoid being the first to commit.

**Non-response ambiguity.** What silence means. In messaging, silence is ambiguous: busy? didn't see it? thinking? not interested? This ambiguity causes the "still on for tomorrow?" confirmation pattern and the "chase non-responders" overhead.

**Social cost of structuring.** Imposing structure on a group conversation has social cost — it feels bossy or presumptuous. "Let me set up a poll" is a social act, not just an informational one. This is why groups default to negotiation (low structure, low social cost) even when it's inefficient.

**Premature commitment.** Sharing detailed logistics before someone has agreed feels presumptuous. Not sharing them means an extra round after agreement. Neither is ideal — this is a structural dilemma, not a user error.

---

## 3. Overhead Sources

**Overhead** is the difference between the information-theoretic minimum for resolving a coordination instance and the actual effort required. Messaging produces overhead from several independent sources:

**Information asymmetry.** Parties lack data the system could provide. Example: two people spend 6 messages negotiating a time while their calendars show exactly one overlapping slot. The information exists — it's just not accessible to the coordination.

**Formulation cost.** Composing a message requires more effort than selecting from options. "How about Thursday around 7, or maybe Friday evening if that's better for you?" vs. tapping a time slot.

**Response ambiguity.** Silence has no defined meaning. This forces confirmation rounds ("still on?") and makes it impossible to proceed without chasing.

**Social dependency.** People's responses are influenced by others' visible responses. Waiting, hedging, first-mover hesitation, changing answers after seeing the group lean a certain way.

**Sequential dimension resolution.** In messaging, dimensions resolve one at a time (first "when", then "where", then...) because the medium can only handle one thread of negotiation. Dimensions that could resolve independently are forced into sequence.

**Social norm friction.** Certain coordination actions carry social cost beyond their informational content. Declining is harder than accepting. Asking is harder than being asked. Specifying details feels presumptuous. Choosing between people feels rude. These costs are real and cause delays, avoidance, and suboptimal outcomes.

### Overhead scaling

For a coordination instance with P parties and D dimensions:

- In unstructured messaging, effort scales roughly as P × D × rounds-per-dimension. A 4-person dinner {who, when, where} ≈ 4 × 3 × 2 ≈ 24 messages. Empirically 18–30.
- Overhead is superlinear in P because social dependency grows with group size.
- The interaction between dimensions (changing "when" affects "who") adds further rounds.

---

## 4. Compressions

A **compression** is a design element that eliminates a specific overhead source. Compressions are orthogonal — multiple can apply to the same coordination instance. Mesh's core design thesis is that applying the right compressions to each coordination pattern can reduce most coordination instances to 1–3 actions per party.

### The compressions

**Information front-loading.** Resolve information asymmetry by feeding system-available data (calendars, preferences, context) into the proposal. The first proposal is already informed, eliminating "what works for you?" negotiation rounds. Example: time slots generated from calendar overlap.

**Structured response.** Replace formulation with selection. A tap replaces a composed message. This eliminates formulation cost and constrains responses to actionable choices.

**Deadline with defined non-response.** Eliminate response ambiguity by defining what happens when the deadline passes. "Silence = not counted" is an unambiguous norm. No chasing needed.

**Private constraints.** Eliminate social dependency by showing each party personalized context that only they see. "Your meeting ends at 19:00, ~40 min commute → arrive ~19:40" appears only to the relevant person. Others don't see it, so no social pressure or awkwardness about constraints.

**Parallel dimension resolution.** Resolve multiple dimensions simultaneously rather than sequentially. A single proposal can carry time, location, and activity details. Participants respond to all dimensions in one action.

**Social cost transfer.** Transfer the social cost of structuring from a person to the system. Nobody has to "be the organized one" who polls the group — the system suggests structure. Declining is a button, not a conversation. The system handles awkwardness.

**Conditional reveal.** Gate information on commitment. Detailed logistics (address, contact, prep instructions) are hidden until acceptance. This resolves the premature commitment dilemma — details exist in the posting but are only revealed at the right moment.

### The compression theorem (informal)

For each negotiation dimension, there exists a combination of compressions that resolves it in ≤1 action per party:

| Dimension            | Primary compressions                                                              |
| -------------------- | --------------------------------------------------------------------------------- |
| Who (finding people) | Information front-loading (matching) + sequential probe (automated)               |
| Who (asking people)  | Social cost transfer + deadline + sequential probe                                |
| When                 | Information front-loading (calendars) + structured response + private constraints |
| Where                | Conditional reveal + information front-loading                                    |
| What                 | Information front-loading (text extraction) + structured response                 |
| How many             | Structured response (capacity setting)                                            |

With all compressions active, total effort ≤ P (one action per party) regardless of the number of dimensions, because dimensions resolve in parallel.

---

## 5. Coordination Patterns and Their Messaging Cost

These are the recurring coordination patterns that dominate real-world group coordination. Each pattern describes what needs to happen (coordination goal) and how it typically plays out in messaging (uncompressed).

### Pattern: Time negotiation

**Goal:** N parties agree on a time. **Messaging cost:** 6–8 messages. "When works?" / "Thursday?" / "I have yoga" / "Friday?" / "Morning or evening?" / "19:00?" / "OK." **Why it's expensive:** Information asymmetry (nobody sees calendars) forces iterative proposal-rejection cycles. Social norms make declaring a time feel presumptuous. **Compressions:** Information front-loading (calendar overlap) + structured response (tap a slot) + private constraints.

### Pattern: Availability check (ask-around)

**Goal:** Find a willing participant from a set of candidates. **Messaging cost:** 4–10+ messages, spread over hours/days. Ask one person — busy. Ask another — no reply. Ask a third — "what time?" **Why it's expensive:** Sequential probing is manual and slow. Non-response is ambiguous. Each probe is a separate conversation with its own overhead. **Compressions:** Information front-loading (calendar pre-filter) + automated sequential probe + deadline.

### Pattern: Commitment to a fixed plan

**Goal:** N parties confirm attendance at a specified event. **Messaging cost:** 2–6 messages. "Dinner Friday 19:00?" + N confirmations + ambiguous non-responses + "still on?" follow-up. **Why it's expensive:** Non-response ambiguity. Social dependency (waiting to see who else commits). No defined meaning for silence. **Compressions:** Structured response (yes/no) + deadline with defined non-response + social cost transfer (declining is a button).

### Pattern: Location/logistics exchange

**Goal:** Share event details (address, directions, prep). **Messaging cost:** 4–5 messages. "That cafe near Goetheplatz" / "Which one?" / "Sedanstrasse 12" / "How do I get there?" **Why it's expensive:** Premature commitment dilemma — sharing details before commitment feels presumptuous, but not sharing them requires a round after commitment. **Compressions:** Conditional reveal.

### Pattern: Role distribution

**Goal:** Assign distinct roles among N parties. **Messaging cost:** 6–8 messages. "Who wants frontend?" → hedging, waiting, social dynamics around undesirable roles. **Why it's expensive:** Social dependency — nobody wants to claim the least desirable role first, nobody wants to appear too eager. Open discussion enables hedging. **Compressions:** Structured response (claim, first-come-first-served) + social cost transfer (structure removes hedging incentive).

### Pattern: Group option selection

**Goal:** Group chooses among options. **Messaging cost:** 4–8 messages. Proposals, responses, tallying, changed minds after seeing others. **Why it's expensive:** Social dependency (visible responses influence others). No defined resolution (when is the decision "made"?). Informal tallying. **Compressions:** Structured response (poll) + deadline + private constraints (for time-based options).

### Pattern: Renegotiation

**Goal:** Change an already-resolved dimension. **Messaging cost:** 3–12 messages (scales with group size). "Something came up" → new negotiation round. **Why it's expensive:** Resets the negotiation, often involving parties who were already settled. **Compressions:** Structured response (suggest alternative) + information front-loading (compute new options from calendars).

### The meta-pattern

Every pattern above is a variation of **Propose → Negotiate → Agree**. Messaging forces all three steps to happen through the same medium (text messages), making each step costly. Compressions collapse this to **Propose → Accept** by front-loading enough information that the first proposal is good enough to accept without negotiation.

---

## 6. Social Norms in Coordination

Coordination delays are not always caused by information problems. Many are caused by social norms — conventions about politeness, fairness, and relationship management that make certain coordination actions awkward.

### Norms that cause delay

**Declining is costly.** Saying "no" to an invitation requires explanation and feels relationally risky. People delay declining, creating ambiguity that stalls the whole coordination. The less close the relationship, the higher the cost.

**Choosing between people is taboo.** "I'd rather do this with Lena than with Marco" is a real preference but socially unacceptable to state. This leads to: inviting everyone (suboptimal group composition), asking in order but pretending it's random, or not coordinating at all.

**Imposing structure is presumptuous.** Setting up a poll or declaring a plan feels like claiming authority. In peer groups, nobody wants to be the "organizer." This is why groups default to unstructured negotiation — it's lower social risk, even though it's less efficient.

**Detailed planning before commitment is presumptuous.** Sharing an address, prep list, or detailed agenda before someone has agreed to come feels like assuming their participation. But not sharing it means an extra round after agreement.

**Non-response carries social weight.** Ignoring a message is read as a social signal (disinterest, rudeness), not just absence of information. This forces unnecessary confirmation messages and makes people feel obligated to respond even when they have nothing to add.

### How systems can bypass social norms

Systems can offer actions that would be socially costly for a person to perform:

- **Declining** becomes a button — no explanation needed, no conversation to navigate.
- **Choosing between people** becomes a ranked invite list — the system invites in order, the person never has to tell anyone they weren't first choice.
- **Imposing structure** becomes tapping a suggestion chip — the system offers the structure, the person just activates it.
- **Conditional detail sharing** becomes hidden content — details exist in the posting, revealed by the system at the right moment.
- **Defined non-response** becomes a deadline — "silence = not counted" is a system rule, not a social judgment.

The key insight: the system doesn't override social norms (that would feel wrong). It provides an alternative channel where the norm doesn't apply. Declining via button feels different from declining via message — the structure removes the social weight.

---

## 7. Context and Inheritance

**Coordination context.** The set of already-resolved dimensions that a new coordination inherits. A hackathon team Space has already resolved "who" and "what project" — a meeting coordination within that Space only needs to resolve "when."

**Context inheritance.** Each level of nesting reduces coordination effort because resolved dimensions are carried forward. The first coordination in a context is the most expensive; subsequent ones are cheap.

This is why Spaces nest. A Space represents a bundle of resolved dimensions. Sub-Spaces inherit that resolution and focus only on what's new.

| Context level                    | Already resolved               | New negotiation                  |
| -------------------------------- | ------------------------------ | -------------------------------- |
| Explore (no context)             | nothing                        | who, what, when, where, how many |
| Community Space (e.g. hackathon) | who is in scope                | who specifically, what, when     |
| Team Space                       | who, what                      | when, where                      |
| Recurring Space                  | who, what, where, roughly when | exact time this instance         |

**Diminishing effort:** First coordination in a new context ≈ 3–5 dimensions. By the third or fourth coordination in the same context ≈ 1 dimension (usually "when").

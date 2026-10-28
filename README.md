# Friend Clue

The classic murder-mystery board game played from your phones, built the same way as Friend
Feud, Friend Jeopardy, Friend Wheel and Friend Monopoly. The mansion goes on the TV; every
player's phone holds their cards and their detective notebook, rolls the dice, picks where to go,
makes suggestions, shows cards and accuses. The game deals, keeps the case file sealed and runs
the questioning, so nobody can peek and nobody argues about the rules: it follows the official
ones.

## Playing

1. On the computer plugged into the TV, open `YOUR-SITE/tv` and click **Start a new game**.
   Press `F` for full screen.
2. Everyone else opens `YOUR-SITE` on their phone (or scans the QR code on the TV) and types the
   4-letter room code and their name. 2 to 6 players, one for each suspect. Each phone picks
   its suspect.
3. Short a few people? **+ Add a bot** on the TV. Bots walk, suggest, show cards and accuse like
   anyone else, and keep a proper notebook.
4. On the TV, pick the board, the dice, how much the notebook fills itself in, how sharp the bots
   are and (if you want one) a turn clock. Press **Start the game** on the TV, or the first player
   to join can start it from their phone.
5. The TV tells the story of the murder while everyone looks at their cards. Then the first
   suspect plays first and it goes round to the left.

Once a game has started nobody new can join. If your phone dies, reopen the page and join with
the same name: you get your seat, your cards and your notebook back.

To quit for good mid-game, tap **Leave the game** at the bottom of your phone. Your cards go face
up on everyone's phone (the game can't be solved with them hidden) and everyone else plays on.

## Rules it follows

The rulebook.

- **The case file:** one suspect, one weapon and one room, drawn at random before anyone sees
  them. The other 18 cards are dealt out; with some numbers of players some hands are one card
  bigger, as in the box.
- **Turn order:** the first suspect on the board goes first (Miss Scarlet on the classic board),
  then play passes to the left. Everyone sits where their suspect starts.
- **Moving:** roll (two dice like today's edition, or one die like the vintage classic, picked on
  the TV) and walk that many squares: no diagonals, no square twice, no walking through another
  piece. You don't need the exact number to get into a room, and walking into a room ends your
  move. Stepping out of a room through a door and stepping in from the square outside a door are
  one square each. A piece standing outside a door blocks it. On the phone you pick a room: the
  gold ones you can walk straight into; the rest, your piece walks the whole roll toward it along
  the shortest way. You can't go straight back into the room you just left.
- **Secret passages:** the corner rooms connect to the opposite corners. Take one instead of
  rolling.
- **Suggestions:** only in a room you just walked into, and only about that room. The suspect and
  weapon you name are brought into the room. Then everyone on your left, in turn, has to show you
  one of the three cards if they hold any (their choice which). The first one who can, shows you
  privately on your phone, and the questioning stops. Everyone else sees only who showed you a
  card, not which.
- **Dragged in:** if someone's suggestion brings your piece into a room, on your next turn you
  can make a suggestion there without moving.
- **Accusations:** any time on your turn, naming any room. Right and you win. Wrong and you're out:
  you saw the case file, so you keep quiet, stop moving and accusing, but you still have to show
  cards when someone suggests one you hold. If everyone accuses wrongly, the killer gets away.

## On your phone

- **Notes:** the detective notebook: every card down the side, every player across the top. Tap
  a square to cycle ✗ (doesn't have it), ✓ (has it), ? (maybe). A row with someone's ✓ is crossed
  off; a row where everyone is ✗ lights up: that card is in the case file. How much it fills in by
  itself is picked on the TV: your own cards and cards you're shown (what you'd write down
  anyway), also who couldn't disprove a suggestion, or nothing but your own hand.
- **Cards:** your hand, every card you've been shown (by whom, on which suggestion), and the cards
  of anyone who left.
- **Map:** the board with every piece and weapon. When you're picking where to go, tap a room.
- **History:** every suggestion: who asked what, who couldn't answer, who showed a card.
- **Chat:** private messages, one to one.

The suggestion and accusation screens show what your notebook says next to every card, so you
don't name something you already know is out by accident.

## Boards

Every board plays on the same floor plan with the same rules; the suspects, weapons, rooms and
the look change.

- **The Mansion** (classic): Mr. Boddy's dinner party.
- **Haunted Manor:** Halloween at the Ashcombe place.
- **San Diego:** La Jolla Cove to Pacific Beach, with a secret passage from the Hotel del to the Zoo.
- **Las Vegas:** a casino owner's luck runs out.
- **House Party (18+):** a party that got way out of hand.
- **My casts…** on the TV: make your own: your friends as the suspects, inside jokes as the
  weapons, places you all know as the rooms. Saved on that computer; Save to file / Load from file
  moves them between computers. Anything you leave blank keeps the classic card.

## The TV

The board, every piece walking square by square, the dice, who's up and what they're doing, each
player's plate (suspect, where they are, how many cards), and a running log. Suggestions and
accusations get a big panel: the three cards, who's being asked, a card flying across to whoever
asked, NOBODY COULD DISPROVE IT, the drum roll before the envelope opens, WRONG. The end screen
reveals the case file and hands out a few awards.

**Save game** keeps a game on that computer to pick up another night (everyone joins with the
same name and gets their cards and notebook back). **End game** opens the case file. **JOIN
CODE** in the corner shows the QR code and room code big, for anyone who needs to get back in.
**Skip the intro**, **Sound**, **Full screen** and **New room** appear when you move the mouse.

## Hosting

Same as the other games: a free Render web service.

- New > Web Service, connect this repo, Free plan.
- Runtime **Node**, build command `npm install`, start command `node server.js` (or let Render read
  `render.yaml`).
- Open `YOUR-SITE/tv` on the TV computer.

A free service sleeps when nobody's using it; the first visit of the night can take up to a
minute to wake it, and the pages say so. If the server restarts mid-game, the TV hands it back a
sealed copy of the game and everyone carries on.

## Files

- `server.js`: rooms, the rules, the bots, saving and restoring.
- `boards.js`: the floor plan, the doors and passages, how far a roll gets you, and the five boards.
- `common.js`: shared by both pages: the connection, dialogs, sounds, and the drawings (board, cards).
- `tv.html`, `index.html`: the TV and the phones. `editor.js`: the TV's cast editor.
- `test/play.js`: `npm test` plays games against a real server and checks the rules.

Every change goes in `CHANGELOG.md` with a version bump (the version shows on both start screens).

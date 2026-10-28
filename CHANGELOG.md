# Friend Clue: what changed, and when

Every change to the game gets an entry here, newest first. The version number is the same one
shown in small print on the TV's start screen and on the phone join screen, so you can tell at a
glance which version a screen is running.

Times are Pacific.

## 1.3 · October 28, 2026

**Every screen redrawn to Camden's "Clue Screens" design**
- The whole game now sits on a detective's desk: a dark green card table, parchment case notes
  with a double rule, brass plaque buttons, a wax-red Accuse button, and a typewritten notebook.
  Three typefaces do the work: Anton for titles and buttons, Special Elite for labels, the
  notebook and the log, Libre Baskerville italic for the story and the flavor copy.
- **Phones:** the join form is a paper slip with the room code in big block letters; the lobby
  puts the suspects on paper and the players and the start button on a dark panel; the main card
  stays a fixed 420 px so the tabs and buttons below never move, with a red "YOUR MOVE" tab when
  it's yours; the die itself is the roll button ("TAP TO ROLL"); "Where to?" lists the rooms as
  brass rows you can walk into and paper rows you head toward; the suggestion and accusation
  sheets are parchment with the picked tiles going brass; showing a card is the one dark screen,
  marked PRIVATE; the tabs are file-folder tabs leading into the ruled Detective Notes; game over
  opens the confidential envelope with the solution, the awards and the standings.
- **TV:** brass inlay around the felt on the start and winner screens; the lobby's join box and
  setup sheet are paper with the code on cream tiles, the players on a dark panel; in the game
  the board sits full height on the left with a brass divider, the "now" box is a paper telegram,
  the player plates are dark with a suspect-colored spine, a felt-backed card fan and a brass
  count, and the log is a typewriter ticker; suggestions and accusations come up on parchment
  over a dimmed board, numbered on a red tab, with the ask chain in pills under the cards; the
  winner screen ends with the three cards, the standings and paper award plaques.
- **The Mansion's cards are painted now**: close-cropped portraits of the six suspects, each
  weapon held big against a stormy sky, and a top-down view of every room (from Camden's
  `clue-icons.js`). They show on the cards, the notebook, the tiles, the plates and the pieces on
  the board. The other boards keep their emoji casts in the same card frames. A custom cast keeps
  the Mansion's pictures for the names it leaves alone and gets plain icons for the ones it
  renames.
- The Mansion's table is now green felt (it was wine red); the other boards keep their own colors,
  and their accent still tints the medallion ring and the room glow.

## 1.2 · October 28, 2026

**The boards from Camden's Claude Design file**
- Every board is now drawn to Camden's designs (Clue Board v2 for the mansion, Themed Boards for
  the other five): a framed board with the six suspects' alcoves and START squares outside the
  rooms, slate (or themed) hallway tiles, each room with its own floor (wood planks, carpet,
  checkerboard, grass, sand), trim and a soft inner shadow, windows on the outside walls, door
  leaves swung open at every doorway, a pill plaque with the room's name, labeled secret-passage
  stairs, and a case file in the middle with the board's name, the envelope and the story (the
  mansion gets the staircase down to the cellar instead). Las Vegas glows neon. The phone's map
  shows the same board.
- The classic rooms are furnished the way the design has them: the Study's desk and lamp, the
  Hall's runner and grandfather clock, the Lounge's green rug by the fire, the laid dining table
  under its chandelier, the Ballroom's parquet medallion, the Kitchen's range, pantry and roast.
- The dice on the TV moved down below the case file, so they never cover the envelope.

## 1.1 · October 28, 2026

**Furnished rooms, The Office, and centered pieces**
- **Every room is furnished now**, like the printed board: a billiard table with racked balls in
  the Billiard Room, a grand piano and parquet in the Ballroom, a dining table laid for dinner,
  sofas, armchairs and a fireplace in the Lounge, bookshelves in the Library, a stove and sink in
  the Kitchen, palms in the Conservatory, and so on. Every board has its own furniture: coffins,
  cauldrons and cobwebs in the Haunted Manor; jets on the Midway deck, a ball field at Petco Park
  and the sea at La Jolla Cove in San Diego; slot machines, card tables and wedding pews in Las
  Vegas; a hot tub, beer pong and a DJ booth at the House Party. The furniture shows on the TV and
  on the phone's map. Weapons and pieces sit on top of it, as on the real board.
- **New board: The Office.** Michael Scott, Dwight Schrute, Angela Martin, Kevin Malone, Jim
  Halpert and Pam Beesly; the Dundie Award, a stapler in Jell-O, a pot of chili, a katana, a ream
  of paper and a pretzel; Michael's Office (secret passage down to the Warehouse), Reception, the
  Conference Room (secret passage to Schrute Farms), the Break Room, the Bullpen, the Annex and
  Accounting. Toby from HR is the victim. Its own look: carpet, cubicles, vending machines.
- **Fix:** the emoji on the colored circles (your suspect on the phone, the plates and pieces on
  the TV) sat off-center on iPhones. They're centered now, and iPhones no longer enlarge them.

## 1.0 · October 27, 2026

**The first version**
- The official rules: a sealed case file, the rest dealt out, the first suspect plays first and
  it goes to the left, dice and doors and blocked hallways, secret passages, suggestions only in
  the room you just walked into (or one you were dragged into), questioning to the left with a
  card shown privately, accusations on your turn, a wrong accuser is out but still shows cards,
  and the killer gets away if everyone guesses wrong.
- 2 to 6 players, one per suspect, plus bots (Casual: learn only from their own suggestions;
  Sharp: read every clue on the table).
- Five boards with their own look: The Mansion (classic), Haunted Manor, San Diego, Las Vegas,
  House Party (18+), plus **My casts…** on the TV for your own suspects, weapons and rooms.
- On the phone: your cards, a tap-to-mark detective notebook (fills in what you'd write anyway,
  or more, or nothing: picked on the TV), a map you can tap to move, the suggestion history, and
  private chat.
- On the TV: the story at the start, pieces walking square by square, the suggestion panel with
  a card flying to whoever asked, the accusation drum roll, and an end screen with the case file
  and awards.
- One die or two, an optional turn clock, save and resume, and the same reconnect and
  restart-survival as the other games. `npm test` plays whole games and checks the rules.

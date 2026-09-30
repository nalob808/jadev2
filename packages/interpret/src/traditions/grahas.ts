import type { TraditionId } from './sources.js';

/**
 * What each tradition takes each planet to be.
 *
 * ## The one place the traditions genuinely differ
 *
 * Five columns saying "the seventh house is partnership" is padding. Five
 * columns on Saturn is not: the Hellenistic Saturn is cold, heavy and slow and
 * governs what endures by attrition; the Jyotiṣa Śani is a servant and a judge
 * who rewards the patient; Lilly's Saturn is a specific kind of person you meet
 * in a question. Those are different doctrines with different consequences, and
 * a reader who wants to know why their Saturn transit sounds different in two
 * books is asking about exactly this.
 *
 * So the planets carry the argument and the places carry the topic, and a
 * composed passage takes the topic once and the argument five times.
 *
 * ## Three fields, and why `now` is the longest
 *
 * `is` and `acts` are the classical doctrine, paraphrased. `now` is what it
 * means for somebody alive today, and it is the field the reader came for. A
 * tradition's own words about slaves, livestock and princes are historically
 * real and practically useless; the underlying observation — about dependence,
 * about maintenance, about patronage — usually is not.
 *
 * Nothing here says what will happen. `acts` is written as a tendency and `now`
 * as a question to hold, because a transit is a description of a season, not a
 * forecast of an event.
 */

export interface GrahaStance {
  /** What this tradition takes the planet to be. */
  readonly is: string;
  /** Its characteristic action — the verb, not the outcome. */
  readonly acts: string;
  /** The same doctrine, for a life lived now. The field readers are here for. */
  readonly now: string;
  /**
   * What this tradition makes of having the planet in a nativity.
   *
   * Separate from `now` because they answer different questions and reading
   * one as the other is the commonest error in this material. `now` is a
   * season — a transit passes. `native` is a permanent fact about somebody,
   * and the traditions disagree far more sharply here: sect decides the whole
   * reading in Hellenistic, testimony-weighing decides it in the Arabic
   * material, and Jyotiṣa reads a kāraka that the Western traditions have no
   * equivalent for at all.
   */
  readonly native: string;
  readonly sourceId: string;
  readonly locus?: string;
}

type ByGraha = Readonly<Record<string, GrahaStance>>;

export const GRAHA_STANCE: Readonly<Record<TraditionId, ByGraha>> = {
  hellenistic: {
    Sun: {
      is: 'The light of the day sect and the mind’s ruling part — not a planet among planets but the thing the others are arranged around.',
      acts: 'Exposes. Whatever it draws near becomes visible and loses the protection of not being noticed.',
      now: 'A season where something stops being private, whether or not you chose that. The useful question is not how to avoid the attention but what it will find when it arrives, because this is a light and lights do not discriminate.',
      native:
        'Born by day it governs the chart and a life arranges itself around being seen; born by night it is a guest in the other sect’s territory, and recognition tends to arrive later and from a direction the person never cultivated.',
      sourceId: 'ptolemy',
      locus: 'III.13',
    },
    Moon: {
      is: 'The body’s own clock and the fastest thing in the chart — the part of a person that responds before it decides.',
      acts: 'Carries. It gathers the condition of whatever it has just left and delivers it to whatever it meets next.',
      now: 'The register here is mood and appetite rather than event: what you want changes, and it changes back. Valens read the Moon for how a life actually feels from inside as against what it looks like from outside, and the two are rarely the same week.',
      native:
        'The night sect’s leader, and the nativity’s second beginning — Valens reads a life forward from the Moon rather than from the rising sign, so what somebody does under pressure is read here and not from how they present.',
      sourceId: 'valens',
      locus: 'I.1',
    },
    Mars: {
      is: 'The hot, dry, cutting one — the night sect’s malefic, and worst placed when the chart is a day chart and it has no ally.',
      acts: 'Separates. It gets things apart from each other, which is destruction or surgery depending entirely on whether the thing needed separating.',
      now: 'Friction arrives, and the choice is whether you spend it or it spends you. Firmicus is explicit that a badly placed Mars produces haste and the consequences of haste — which is a description of a tendency you can decline, not of an event scheduled for you.',
      native:
        'Tolerable in a night chart and difficult in a day one, which is the tradition’s way of saying that the same heat is a tool or a liability depending on whether there is anything worth pointing it at.',
      sourceId: 'firmicus',
      locus: 'III.4',
    },
    Mercury: {
      is: 'Neither day nor night in itself, taking the sect of whichever light it rises or sets with — the most conditional planet in the system.',
      acts: 'Joins. It puts things next to each other and finds the relation, which is thought when it works and rationalisation when it does not.',
      now: 'Business, paperwork, argument, the sudden need to explain yourself. The tradition’s warning is worth keeping: Mercury takes the colour of whatever it is standing next to, so watch whose framing you are borrowing this month.',
      native:
        'Rising ahead of the Sun it reasons before events; setting after it, the person understands things afterwards and understands them better. Neither is the superior placement — they are two different relationships to time.',
      sourceId: 'ptolemy',
      locus: 'III.14',
    },
    Jupiter: {
      is: 'The greater benefic and the day sect’s best piece — temperate where Saturn is cold and Mars is hot, and therefore the one that makes room.',
      acts: 'Enlarges. It does not improve what it touches; it makes more of it.',
      now: 'Opportunity with a cost attached, because enlargement is not selective. The classical caution — that Jupiter in a difficult place enlarges the difficulty — is the part modern writing usually drops and the part most worth keeping.',
      native:
        'The day sect’s benefic, and the tradition is blunt that it protects rather than provides: it keeps a life from narrowing, which is a slower gift than luck and a more durable one.',
      sourceId: 'ptolemy',
      locus: 'III.13',
    },
    Venus: {
      is: 'The lesser benefic, of the night sect, governing what is pleasant and what draws people toward each other.',
      acts: 'Attracts. It brings things into relation on the strength of wanting rather than of reasoning.',
      now: 'Easier than it looks and softer than is useful. Dorotheus treats Venus as the planet of agreement, which is exactly why a Venus season is a poor time to test whether an agreement is actually good.',
      native:
        'Of the night sect, and read for what somebody is drawn towards rather than what they secure. Strong, a life accumulates alliances; strained, the person keeps choosing the arrangement over its terms.',
      sourceId: 'dorotheus',
      locus: 'II',
    },
    Saturn: {
      is: 'The outermost visible planet, cold and dry, of the day sect — the boundary of the world as the tradition could see it.',
      acts: 'Slows and constrains. It takes time away from things and gives weight in exchange.',
      now: 'A long season rather than an incident, and it asks for maintenance rather than effort. The Hellenistic reading is that Saturn rules whatever persists by attrition — so what it touches is either abandoned or built to last, and which one is largely up to you.',
      native:
        'The day sect’s malefic, least dangerous in a day chart and most in a night one. What it governs is not hardship but duration — whatever it touches is slow to arrive and slow to leave.',
      sourceId: 'firmicus',
      locus: 'III.2',
    },
  },

  'perso-arabic': {
    Sun: {
      is: 'The king of the planets, whose nearness burns and whose place confers rank on whatever stands there.',
      acts: 'Dignifies, and consumes. A planet close to it is combust — present in the chart and unable to act.',
      now: 'Recognition and erasure by the same mechanism. Standing next to the thing everyone is looking at gets you seen; standing too close gets you absorbed into it, which is worth knowing before you take the meeting.',
      native:
        'Abū Maʿshar reads the Sun for standing granted rather than standing claimed, and weighs it against the lord of the rising sign: strong Sun with a weak ruler is somebody with authority they cannot actually spend.',
      sourceId: 'abu-mashar',
      locus: 'Bk. V',
    },
    Moon: {
      is: 'The quickest significator, and the one the tradition watches most closely because it is the one that arrives first.',
      acts: 'Applies and separates. Its next contact is read as what happens next, and the one it just left as what has just been settled.',
      now: 'The tradition’s real contribution here is procedural: it is not where the Moon is but what it is moving toward. Applied to a life, that is the difference between describing your mood and noticing what your mood is heading into.',
      native:
        'Read for the body’s temper and for what it applies to next — the tradition’s clearest single idea. What the Moon is moving toward describes what somebody is about to do, which is not the same as what they are.',
      sourceId: 'masha-allah',
      locus: 'On Reception',
    },
    Mars: {
      is: 'The lesser infortune, hot and dry, strong in its own places and dangerous chiefly when it has no dignity at all.',
      acts: 'Cuts, and takes by force what is not given.',
      now: 'A wandering Mars — in nobody’s territory, received by nobody — is the difficult one. With dignity it is just competence under pressure. That distinction is Perso-Arabic and it is the most practically useful thing anyone has said about Mars.',
      native:
        'Hot and dry, and the Arabic material cares less whether that is bad than whether the chart can absorb it. Mars with somewhere to work is craft; Mars with nowhere to work is the same force turned inward.',
      sourceId: 'abu-mashar',
      locus: 'Bk. VII',
    },
    Mercury: {
      is: 'The scribe, taking the nature of its companions and of the sign it stands in more completely than any other planet.',
      acts: 'Transmits, and alters slightly in transmitting.',
      now: 'Contracts, accounts, correspondence, the exact wording. Al-Bīrūnī’s framing is that Mercury signifies the work of intermediaries, which is a good description of the month: you are in somebody else’s chain of custody.',
      native:
        'Takes the complexion of whatever it stands beside, so the tradition weighs it last, after everything else is settled. The intelligence is real; its direction is borrowed from the strongest testimony near it.',
      sourceId: 'al-biruni',
      locus: '§ 396',
    },
    Jupiter: {
      is: 'The greater fortune, and the significator of law, of teaching, and of the kind of wealth that arrives through other people’s good opinion.',
      acts: 'Prospers whatever it receives, in proportion to how well it is placed to do so.',
      now: 'Reception is the whole of it. Jupiter helping from a place where it has no standing is a promise from somebody with no budget — the tradition is careful about this and modern writing usually is not.',
      native:
        'The most generous significator and the one the tradition warns about hardest, because enlargement without judgement is just excess. Strong Jupiter means somebody is trusted; whether that trust is warranted is read elsewhere.',
      sourceId: 'abu-mashar',
      locus: 'Bk. VII',
    },
    Venus: {
      is: 'The lesser fortune, governing ornament, music, agreement and the pleasant forms of exchange.',
      acts: 'Reconciles. It makes parties willing.',
      now: 'Negotiation goes well, which is not the same as going well for you. A Venus season is when the room wants to agree; whether the agreement is worth having is a question you have to ask deliberately, because nothing in the season will raise it.',
      native:
        'Read for concord — what somebody can hold together, including people who would not otherwise be in the same room. Strained, the same faculty becomes an inability to let a disagreement stay a disagreement.',
      sourceId: 'al-biruni',
      locus: '§ 396',
    },
    Saturn: {
      is: 'The greater infortune, cold and dry, significator of age, of depth, of land, and of everything slow.',
      acts: 'Withholds and delays — and confers, on whatever survives the delay.',
      now: 'The tradition reads Saturn for foundations, mining, building, and old things, and this is not decoration. It marks a stretch in which only durable work returns anything, and quick work returns nothing at all.',
      native:
        'Cold, dry and slow, and the Arabic writers give it the long view: what Saturn signifies arrives at the end of a process. A strong Saturn is not an easy life, it is a life whose late part is the substantial one.',
      sourceId: 'abu-mashar',
      locus: 'Bk. VII',
    },
    Rahu: {
      is: 'The Head of the Dragon — where the Moon crosses north over the ecliptic, and where eclipses happen.',
      acts: 'Increases whatever it joins, without discrimination and without a limit of its own.',
      now: 'Appetite without a stopping point. The Arabic authorities treat the Head as amplifying rather than as good or bad, which is the more useful reading: this is the month something in you scales up, and nothing in the configuration decides whether it should.',
      native:
        'The ascending node, taken as an amplifier that adds no judgement of its own. The counsel is to establish what it is amplifying before asking whether the amplification is welcome.',
      sourceId: 'al-biruni',
      locus: '§ 442',
    },
    Ketu: {
      is: 'The Tail of the Dragon, the southern crossing — the other end of the same axis.',
      acts: 'Diminishes and detaches.',
      now: 'Interest drains out of something that used to hold it. Read as loss it is bleak; read as release it is often the more accurate account of what actually happened, and the tradition already carried both senses.',
      native:
        'The descending node, read as separation and as expertise arrived at by subtraction — somebody is unusually good at a thing they have stopped wanting credit for.',
      sourceId: 'al-biruni',
      locus: '§ 442',
    },
  },

  medieval: {
    Sun: {
      is: 'The significator of the king, the father, authority, and the native’s own vitality and standing.',
      acts: 'Confers rank, and exposes whatever cannot bear inspection.',
      now: 'The medieval reading is unusually institutional: the Sun is the person whose approval settles the matter. So the season is about that person and that approval, whether the institution is a company, a family or a committee.',
      native:
        'Bonatti reads the Sun for a person’s own authority as against borrowed authority. Well placed, a life does not require permission; badly placed, effort goes into being credited rather than into the work.',
      sourceId: 'bonatti',
      locus: 'Tr. 3',
    },
    Moon: {
      is: 'The significator of the common people, of the body, and of anything that changes on a short cycle.',
      acts: 'Translates light — carries the testimony of one planet to another and so joins matters that could not otherwise reach each other.',
      now: 'Translation of light is the tradition’s best idea and it has no modern equivalent: a small, fast, unimportant-looking contact is what connects two things that had no way of meeting. Worth watching what the trivial event this month turns out to have introduced.',
      native:
        'The medieval Moon mediates everything else: a strong one makes a difficult chart workable and a weak one makes a good chart hard to live inside. In this tradition it is the single most consequential placement.',
      sourceId: 'bonatti',
      locus: 'Tr. 5',
    },
    Mars: {
      is: 'The lesser infortune; significator of soldiers, surgeons, smiths, and every trade conducted with iron and fire.',
      acts: 'Impels. It shortens the distance between the impulse and the act.',
      now: 'The medieval trade list is the interpretation: this is skill applied with force, and it is an excellent season for anything that is supposed to cut. The failure mode is applying it to something that was not.',
      native:
        'Read for the capacity to do the unpleasant part of a thing. Well placed, somebody finishes; badly placed, the same capacity goes into starting, repeatedly and with conviction.',
      sourceId: 'bonatti',
      locus: 'Tr. 3',
    },
    Mercury: {
      is: 'The significator of scholars, merchants, scribes and messengers — and, the tradition says without embarrassment, of thieves.',
      acts: 'Devises. It finds the route between two points, including the routes nobody intended.',
      now: 'Cleverness is the theme and cleverness is the risk. A month where the workaround presents itself is a month to check whether the workaround is the thing you would have chosen if it had been harder to find.',
      native:
        'Judged on speed, direction and the company it keeps. The practical claim is that a mind works at the pace of its Mercury, and that arguing with that pace is wasted effort in either direction.',
      sourceId: 'bonatti',
      locus: 'Tr. 3',
    },
    Jupiter: {
      is: 'The greater fortune, significator of judges, clergy, and lawful increase.',
      acts: 'Protects and multiplies, chiefly by putting you on the right side of a rule.',
      now: 'The medieval emphasis is legitimacy rather than luck — Jupiter is what makes a thing above board. Practically: this is when to formalise something that has been running on goodwill.',
      native:
        'A question of scope — how much somebody can hold at once. Strong, they carry more than looks reasonable; strained, they take on more than they carry, and the gap is the whole of the difficulty.',
      sourceId: 'bonatti',
      locus: 'Tr. 3',
    },
    Venus: {
      is: 'The lesser fortune, significator of women in the older texts, of ornament, of music, and of concord.',
      acts: 'Softens. It reduces the cost of an agreement to both parties.',
      now: 'The gendered reading is the part to drop; the observation underneath is about anything that works by making things pleasant rather than by making them true. Good for repair, unreliable for assessment.',
      native:
        'Read for what somebody will compromise in order to keep. Not a criticism: the tradition is asking which arrangements a life is actually organised around, which is rarely the ones it names.',
      sourceId: 'bonatti',
      locus: 'Tr. 3',
    },
    Saturn: {
      is: 'The greater infortune, significator of the old, the deep, the buried, and of every occupation carried on in the dark or the dirt.',
      acts: 'Binds. It attaches a cost to time.',
      now: 'The medieval authors are the most explicit that Saturn’s difficulty is duration rather than severity — nothing dramatic, for a long time. That is the actual shape of the season, and it is why the advice is to reduce commitments rather than to brace.',
      native:
        'Bonatti’s Saturn is about retention. Unsentimentally: a strong one keeps what it builds and a weak one builds repeatedly, and the difference shows in the second half of a life rather than the first.',
      sourceId: 'bonatti',
      locus: 'Tr. 3',
    },
  },

  renaissance: {
    Sun: {
      is: 'Lilly gives the Sun rule over kings, princes and men of eminence, and over gold, and reads it for the native’s own honour.',
      acts: 'Raises, and burns what stands too near.',
      now: 'Lilly wrote to be used, and the use here is direct: this is a season concerning status and the people who confer it. He would have asked who the eminent person in the question is, which is still the first useful question.',
      native:
        'Lilly reads the Sun as honour — what somebody will not do for money. Afflicted, he is clear they are no less proud, merely proud about the wrong things.',
      sourceId: 'lilly',
      locus: 'Bk. I',
    },
    Moon: {
      is: 'The significatrix of the querent in most questions, and the planet Lilly watches for whether a matter will come to anything at all.',
      acts: 'Applies to the next planet, and that application is the answer.',
      now: 'The genuinely modern idea in Lilly is that the Moon reports on the *matter* rather than on the person. Read that way, this season is about whether the thing you are currently working on is going to conclude — which is a separate question from how you feel while it does.',
      native:
        'Lilly gives the Moon the messenger’s role: it reports how a matter is actually proceeding as against how it was meant to. In a nativity that is the standing gap between somebody’s plan and their week.',
      sourceId: 'lilly',
      locus: 'Bk. II',
    },
    Mars: {
      is: 'Lilly’s Mars is a specific kind of person — quarrelsome, fearless, and useful — as much as it is a force.',
      acts: 'Provokes, and will not be managed by being ignored.',
      now: 'Morin’s scepticism is worth pairing with this: he thought the received rules about the malefics far too sweeping, and insisted that what a planet actually governs in your chart matters more than its reputation. Mars arriving somewhere it already has responsibilities is not the same season at all.',
      native:
        'The lesser infortune, and Lilly is precise that its harm is nearly always self-inflicted rather than arriving from outside. Well placed it is the surgeon; badly placed, the same decisiveness a beat too early.',
      sourceId: 'morin',
      locus: 'Bk. XXI',
    },
    Mercury: {
      is: 'Lilly’s Mercury is the man of business — subtle, quick, and entirely dependent on the company he keeps.',
      acts: 'Adapts, faster than the situation changes.',
      now: 'The early-modern practitioners were sending letters, drafting contracts and arguing in print, and they read Mercury for exactly that. The season is administrative, and the risk is signing something you were too quick to understand.',
      native:
        'Lilly is more interested in Mercury’s honesty than its cleverness — whether an account of a thing matches the thing. Strong, somebody is exact; strained, they are persuasive, which is a different faculty entirely.',
      sourceId: 'lilly',
      locus: 'Bk. I',
    },
    Jupiter: {
      is: 'The greater fortune; Lilly’s Jupiter is temperate, honest and expansive, and he associates it with judges, scholars and merchants of standing.',
      acts: 'Favours, and overstates.',
      now: 'Morin’s correction applies here too: Jupiter is not a guarantee but a disposition, and it does whatever it already has responsibility for, more. Generous season, and a poor one for estimating.',
      native:
        'The greater fortune, and Lilly’s version is social: Jupiter is who will vouch for you. A strong one is a life with people in it who pick up the phone.',
      sourceId: 'lilly',
      locus: 'Bk. I',
    },
    Venus: {
      is: 'Lilly reads Venus for music, for pleasure, for reconciliation, and for the people who make their living from any of them.',
      acts: 'Pleases, and so gets its way without argument.',
      now: 'A good season for anything that depends on people wanting to say yes — and worth noticing that this includes things you would rather they said no to.',
      native:
        'Read for taste and for company — the room somebody is comfortable in. The strained version keeps walking into rooms they are not comfortable in, and staying.',
      sourceId: 'lilly',
      locus: 'Bk. I',
    },
    Saturn: {
      is: 'Lilly’s Saturn is grave, patient, laborious and suspicious; he gives it the deep places, the old professions, and everything done slowly.',
      acts: 'Restrains, and rewards only what is still there afterwards.',
      now: 'Lilly is worth reading directly on Saturn because he is describing people he had met rather than a principle. The season has the quality he attributes to the planet: nothing arrives quickly, and what does arrive has been earned in a way that is visible afterwards.',
      native:
        'Lilly’s Saturn is a particular kind of person and a particular kind of delay. In a nativity it marks the part of a life that will not be hurried, and the useful thing is to find out which part early.',
      sourceId: 'lilly',
      locus: 'Bk. I',
    },
  },

  jyotisha: {
    Sun: {
      is: 'Sūrya — ātmakāraka, the significator of the self, of the father, of bone and of sovereignty.',
      acts: 'Illuminates, and scorches what stands beside it.',
      now: 'The Jyotiṣa reading is more about authority within a person than about public rank — whether you are running your own life. A Sun period asks that directly, and is unusually unforgiving of arrangements where somebody else is deciding.',
      native:
        'Read for the self that cannot be delegated. Strong, somebody carries responsibility without being asked; weak, they carry it resentfully, which is the same weight held differently.',
      sourceId: 'parashara',
      locus: 'ch. 3',
    },
    Moon: {
      is: 'Candra — the mind itself, manas, and the significator of the mother and of everything that fills and empties.',
      acts: 'Waxes and wanes, and the tradition reads its brightness rather than only its place.',
      now: 'That the Moon *is* the mind, rather than signifying it, is the substantive difference from the Western traditions — which is why Jyotiṣa runs its principal period system from the Moon’s nakṣatra and reads the whole of a life’s timing from where the mind started.',
      native:
        'Manaḥkāraka, the mind, and in practice the placement a Jyotiṣī reads first. Well placed, somebody is at home in their own company; strained, the chart’s other strengths are harder for them to reach.',
      sourceId: 'parashara',
      locus: 'ch. 3',
    },
    Mars: {
      is: 'Maṅgala or Kuja — a kṛra graha, commander of the army, significator of siblings, land, and courage.',
      acts: 'Asserts, and holds ground.',
      now: 'The Sārāvalī treats Mars as competence before it treats it as harm — this is the planet of people who can actually do the thing. A Mars season is for work that requires nerve, and it goes badly only where there is nothing to apply the nerve to.',
      native:
        'Bhrātṛkāraka — courage, siblings, land, and the willingness to hold a position. Maṅgala is read for whether somebody will defend what is theirs, which is admired where it is warranted and named doṣa where it is not.',
      sourceId: 'kalyanavarma',
      locus: 'ch. 4',
    },
    Mercury: {
      is: 'Budha — intelligence and discrimination, and the most changeable of the grahas because it takes on the character of whatever it sits with.',
      acts: 'Distinguishes. It tells apart what had been lumped together.',
      now: 'The useful emphasis here is discernment rather than communication: this is a season for telling two similar-looking options apart, and the trap is treating fluency as understanding.',
      native:
        'Budha is discrimination: telling two similar things apart. Strong, somebody judges detail well; compromised, they are quick and wrong in a way that is hard to catch, because the speed is convincing.',
      sourceId: 'varahamihira',
      locus: 'ch. 2',
    },
    Jupiter: {
      is: 'Guru or Bṛhaspati — the teacher, the counsellor, and the greatest benefic; significator of children, of wealth, and of dharma.',
      acts: 'Blesses and expands, and its aspect is read as protective in a way no Western tradition quite matches.',
      now: 'Jyotiṣa gives Jupiter a reach the Western planets do not have — it sees the fifth and ninth from itself as well as the seventh — so wherever it stands it is touching three parts of the chart at once. Practically, it is the widest-reaching of the slow movements, and the one most worth planning around.',
      native:
        'Guru, and the tradition means teacher literally — a strong Jupiter usually means somebody was taught early and it took. Weak, they have had to construct their own principles, later and at more cost.',
      sourceId: 'parashara',
      locus: 'ch. 26',
    },
    Venus: {
      is: 'Śukra — the teacher of the asuras, significator of the spouse, of vehicles, of comfort and of art.',
      acts: 'Refines, and attaches.',
      now: 'Śukra being the *other* teacher is not a footnote: the tradition treats the pleasant path as a genuine path with a genuine syllabus, not as a distraction from a serious one. A Venus season is allowed to be enjoyable without that being a warning.',
      native:
        'Śukra is what somebody finds beautiful and will arrange a life to be near. It is also read for the capacity to enjoy what has already been obtained, which is a separate skill from obtaining it.',
      sourceId: 'kalyanavarma',
      locus: 'ch. 4',
    },
    Saturn: {
      is: 'Śani — slow, the significator of labour, of servants, of the poor, of longevity, and the one graha the tradition treats as a judge.',
      acts: 'Delays, and settles accounts.',
      now: 'The reason Śani reads differently here is that it is not merely an obstruction but a verdict — it gives what was earned, late and exactly. That makes a Saturn period unpleasant where the work was not done and quietly vindicating where it was, and the tradition is comfortable saying both.',
      native:
        'Śani is servant and judge. The doctrine is that it delays and then confirms: what it governs arrives late and does not leave, and a strong Śani is regarded as one of the better things to have.',
      sourceId: 'parashara',
      locus: 'ch. 3',
    },
    Rahu: {
      is: 'Rāhu — the severed head, a chāyā graha with no body, insatiable because it can swallow and not digest.',
      acts: 'Amplifies and obsesses, and confers worldly result without satisfaction.',
      now: 'The classical picture is unusually precise about a modern experience: wanting something at full intensity and finding that getting it does not end the wanting. A Rāhu season is productive and unsatisfying in the same motion, and knowing that in advance is most of what you can do about it.',
      native:
        'Unbounded appetite, and foreign ground — the part of a life that does not come from the family and is not explained by it. It gives worldly results and withholds satisfaction, which is the oldest observation about it.',
      sourceId: 'parashara',
      locus: 'ch. 3',
    },
    Ketu: {
      is: 'Ketu — the body without the head, the other chāyā graha; significator of detachment, of what is already finished, and of insight without ambition.',
      acts: 'Cuts away, and leaves what cannot be removed.',
      now: 'Interest withdraws from something and does not come back. The tradition reads this as liberating rather than as loss, and the reason is worth keeping: what Ketu takes is usually the part you were holding on to out of habit.',
      native:
        'Mokṣakāraka, read for where somebody is already finished, often without having noticed. It removes attachment to what it touches, which is loss or freedom depending on what was being held.',
      sourceId: 'parashara',
      locus: 'ch. 3',
    },
  },
};

/** The stance a tradition takes on a graha, if it takes one. */
export function stanceFor(tradition: TraditionId, graha: string): GrahaStance | undefined {
  return GRAHA_STANCE[tradition][graha];
}

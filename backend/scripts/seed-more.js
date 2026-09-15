import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT, 10),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGHOST === 'localhost' ? false : { rejectUnauthorized: false },
});

const POSTER_BASE = 'https://image.tmdb.org/t/p/w185';
const SALT_ROUNDS = 10;

// ── 8 New Users ───────────────────────────────────────────────
const NEW_USERS = [
  {
    email: 'james@aethel.io',    username: 'james_rewind',
    display_name: 'James Rewind', password: 'password123', role: 'user',
    bio: 'Classic Hollywood buff. Hitchcock > everyone. 500+ films logged 🎞️',
  },
  {
    email: 'luna@aethel.io',     username: 'luna_frames',
    display_name: 'Luna Frames',  password: 'password123', role: 'user',
    bio: 'Animation fanatic and Studio Ghibli devotee. Cinema is magic ✨',
  },
  {
    email: 'kai@aethel.io',      username: 'kai_critic',
    display_name: 'Kai Nakamura', password: 'password123', role: 'user',
    bio: 'Japanese cinema, Korean thrillers, and anything A24. Very picky. 🎬',
  },
  {
    email: 'zara@aethel.io',     username: 'zara_screens',
    display_name: 'Zara Ahmed',   password: 'password123', role: 'user',
    bio: 'Documentary junkie and slow-cinema enthusiast. Real life > fiction.',
  },
  {
    email: 'liam@aethel.io',     username: 'liam_popcorn',
    display_name: 'Liam Carter',  password: 'password123', role: 'user',
    bio: 'Blockbuster fan, horror addict, and proud Letterboxd power user 🍿',
  },
  {
    email: 'nina@aethel.io',     username: 'nina_ciné',
    display_name: 'Nina Dubois',  password: 'password123', role: 'user',
    bio: 'French cinema first, everything else second. Truffaut changed my life.',
  },
  {
    email: 'omar@aethel.io',     username: 'omar_director',
    display_name: 'Omar Hassan',  password: 'password123', role: 'user',
    bio: 'Aspiring filmmaker studying every frame. Cinematography nerd 📷',
  },
  {
    email: 'priya@aethel.io',    username: 'priya_plot',
    display_name: 'Priya Sharma', password: 'password123', role: 'user',
    bio: 'Bollywood + Hollywood equal opportunity lover. Twist endings obsessed 🎭',
  },
];

// ── Additional Movies ─────────────────────────────────────────
const MORE_MOVIES = [
  { title: 'Spirited Away',           release_year: 2001, tmdb_id: 129,    poster_url: `${POSTER_BASE}/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg`, overview: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.', genres: ['Animation', 'Family', 'Fantasy'] },
  { title: 'Princess Mononoke',       release_year: 1997, tmdb_id: 128,    poster_url: `${POSTER_BASE}/jHArjZDjCEJNgJHBMVCbTKwrFP2.jpg`, overview: 'Ashitaka, a prince of the disappearing Emishi people, is cursed by a demonized boar god.', genres: ['Animation', 'Fantasy', 'Action'] },
  { title: 'Psycho',                  release_year: 1960, tmdb_id: 539,    poster_url: `${POSTER_BASE}/yz4QVqPx3h551LTiegOyn0oWMqS.jpg`, overview: 'A secretary embezzles forty thousand dollars from her employer\'s client, goes on the run, and checks into a remote motel.', genres: ['Horror', 'Thriller', 'Mystery'] },
  { title: 'Rear Window',             release_year: 1954, tmdb_id: 4778,   poster_url: `${POSTER_BASE}/ILVF0eIP1jTouC2yCKrfBWKFbal.jpg`, overview: 'A magazine photographer confined to a wheelchair watches his neighbors through his rear window and becomes convinced one of them committed murder.', genres: ['Mystery', 'Thriller'] },
  { title: 'Oldboy',                  release_year: 2003, tmdb_id: 670,    poster_url: `${POSTER_BASE}/pWDtjs568ZfOTMm5C3TSoAYBs8Y.jpg`, overview: 'After being kidnapped and imprisoned for fifteen years, Oh Dae-Su is released, only to find that he must find his captor in five days.', genres: ['Action', 'Drama', 'Mystery'] },
  { title: 'Burning',                 release_year: 2018, tmdb_id: 508439, poster_url: `${POSTER_BASE}/6BzqzBrT3Ixo3JnBqxHMdUeFzrJ.jpg`, overview: 'Jong-su bumps into Hae-mi while delivering mail. She asks him to look after her cat while she\'s away on a trip.', genres: ['Drama', 'Mystery', 'Thriller'] },
  { title: 'The Lighthouse',          release_year: 2019, tmdb_id: 553604, poster_url: `${POSTER_BASE}/3ASf9SnEuNk5mNEUAHFV5xnlD4L.jpg`, overview: 'Two lighthouse keepers try to maintain their sanity while living on a remote and mysterious New England island in the 1890s.', genres: ['Drama', 'Fantasy', 'Thriller'] },
  { title: 'Portrait of a Lady on Fire', release_year: 2019, tmdb_id: 578701, poster_url: `${POSTER_BASE}/3aIsNiyb9jXDCjqAPkB4NiCzNzh.jpg`, overview: 'In 18th century France, Marianne is commissioned to paint the wedding portrait of Héloïse, a young woman recently released from a convent.', genres: ['Drama', 'Romance'] },
  { title: 'The Truman Show',         release_year: 1998, tmdb_id: 37165,  poster_url: `${POSTER_BASE}/vuza0WqY239yBXOadKlGwJsZJFE.jpg`, overview: 'Truman Burbank lives a happy life—but is unaware it is staged for a reality TV show.', genres: ['Drama', 'Comedy', 'Sci-Fi'] },
  { title: 'Midsommar',               release_year: 2019, tmdb_id: 530385, poster_url: `${POSTER_BASE}/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg`, overview: 'A couple travels to Sweden to visit a rural hometown\'s midsummer festival. What begins as an idyllic retreat devolves into an increasingly violent competition.', genres: ['Horror', 'Drama', 'Mystery'] },
  { title: 'Moonlight',               release_year: 2016, tmdb_id: 376867, poster_url: `${POSTER_BASE}/4911T5FbJ9eAlnRPLyo5JaRERUI.jpg`, overview: 'A young man\'s story unfolds in three chapters as he navigates identity, sexuality, and the struggles growing up in Miami.', genres: ['Drama'] },
  { title: '1917',                    release_year: 2019, tmdb_id: 530385, poster_url: `${POSTER_BASE}/iZf0KyrE25z1sage4SYFLCCrMi9.jpg`, overview: 'Two British soldiers are sent on an impossible mission in WWI: deliver a message deep in enemy territory.', genres: ['Drama', 'War', 'Action'] },
  { title: 'Her',                     release_year: 2013, tmdb_id: 152601, poster_url: `${POSTER_BASE}/lEIaL12hSkqqe83kgADkbUMEnUm.jpg`, overview: 'A lonely writer develops an unlikely relationship with an operating system designed to meet his every need.', genres: ['Drama', 'Romance', 'Sci-Fi'] },
  { title: 'Arrival',                 release_year: 2016, tmdb_id: 329865, poster_url: `${POSTER_BASE}/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg`, overview: 'When mysterious spacecraft touch down around the globe, a linguist is recruited to communicate with the alien life forms.', genres: ['Drama', 'Sci-Fi', 'Mystery'] },
  { title: 'No Country for Old Men',  release_year: 2007, tmdb_id: 6977,   poster_url: `${POSTER_BASE}/iLwSnGDgLDIgNz8L8XEpyLGJELQ.jpg`, overview: 'Violence and mayhem ensue after a hunter stumbles upon a drug deal gone wrong and over two million dollars in cash near the Rio Grande.', genres: ['Crime', 'Drama', 'Thriller'] },
  { title: 'Eternal Sunshine',        release_year: 2004, tmdb_id: 38,     poster_url: `${POSTER_BASE}/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg`, overview: 'When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories.', genres: ['Drama', 'Romance', 'Sci-Fi'] },
  { title: 'Titanic',                 release_year: 1997, tmdb_id: 597,    poster_url: `${POSTER_BASE}/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg`, overview: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.', genres: ['Drama', 'Romance'] },
  { title: 'The Matrix',              release_year: 1999, tmdb_id: 603,    poster_url: `${POSTER_BASE}/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg`, overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.', genres: ['Action', 'Sci-Fi'] },
  { title: 'Amélie',                  release_year: 2001, tmdb_id: 194,    poster_url: `${POSTER_BASE}/hnSFosOJGTGtcpQdYqNIFbmGBFo.jpg`, overview: 'At a tiny Parisian café, the adorable yet painfully shy Amélie accidentally discovers a gift for changing people\'s lives.', genres: ['Comedy', 'Romance'] },
  { title: 'Requiem for a Dream',     release_year: 2000, tmdb_id: 641,    poster_url: `${POSTER_BASE}/nOd6vjEmzCT0k4VYqsA2hwyi87C.jpg`, overview: 'The drug-induced utopias of four Coney Island people are shattered when their addictions run deep.', genres: ['Drama'] },
];

// ── Per-user collections ──────────────────────────────────────
const NEW_USER_MOVIES = {
  james_rewind: [
    { title: 'Psycho',                  rating: 5, status: 'Completed' },
    { title: 'Rear Window',             rating: 5, status: 'Completed' },
    { title: 'The Godfather',           rating: 5, status: 'Completed' },
    { title: 'The Dark Knight',         rating: 5, status: 'Completed' },
    { title: 'No Country for Old Men',  rating: 5, status: 'Completed' },
    { title: 'The Shawshank Redemption',rating: 5, status: 'Completed' },
    { title: 'Whiplash',                rating: 4, status: 'Completed' },
    { title: 'Parasite',                rating: 4, status: 'Completed' },
    { title: 'Inception',               rating: 4, status: 'Completed' },
    { title: 'Interstellar',            rating: 0, status: 'Want to Watch' },
    { title: 'Oppenheimer',             rating: 0, status: 'Want to Watch' },
    { title: 'Eternal Sunshine',        rating: 5, status: 'Completed' },
  ],
  luna_frames: [
    { title: 'Spirited Away',           rating: 5, status: 'Completed' },
    { title: 'Princess Mononoke',       rating: 5, status: 'Completed' },
    { title: 'Spider-Man: Into the Spider-Verse', rating: 5, status: 'Completed' },
    { title: 'Amélie',                  rating: 5, status: 'Completed' },
    { title: 'La La Land',              rating: 5, status: 'Completed' },
    { title: 'Everything Everywhere All at Once', rating: 5, status: 'Completed' },
    { title: 'Her',                     rating: 4, status: 'Completed' },
    { title: 'Portrait of a Lady on Fire', rating: 5, status: 'Completed' },
    { title: 'Moonlight',               rating: 4, status: 'Completed' },
    { title: 'Titanic',                 rating: 4, status: 'Completed' },
    { title: 'Midsommar',               rating: 0, status: 'Want to Watch' },
    { title: 'Oppenheimer',             rating: 0, status: 'Want to Watch' },
  ],
  kai_critic: [
    { title: 'Parasite',                rating: 5, status: 'Completed' },
    { title: 'Oldboy',                  rating: 5, status: 'Completed' },
    { title: 'Burning',                 rating: 5, status: 'Completed' },
    { title: 'Spirited Away',           rating: 5, status: 'Completed' },
    { title: 'Blade Runner 2049',       rating: 5, status: 'Completed' },
    { title: 'The Lighthouse',          rating: 4, status: 'Completed' },
    { title: 'Midsommar',               rating: 4, status: 'Completed' },
    { title: 'Hereditary',              rating: 5, status: 'Completed' },
    { title: 'No Country for Old Men',  rating: 4, status: 'Completed' },
    { title: 'Arrival',                 rating: 5, status: 'Completed' },
    { title: 'Everything Everywhere All at Once', rating: 4, status: 'Completed' },
    { title: 'Portrait of a Lady on Fire', rating: 5, status: 'Completed' },
  ],
  zara_screens: [
    { title: 'Moonlight',               rating: 5, status: 'Completed' },
    { title: 'Portrait of a Lady on Fire', rating: 5, status: 'Completed' },
    { title: 'Parasite',                rating: 5, status: 'Completed' },
    { title: 'Her',                     rating: 4, status: 'Completed' },
    { title: 'The Grand Budapest Hotel',rating: 4, status: 'Completed' },
    { title: 'Burning',                 rating: 5, status: 'Completed' },
    { title: 'Get Out',                 rating: 4, status: 'Completed' },
    { title: 'Eternal Sunshine',        rating: 5, status: 'Completed' },
    { title: 'Arrival',                 rating: 4, status: 'Completed' },
    { title: 'Midsommar',               rating: 3, status: 'Completed' },
    { title: 'Oppenheimer',             rating: 0, status: 'Watching' },
    { title: 'The Lighthouse',          rating: 0, status: 'Want to Watch' },
  ],
  liam_popcorn: [
    { title: 'Avengers: Endgame',       rating: 5, status: 'Completed' },
    { title: 'The Matrix',              rating: 5, status: 'Completed' },
    { title: 'Mad Max: Fury Road',      rating: 5, status: 'Completed' },
    { title: 'Midsommar',               rating: 4, status: 'Completed' },
    { title: 'Hereditary',              rating: 5, status: 'Completed' },
    { title: 'Get Out',                 rating: 4, status: 'Completed' },
    { title: 'Joker',                   rating: 4, status: 'Completed' },
    { title: 'Dune',                    rating: 4, status: 'Completed' },
    { title: '1917',                    rating: 5, status: 'Completed' },
    { title: 'Oppenheimer',             rating: 4, status: 'Completed' },
    { title: 'Spider-Man: Into the Spider-Verse', rating: 5, status: 'Completed' },
    { title: 'Oldboy',                  rating: 0, status: 'Want to Watch' },
  ],
  'nina_ciné': [
    { title: 'Amélie',                  rating: 5, status: 'Completed' },
    { title: 'Portrait of a Lady on Fire', rating: 5, status: 'Completed' },
    { title: 'The Grand Budapest Hotel',rating: 5, status: 'Completed' },
    { title: 'La La Land',              rating: 4, status: 'Completed' },
    { title: 'Parasite',                rating: 4, status: 'Completed' },
    { title: 'Moonlight',               rating: 5, status: 'Completed' },
    { title: 'Eternal Sunshine',        rating: 5, status: 'Completed' },
    { title: 'Her',                     rating: 4, status: 'Completed' },
    { title: 'Burning',                 rating: 5, status: 'Completed' },
    { title: 'Whiplash',                rating: 4, status: 'Completed' },
    { title: 'Rear Window',             rating: 5, status: 'Completed' },
    { title: 'Arrival',                 rating: 0, status: 'Want to Watch' },
  ],
  omar_director: [
    { title: 'Blade Runner 2049',       rating: 5, status: 'Completed' },
    { title: '1917',                    rating: 5, status: 'Completed' },
    { title: 'The Revenant',            rating: 5, status: 'Completed' },
    { title: 'Mad Max: Fury Road',      rating: 5, status: 'Completed' },
    { title: 'Arrival',                 rating: 5, status: 'Completed' },
    { title: 'Dune',                    rating: 5, status: 'Completed' },
    { title: 'Interstellar',            rating: 5, status: 'Completed' },
    { title: 'Inception',               rating: 4, status: 'Completed' },
    { title: 'No Country for Old Men',  rating: 4, status: 'Completed' },
    { title: 'Portrait of a Lady on Fire', rating: 4, status: 'Completed' },
    { title: 'Psycho',                  rating: 5, status: 'Completed' },
    { title: 'The Lighthouse',          rating: 5, status: 'Completed' },
  ],
  priya_plot: [
    { title: 'Inception',               rating: 5, status: 'Completed' },
    { title: 'The Truman Show',         rating: 5, status: 'Completed' },
    { title: 'Oldboy',                  rating: 4, status: 'Completed' },
    { title: 'Get Out',                 rating: 5, status: 'Completed' },
    { title: 'Parasite',                rating: 5, status: 'Completed' },
    { title: 'Hereditary',              rating: 4, status: 'Completed' },
    { title: 'Requiem for a Dream',     rating: 4, status: 'Completed' },
    { title: 'No Country for Old Men',  rating: 4, status: 'Completed' },
    { title: 'Everything Everywhere All at Once', rating: 5, status: 'Completed' },
    { title: 'Avengers: Endgame',       rating: 4, status: 'Completed' },
    { title: 'Burning',                 rating: 0, status: 'Want to Watch' },
    { title: 'Midsommar',               rating: 0, status: 'Want to Watch' },
  ],
};

// ── New Posts ─────────────────────────────────────────────────
const NEW_POSTS = [
  {
    author: 'james_rewind',
    title: 'Psycho (1960) still terrifies 60+ years later',
    body: 'Rewatched Psycho last night and I am still baffled by how Hitchcock managed to build this much tension with zero gore. The shower scene is 45 seconds. It shows almost nothing graphic. And yet it\'s one of the most effective horror sequences ever committed to film. The camera work, Bernard Herrmann\'s score — perfection. Modern horror directors could learn a lesson.',
    media_title: 'Psycho',
  },
  {
    author: 'luna_frames',
    title: 'Spirited Away is the greatest film ever made. I said it.',
    body: 'I know that\'s a bold statement but I\'m standing by it. Every single frame of Spirited Away contains more imagination than most entire film catalogs. The bathhouse, the soot sprites, No-Face, the train scene across the water — Miyazaki created a world so rich and strange and alive that it still feels completely fresh 20+ years later. My love letter to Studio Ghibli.',
    media_title: 'Spirited Away',
  },
  {
    author: 'kai_critic',
    title: 'Burning (2018) is the most haunting slow-burn thriller',
    body: 'Lee Chang-dong\'s Burning is the kind of film that colonizes your mind for weeks after watching. Nothing is spelled out. Everything is suggested. The greenhouse scene is one of the most unsettling things I\'ve witnessed in cinema. Steven Yeun is genuinely terrifying by doing almost nothing. If you haven\'t seen this, block out 3 hours and surrender to it.',
    media_title: 'Burning',
  },
  {
    author: 'zara_screens',
    title: 'Portrait of a Lady on Fire is a masterclass in restraint',
    body: 'Céline Sciamma made a love story where glances carry more weight than dialogue. The act of looking — of being seen, of painting someone — becomes the most intimate act imaginable. The score is almost entirely diegetic. The final shot absolutely destroyed me. Portrait of a Lady on Fire understands longing better than any film I\'ve ever seen.',
    media_title: 'Portrait of a Lady on Fire',
  },
  {
    author: 'liam_popcorn',
    title: 'Hereditary is the scariest film I\'ve ever seen. No debate.',
    body: 'I do not scare easily. I have seen every major horror film from the last 30 years. Hereditary broke me. The attic scene. The telephone pole scene. The dinner table monologue. Toni Collette delivers one of the greatest performances in horror history and was criminally overlooked at the Oscars. Ari Aster announced himself as a generational talent.',
    media_title: 'Hereditary',
  },
  {
    author: 'nina_ciné',
    title: 'Amélie changed how I see everyday life',
    body: 'Jean-Pierre Jeunet\'s Amélie taught me to find magic in the mundane. The coffee shops, the produce, the way light hits Paris at 4pm — everything became saturated and meaningful. Audrey Tautou\'s performance is one of cinema\'s great gifts. I watch this film when I\'m sad, when I\'m happy, and when I just need to be reminded that beauty is everywhere.',
    media_title: 'Amélie',
  },
  {
    author: 'omar_director',
    title: '1917 is the greatest single-take war film ever crafted',
    body: 'Roger Deakins and Sam Mendes pulled off something I genuinely did not believe was possible. 1917 feels like you are walking next to these men in real time. The transition through the burning village is one of the most visually arresting sequences I can name. The stitching is invisible. The tension is relentless. A technical miracle in service of raw humanity.',
    media_title: '1917',
  },
  {
    author: 'priya_plot',
    title: 'The Truman Show predicted reality TV and social media perfectly',
    body: 'Jim Carrey\'s Truman Burbank is simultaneously the most watched person alive and the most lonely. Rewatching this in 2024 is a completely different experience — we are ALL Truman now, performing our lives for audiences. The ending still gives me chills. "In case I don\'t see ya: good afternoon, good evening, and good night." Prophetic film.',
    media_title: 'The Truman Show',
  },
  {
    author: 'james_rewind',
    title: 'No Country for Old Men is Cormac McCarthy AND the Coens at their best',
    body: 'I\'ve read the novel three times and the Coens\' adaptation loses nothing in translation. Anton Chigurh is cinema\'s greatest villain — not because he\'s evil, but because he\'s a force of nature that operates on its own logic. The coin flip scene. The milk scene. The ending that refuses to give you closure. A film that demands you think about fate and mortality.',
    media_title: 'No Country for Old Men',
  },
  {
    author: 'kai_critic',
    title: 'Oldboy (2003) has the most shocking reveal in cinema history',
    body: 'Park Chan-wook built an entire film around one gut-punch that I will never recover from. The corridor fight scene is the most impressive single-take action sequence ever filmed — one man vs. a hallway full of people, exhausted and brutal and real. But everything in Oldboy exists to make that final revelation land as hard as possible. Unmissable.',
    media_title: 'Oldboy',
  },
  {
    author: 'luna_frames',
    title: 'Her (2013) understood loneliness before the AI age',
    body: 'Spike Jonze made a film about falling in love with an AI that somehow becomes a meditation on what connection actually means. Theodore\'s loneliness is so precisely observed that it hurts. Scarlett Johansson performs an entire character with only her voice. And the ending… the way it refuses sentimentality and chooses something genuinely philosophical. Underrated masterpiece.',
    media_title: 'Her',
  },
  {
    author: 'omar_director',
    title: 'Arrival proves sci-fi can be about language and grief',
    body: 'Denis Villeneuve is the most consistent director working today. Arrival wraps an emotionally devastating story about grief, time, and parenthood inside a first-contact sci-fi thriller. The heptapod language is a legitimate linguistic concept. The twist reframes EVERYTHING you saw before it. Amy Adams should have an Oscar for this. Genuinely one of the best films of the decade.',
    media_title: 'Arrival',
  },
  {
    author: 'zara_screens',
    title: 'Moonlight is quiet, devastating, and essential',
    body: 'Barry Jenkins\' Moonlight is three short films that together create something enormous. Each chapter of Chiron\'s life feels complete and incomplete at the same time. The scene at the diner. The conversation about the moon. The tenderness of two people who never learned how to speak to each other finding words at last. This film lives inside me.',
    media_title: 'Moonlight',
  },
  {
    author: 'priya_plot',
    title: 'Get Out did something no horror film had done before',
    body: 'Jordan Peele turned racial anxiety into a genre film that works on every level simultaneously. It\'s funny, terrifying, and politically sharp all at once. The "sunken place" is now a cultural shorthand for a reason — it perfectly visualizes the experience of being othered and suppressed. Daniel Kaluuya\'s face tells a whole novel without words. A modern masterpiece.',
    media_title: 'Get Out',
  },
  {
    author: 'liam_popcorn',
    title: 'The Matrix was a philosophical gut-punch disguised as action',
    body: 'I was 12 when I first saw The Matrix and I didn\'t understand half of what it was saying. At 28 I understand all of it and it\'s even better. Baudrillard\'s simulacrum, Plato\'s cave, questions of free will vs. determinism — all delivered through some of the most innovative action filmmaking in history. The lobby scene. The rooftop helicopter. Nothing has aged it.',
    media_title: 'The Matrix',
  },
  {
    author: 'nina_ciné',
    title: 'Eternal Sunshine hurts so much because it\'s so accurate',
    body: 'Charlie Kaufman understands the architecture of love and loss better than any writer I know. The way he literalizes the selective memory erasure — running backwards through a relationship as it gets deleted — is devastating. Joel and Clementine feel REAL. The ending is simultaneously hopeless and hopeful and I think that\'s the point. You watch it once and carry it forever.',
    media_title: 'Eternal Sunshine',
  },
  {
    author: 'kai_critic',
    title: 'The Lighthouse is the most unhinged prestige film of the decade',
    body: 'Robert Eggers shot this in 35mm black and white with an almost-square aspect ratio. Willem Dafoe and Robert Pattinson are both giving performances from another galaxy. The descent into madness is so claustrophobic that you can almost smell the salt and kerosene. Nothing I say can prepare you for what happens in the last thirty minutes. 4:3 ratio, shot like a nightmare.',
    media_title: 'The Lighthouse',
  },
  {
    author: 'james_rewind',
    title: 'Eternal Sunshine of the Spotless Mind — revisiting heartbreak',
    body: 'I last watched Eternal Sunshine during a breakup and it felt like being punched repeatedly. Now watching it happily in a relationship, it plays completely differently — now it feels like a warning and a celebration simultaneously. Kaufman\'s genius is that the film changes based on what you bring to it. How many films can say that?',
    media_title: 'Eternal Sunshine',
  },
  {
    author: 'omar_director',
    title: 'Blade Runner 2049 — studying Deakins frame by frame',
    body: 'I spent a week watching Blade Runner 2049 with a notebook and pausing every composition. Deakins never places a camera randomly. Every frame has a sight line, a color temperature story, a texture choice. The orange wasteland sequence. The black-and-white Las Vegas. The water battle in blue-grey. Three completely different looks in service of three different emotional states. Cinema school in one film.',
    media_title: 'Blade Runner 2049',
  },
  {
    author: 'priya_plot',
    title: 'Requiem for a Dream is the most uncomfortable film I\'ve ever loved',
    body: 'Darren Aronofsky made a film about addiction that is itself somewhat addictive to discuss. The split screens, the hip-hop montages of pills and pupils, Clint Mansell\'s unforgettable score — everything accelerates toward devastation. Ellen Burstyn\'s performance as Sara Goldfarb is one of the greatest in all of cinema. I will never forget this film. I will probably never watch it again.',
    media_title: 'Requiem for a Dream',
  },
];

// ── Comments ──────────────────────────────────────────────────
const NEW_COMMENTS = [
  { postTitle: 'Psycho (1960) still terrifies 60+ years later',         author: 'kai_critic',    body: 'The thing about that shower scene is that Hitchcock originally hired Janet Leigh as the star so audiences expected her to survive. Killing the protagonist 30 minutes in was unthinkable. That subversion is why it still works — it broke a fundamental rule of storytelling.' },
  { postTitle: 'Psycho (1960) still terrifies 60+ years later',         author: 'omar_director',  body: 'Herrmann\'s strings are genuinely half the terror. Hitchcock wanted to do the scene silent. Herrmann insisted. Can you imagine that scene without the screeching violins? Impossible now.' },
  { postTitle: 'Spirited Away is the greatest film ever made. I said it.', author: 'nina_ciné',   body: 'Bold but I\'m not going to argue. The train sequence with no dialogue across the water is one of cinema\'s most beautiful moments. Miyazaki understands childhood imagination in a way no one else does.' },
  { postTitle: 'Spirited Away is the greatest film ever made. I said it.', author: 'zara_screens', body: 'What gets me is that there\'s no central villain, no clear moral lesson. It trusts children to feel things without explaining them. So rare in Western animation.' },
  { postTitle: 'Spirited Away is the greatest film ever made. I said it.', author: 'priya_plot',  body: 'The love story between Chihiro and Haku is so subtle and so pure. They barely interact and yet you feel it completely. Miyazaki communicates through glances and gestures like no one else.' },
  { postTitle: 'Burning (2018) is the most haunting slow-burn thriller',  author: 'zara_screens', body: 'I thought about this film for literally two months after watching. The ambiguity is the point — you can\'t prove anything, just like Jong-su can\'t. Lee Chang-dong implicates the audience in the uncertainty.' },
  { postTitle: 'Burning (2018) is the most haunting slow-burn thriller',  author: 'nina_ciné',   body: 'The great hunger monologue near the end is one of the most chilling pieces of dialogue in modern cinema. Steven Yeun says almost everything with just his eyes.' },
  { postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint', author: 'luna_frames', body: 'The scene where they\'re both looking at the painting and she realizes she\'s been depicted in it — everything communicated through two pairs of eyes. I gasped.' },
  { postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint', author: 'nina_ciné',   body: 'Céline Sciamma creates a world with no male gaze. The only eye is female, mutual, and aching. It transformed how I think about point of view in cinema.' },
  { postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint', author: 'kai_critic',  body: 'The fire scene where she turns and she\'s burning at the edges — that image is seared into my memory permanently. Haunting.' },
  { postTitle: 'Hereditary is the scariest film I\'ve ever seen. No debate.', author: 'priya_plot', body: 'The telephone pole moment made me yelp out loud alone in my apartment at midnight. Context makes it worse — you\'ve seen this family\'s entire story up to that point and then that happens.' },
  { postTitle: 'Hereditary is the scariest film I\'ve ever seen. No debate.', author: 'kai_critic', body: 'Toni Collette\'s dinner table breakdown might be the most unnerving scene in any horror film ever. The camera just holds on her. She doesn\'t stop. Nothing is cut away.' },
  { postTitle: 'Hereditary is the scariest film I\'ve ever seen. No debate.', author: 'james_rewind', body: 'It works because it\'s a grief film first and a horror film second. The horror only hits so hard because you already feel how broken this family is.' },
  { postTitle: '1917 is the greatest single-take war film ever crafted',  author: 'james_rewind', body: 'The transition from day to night in the ruined village is technically one of the most complex sequences ever filmed. They had about an hour of the right lighting to shoot it each day.' },
  { postTitle: '1917 is the greatest single-take war film ever crafted',  author: 'liam_popcorn', body: 'When the camera goes under water and comes back up in the completely different setting — I held my breath in the theater. First time a film made me forget to breathe.' },
  { postTitle: 'Oldboy (2003) has the most shocking reveal in cinema history', author: 'priya_plot', body: 'I knew the twist going in because someone spoiled it, and it STILL destroyed me. The craft means you feel it regardless. That\'s a masterful filmmaker.' },
  { postTitle: 'Oldboy (2003) has the most shocking reveal in cinema history', author: 'liam_popcorn', body: 'The hammer corridor fight scene was shot over three days with minimal cuts. Choi Min-sik was genuinely exhausted by take 17. You can see it and it makes it more real.' },
  { postTitle: 'Her (2013) understood loneliness before the AI age',     author: 'james_rewind', body: 'Rewatching this in the ChatGPT era is a profoundly different experience. Jonze wasn\'t predicting a technology trend, he was predicting emotional outsourcing.' },
  { postTitle: 'Her (2013) understood loneliness before the AI age',     author: 'zara_screens', body: 'The scene where he walks through crowds of people all talking to their OSes and he\'s one of hundreds — quietly the most unsettling image in the film.' },
  { postTitle: 'Arrival proves sci-fi can be about language and grief',   author: 'luna_frames', body: 'The reveal that the memories are actually the future fundamentally changes what the film is about. Rewatching it immediately after — every scene plays differently. Incredible screenwriting.' },
  { postTitle: 'Arrival proves sci-fi can be about language and grief',   author: 'kai_critic',  body: 'Eric Heisserer adapted an unfilmable short story. Ted Chiang\'s original is brilliant but very interior. The adaptation solved every problem. Genuinely impressive work.' },
  { postTitle: 'Moonlight is quiet, devastating, and essential',          author: 'nina_ciné',   body: 'James Laxton\'s cinematography is the real supporting actor. The way he shoots Black skin in golden light, the way color shifts between each chapter — it\'s a visual argument about who gets to be beautiful on screen.' },
  { postTitle: 'Get Out did something no horror film had done before',    author: 'omar_director', body: 'Peele uses every conventional horror mechanic — the jump scare, the creepy family, the isolated location — but fills each one with specific racial content. Nothing in this film is accidental.' },
  { postTitle: 'Get Out did something no horror film had done before',    author: 'liam_popcorn', body: 'The tea cup scene. The way she stirs and he snaps into a new face. That moment is so quietly horrifying. No music. Just a sound. I didn\'t breathe.' },
  { postTitle: 'The Matrix was a philosophical gut-punch disguised as action', author: 'james_rewind', body: 'The Wachowskis made philosophy populist. Baudrillard is on screen in the film literally but you don\'t need to know him to feel what the film is saying. That accessibility is genius.' },
  { postTitle: 'The Matrix was a philosophical gut-punch disguised as action', author: 'kai_critic',  body: 'The bullet-time sequences were revolutionary but what people forget is the sound design. The silence before an action beat — that\'s as important as the visuals.' },
  { postTitle: 'Eternal Sunshine hurts so much because it\'s so accurate', author: 'james_rewind', body: 'What kills me is the very first scene is technically the last scene chronologically. Knowing that, the whole film becomes even more bittersweet.' },
  { postTitle: 'Eternal Sunshine hurts so much because it\'s so accurate', author: 'priya_plot',  body: '"How happy is the blameless vestal\'s lot! The world forgetting, by the world forgot. Eternal sunshine of the spotless mind!" — that Pope poem is the whole thesis in four lines.' },
  { postTitle: 'The Lighthouse is the most unhinged prestige film of the decade', author: 'liam_popcorn', body: 'Robert Pattinson has officially erased Twilight from memory. The man is a legitimate actor of the highest order and The Lighthouse is exhibit A.' },
  { postTitle: 'Blade Runner 2049 — studying Deakins frame by frame',    author: 'luna_frames',  body: 'The hologram scene with Joi against the falling rain — that image is genuinely one of the most beautiful things I\'ve ever seen projected. Every detail is intentional.' },
  { postTitle: 'Requiem for a Dream is the most uncomfortable film I\'ve ever loved', author: 'nina_ciné', body: 'Mansell\'s "Lux Aeterna" has been overused in every trailer since but hearing it in context is still devastating. It\'s not triumphant in this film. It\'s a dirge.' },
];

// ── Loves ─────────────────────────────────────────────────────
const NEW_LOVES = [
  { lover: 'james_rewind',  postTitle: 'Parasite deserved every Oscar it won (and more)' },
  { lover: 'james_rewind',  postTitle: 'Blade Runner 2049 is criminally underrated' },
  { lover: 'james_rewind',  postTitle: 'Spirited Away is the greatest film ever made. I said it.' },
  { lover: 'james_rewind',  postTitle: 'Burning (2018) is the most haunting slow-burn thriller' },
  { lover: 'james_rewind',  postTitle: '1917 is the greatest single-take war film ever crafted' },
  { lover: 'luna_frames',   postTitle: 'Everything Everywhere is the most unhinged, beautiful film' },
  { lover: 'luna_frames',   postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint' },
  { lover: 'luna_frames',   postTitle: 'Spirited Away is the greatest film ever made. I said it.' },
  { lover: 'luna_frames',   postTitle: 'Her (2013) understood loneliness before the AI age' },
  { lover: 'luna_frames',   postTitle: 'Moonlight is quiet, devastating, and essential' },
  { lover: 'kai_critic',    postTitle: 'Parasite deserved every Oscar it won (and more)' },
  { lover: 'kai_critic',    postTitle: 'Burning (2018) is the most haunting slow-burn thriller' },
  { lover: 'kai_critic',    postTitle: 'Hereditary is the scariest film I\'ve ever seen. No debate.' },
  { lover: 'kai_critic',    postTitle: 'Arrival proves sci-fi can be about language and grief' },
  { lover: 'kai_critic',    postTitle: 'Oldboy (2003) has the most shocking reveal in cinema history' },
  { lover: 'zara_screens',  postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint' },
  { lover: 'zara_screens',  postTitle: 'Moonlight is quiet, devastating, and essential' },
  { lover: 'zara_screens',  postTitle: 'Burning (2018) is the most haunting slow-burn thriller' },
  { lover: 'zara_screens',  postTitle: 'Everything Everywhere is the most unhinged, beautiful film' },
  { lover: 'zara_screens',  postTitle: 'Her (2013) understood loneliness before the AI age' },
  { lover: 'liam_popcorn',  postTitle: 'Hereditary is the scariest film I\'ve ever seen. No debate.' },
  { lover: 'liam_popcorn',  postTitle: 'Avengers: Endgame made me cry in a theater for the first time' },
  { lover: 'liam_popcorn',  postTitle: 'Into the Spider-Verse changed what animated films can be' },
  { lover: 'liam_popcorn',  postTitle: 'The Matrix was a philosophical gut-punch disguised as action' },
  { lover: 'liam_popcorn',  postTitle: '1917 is the greatest single-take war film ever crafted' },
  { lover: 'nina_ciné',     postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint' },
  { lover: 'nina_ciné',     postTitle: 'Amélie changed how I see everyday life' },
  { lover: 'nina_ciné',     postTitle: 'Eternal Sunshine hurts so much because it\'s so accurate' },
  { lover: 'nina_ciné',     postTitle: 'Parasite deserved every Oscar it won (and more)' },
  { lover: 'omar_director', postTitle: 'Blade Runner 2049 is criminally underrated' },
  { lover: 'omar_director', postTitle: '1917 is the greatest single-take war film ever crafted' },
  { lover: 'omar_director', postTitle: 'Dune Part One — Denis Villeneuve is a visionary' },
  { lover: 'omar_director', postTitle: 'Arrival proves sci-fi can be about language and grief' },
  { lover: 'priya_plot',    postTitle: 'Inception is still the GOAT of mind-bending cinema' },
  { lover: 'priya_plot',    postTitle: 'Get Out did something no horror film had done before' },
  { lover: 'priya_plot',    postTitle: 'Oldboy (2003) has the most shocking reveal in cinema history' },
  { lover: 'priya_plot',    postTitle: 'Everything Everywhere is the most unhinged, beautiful film' },
  { lover: 'alex_cinema',   postTitle: '1917 is the greatest single-take war film ever crafted' },
  { lover: 'sarah_film',    postTitle: 'Portrait of a Lady on Fire is a masterclass in restraint' },
  { lover: 'mike_reel',     postTitle: 'Hereditary is the scariest film I\'ve ever seen. No debate.' },
];

// ── Seed Runner ───────────────────────────────────────────────
async function seedMore() {
  const client = await pool.connect();
  console.log('\n🌱 Starting extended seed...\n');

  try {
    await client.query('BEGIN');

    // Genre map
    const { rows: genreRows } = await client.query('SELECT genre_id, genre_name FROM genres');
    const genreMap = Object.fromEntries(genreRows.map(g => [g.genre_name, g.genre_id]));

    // Movie type
    const { rows: typeRows } = await client.query("SELECT type_id FROM item_types WHERE type_name = 'Movie' LIMIT 1");
    const movieTypeId = typeRows[0]?.type_id;
    if (!movieTypeId) throw new Error('Movie type not found');

    // ── 1. Create new users ───────────────────────────────────
    const userMap = {};
    for (const u of NEW_USERS) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
      const { rows } = await client.query(
        `INSERT INTO users (email, username, password_hash, display_name, bio, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio
         RETURNING user_id, username`,
        [u.email, u.username, hash, u.display_name, u.bio, u.role]
      );
      userMap[rows[0].username] = rows[0].user_id;
      console.log(`  👤 ${u.display_name} (@${u.username})`);
    }

    // Also load existing users into the map
    const { rows: existingUsers } = await client.query('SELECT user_id, username FROM users');
    for (const u of existingUsers) {
      if (!userMap[u.username]) userMap[u.username] = u.user_id;
    }

    // ── 2. Build movie lookup (no placeholder inserts needed) ────
    const movieLookup = {};
    for (const m of MORE_MOVIES) {
      movieLookup[m.title] = m;
    }

    // Also load original movies into lookup
    const ORIG_MOVIES = [
      { title: 'Inception', release_year: 2010, tmdb_id: 27205, poster_url: `${POSTER_BASE}/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg`, overview: '', genres: ['Sci-Fi', 'Action', 'Thriller'] },
      { title: 'The Dark Knight', release_year: 2008, tmdb_id: 155, poster_url: `${POSTER_BASE}/qJ2tW6WMUDux911r6m7haRef0WH.jpg`, overview: '', genres: ['Action', 'Crime', 'Drama'] },
      { title: 'Interstellar', release_year: 2014, tmdb_id: 157336, poster_url: `${POSTER_BASE}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`, overview: '', genres: [] },
      { title: 'Parasite', release_year: 2019, tmdb_id: 496243, poster_url: `${POSTER_BASE}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`, overview: '', genres: [] },
      { title: 'Dune', release_year: 2021, tmdb_id: 438631, poster_url: `${POSTER_BASE}/d5NXSklpcvkBX3n9D2C8JdfX98v.jpg`, overview: '', genres: [] },
      { title: 'The Shawshank Redemption', release_year: 1994, tmdb_id: 278, poster_url: `${POSTER_BASE}/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg`, overview: '', genres: [] },
      { title: 'Avengers: Endgame', release_year: 2019, tmdb_id: 299534, poster_url: `${POSTER_BASE}/or06FN3Dka5tukK1e9sl16pB3iy.jpg`, overview: '', genres: [] },
      { title: 'Oppenheimer', release_year: 2023, tmdb_id: 872585, poster_url: `${POSTER_BASE}/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`, overview: '', genres: [] },
      { title: 'Everything Everywhere All at Once', release_year: 2022, tmdb_id: 545611, poster_url: `${POSTER_BASE}/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg`, overview: '', genres: [] },
      { title: 'Whiplash', release_year: 2014, tmdb_id: 244786, poster_url: `${POSTER_BASE}/oPFPHHHFg3tReuOB1mb7oqcf3UE.jpg`, overview: '', genres: [] },
      { title: 'Mad Max: Fury Road', release_year: 2015, tmdb_id: 76341, poster_url: `${POSTER_BASE}/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg`, overview: '', genres: [] },
      { title: 'Spider-Man: Into the Spider-Verse', release_year: 2018, tmdb_id: 324857, poster_url: `${POSTER_BASE}/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg`, overview: '', genres: [] },
      { title: 'La La Land', release_year: 2016, tmdb_id: 313369, poster_url: `${POSTER_BASE}/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg`, overview: '', genres: [] },
      { title: 'The Godfather', release_year: 1972, tmdb_id: 238, poster_url: `${POSTER_BASE}/3bhkrj58Vtu7enYsLeleqKeioz.jpg`, overview: '', genres: [] },
      { title: 'Get Out', release_year: 2017, tmdb_id: 419430, poster_url: `${POSTER_BASE}/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg`, overview: '', genres: [] },
      { title: 'Hereditary', release_year: 2018, tmdb_id: 493922, poster_url: `${POSTER_BASE}/V3bYBs1PygTQFMoq1pu2hBmLnW.jpg`, overview: '', genres: [] },
      { title: 'The Revenant', release_year: 2015, tmdb_id: 281957, poster_url: `${POSTER_BASE}/ji3ecJphATlVgWNY0B0RVXZizja.jpg`, overview: '', genres: [] },
      { title: 'Joker', release_year: 2019, tmdb_id: 475557, poster_url: `${POSTER_BASE}/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg`, overview: '', genres: [] },
      { title: 'Blade Runner 2049', release_year: 2017, tmdb_id: 335984, poster_url: `${POSTER_BASE}/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg`, overview: '', genres: [] },
      { title: 'The Grand Budapest Hotel', release_year: 2014, tmdb_id: 120467, poster_url: `${POSTER_BASE}/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg`, overview: '', genres: [] },
    ];
    for (const m of ORIG_MOVIES) movieLookup[m.title] = m;
    for (const m of MORE_MOVIES) movieLookup[m.title] = m;

    // ── 3. Insert collections for new users ───────────────────
    for (const [username, movies] of Object.entries(NEW_USER_MOVIES)) {
      const userId = userMap[username];
      if (!userId) { console.warn(`  ⚠️  No user found: ${username}`); continue; }
      let count = 0;
      for (const m of movies) {
        const meta = movieLookup[m.title];
        if (!meta) { console.warn(`  ⚠️  No metadata: ${m.title}`); continue; }
        // rating must be 1-5, NOT NULL — unrated entries default to 3
        const rating = (m.rating && m.rating >= 1) ? m.rating : 3;
        await client.query(
          `INSERT INTO media_items (title, release_year, rating, completion_status, poster_url, overview, tmdb_id, type_id, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [meta.title, meta.release_year, rating, m.status, meta.poster_url, meta.overview || '', meta.tmdb_id, movieTypeId, userId]
        );
        count++;
      }
      console.log(`  🎬 ${username}: ${count} movies`);
    }

    // ── 4. Posts ──────────────────────────────────────────────
    const postIdMap = {};

    // Load existing post titles → IDs
    const { rows: existingPosts } = await client.query('SELECT post_id, title FROM posts');
    for (const p of existingPosts) postIdMap[p.title] = p.post_id;

    for (const p of NEW_POSTS) {
      const userId = userMap[p.author];
      if (!userId) continue;
      const { rows } = await client.query(
        `INSERT INTO posts (user_id, title, body, media_type, media_title, status)
         VALUES ($1, $2, $3, 'Movie', $4, 'published')
         ON CONFLICT DO NOTHING RETURNING post_id`,
        [userId, p.title, p.body, p.media_title]
      );
      if (rows[0]) postIdMap[p.title] = rows[0].post_id;
    }
    console.log(`  📝 Posts: ${NEW_POSTS.length}`);

    // ── 5. Comments ───────────────────────────────────────────
    let commentCount = 0;
    for (const c of NEW_COMMENTS) {
      const postId = postIdMap[c.postTitle];
      const userId = userMap[c.author];
      if (!postId || !userId) { console.warn(`  ⚠️  Missing post/user for comment: "${c.postTitle}" by ${c.author}`); continue; }
      await client.query(
        'INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3)',
        [postId, userId, c.body]
      );
      commentCount++;
    }
    console.log(`  💬 Comments: ${commentCount}`);

    // ── 6. Loves ──────────────────────────────────────────────
    let loveCount = 0;
    for (const l of NEW_LOVES) {
      const userId = userMap[l.lover];
      const postId = postIdMap[l.postTitle];
      if (!postId || !userId) continue;
      await client.query(
        'INSERT INTO loves (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, postId]
      );
      loveCount++;
    }
    console.log(`  ❤️  Loves: ${loveCount}`);

    await client.query('COMMIT');

    console.log('\n✅ Extended seed complete!\n');
    console.log('New accounts (password: password123):');
    for (const u of NEW_USERS) {
      console.log(`  ${u.email.padEnd(22)} → @${u.username}`);
    }
    console.log();

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMore();

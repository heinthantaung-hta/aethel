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
const SALT_ROUNDS = 12;

// ── Users ─────────────────────────────────────────────────────
const USERS = [
  {
    email: 'alex@aethel.io',
    username: 'alex_cinema',
    display_name: 'Alex Chen',
    bio: 'Obsessed with sci-fi and psychological thrillers. 300+ films logged. 🎬',
    password: 'password123',
    role: 'user',
  },
  {
    email: 'sarah@aethel.io',
    username: 'sarah_film',
    display_name: 'Sarah Park',
    bio: 'Film critic by day, cinephile by night. Arthouse & indie specialist. 🎞️',
    password: 'password123',
    role: 'user',
  },
  {
    email: 'mike@aethel.io',
    username: 'mike_reel',
    display_name: 'Mike Torres',
    bio: 'Marvel fan but open to everything. Building my watchlist one movie at a time.',
    password: 'password123',
    role: 'user',
  },
  {
    email: 'admin@aethel.io',
    username: 'admin',
    display_name: 'Aethel Admin',
    bio: 'Keeping the community great. 🛡️',
    password: 'admin123',
    role: 'admin',
  },
];

// ── Movies with real TMDB data ─────────────────────────────────
const MOVIES = [
  {
    title: 'Inception',
    release_year: 2010,
    tmdb_id: 27205,
    poster_url: `${POSTER_BASE}/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg`,
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
    genres: ['Sci-Fi', 'Action', 'Thriller'],
  },
  {
    title: 'The Dark Knight',
    release_year: 2008,
    tmdb_id: 155,
    poster_url: `${POSTER_BASE}/qJ2tW6WMUDux911r6m7haRef0WH.jpg`,
    overview: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    genres: ['Action', 'Crime', 'Drama'],
  },
  {
    title: 'Interstellar',
    release_year: 2014,
    tmdb_id: 157336,
    poster_url: `${POSTER_BASE}/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg`,
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
  },
  {
    title: 'Parasite',
    release_year: 2019,
    tmdb_id: 496243,
    poster_url: `${POSTER_BASE}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
    overview: 'All unemployed, Ki-taek\'s family takes a peculiar interest in the wealthy and seemingly perfect Parks family.',
    genres: ['Drama', 'Thriller', 'Comedy'],
  },
  {
    title: 'Dune',
    release_year: 2021,
    tmdb_id: 438631,
    poster_url: `${POSTER_BASE}/d5NXSklpcvkBX3n9D2C8JdfX98v.jpg`,
    overview: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.',
    genres: ['Sci-Fi', 'Adventure'],
  },
  {
    title: 'The Shawshank Redemption',
    release_year: 1994,
    tmdb_id: 278,
    poster_url: `${POSTER_BASE}/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg`,
    overview: 'Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.',
    genres: ['Drama'],
  },
  {
    title: 'Avengers: Endgame',
    release_year: 2019,
    tmdb_id: 299534,
    poster_url: `${POSTER_BASE}/or06FN3Dka5tukK1e9sl16pB3iy.jpg`,
    overview: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more.',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
  },
  {
    title: 'Oppenheimer',
    release_year: 2023,
    tmdb_id: 872585,
    poster_url: `${POSTER_BASE}/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg`,
    overview: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    genres: ['Drama', 'History', 'Thriller'],
  },
  {
    title: 'Everything Everywhere All at Once',
    release_year: 2022,
    tmdb_id: 545611,
    poster_url: `${POSTER_BASE}/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg`,
    overview: 'A middle-aged Chinese immigrant is swept up in an insane adventure in which she alone can save existence by exploring other universes and the lives she could have led.',
    genres: ['Sci-Fi', 'Comedy', 'Action'],
  },
  {
    title: 'Whiplash',
    release_year: 2014,
    tmdb_id: 244786,
    poster_url: `${POSTER_BASE}/oPFPHHHFg3tReuOB1mb7oqcf3UE.jpg`,
    overview: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.',
    genres: ['Drama', 'Music'],
  },
  {
    title: 'Mad Max: Fury Road',
    release_year: 2015,
    tmdb_id: 76341,
    poster_url: `${POSTER_BASE}/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg`,
    overview: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners, a psychotic worshiper, and a drifter named Max.',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
  },
  {
    title: 'Spider-Man: Into the Spider-Verse',
    release_year: 2018,
    tmdb_id: 324857,
    poster_url: `${POSTER_BASE}/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg`,
    overview: 'Miles Morales becomes the Spider-Man of his universe and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.',
    genres: ['Animation', 'Action', 'Adventure'],
  },
  {
    title: 'La La Land',
    release_year: 2016,
    tmdb_id: 313369,
    poster_url: `${POSTER_BASE}/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg`,
    overview: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.',
    genres: ['Drama', 'Romance', 'Music'],
  },
  {
    title: 'The Godfather',
    release_year: 1972,
    tmdb_id: 238,
    poster_url: `${POSTER_BASE}/3bhkrj58Vtu7enYsLeleqKeioz.jpg`,
    overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to keep the family together.',
    genres: ['Crime', 'Drama'],
  },
  {
    title: 'Get Out',
    release_year: 2017,
    tmdb_id: 419430,
    poster_url: `${POSTER_BASE}/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg`,
    overview: 'A young African-American visits his white girlfriend\'s parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.',
    genres: ['Horror', 'Mystery', 'Thriller'],
  },
  {
    title: 'Hereditary',
    release_year: 2018,
    tmdb_id: 493922,
    poster_url: `${POSTER_BASE}/V3bYBs1PygTQFMoq1pu2hBmLnW.jpg`,
    overview: 'When the matriarch of the Graham family passes away, her daughter\'s family begins to unravel cryptic and terrifying secrets about their ancestry.',
    genres: ['Horror', 'Drama', 'Mystery'],
  },
  {
    title: 'The Revenant',
    release_year: 2015,
    tmdb_id: 281957,
    poster_url: `${POSTER_BASE}/ji3ecJphATlVgWNY0B0RVXZizja.jpg`,
    overview: 'In the 1820s, a frontiersman, Hugh Glass, sets out on a path of vengeance against those who left him for dead after a bear mauling.',
    genres: ['Adventure', 'Drama', 'Western'],
  },
  {
    title: 'Joker',
    release_year: 2019,
    tmdb_id: 475557,
    poster_url: `${POSTER_BASE}/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg`,
    overview: 'During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City while becoming an infamous super-villain known as the Joker.',
    genres: ['Crime', 'Drama', 'Thriller'],
  },
  {
    title: 'Blade Runner 2049',
    release_year: 2017,
    tmdb_id: 335984,
    poster_url: `${POSTER_BASE}/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg`,
    overview: 'Young Blade Runner K\'s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who\'s been missing for thirty years.',
    genres: ['Sci-Fi', 'Drama', 'Mystery'],
  },
  {
    title: 'The Grand Budapest Hotel',
    release_year: 2014,
    tmdb_id: 120467,
    poster_url: `${POSTER_BASE}/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg`,
    overview: 'The adventures of Gustave H, a legendary concierge at a famous European hotel between the wars, and Zero Moustafa, the lobby boy who becomes his most trusted friend.',
    genres: ['Comedy', 'Drama', 'Adventure'],
  },
];

// ── Per-user movie assignments ─────────────────────────────────
const USER_MOVIES = {
  alex_cinema: [
    { title: 'Inception',           rating: 5, status: 'Completed' },
    { title: 'Interstellar',        rating: 5, status: 'Completed' },
    { title: 'Blade Runner 2049',   rating: 5, status: 'Completed' },
    { title: 'The Dark Knight',     rating: 5, status: 'Completed' },
    { title: 'Dune',                rating: 4, status: 'Completed' },
    { title: 'Oppenheimer',         rating: 4, status: 'Completed' },
    { title: 'Mad Max: Fury Road',  rating: 4, status: 'Completed' },
    { title: 'Everything Everywhere All at Once', rating: 5, status: 'Completed' },
    { title: 'Hereditary',          rating: 3, status: 'Completed' },
    { title: 'The Revenant',        rating: 4, status: 'Watching'  },
    { title: 'Joker',               rating: 0, status: 'Want to Watch' },
    { title: 'Parasite',            rating: 0, status: 'Want to Watch' },
  ],
  sarah_film: [
    { title: 'Parasite',            rating: 5, status: 'Completed' },
    { title: 'The Grand Budapest Hotel', rating: 5, status: 'Completed' },
    { title: 'Whiplash',            rating: 5, status: 'Completed' },
    { title: 'La La Land',          rating: 4, status: 'Completed' },
    { title: 'Get Out',             rating: 4, status: 'Completed' },
    { title: 'Everything Everywhere All at Once', rating: 5, status: 'Completed' },
    { title: 'The Godfather',       rating: 5, status: 'Completed' },
    { title: 'Hereditary',          rating: 4, status: 'Completed' },
    { title: 'Oppenheimer',         rating: 4, status: 'Completed' },
    { title: 'Joker',               rating: 3, status: 'Completed' },
    { title: 'Spider-Man: Into the Spider-Verse', rating: 0, status: 'Want to Watch' },
    { title: 'Inception',           rating: 0, status: 'Want to Watch' },
  ],
  mike_reel: [
    { title: 'Avengers: Endgame',   rating: 5, status: 'Completed' },
    { title: 'Spider-Man: Into the Spider-Verse', rating: 5, status: 'Completed' },
    { title: 'The Dark Knight',     rating: 5, status: 'Completed' },
    { title: 'Inception',           rating: 4, status: 'Completed' },
    { title: 'Dune',                rating: 4, status: 'Completed' },
    { title: 'Mad Max: Fury Road',  rating: 4, status: 'Completed' },
    { title: 'The Shawshank Redemption', rating: 5, status: 'Completed' },
    { title: 'Oppenheimer',         rating: 0, status: 'Watching'  },
    { title: 'Joker',               rating: 0, status: 'Want to Watch' },
    { title: 'Parasite',            rating: 0, status: 'Want to Watch' },
    { title: 'Interstellar',        rating: 0, status: 'Want to Watch' },
    { title: 'La La Land',          rating: 0, status: 'Want to Watch' },
  ],
};

// ── Social Feed Posts ──────────────────────────────────────────
const POSTS = [
  {
    author: 'alex_cinema',
    title: 'Inception is still the GOAT of mind-bending cinema',
    body: 'Just rewatched Inception for the 5th time and it still holds up perfectly. The way Nolan layers the dream levels while keeping the emotional core of Cobb\'s story front and center is just masterful. The spinning top ending still gets me every single time. What does everyone think — does it fall or not? 🌀',
    media_title: 'Inception',
  },
  {
    author: 'sarah_film',
    title: 'Parasite deserved every Oscar it won (and more)',
    body: 'Bong Joon-ho created a masterpiece that works on so many levels simultaneously. On the surface it\'s a dark comedy, but underneath it\'s a devastating critique of class inequality. The basement reveal scene is one of the best in modern cinema. If you haven\'t seen it, stop what you\'re doing and watch it NOW.',
    media_title: 'Parasite',
  },
  {
    author: 'mike_reel',
    title: 'Avengers: Endgame made me cry in a theater for the first time',
    body: '"I am Iron Man." Three words that ended a decade of storytelling perfectly. Whatever you think about the MCU, you can\'t deny the sheer emotional payoff of Endgame. The portals scene alone is worth 10 years of investment. I don\'t think any movie will ever hit me the same way.',
    media_title: 'Avengers: Endgame',
  },
  {
    author: 'sarah_film',
    title: 'Whiplash: The most stressful 107 minutes of my life',
    body: 'Fletcher vs. Neiman is one of cinema\'s greatest rivalries. J.K. Simmons is absolutely terrifying and magnetic at the same time — you hate him, fear him, and weirdly respect him all at once. The final drum sequence is pure cinematic adrenaline. Damien Chazelle was 28 when he made this. Let that sink in.',
    media_title: 'Whiplash',
  },
  {
    author: 'alex_cinema',
    title: 'Blade Runner 2049 is criminally underrated',
    body: 'Roger Deakins shot the most beautiful film I\'ve ever seen, and somehow people slept on it at the box office. Every single frame of this movie is a painting. Ryan Gosling carries the film with subtle, nuanced perfection. Denis Villeneuve is operating on another level entirely. Dune confirmed it.',
    media_title: 'Blade Runner 2049',
  },
  {
    author: 'mike_reel',
    title: 'Into the Spider-Verse changed what animated films can be',
    body: 'No joke, Spider-Man: Into the Spider-Verse is the greatest animated film ever made. The art style alone is revolutionary — they literally created new animation techniques for this. Miles Morales is the Spider-Man for a generation. "What\'s up, danger?" is my most-quoted movie line of all time.',
    media_title: 'Spider-Man: Into the Spider-Verse',
  },
  {
    author: 'sarah_film',
    title: 'Everything Everywhere is the most unhinged, beautiful film',
    body: 'The Daniels made a movie about nihilism, taxes, and a mother-daughter relationship that somehow becomes the most life-affirming thing I\'ve watched. The raccacoonie scene sent me. The hot dog fingers universe sent me further. Then it made me call my mom and cry. Nothing has prepared me for this film.',
    media_title: 'Everything Everywhere All at Once',
  },
  {
    author: 'alex_cinema',
    title: 'Dune Part One — Denis Villeneuve is a visionary',
    body: 'Finally, a Dune adaptation that gets it right. The scale, the world-building, the atmosphere — it\'s all exactly as I imagined reading the book. Hans Zimmer\'s score is otherworldly. Zendaya with less than 10 minutes of screen time and she OWNS every frame. Cannot wait for Part Two.',
    media_title: 'Dune',
  },
];

// ── Comments ───────────────────────────────────────────────────
const COMMENTS = [
  { postTitle: 'Inception is still the GOAT of mind-bending cinema', author: 'sarah_film',  body: 'The top falls. That wobble at the end is key — it never wobbled before. Cobb is home. That\'s my final answer and I\'m sticking to it 😤' },
  { postTitle: 'Inception is still the GOAT of mind-bending cinema', author: 'mike_reel',   body: 'I think the whole point is we\'re not supposed to know. The real question is whether it matters to Cobb anymore — and it doesn\'t. That\'s the actual ending.' },
  { postTitle: 'Parasite deserved every Oscar it won (and more)', author: 'alex_cinema',    body: 'Agreed 100%. The stone metaphor throughout the film is one of the most subtle bits of foreshadowing I\'ve ever noticed on a rewatch.' },
  { postTitle: 'Parasite deserved every Oscar it won (and more)', author: 'mike_reel',      body: 'Just watched it last week after putting it off forever. You\'re right, I should have watched it sooner. The smell metaphor completely flew over my head the first time.' },
  { postTitle: 'Avengers: Endgame made me cry in a theater for the first time', author: 'alex_cinema', body: 'The portals scene is one of the greatest theatrical experiences ever. The whole audience was on their feet. Pure magic.' },
  { postTitle: 'Avengers: Endgame made me cry in a theater for the first time', author: 'sarah_film',  body: 'I\'m not a huge MCU person but even I was moved. Tony\'s sacrifice is earned in a way that few blockbusters manage.' },
  { postTitle: 'Whiplash: The most stressful 107 minutes of my life', author: 'alex_cinema', body: 'The ending is genuinely ambiguous though. Did Fletcher win, or did Andrew? That last cut to black is so loaded.' },
  { postTitle: 'Everything Everywhere is the most unhinged, beautiful film', author: 'mike_reel', body: 'I went in expecting a weird action movie and came out having a full emotional breakdown. The everything bagel scene should not have worked as an emotional climax but somehow it DID.' },
];

// ── Loves (which user loves which post) ───────────────────────
const LOVES = [
  { loverUsername: 'sarah_film',  postTitle: 'Inception is still the GOAT of mind-bending cinema' },
  { loverUsername: 'mike_reel',   postTitle: 'Inception is still the GOAT of mind-bending cinema' },
  { loverUsername: 'alex_cinema', postTitle: 'Parasite deserved every Oscar it won (and more)' },
  { loverUsername: 'mike_reel',   postTitle: 'Parasite deserved every Oscar it won (and more)' },
  { loverUsername: 'alex_cinema', postTitle: 'Avengers: Endgame made me cry in a theater for the first time' },
  { loverUsername: 'sarah_film',  postTitle: 'Avengers: Endgame made me cry in a theater for the first time' },
  { loverUsername: 'mike_reel',   postTitle: 'Whiplash: The most stressful 107 minutes of my life' },
  { loverUsername: 'alex_cinema', postTitle: 'Whiplash: The most stressful 107 minutes of my life' },
  { loverUsername: 'sarah_film',  postTitle: 'Blade Runner 2049 is criminally underrated' },
  { loverUsername: 'mike_reel',   postTitle: 'Into the Spider-Verse changed what animated films can be' },
  { loverUsername: 'alex_cinema', postTitle: 'Into the Spider-Verse changed what animated films can be' },
  { loverUsername: 'sarah_film',  postTitle: 'Everything Everywhere is the most unhinged, beautiful film' },
  { loverUsername: 'mike_reel',   postTitle: 'Everything Everywhere is the most unhinged, beautiful film' },
  { loverUsername: 'sarah_film',  postTitle: 'Dune Part One — Denis Villeneuve is a visionary' },
  { loverUsername: 'mike_reel',   postTitle: 'Dune Part One — Denis Villeneuve is a visionary' },
];

// ── Seed Runner ────────────────────────────────────────────────
async function seed() {
  const client = await pool.connect();
  console.log('\n🌱 Starting seed...\n');

  try {
    await client.query('BEGIN');

    // ── 1. Get genre map ──────────────────────────────────────
    const { rows: genreRows } = await client.query('SELECT genre_id, genre_name FROM genres');
    const genreMap = Object.fromEntries(genreRows.map(g => [g.genre_name, g.genre_id]));

    // ── 2. Get movie type_id ──────────────────────────────────
    const { rows: typeRows } = await client.query("SELECT type_id FROM item_types WHERE type_name = 'Movie' LIMIT 1");
    const movieTypeId = typeRows[0]?.type_id;
    if (!movieTypeId) throw new Error('Movie type not found');

    // ── 3. Create users ───────────────────────────────────────
    const userMap = {}; // username -> user_id
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
      const { rows } = await client.query(
        `INSERT INTO users (email, username, password_hash, display_name, bio, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio
         RETURNING user_id, username`,
        [u.email, u.username, hash, u.display_name, u.bio, u.role]
      );
      userMap[rows[0].username] = rows[0].user_id;
      console.log(`  👤 User: ${u.display_name} (@${u.username})`);
    }

    // ── 4. Build movie lookup ─────────────────────────────────
    const movieLookup = Object.fromEntries(MOVIES.map(m => [m.title, m]));

    // ── 5. Insert media items per user ────────────────────────
    const itemIdMap = {}; // "username:title" -> item_id
    for (const [username, movies] of Object.entries(USER_MOVIES)) {
      const userId = userMap[username];
      for (const m of movies) {
        const meta = movieLookup[m.title];
        if (!meta) { console.warn(`  ⚠️  No metadata for: ${m.title}`); continue; }

        const rating = m.rating || (m.status === 'Completed' ? 4 : 3);

        const { rows } = await client.query(
          `INSERT INTO media_items
             (title, release_year, rating, completion_status, poster_url, overview, tmdb_id, type_id, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING item_id`,
          [meta.title, meta.release_year, rating, m.status, meta.poster_url, meta.overview, meta.tmdb_id, movieTypeId, userId]
        );
        const itemId = rows[0].item_id;
        itemIdMap[`${username}:${m.title}`] = itemId;

        // Insert genres
        for (const genreName of (meta.genres || [])) {
          const gid = genreMap[genreName];
          if (gid) {
            await client.query(
              'INSERT INTO media_item_genres (item_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [itemId, gid]
            );
          }
        }
      }
      console.log(`  🎬 Movies for @${username}: ${movies.length}`);
    }

    // ── 6. Insert posts ───────────────────────────────────────
    const postIdMap = {}; // postTitle -> post_id
    for (const p of POSTS) {
      const userId = userMap[p.author];
      const { rows } = await client.query(
        `INSERT INTO posts (user_id, title, body, media_type, media_title, status)
         VALUES ($1, $2, $3, 'Movie', $4, 'published')
         RETURNING post_id`,
        [userId, p.title, p.body, p.media_title]
      );
      postIdMap[p.title] = rows[0].post_id;
    }
    console.log(`  📝 Posts: ${POSTS.length}`);

    // ── 7. Insert comments ────────────────────────────────────
    for (const c of COMMENTS) {
      const postId = postIdMap[c.postTitle];
      const userId = userMap[c.author];
      if (!postId || !userId) continue;
      await client.query(
        'INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3)',
        [postId, userId, c.body]
      );
    }
    console.log(`  💬 Comments: ${COMMENTS.length}`);

    // ── 8. Insert loves ───────────────────────────────────────
    for (const l of LOVES) {
      const userId = userMap[l.loverUsername];
      const postId = postIdMap[l.postTitle];
      if (!postId || !userId) continue;
      await client.query(
        'INSERT INTO loves (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, postId]
      );
    }
    console.log(`  ❤️  Loves: ${LOVES.length}`);

    await client.query('COMMIT');

    console.log('\n✅ Seed complete!\n');
    console.log('👤 Demo accounts (password: password123):');
    console.log('   alex@aethel.io  → @alex_cinema (Sci-Fi lover)');
    console.log('   sarah@aethel.io → @sarah_film  (Film critic)');
    console.log('   mike@aethel.io  → @mike_reel   (Marvel fan)');
    console.log('   admin@aethel.io → @admin        (password: admin123)\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

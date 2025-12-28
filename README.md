# Minigolf scoreboard

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/owf6o3?referralCode=XR5Br6&utm_medium=integration&utm_source=template&utm_campaign=generic)

Track minigolf scores for your group without any hassle. Create a game, share the code with your friends, and start keeping score. Everyone can add players, enter scores, and see the live scoreboard. If someone joins mid-game, they'll automatically get the average score for holes already played. No sign-ups, no accounts, just open the link and play.

Since theres no accounts, you can use my live version at https://minigolf.up.railway.app, but if you prefer you can self-host your own. I've made a one-click railway deploy for your convenience.

<details>

<summary>Self-hosting details</summary>

if you want to host this elsewhere, all you need is bun and run `bun install && bun build` and then `bun start` will handle database migrations and starting the built server. If you want persistance, all data is stored in ./drizzle. You can run this on a VPS or in a docker container. A PORT env var can be used to change the server's port.

</details>

## Features

- **Create and manage games** - Start a new game with a unique code that can be shared with players
- **Add/Edit players** - Add any number of players with custom names and ball colors
- **Track/Edit scores** - Enter scores (1-10 shots) for each hole with a simple tap
- **Dynamic holes** - Add more holes to a game as you play
- **Live scoreboard** - View total scores and current rankings at a glance
- **Game summary** - View overall standings, per-hole breakdown, and average scores
- **Real-time updates** - (Finicky) Scores update automatically across all devices when someone enters a score

## Tech Stack

- [SolidJS](https://www.solidjs.com/) - Reactive UI framework
- [SolidStart](https://start.solidjs.com/) - Full-stack framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [SQLite](https://www.sqlite.org/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Motion One](https://motion.dev/) - Animations

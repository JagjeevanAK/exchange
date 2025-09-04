# poller

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.11. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

```sh
docker stop timescaledb_container
docker rm timescaledb_container
docker run -d --name timescaledb_container -p 5433:5432 -e POSTGRES_PASSWORD=XYZ@123 -e POSTGRES_USER=user timescale/timescaledb-ha:pg17

docker rm redis
docker rm redis
docker run -d -p 6379:6379 redis
```

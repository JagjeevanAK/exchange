# backend

Located inside `apps/backend` of the turborepo.

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
docker-compose -f prometheus-grafana.yml down
docker-compose -f prometheus-grafana.yml up

# # porstgres
# docker run --name postgres-1 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=exchange -p 5432:5432 -d postgres:15-alpine
```
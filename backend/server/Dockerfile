FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/index.ts .
COPY --from=prerelease /app/routes ./routes
COPY --from=prerelease /app/middlewares ./middlewares
COPY --from=prerelease /app/helpers ./helpers
COPY --from=prerelease /app/types ./types
COPY --from=prerelease /app/prisma ./prisma
COPY --from=prerelease /app/generated ./generated
COPY --from=prerelease /app/package.json .
COPY --from=prerelease /app/tsconfig.json .

# Expose port
EXPOSE 3000

# Run the app
USER bun
CMD ["bun", "run", "index.ts"]

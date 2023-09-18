FROM arm64v8/node:lts-buster

ENV NODE_ENV="production"
ENV HTTP_PORT=8080
ENV CORS_ORIGINS="*"
ENV DATABASE_HOST="UNSET"
ENV DATABASE_USER="UNSET"
ENV DATABASE_PASS="UNSET"
ENV DATABASE_NAME="UNSET"
ENV SIGNED_COOKIE_SECRET="UNSET"

# Clone and move into directory
RUN git clone --recurse-submodules https://github.com/cards-against-my-sanity/server.git /app
WORKDIR /app

# Install dependencies
RUN yarn install

# Build application
RUN yarn build

# Expose the port
EXPOSE 8080

# Start the app
CMD /bin/sh -c "NODE_ENV=$NODE_ENV HTTP_PORT=$HTTP_PORT CORS_ORIGINS=$CORS_ORIGINS DATABASE_HOST=$DATABASE_HOST DATABASE_USER=$DATABASE_USER DATABASE_PASS=$DATABASE_PASS DATABASE_NAME=$DATABASE_NAME SIGNED_COOKIE_SECRET=$SIGNED_COOKIE_SECRET yarn start:prod"

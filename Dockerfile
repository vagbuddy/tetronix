# ---------- Frontend build ----------
FROM node:20-slim AS frontend-build
WORKDIR /app

ARG BUILD_ENV=production
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build


# ---------- API build ----------
FROM node:20-slim AS api-build
WORKDIR /app/api

COPY api/package*.json ./
RUN npm install --no-audit --no-fund
COPY api .
# Copy shared code into the build context so the API tsc can import from ../shared
COPY shared ../shared
RUN npm run build


# ---------- Runtime ----------
FROM node:20-slim AS runtime
ARG BUILD_ENV=production
ARG APP_CHECK_ENFORCE=true
ENV NODE_ENV=${BUILD_ENV}
ENV APP_CHECK_ENFORCE=${APP_CHECK_ENFORCE}
ENV PORT=3001
WORKDIR /app/api

COPY --from=frontend-build /app/build /app/api/build

COPY api/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=api-build /app/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/api/index.js"]

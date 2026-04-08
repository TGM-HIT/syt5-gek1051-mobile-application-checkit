FROM node:20-alpine AS build
WORKDIR /frontend
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
ARG VITE_COUCHDB_URL
ARG VITE_PEPPER
ENV VITE_COUCHDB_URL="${VITE_COUCHDB_URL}"
ENV VITE_PEPPER="${VITE_PEPPER}"
RUN yarn build

FROM nginx:stable-alpine
COPY --from=build /frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# build stage
FROM node:20-alpine AS build
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# run stage
FROM nginx:stable-alpine
COPY --from=build /frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

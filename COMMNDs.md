COMMND:
cd /Users/shraddha/projects/FoodNet/food-net

cp -n .env.example .env

docker compose down
docker compose up -d --build

docker compose exec app npx prisma migrate deploy

docker compose ps
docker compose logs -f app worker

docker compose logs -f app

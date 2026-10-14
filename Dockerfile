FROM node:22-alpine AS frontend-build

WORKDIR /frontend

COPY app/views/frontend/package.json .
RUN npm install

COPY app/views/frontend .
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-build /frontend/dist /app/app/views/static

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "web.py"]

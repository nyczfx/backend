# Dockerfile para backend Study (baileys bot + server)
FROM node:18

# define workdir
WORKDIR /app

# copia package.json e package-lock primeiro (cache de dependências)
COPY package*.json ./

# instala dependências (production)
RUN npm install --production

# copia o restante do código
COPY . .

# garante a pasta auth (volume irá montar aqui)
RUN mkdir -p /app/auth

# expõe a porta que o server usa (server.js usa 3001)
EXPOSE 3001

# start do servidor
CMD ["node", "server.js"]

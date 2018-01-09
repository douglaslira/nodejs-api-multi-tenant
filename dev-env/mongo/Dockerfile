FROM	ubuntu:latest
ARG MONGO_VERSION=3.4.7

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
RUN echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.4.list

RUN apt-get update
RUN apt-get install -y -q mongodb-org=${MONGO_VERSION} mongodb-org-server=${MONGO_VERSION} mongodb-org-shell=${MONGO_VERSION} mongodb-org-tools=${MONGO_VERSION}

RUN mkdir -p /data/db

VOLUME ["/data"]

WORKDIR /data

CMD ["mongod"]

EXPOSE 27017
